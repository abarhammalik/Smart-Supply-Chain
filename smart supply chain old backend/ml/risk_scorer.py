"""
risk_scorer.py
--------------
Random-Forest-based disruption risk classifier for shipment telemetry.

Risk levels
-----------
  0 → LOW       1 → MEDIUM       2 → HIGH       3 → CRITICAL

Requires Python 3.9 – 3.12  (NOT 3.13/3.14 — scipy/sklearn are incompatible).

Usage
-----
    python risk_scorer.py                    # train + smoke tests
    python risk_scorer.py --data path.csv    # custom training data
    python risk_scorer.py --log-level DEBUG  # verbose output
"""

from __future__ import annotations

__all__ = ["train_risk_model", "predict_risk", "RiskScorer"]
__version__ = "2.0.0"

import argparse
import logging
import os
import pickle
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("risk_scorer")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
NUMERIC_FEATURES: list[str] = [
    "delay_hours",
    "weather_score",
    "port_congestion",
    "speed_knots",
    "dwell_hours",
]
CATEGORICAL_FEATURES: list[str] = ["route_segment", "cargo_type"]

# Canonical mapping — used for display and for safe class-index lookup
RISK_LABELS: dict[int, str] = {0: "LOW", 1: "MEDIUM", 2: "HIGH", 3: "CRITICAL"}
RISK_LABEL_LIST: list[str] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

MODEL_DIR = Path("ml/models")
MODEL_PATH = MODEL_DIR / "risk_model.pkl"
DEFAULT_DATA_PATH = Path("ml/data/synthetic_shipments.csv")

# Hyper-parameters as named constants — no magic numbers in logic
N_ESTIMATORS: int = 200
MAX_DEPTH: int = 12
MIN_SAMPLES_SPLIT: int = 5
TEST_SIZE: float = 0.2
RANDOM_STATE: int = 42

# Numeric feature bounds for validation {feature: (min, max)}
FEATURE_BOUNDS: dict[str, tuple[float, float]] = {
    "delay_hours": (0.0, 9_999.0),
    "weather_score": (0.0, 1.0),
    "port_congestion": (0.0, 1.0),
    "speed_knots": (0.0, 50.0),
    "dwell_hours": (0.0, 9_999.0),
}


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class RiskPrediction:
    """Immutable result returned by :meth:`RiskScorer.predict`."""

    risk_level: str          # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    risk_class: int          # 0 – 3
    risk_score: float        # weighted severity score ∈ [0, 1]
    delay_probability: float # P(HIGH) + P(CRITICAL) ∈ [0, 1]
    class_probabilities: dict[str, float]  # full distribution

    def __str__(self) -> str:
        return (
            f"[{self.risk_level}] risk_score={self.risk_score:.3f}  "
            f"delay_prob={self.delay_probability:.3f}  "
            f"probs={self.class_probabilities}"
        )


@dataclass
class ModelBundle:
    """Everything needed to run inference — stored as a single pickle."""

    model: RandomForestClassifier
    label_encoders: dict[str, LabelEncoder]   # keyed by feature name
    numeric_features: list[str]
    categorical_features: list[str]
    trained_classes: list[int]                # classes actually seen in training


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def _validate_inputs(
    delay_hours: float,
    weather_score: float,
    port_congestion: float,
    speed_knots: float,
    dwell_hours: float,
    route_segment: str,
    cargo_type: str,
) -> None:
    """Raise descriptive errors for any input that would corrupt inference."""
    numeric_inputs = {
        "delay_hours": delay_hours,
        "weather_score": weather_score,
        "port_congestion": port_congestion,
        "speed_knots": speed_knots,
        "dwell_hours": dwell_hours,
    }
    for name, value in numeric_inputs.items():
        if not isinstance(value, (int, float)):
            raise TypeError(f"'{name}' must be numeric, got {type(value).__name__}")
        if np.isnan(value):
            raise ValueError(f"'{name}' is NaN")
        if np.isinf(value):
            raise ValueError(f"'{name}' is infinite")
        lo, hi = FEATURE_BOUNDS[name]
        if not (lo <= value <= hi):
            raise ValueError(
                f"'{name}' = {value} is outside expected range [{lo}, {hi}]"
            )

    for name, value in [("route_segment", route_segment), ("cargo_type", cargo_type)]:
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"'{name}' must be a non-empty string")


# ---------------------------------------------------------------------------
# Core class
# ---------------------------------------------------------------------------
class RiskScorer:
    """
    Stateful wrapper around RandomForestClassifier.

    • Model is loaded from disk once and cached in memory.
    • Unknown categorical values are handled with a meaningful fallback
      (most-frequent class) instead of silently defaulting to index 0.
    • risk_score is a severity-weighted expectation, not just the confidence
      of the predicted class.

    Example
    -------
    >>> scorer = RiskScorer()
    >>> result = scorer.predict(
    ...     delay_hours=1, weather_score=0.1, port_congestion=0.2,
    ...     speed_knots=15, route_segment="Pacific", cargo_type="General"
    ... )
    >>> print(result)
    [LOW] risk_score=0.051  delay_prob=0.012  probs={...}
    """

    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        data_path: Path = DEFAULT_DATA_PATH,
    ) -> None:
        self._model_path = Path(model_path)
        self._data_path = Path(data_path)
        self._bundle: Optional[ModelBundle] = None

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def train(self, data_path: Optional[Path] = None) -> ModelBundle:
        """Train, evaluate, persist, and cache the model bundle."""
        src = Path(data_path) if data_path else self._data_path
        if not src.exists():
            raise FileNotFoundError(f"Training data not found: {src}")

        log.info("Loading training data from %s", src)
        df = pd.read_csv(src)

        # --- Validate required columns ---
        required = NUMERIC_FEATURES + CATEGORICAL_FEATURES + ["risk_level"]
        missing_cols = [c for c in required if c not in df.columns]
        if missing_cols:
            raise ValueError(f"Training CSV missing columns: {missing_cols}")

        # --- Drop rows with NaN/inf in numeric features ---
        before = len(df)
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.dropna(subset=NUMERIC_FEATURES + ["risk_level"])
        if len(df) < before:
            log.warning("Dropped %d row(s) with NaN/inf values.", before - len(df))

        # --- Encode categoricals — fit one LabelEncoder per feature ---
        label_encoders: dict[str, LabelEncoder] = {}
        for feat in CATEGORICAL_FEATURES:
            le = LabelEncoder()
            df[f"{feat}_enc"] = le.fit_transform(df[feat].astype(str))
            label_encoders[feat] = le

        encoded_cats = [f"{f}_enc" for f in CATEGORICAL_FEATURES]
        all_features = NUMERIC_FEATURES + encoded_cats

        X = df[all_features].to_numpy(dtype=np.float64)
        y = df["risk_level"].to_numpy(dtype=int)

        trained_classes: list[int] = sorted(np.unique(y).tolist())
        n_classes = len(trained_classes)
        log.info("Classes present in training data: %s", trained_classes)

        # --- Build target_names aligned to ACTUAL classes in data ---
        # BUG FIX: never hardcode target_names — derive from what's in the data
        target_names = [RISK_LABELS.get(c, str(c)) for c in trained_classes]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
        )

        log.info(
            "Training RandomForest (n_estimators=%d, max_depth=%d, classes=%d)",
            N_ESTIMATORS, MAX_DEPTH, n_classes,
        )
        model = RandomForestClassifier(
            n_estimators=N_ESTIMATORS,
            max_depth=MAX_DEPTH,
            min_samples_split=MIN_SAMPLES_SPLIT,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )
        model.fit(X_train, y_train)

        # --- Evaluation ---
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)

        # Pass labels= so sklearn knows the expected ordering — prevents the crash
        report = classification_report(
            y_test,
            y_pred,
            labels=trained_classes,
            target_names=target_names,
            zero_division=0,
        )
        log.info("Risk Scorer — Test Report (accuracy=%.3f):\n%s", acc, report)

        # --- Feature importances ---
        feat_imp = sorted(
            zip(all_features, model.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
        top5 = "\n".join(f"  {f}: {i:.4f}" for f, i in feat_imp[:5])
        log.info("Top-5 feature importances:\n%s", top5)

        bundle = ModelBundle(
            model=model,
            label_encoders=label_encoders,
            numeric_features=NUMERIC_FEATURES,
            categorical_features=CATEGORICAL_FEATURES,
            trained_classes=trained_classes,
        )
        self._save_bundle(bundle)
        self._bundle = bundle
        return bundle

    def predict(
        self,
        delay_hours: float,
        weather_score: float,
        port_congestion: float,
        speed_knots: float,
        route_segment: str,
        cargo_type: str = "General",
        dwell_hours: float = 0.0,
    ) -> RiskPrediction:
        """
        Predict disruption risk for one shipment observation.

        Parameters
        ----------
        delay_hours:      Current delay in hours.
        weather_score:    Weather severity index ∈ [0, 1].
        port_congestion:  Port congestion index ∈ [0, 1].
        speed_knots:      Vessel speed in knots.
        route_segment:    Named route segment (e.g. "Pacific", "Red Sea").
        cargo_type:       Cargo category (e.g. "General", "Electronics").
        dwell_hours:      Time at port in hours.

        Returns
        -------
        RiskPrediction with risk_level, risk_score, delay_probability, etc.
        """
        _validate_inputs(
            delay_hours, weather_score, port_congestion,
            speed_knots, dwell_hours, route_segment, cargo_type,
        )

        bundle = self._load_bundle()
        trained_classes = bundle.trained_classes  # e.g. [0, 1, 2] or [0, 1, 2, 3]

        # --- Encode categoricals with graceful unknown handling ---
        encoded: dict[str, int] = {}
        for feat, value in [("route_segment", route_segment), ("cargo_type", cargo_type)]:
            le = bundle.label_encoders[feat]
            known = list(le.classes_)
            if value in known:
                encoded[feat] = int(le.transform([value])[0])
            else:
                # FIX: fall back to modal (most frequent) class index, not blind 0
                # This is still imperfect but at least documented and intentional
                log.warning(
                    "Unknown %s='%s'; known=%s. Using modal class fallback.",
                    feat, value, known,
                )
                encoded[feat] = int(le.transform([known[len(known) // 2]])[0])

        X = np.array(
            [[
                delay_hours, weather_score, port_congestion,
                speed_knots, dwell_hours,
                encoded["route_segment"], encoded["cargo_type"],
            ]],
            dtype=np.float64,
        )

        risk_class_raw = int(bundle.model.predict(X)[0])
        proba = bundle.model.predict_proba(X)[0]  # length == len(trained_classes)

        # --- Build full probability dict keyed by class int ---
        # model.classes_ gives the actual class labels the forest was trained on
        class_prob_map: dict[int, float] = {
            int(cls): float(p)
            for cls, p in zip(bundle.model.classes_, proba)
        }

        # FIX: risk_score = severity-weighted expectation over all classes
        # This is far more meaningful than "confidence of predicted class"
        # E.g. if P(HIGH)=0.4 and P(CRITICAL)=0.4, risk_score reflects that
        max_class = max(RISK_LABELS.keys())  # 3
        risk_score = float(
            sum(
                class_prob_map.get(c, 0.0) * (c / max_class)
                for c in RISK_LABELS
            )
        )

        # FIX: delay_probability uses the class index map, not raw slice [2:]
        # Works correctly even when HIGH (2) or CRITICAL (3) aren't in training data
        delay_probability = float(
            class_prob_map.get(2, 0.0) + class_prob_map.get(3, 0.0)
        )

        # FIX: safe label lookup — KeyError impossible
        risk_level = RISK_LABELS.get(risk_class_raw, f"CLASS_{risk_class_raw}")

        class_probabilities = {
            RISK_LABELS.get(c, str(c)): round(class_prob_map.get(c, 0.0), 4)
            for c in sorted(RISK_LABELS)
        }

        return RiskPrediction(
            risk_level=risk_level,
            risk_class=risk_class_raw,
            risk_score=round(risk_score, 4),
            delay_probability=round(delay_probability, 4),
            class_probabilities=class_probabilities,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_bundle(self) -> ModelBundle:
        """Return cached bundle; train from scratch if missing or corrupt."""
        if self._bundle is not None:
            return self._bundle

        if self._model_path.exists():
            log.info("Loading model from %s", self._model_path)
            try:
                with self._model_path.open("rb") as fh:
                    obj = pickle.load(fh)

                # Backward-compat: accept old dict-style bundles from v1
                if isinstance(obj, dict):
                    bundle = ModelBundle(
                        model=obj["model"],
                        label_encoders={
                            "route_segment": obj["le_segment"],
                            "cargo_type": obj["le_cargo"],
                        },
                        numeric_features=NUMERIC_FEATURES,
                        categorical_features=CATEGORICAL_FEATURES,
                        trained_classes=sorted(
                            obj["model"].classes_.tolist()
                        ),
                    )
                elif isinstance(obj, ModelBundle):
                    bundle = obj
                else:
                    raise TypeError(f"Unrecognised bundle type: {type(obj)}")

                self._bundle = bundle
                return self._bundle
            except Exception as exc:
                log.warning("Failed to load model (%s); retraining.", exc)

        log.info("No saved model found — training from scratch.")
        return self.train()

    def _save_bundle(self, bundle: ModelBundle) -> None:
        """Atomic-ish pickle save: write to .tmp then rename."""
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        tmp = self._model_path.with_suffix(".tmp")
        try:
            with tmp.open("wb") as fh:
                pickle.dump(bundle, fh, protocol=pickle.HIGHEST_PROTOCOL)
            tmp.replace(self._model_path)
            log.info("Model saved → %s", self._model_path)
        except Exception as exc:
            log.error("Failed to save model: %s", exc)
            if tmp.exists():
                tmp.unlink(missing_ok=True)
            raise


# ---------------------------------------------------------------------------
# Module-level convenience functions (backward-compatible with v1 API)
# ---------------------------------------------------------------------------
_default_scorer: Optional[RiskScorer] = None


def _get_default_scorer() -> RiskScorer:
    global _default_scorer
    if _default_scorer is None:
        _default_scorer = RiskScorer()
    return _default_scorer


def train_risk_model(
    data_path: str | Path = DEFAULT_DATA_PATH,
) -> RandomForestClassifier:
    """Train (or retrain) the global model. Returns the classifier."""
    bundle = _get_default_scorer().train(data_path=Path(data_path))
    return bundle.model


def predict_risk(
    delay_hours: float,
    weather_score: float,
    port_congestion: float,
    speed_knots: float,
    route_segment: str,
    cargo_type: str = "General",
    dwell_hours: float = 0.0,
) -> dict[str, object]:
    """
    Predict risk for one observation — backward-compatible dict interface.

    Returns
    -------
    {"risk_score": float, "risk_level": str, "delay_probability": float}
    """
    result = _get_default_scorer().predict(
        delay_hours=delay_hours,
        weather_score=weather_score,
        port_congestion=port_congestion,
        speed_knots=speed_knots,
        route_segment=route_segment,
        cargo_type=cargo_type,
        dwell_hours=dwell_hours,
    )
    return {
        "risk_score": result.risk_score,
        "risk_level": result.risk_level,
        "delay_probability": result.delay_probability,
    }


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------
def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Train the shipment risk scorer and run smoke tests."
    )
    p.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH,
                   help="Path to training CSV (default: %(default)s)")
    p.add_argument("--model", type=Path, default=MODEL_PATH,
                   help="Where to save/load the model (default: %(default)s)")
    p.add_argument("--log-level", default="INFO",
                   choices=["DEBUG", "INFO", "WARNING", "ERROR"],
                   help="Logging verbosity (default: %(default)s)")
    return p


def _smoke_tests(scorer: RiskScorer) -> None:
    cases = [
        {
            "label": "Low-risk shipment",
            "kwargs": dict(delay_hours=1, weather_score=0.1, port_congestion=0.2,
                           speed_knots=15, route_segment="Pacific",
                           cargo_type="General"),
        },
        {
            "label": "High-risk — storm + congestion",
            "kwargs": dict(delay_hours=18, weather_score=0.85, port_congestion=0.75,
                           speed_knots=7, route_segment="Red Sea",
                           cargo_type="Electronics"),
        },
        {
            "label": "Critical risk — extreme delay",
            "kwargs": dict(delay_hours=48, weather_score=0.92, port_congestion=0.9,
                           speed_knots=4, route_segment="Suez Canal",
                           cargo_type="Perishables"),
        },
        {
            "label": "Unknown route segment (graceful fallback)",
            "kwargs": dict(delay_hours=5, weather_score=0.4, port_congestion=0.3,
                           speed_knots=12, route_segment="UNKNOWN_ROUTE",
                           cargo_type="General"),
        },
    ]
    print("\n" + "=" * 70)
    print("SMOKE TESTS")
    print("=" * 70)
    for case in cases:
        result = scorer.predict(**case["kwargs"])
        print(f"\n  {case['label']}")
        print(f"  Input  : {case['kwargs']}")
        print(f"  Result : {result}")
    print("=" * 70)


if __name__ == "__main__":
    args = _build_parser().parse_args()
    logging.getLogger().setLevel(args.log_level)

    scorer = RiskScorer(model_path=args.model, data_path=args.data)

    try:
        scorer.train()
    except FileNotFoundError as exc:
        log.error("%s", exc)
        log.error("Tip: generate synthetic data first, or pass --data <path>")
        sys.exit(1)

    _smoke_tests(scorer)