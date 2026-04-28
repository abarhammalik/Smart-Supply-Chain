import numpy as np
import pandas as pd
from faker import Faker
import os

fake = Faker()
np.random.seed(42)
os.makedirs("ml/data", exist_ok=True)

N = 5000

ROUTE_SEGMENTS = ["Suez Canal", "Strait of Malacca", "Cape of Good Hope", 
                  "English Channel", "Red Sea", "Arabian Sea", 
                  "South China Sea", "Pacific", "Atlantic", "Indian Ocean",
                  "North Atlantic", "Mediterranean", "Yellow Sea", "Open Ocean"]

CARGO_TYPES = ["Electronics", "Perishables", "Chemicals", "General", "Automotive"]

HIGH_RISK_SEGMENTS = ["Suez Canal", "Strait of Malacca", "Red Sea"]

def generate_dataset():
    rows = []
    for _ in range(N):
        segment = np.random.choice(ROUTE_SEGMENTS)
        cargo = np.random.choice(CARGO_TYPES)
        
        # Base metrics
        speed_knots = np.random.normal(14, 3)
        speed_knots = np.clip(speed_knots, 0, 25)
        
        expected_dwell = np.random.choice([2, 4, 6, 8])
        dwell_hours = np.random.exponential(expected_dwell)
        
        # Weather score: higher in dangerous segments
        if segment in HIGH_RISK_SEGMENTS:
            weather_score = np.random.beta(3, 2)  # skewed higher
        else:
            weather_score = np.random.beta(1, 4)  # mostly low
        weather_score = np.clip(weather_score, 0, 1)
        
        # Port congestion: higher in busy hubs
        port_congestion = np.random.beta(2, 5)
        port_congestion = np.clip(port_congestion, 0, 1)
        
        # Delay hours: driven by weather + congestion + slow speed
        base_delay = 0
        if weather_score > 0.6: base_delay += np.random.exponential(12)
        if port_congestion > 0.7: base_delay += np.random.exponential(8)
        if speed_knots < 8: base_delay += np.random.exponential(6)
        delay_hours = np.clip(base_delay + np.random.exponential(2), 0, 96)
        
        # Perishables are more sensitive to delays
        if cargo == "Perishables" and delay_hours > 0:
            delay_hours *= 1.3
        
        # Labels
        is_delayed = 1 if delay_hours > 4 else 0
        
        # Anomaly: near-stopped OR extreme dwell
        is_anomaly = 1 if (speed_knots < 3 and dwell_hours > 10) or (dwell_hours > expected_dwell * 4) else 0
        
        # Risk level: 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL
        risk_score_raw = (
            min(delay_hours / 72, 1) * 0.4 +
            weather_score * 0.3 +
            port_congestion * 0.2 +
            (1 - speed_knots / 25) * 0.1
        )
        if risk_score_raw >= 0.85: risk_level = 3  # CRITICAL
        elif risk_score_raw >= 0.65: risk_level = 2  # HIGH
        elif risk_score_raw >= 0.4: risk_level = 1   # MEDIUM
        else: risk_level = 0                          # LOW
        
        rows.append({
            "speed_knots": round(speed_knots, 2),
            "dwell_hours": round(dwell_hours, 2),
            "expected_dwell_hours": float(expected_dwell),
            "delay_hours": round(delay_hours, 2),
            "weather_score": round(weather_score, 3),
            "port_congestion": round(port_congestion, 3),
            "route_segment": segment,
            "cargo_type": cargo,
            "is_delayed": is_delayed,
            "is_anomaly": is_anomaly,
            "risk_level": risk_level
        })
    
    df = pd.DataFrame(rows)
    df.to_csv("ml/data/synthetic_shipments.csv", index=False)
    
    print(f"Dataset generated: {len(df)} rows")
    print(f"Risk distribution: {df['risk_level'].value_counts().to_dict()}")
    print(f"Anomaly rate: {df['is_anomaly'].mean():.1%}")
    print(f"Delay rate: {df['is_delayed'].mean():.1%}")
    return df

if __name__ == "__main__":
    df = generate_dataset()
    print(df.head())