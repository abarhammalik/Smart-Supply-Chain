"""
Run these to trigger the 3 demo scenarios during the presentation.

Usage:
  python ml/demo_scenarios.py --scenario A      # Cyclone
  python ml/demo_scenarios.py --scenario B      # Port strike
  python ml/demo_scenarios.py --scenario C      # Hidden bottleneck
  python ml/demo_scenarios.py --scenario NORMAL # Reset
"""

import argparse
import json

# These are the data values that the producer should override
# Write them to a file that kafka_producer.py reads

SCENARIOS = {
    "A": {
        "name": "Cyclone Sheela — Red Sea / Suez Canal Closure",
        "description": "Extreme weather blocking primary route for 12 vessels",
        "overrides": {
            "affected_segments": ["Red Sea", "Arabian Sea", "Suez Canal"],
            "weather_score": 0.93,
            "delay_hours": 48,
            "port_congestion": 0.3,
            "speed_knots": 5,
        },
        "expected_outcome": {
            "alerts": "12 CRITICAL alerts firing",
            "route": "System recommends Cape of Good Hope diversion",
            "time_saved": "18 hours vs waiting for canal reopening",
        },
        "talking_points": [
            "Cyclone detected 72 hours in advance on Red Sea route",
            "12 vessels automatically flagged CRITICAL",
            "Dijkstra algorithm finds Cape of Good Hope route in milliseconds",
            "Alternative adds 3 days but guarantees delivery vs indefinite wait",
        ],
    },
    "B": {
        "name": "Singapore Port Strike — Operational Bottleneck",
        "description": "Port congestion spike creating cascading dwell time anomalies",
        "overrides": {
            "affected_origins": ["Singapore"],
            "affected_destinations": ["Singapore"],
            "port_congestion": 0.92,
            "dwell_hours": 22,
            "expected_dwell_hours": 4,
            "weather_score": 0.1,
            "speed_knots": 13,
        },
        "expected_outcome": {
            "alerts": "8 HIGH alerts + anomaly flags",
            "route": "Colombo rerouting recommended for Singapore-bound vessels",
            "detection": "Pattern detected 6 hours before first ETA breach",
        },
        "talking_points": [
            "Isolation Forest detects abnormal dwell times across 8 vessels simultaneously",
            "Pattern recognition: all 8 share Singapore as waypoint",
            "Risk scorer elevates to HIGH even without weather event",
            "Classic cascading bottleneck — caught at stage 1 not stage 3",
        ],
    },
    "C": {
        "name": "Ghost Shipment — SHP-034 Hidden Anomaly",
        "description": "Single vessel near-stationary for 22 hours — undetected customs issue",
        "overrides": {
            "affected_shipment_id": "SHP-034",
            "speed_knots": 1.2,
            "dwell_hours": 22,
            "expected_dwell_hours": 4,
            "delay_hours": 0,        # No obvious delay yet — that's the trick
            "weather_score": 0.08,   # Clear weather — no external reason
            "port_congestion": 0.15, # Normal port — no external reason
        },
        "expected_outcome": {
            "alerts": "1 ANOMALY alert for SHP-034 specifically",
            "detection": "Isolation Forest flags it before delay accumulates",
            "investigation": "Would reveal unscanned cargo at customs",
        },
        "talking_points": [
            "No weather event. No port congestion. No obvious cause.",
            "Traditional alert: fires only after 4+ hour delay breach",
            "Our system: fires when BEHAVIOR is anomalous — 22hrs dwell vs 4hr expected",
            "Isolation Forest compares this ship vs all 49 active ships' patterns",
            "Detected 8+ hours before the delay would appear in any KPI report",
        ],
    },
    "NORMAL": {
        "name": "Normal Operations — Reset",
        "description": "All scenarios cleared, return to normal simulation",
        "overrides": {},
    },
}


def run_scenario(scenario_key: str):
    scenario = SCENARIOS.get(scenario_key.upper())
    if not scenario:
        print(f"Unknown scenario. Use: A, B, C, or NORMAL")
        return

    print(f"\n{'='*60}")
    print(f"ACTIVATING SCENARIO {scenario_key}: {scenario['name']}")
    print(f"{'='*60}")
    print(f"Description: {scenario['description']}")

    if "expected_outcome" in scenario:
        print("\nExpected on dashboard:")
        for k, v in scenario["expected_outcome"].items():
            print(f"  {k}: {v}")

    if "talking_points" in scenario:
        print("\nTalking points for judges:")
        for tp in scenario["talking_points"]:
            print(f"  - {tp}")

    # Write scenario to file for producer to pick up
    with open(".active_scenario", "w") as f:
        json.dump(
            {"scenario": scenario_key, "overrides": scenario.get("overrides", {})}, f
        )

    print(f"\nScenario activated. Changes visible on dashboard in ~10 seconds.")
    print("Press Ctrl+C to stop or run NORMAL to reset.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default="NORMAL", help="A, B, C, or NORMAL")
    args = parser.parse_args()
    run_scenario(args.scenario)