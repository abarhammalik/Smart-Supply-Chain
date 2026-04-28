"""
api.py
------
FastAPI service exposing the Supply Chain ML models over HTTP.

Endpoints
---------
  GET  /health                — liveness probe
  GET  /ready                 — readiness probe (models loaded)
  POST /predict/anomaly       — IsolationForest anomaly detection
  POST /predict/risk          — RandomForest risk scoring
  POST /optimize/route        — graph-based route optimisation
  POST /train/all             — retrain all models (admin)

Run (development)
-----------------
    uvicorn ml.api:app --port 8001 --reload

Run (production)
----------------
    uvicorn ml.api:app --host 0.0.0.0 --port 8001 --workers 4

Environment variables
---------------------
  ML_DATA_PATH   — path to training CSV  (default: ml/data/synthetic_shipments.csv)
  ML_MODEL_DIR   — model artefact directory (default: ml/models)
  CORS_ORIGINS   — comma-separated allowed origins (default: *)
  LOG_LEVEL      — uvicorn/app log level (default: info)
"""

from __future__ import annotations

import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

# Ensure the project root is importable when the file is run directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uvicorn
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from ml.anomaly_detector import AnomalyDetector
from ml.risk_scorer import RiskScorer
from ml.route_optimizer import compare_routes

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("api")

# ---------------------------------------------------------------------------
# Environment-driven configuration — no magic strings buried in logic
# ---------------------------------------------------------------------------
DATA_PATH = Path(os.getenv("ML_DATA_PATH", "ml/data/synthetic_shipments.csv"))
MODEL_DIR = Path(os.getenv("ML_MODEL_DIR", "ml/models"))
_raw_origins = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS: list[str] = (
    ["*"] if _raw_origins == "*" else [o.strip() for o in _raw_origins.split(",")]
)

# ---------------------------------------------------------------------------
# Model singletons — instantiated once at startup, reused across all requests
# ---------------------------------------------------------------------------
_anomaly_detector: AnomalyDetector | None = None
_risk_scorer: RiskScorer | None = None


def _get_anomaly_detector() -> AnomalyDetector:
    global _anomaly_detector
    if _anomaly_detector is None:
        raise RuntimeError("AnomalyDetector not initialised — server not ready")
    return _anomaly_detector


def _get_risk_scorer() -> RiskScorer:
    global _risk_scorer
    if _risk_scorer is None:
        raise RuntimeError("RiskScorer not initialised — server not ready")
    return _risk_scorer


# ---------------------------------------------------------------------------
# Lifespan: load (or train) models before the first request
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: warm up models. Shutdown: nothing special needed."""
    global _anomaly_detector, _risk_scorer

    log.info("Warming up ML models …")
    t0 = time.perf_counter()

    _anomaly_detector = AnomalyDetector(
        model_path=MODEL_DIR / "anomaly_model.pkl",
        data_path=DATA_PATH,
    )
    _risk_scorer = RiskScorer(
        model_path=MODEL_DIR / "risk_model.pkl",
        data_path=DATA_PATH,
    )

    # Trigger lazy load — surfaces training errors at startup, not first request
    try:
        _anomaly_detector._load_bundle()
        _risk_scorer._load_bundle()
    except Exception as exc:
        log.error("Model warm-up failed: %s", exc)
        # Don't crash the server — /ready will report unhealthy

    elapsed = time.perf_counter() - t0
    log.info("Models ready in %.2fs", elapsed)

    yield  # server runs here

    log.info("Shutting down — nothing to clean up.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Supply Chain ML API",
    version="2.0.0",
    description=__doc__,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handler — prevents raw tracebacks leaking to clients
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class AnomalyRequest(BaseModel):
    shipment_id: str = Field(..., min_length=1, description="Unique shipment identifier")
    speed_knots: float = Field(..., ge=0.0, le=50.0, description="Vessel speed in knots")
    dwell_hours: float = Field(..., ge=0.0, description="Actual dwell time in hours")
    expected_dwell_hours: float = Field(4.0, ge=0.0, description="Scheduled dwell time")
    delay_hours: float = Field(0.0, ge=0.0, description="Delay beyond schedule")

    model_config = {"json_schema_extra": {"examples": [{
        "shipment_id": "SHP-001",
        "speed_knots": 1.2,
        "dwell_hours": 22,
        "expected_dwell_hours": 4,
        "delay_hours": 18,
    }]}}


class AnomalyResponse(BaseModel):
    shipment_id: str
    anomaly_score: float
    is_anomaly: bool


class RiskRequest(BaseModel):
    shipment_id: str = Field(..., min_length=1)
    delay_hours: float = Field(0.0, ge=0.0)
    weather_score: float = Field(0.0, ge=0.0, le=1.0)
    port_congestion: float = Field(0.0, ge=0.0, le=1.0)
    speed_knots: float = Field(14.0, ge=0.0, le=50.0)
    route_segment: str = Field("Open Ocean", min_length=1)
    cargo_type: str = Field("General", min_length=1)
    dwell_hours: float = Field(0.0, ge=0.0)

    model_config = {"json_schema_extra": {"examples": [{
        "shipment_id": "SHP-002",
        "delay_hours": 24,
        "weather_score": 0.88,
        "port_congestion": 0.6,
        "speed_knots": 6,
        "route_segment": "Red Sea",
        "cargo_type": "Electronics",
    }]}}


class RiskResponse(BaseModel):
    shipment_id: str
    risk_score: float
    risk_level: str
    delay_probability: float


class RouteRequest(BaseModel):
    origin: str = Field(..., min_length=1, description="Origin port name")
    destination: str = Field(..., min_length=1, description="Destination port name")
    blocked_segments: list[str] = Field(
        default_factory=list,
        description="Route segments to exclude",
    )

    @field_validator("blocked_segments")
    @classmethod
    def _no_blank_segments(cls, v: list[str]) -> list[str]:
        """Strip whitespace and drop empty strings silently."""
        return [s.strip() for s in v if s.strip()]

    model_config = {"json_schema_extra": {"examples": [{
        "origin": "Mumbai",
        "destination": "Rotterdam",
        "blocked_segments": ["Suez Canal", "Red Sea"],
    }]}}


class TrainResponse(BaseModel):
    status: str
    models_retrained: list[str]
    elapsed_seconds: float


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", tags=["ops"], summary="Liveness probe")
def health() -> dict[str, str]:
    """Always returns 200 if the process is alive."""
    return {"status": "ok", "service": "ml-api", "version": app.version}


@app.get("/ready", tags=["ops"], summary="Readiness probe")
def ready() -> dict[str, Any]:
    """Returns 200 only when all models are loaded and ready."""
    anomaly_ok = _anomaly_detector is not None and _anomaly_detector._bundle is not None
    risk_ok = _risk_scorer is not None and _risk_scorer._bundle is not None

    if not (anomaly_ok and risk_ok):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "ready": False,
                "anomaly_model": anomaly_ok,
                "risk_model": risk_ok,
            },
        )
    return {"ready": True, "anomaly_model": True, "risk_model": True}


@app.post(
    "/predict/anomaly",
    response_model=AnomalyResponse,
    tags=["inference"],
    summary="Detect shipment anomalies",
)
def anomaly_endpoint(req: AnomalyRequest) -> AnomalyResponse:
    """
    Run IsolationForest anomaly detection on a single shipment observation.

    Returns an `anomaly_score` ∈ [0, 1] and a boolean `is_anomaly` flag.
    """
    detector = _get_anomaly_detector()
    try:
        result = detector.predict(
            speed_knots=req.speed_knots,
            dwell_hours=req.dwell_hours,
            expected_dwell_hours=req.expected_dwell_hours,
            delay_hours=req.delay_hours,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=str(exc)) from exc

    return AnomalyResponse(
        shipment_id=req.shipment_id,
        anomaly_score=result.anomaly_score,
        is_anomaly=result.is_anomaly,
    )


@app.post(
    "/predict/risk",
    response_model=RiskResponse,
    tags=["inference"],
    summary="Score disruption risk",
)
def risk_endpoint(req: RiskRequest) -> RiskResponse:
    """
    Run RandomForest risk classification on a single shipment observation.

    Returns `risk_level` (LOW/MEDIUM/HIGH/CRITICAL), a severity-weighted
    `risk_score` ∈ [0, 1], and `delay_probability` = P(HIGH or CRITICAL).
    """
    scorer = _get_risk_scorer()
    try:
        result = scorer.predict(
            delay_hours=req.delay_hours,
            weather_score=req.weather_score,
            port_congestion=req.port_congestion,
            speed_knots=req.speed_knots,
            route_segment=req.route_segment,
            cargo_type=req.cargo_type,
            dwell_hours=req.dwell_hours,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=str(exc)) from exc

    return RiskResponse(
        shipment_id=req.shipment_id,
        risk_score=result.risk_score,
        risk_level=result.risk_level,
        delay_probability=result.delay_probability,
    )


@app.post(
    "/optimize/route",
    tags=["routing"],
    summary="Find optimal shipping route",
)
def route_endpoint(req: RouteRequest) -> dict[str, Any]:
    """
    Compare available routes between origin and destination,
    excluding any blocked segments.
    """
    try:
        result = compare_routes(req.origin, req.destination, req.blocked_segments)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown port or route: {exc}",
        ) from exc

    return result


@app.post(
    "/train/all",
    response_model=TrainResponse,
    tags=["admin"],
    summary="Retrain all ML models",
)
def retrain_all() -> TrainResponse:
    """
    Trigger a synchronous retraining of every ML model.

    ⚠ Blocks the event loop — intended for admin/demo use only.
    For production, offload to a background task queue (e.g. Celery).
    """
    detector = _get_anomaly_detector()
    scorer = _get_risk_scorer()

    retrained: list[str] = []
    t0 = time.perf_counter()

    try:
        detector.train()
        retrained.append("anomaly_detector")
    except Exception as exc:
        log.error("anomaly_detector retrain failed: %s", exc)
        raise HTTPException(status_code=500,
                            detail=f"anomaly_detector failed: {exc}") from exc

    try:
        scorer.train()
        retrained.append("risk_scorer")
    except Exception as exc:
        log.error("risk_scorer retrain failed: %s", exc)
        raise HTTPException(status_code=500,
                            detail=f"risk_scorer failed: {exc}") from exc

    elapsed = round(time.perf_counter() - t0, 3)
    log.info("Retrained %s in %.3fs", retrained, elapsed)

    return TrainResponse(
        status="Models retrained successfully",
        models_retrained=retrained,
        elapsed_seconds=elapsed,
    )


# ---------------------------------------------------------------------------
# Direct execution entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "ml.api:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8001")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )