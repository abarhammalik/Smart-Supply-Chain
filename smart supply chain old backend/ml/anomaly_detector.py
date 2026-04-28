"""
anomaly_detector.py
-------------------
Isolation-Forest-based anomaly detector for shipment telemetry.

Requires Python 3.9 – 3.12  (NOT 3.13/3.14 — scipy/sklearn are incompatible).

Usage
-----
    python anomaly_detector.py                  # train + run built-in tests
    python anomaly_detector.py --data path.csv  # train on custom CSV
"""

from __future__ import annotations

__all__ = ["train_anomaly_model", "predict_anomaly", "AnomalyDetector"]
__version__ = "2.0.0"

import argparse
import logging
import os
import pickle
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Logging — replace bare print() calls with structured log output
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("anomaly_detector")

# ---------------------------------------------------------------------------
# Constants — no magic numbers scattered through logic
# ---------------------------------------------------------------------------
FEATURES: list[str] = [
    "speed_knots",
    "dwell_hours",
    "expected_dwell_hours",
    "delay_hours",
]

MODEL_DIR = Path("ml/models")
MODEL_PATH = MODEL_DIR / "anomaly_model.pkl"
DEFAULT_DATA_PATH = Path("ml/data/synthetic_shipments.csv")

N_ESTIMATORS: int = 200
CONTAMINATION: float = 0.10          # expected anomaly fraction in training data
RANDOM_STATE: int = 42

# Boundaries used for robust score normalisation (percentile-fitted at train time)
_SCORE_CLIP_LOW: float = -0.5
_SCORE_CLIP_HIGH: float = 0.5


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class PredictionResult:
    """Immutable result returned by :func:`predict_anomaly`."""

    anomaly_score: float          # 0 → normal, 1 → highly anomalous
    is_anomaly: bool
    raw_decision_score: float     # raw IsolationForest decision_function output

    def __str__(self) -> str:  # pragma: no cover
        label = "ANOMALY" if self.is_anomaly else "normal"
        return (
            f"[{label}] anomaly_score={self.anomaly_score:.3f} "
            f"(raw={self.raw_decision_score:.4f})"
        )


@dataclass
class ModelBundle:
    """Container for everything needed to run inference."""

    model: IsolationForest
    scaler: StandardScaler
    features: list[str]
    score_low: float = _SCORE_CLIP_LOW
    score_high: float = _SCORE_CLIP_HIGH


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------
def _validate_features(values: dict[str, float]) -> None:
    """
    Raise ValueError for any input that would silently corrupt a prediction.

    Checks:
      - All required feature keys are present.
      - No NaN or infinite values.
      - speed_knots is non-negative (physically impossible otherwise).
      - dwell_hours and expected_dwell_hours are non-negative.
    """
    missing = [f for f in FEATURES if f not in values]
    if missing:
        raise ValueError(f"Missing feature(s): {missing}")

    for name in FEATURES:
        v = values[name]
        if not isinstance(v, (int, float)):
            raise TypeError(f"Feature '{name}' must be numeric, got {type(v).__name__}")
        if np.isnan(v):
            raise ValueError(f"Feature '{name}' is NaN")
        if np.isinf(v):
            raise ValueError(f"Feature '{name}' is infinite")

    if values["speed_knots"] < 0:
        raise ValueError(f"speed_knots cannot be negative (got {values['speed_knots']})")
    if values["dwell_hours"] < 0:
        raise ValueError(f"dwell_hours cannot be negative (got {values['dwell_hours']})")
    if values["expected_dwell_hours"] < 0:
        raise ValueError(
            f"expected_dwell_hours cannot be negative (got {values['expected_dwell_hours']})"
        )


# ---------------------------------------------------------------------------
# Core class — owns the model lifecycle and caches the bundle in memory
# ---------------------------------------------------------------------------
class AnomalyDetector:
    """
    Stateful wrapper around IsolationForest that caches the loaded model
    so disk I/O only happens once per process, not once per prediction.

    Example
    -------
    >>> detector = AnomalyDetector()
    >>> result = detector.predict(speed_knots=14, dwell_hours=3,
    ...                           expected_dwell_hours=4, delay_hours=1)
    >>> print(result)
    [normal] anomaly_score=0.241 (raw=0.2591)
    """

    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        data_path: Path = DEFAULT_DATA_PATH,
    ) -> None:
        self._model_path = Path(model_path)
        self._data_path = Path(data_path)
        self._bundle: Optional[ModelBundle] = None  # lazy-loaded

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def train(self, data_path: Optional[Path] = None) -> ModelBundle:
        """Train, evaluate, persist and cache the model bundle."""
        src = Path(data_path) if data_path else self._data_path

        if not src.exists():
            raise FileNotFoundError(f"Training data not found: {src}")

        log.info("Loading training data from %s", src)
        df = pd.read_csv(src)

        missing_cols = [c for c in FEATURES if c not in df.columns]
        if missing_cols:
            raise ValueError(f"Training CSV is missing columns: {missing_cols}")

        X = df[FEATURES].to_numpy(dtype=np.float64)

        # Guard against NaN / inf in training data
        if not np.isfinite(X).all():
            bad_rows = np.where(~np.isfinite(X).all(axis=1))[0]
            log.warning(
                "Dropping %d row(s) with NaN/inf from training data", len(bad_rows)
            )
            X = X[np.isfinite(X).all(axis=1)]
            df = df.iloc[np.where(np.isfinite(df[FEATURES].to_numpy()).all(axis=1))[0]]

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        log.info(
            "Training IsolationForest (n_estimators=%d, contamination=%.2f)",
            N_ESTIMATORS,
            CONTAMINATION,
        )
        model = IsolationForest(
            n_estimators=N_ESTIMATORS,
            contamination=CONTAMINATION,
            max_samples="auto",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )
        model.fit(X_scaled)

        # --- Calibrate score normalisation bounds on training distribution ---
        raw_scores = model.decision_function(X_scaled)
        score_low = float(np.percentile(raw_scores, 1))
        score_high = float(np.percentile(raw_scores, 99))
        log.info(
            "Score range (1st–99th pct): [%.4f, %.4f]", score_low, score_high
        )

        # --- Evaluate if ground-truth labels are available ---
        if "is_anomaly" in df.columns:
            y_true = df["is_anomaly"].to_numpy()
            preds = model.predict(X_scaled)
            y_pred = (preds == -1).astype(int)
            log.info("Anomaly Detector — Training Evaluation:\n%s",
                     classification_report(y_true, y_pred,
                                           target_names=["Normal", "Anomaly"]))
        else:
            log.warning("Column 'is_anomaly' not found; skipping evaluation.")

        bundle = ModelBundle(
            model=model,
            scaler=scaler,
            features=FEATURES,
            score_low=score_low,
            score_high=score_high,
        )
        self._save_bundle(bundle)
        self._bundle = bundle
        return bundle

    def predict(
        self,
        speed_knots: float,
        dwell_hours: float,
        expected_dwell_hours: float,
        delay_hours: float,
    ) -> PredictionResult:
        """
        Return anomaly score and label for one shipment observation.

        Parameters
        ----------
        speed_knots:           Vessel speed in knots.
        dwell_hours:           Actual time spent at port (hours).
        expected_dwell_hours:  Scheduled dwell time (hours).
        delay_hours:           Delay beyond schedule (hours).

        Returns
        -------
        PredictionResult with anomaly_score ∈ [0, 1] and is_anomaly flag.
        """
        raw_values = {
            "speed_knots": speed_knots,
            "dwell_hours": dwell_hours,
            "expected_dwell_hours": expected_dwell_hours,
            "delay_hours": delay_hours,
        }
        _validate_features(raw_values)

        bundle = self._load_bundle()

        X = np.array([[speed_knots, dwell_hours, expected_dwell_hours, delay_hours]],
                     dtype=np.float64)
        X_scaled = bundle.scaler.transform(X)

        raw_score: float = float(bundle.model.decision_function(X_scaled)[0])
        prediction: int = int(bundle.model.predict(X_scaled)[0])  # -1 or +1

        # Normalise using training-time percentile bounds (robust vs fixed 0.5 hack)
        span = bundle.score_high - bundle.score_low or 1.0   # guard zero-division
        normalised = (raw_score - bundle.score_low) / span   # 0 (low) → 1 (high)
        anomaly_score = float(np.clip(1.0 - normalised, 0.0, 1.0))  # invert: high = anomalous

        return PredictionResult(
            anomaly_score=round(anomaly_score, 4),
            is_anomaly=(prediction == -1),
            raw_decision_score=round(raw_score, 6),
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_bundle(self) -> ModelBundle:
        """Return cached bundle; train from scratch if missing."""
        if self._bundle is not None:
            return self._bundle

        if self._model_path.exists():
            log.info("Loading model from %s", self._model_path)
            try:
                with self._model_path.open("rb") as fh:
                    raw = pickle.load(fh)

                # Support old dict-style bundles for backward compatibility
                if isinstance(raw, dict):
                    bundle = ModelBundle(
                        model=raw["model"],
                        scaler=raw["scaler"],
                        features=raw["features"],
                    )
                elif isinstance(raw, ModelBundle):
                    bundle = raw
                else:
                    raise TypeError(f"Unrecognised bundle type: {type(raw)}")

                self._bundle = bundle
                return self._bundle
            except Exception as exc:
                log.warning("Failed to load model (%s); retraining.", exc)

        log.info("No saved model found — training from scratch.")
        return self.train()

    def _save_bundle(self, bundle: ModelBundle) -> None:
        """Persist bundle to disk with atomic-ish write."""
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        tmp_path = self._model_path.with_suffix(".tmp")
        try:
            with tmp_path.open("wb") as fh:
                pickle.dump(bundle, fh, protocol=pickle.HIGHEST_PROTOCOL)
            tmp_path.replace(self._model_path)   # atomic on POSIX, near-atomic on Windows
            log.info("Model saved → %s", self._model_path)
        except Exception as exc:
            log.error("Failed to save model: %s", exc)
            if tmp_path.exists():
                tmp_path.unlink(missing_ok=True)
            raise


# ---------------------------------------------------------------------------
# Module-level convenience functions (thin wrappers around a shared instance)
# ---------------------------------------------------------------------------
_default_detector: Optional[AnomalyDetector] = None


def _get_default_detector() -> AnomalyDetector:
    global _default_detector
    if _default_detector is None:
        _default_detector = AnomalyDetector()
    return _default_detector


def train_anomaly_model(
    data_path: str | Path = DEFAULT_DATA_PATH,
) -> tuple[IsolationForest, StandardScaler]:
    """
    Train (or retrain) the global model.

    Returns
    -------
    (model, scaler) — for backward compatibility with v1 callers.
    """
    bundle = _get_default_detector().train(data_path=Path(data_path))
    return bundle.model, bundle.scaler


def predict_anomaly(
    speed_knots: float,
    dwell_hours: float,
    expected_dwell_hours: float,
    delay_hours: float,
) -> dict[str, float | bool]:
    """
    Predict anomaly for a single observation.

    Returns
    -------
    {"anomaly_score": float, "is_anomaly": bool}  — backward-compatible with v1.
    """
    result = _get_default_detector().predict(
        speed_knots=speed_knots,
        dwell_hours=dwell_hours,
        expected_dwell_hours=expected_dwell_hours,
        delay_hours=delay_hours,
    )
    return {"anomaly_score": result.anomaly_score, "is_anomaly": result.is_anomaly}


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------
def _build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Train the shipment anomaly detector and run smoke tests."
    )
    p.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Path to training CSV (default: %(default)s)",
    )
    p.add_argument(
        "--model",
        type=Path,
        default=MODEL_PATH,
        help="Where to save/load the model (default: %(default)s)",
    )
    p.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging verbosity (default: %(default)s)",
    )
    return p


def _smoke_tests(detector: AnomalyDetector) -> None:
    cases = [
        {
            "label": "Normal shipment",
            "kwargs": dict(speed_knots=14, dwell_hours=3,
                           expected_dwell_hours=4, delay_hours=1),
        },
        {
            "label": "Stopped vessel (anomaly)",
            "kwargs": dict(speed_knots=1.2, dwell_hours=22,
                           expected_dwell_hours=4, delay_hours=18),
        },
        {
            "label": "Extreme delay (anomaly)",
            "kwargs": dict(speed_knots=8, dwell_hours=15,
                           expected_dwell_hours=4, delay_hours=48),
        },
    ]
    print("\n" + "=" * 60)
    print("SMOKE TESTS")
    print("=" * 60)
    for case in cases:
        result = detector.predict(**case["kwargs"])
        print(f"\n  {case['label']}")
        print(f"  Input  : {case['kwargs']}")
        print(f"  Result : {result}")
    print("=" * 60)


if __name__ == "__main__":
    args = _build_arg_parser().parse_args()
    logging.getLogger().setLevel(args.log_level)

    detector = AnomalyDetector(model_path=args.model, data_path=args.data)

    try:
        detector.train()
    except FileNotFoundError as exc:
        log.error("%s", exc)
        log.error(
            "Tip: generate synthetic data first, or pass --data <path-to-csv>"
        )
        sys.exit(1)

    _smoke_tests(detector)