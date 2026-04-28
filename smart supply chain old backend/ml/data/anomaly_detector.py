"""
route_optimizer.py
------------------
Graph-based shipping route optimisation using Dijkstra's algorithm.

Functions
---------
  find_optimal_route(origin, destination, blocked_segments) -> dict
  compare_routes(origin, destination, blocked_segments)     -> dict
"""

from __future__ import annotations

import logging
from typing import Any

import networkx as nx

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Shipping route graph
# Each edge has:
#   weight      — base transit days
#   distance_km — nautical distance
#   segment     — named route segment (used for blocking)
# ---------------------------------------------------------------------------
ROUTE_GRAPH_DATA: list[tuple[str, str, dict]] = [
    # Asia → Middle East
    ("Shanghai",   "Singapore",  {"weight": 5,  "distance_km": 4450,  "segment": "South China Sea"}),
    ("Singapore",  "Colombo",    {"weight": 3,  "distance_km": 1900,  "segment": "Indian Ocean"}),
    ("Singapore",  "Mumbai",     {"weight": 5,  "distance_km": 3900,  "segment": "Indian Ocean"}),
    ("Colombo",    "Mumbai",     {"weight": 2,  "distance_km": 1400,  "segment": "Indian Ocean"}),
    # Middle East routes
    ("Mumbai",     "Jeddah",     {"weight": 4,  "distance_km": 3200,  "segment": "Arabian Sea"}),
    ("Jeddah",     "Suez Canal", {"weight": 2,  "distance_km": 1800,  "segment": "Red Sea"}),
    ("Suez Canal", "Port Said",  {"weight": 1,  "distance_km": 195,   "segment": "Suez Canal"}),
    ("Port Said",  "Rotterdam",  {"weight": 7,  "distance_km": 5200,  "segment": "Mediterranean Sea"}),
    # Cape of Good Hope diversion
    ("Mumbai",     "Cape Town",  {"weight": 10, "distance_km": 8000,  "segment": "Indian Ocean South"}),
    ("Colombo",    "Cape Town",  {"weight": 9,  "distance_km": 7200,  "segment": "Indian Ocean South"}),
    ("Singapore",  "Cape Town",  {"weight": 14, "distance_km": 10500, "segment": "Indian Ocean South"}),
    ("Cape Town",  "Rotterdam",  {"weight": 14, "distance_km": 9700,  "segment": "Atlantic Ocean"}),
    # Europe internal
    ("Rotterdam",  "Hamburg",    {"weight": 1,  "distance_km": 450,   "segment": "North Sea"}),
    ("Rotterdam",  "Felixstowe", {"weight": 1,  "distance_km": 320,   "segment": "North Sea"}),
    # Americas
    ("Shanghai",   "Los Angeles",{"weight": 14, "distance_km": 10250, "segment": "Pacific Ocean"}),
    ("Los Angeles","Rotterdam",  {"weight": 20, "distance_km": 14000, "segment": "Atlantic Ocean"}),
    ("Los Angeles","New York",   {"weight": 5,  "distance_km": 4900,  "segment": "Panama Canal"}),
    ("New York",   "Rotterdam",  {"weight": 8,  "distance_km": 5800,  "segment": "Atlantic Ocean"}),
    # Africa east coast
    ("Singapore",  "Mombasa",    {"weight": 8,  "distance_km": 6100,  "segment": "Indian Ocean"}),
    ("Mombasa",    "Cape Town",  {"weight": 6,  "distance_km": 4500,  "segment": "Indian Ocean South"}),
    ("Mombasa",    "Jeddah",     {"weight": 4,  "distance_km": 2900,  "segment": "Arabian Sea"}),
]

# Port metadata for enriching responses
PORT_INFO: dict[str, dict] = {
    "Shanghai":    {"country": "China",        "region": "Asia Pacific"},
    "Singapore":   {"country": "Singapore",    "region": "Asia Pacific"},
    "Colombo":     {"country": "Sri Lanka",    "region": "South Asia"},
    "Mumbai":      {"country": "India",        "region": "South Asia"},
    "Jeddah":      {"country": "Saudi Arabia", "region": "Middle East"},
    "Suez Canal":  {"country": "Egypt",        "region": "Middle East"},
    "Port Said":   {"country": "Egypt",        "region": "Middle East"},
    "Rotterdam":   {"country": "Netherlands",  "region": "Europe"},
    "Hamburg":     {"country": "Germany",      "region": "Europe"},
    "Felixstowe":  {"country": "UK",           "region": "Europe"},
    "Cape Town":   {"country": "South Africa", "region": "Africa"},
    "Los Angeles": {"country": "USA",          "region": "Americas"},
    "New York":    {"country": "USA",          "region": "Americas"},
    "Mombasa":     {"country": "Kenya",        "region": "Africa"},
}


def _build_graph(blocked_segments: list[str] | None = None) -> nx.Graph:
    """Build an undirected weighted graph, optionally excluding blocked segments."""
    blocked = {s.strip().lower() for s in (blocked_segments or [])}
    G = nx.Graph()
    for u, v, data in ROUTE_GRAPH_DATA:
        if data["segment"].lower() not in blocked:
            G.add_edge(u, v, **data)
            G.add_edge(v, u, **data)  # bidirectional
    return G


def find_optimal_route(
    origin: str,
    destination: str,
    blocked_segments: list[str] | None = None,
) -> dict[str, Any]:
    """
    Find the shortest (fastest) route between two ports.

    Returns a dict with path, total_days, total_km, and segments used.
    Raises ValueError if no path exists.
    Raises KeyError if origin or destination is unknown.
    """
    G = _build_graph(blocked_segments)

    known_ports = {n for n, _ in ROUTE_GRAPH_DATA for n in [_, _]}
    all_ports = {u for u, v, _ in ROUTE_GRAPH_DATA} | {v for u, v, _ in ROUTE_GRAPH_DATA}

    if origin not in all_ports:
        raise KeyError(f"Unknown origin port: '{origin}'")
    if destination not in all_ports:
        raise KeyError(f"Unknown destination port: '{destination}'")

    try:
        path = nx.dijkstra_path(G, origin, destination, weight="weight")
        total_days = nx.dijkstra_path_length(G, origin, destination, weight="weight")
    except nx.NetworkXNoPath:
        raise ValueError(
            f"No available route from '{origin}' to '{destination}' "
            f"with blocked segments: {blocked_segments}"
        )
    except nx.NodeNotFound as e:
        raise KeyError(str(e))

    # Collect edge details along the path
    segments_used = []
    total_km = 0
    for i in range(len(path) - 1):
        edge_data = G[path[i]][path[i + 1]]
        segments_used.append(edge_data["segment"])
        total_km += edge_data["distance_km"]

    return {
        "path": path,
        "total_days": total_days,
        "total_km": total_km,
        "segments": segments_used,
        "stops": len(path) - 2,  # intermediate ports
    }


def compare_routes(
    origin: str,
    destination: str,
    blocked_segments: list[str] | None = None,
) -> dict[str, Any]:
    """
    Compare the optimal route with and without blocked segments.

    This is the primary function called by api.py.
    Returns the recommended route plus context about any diversion.
    """
    blocked_segments = blocked_segments or []

    # Find optimal route with blocked segments applied
    optimal = find_optimal_route(origin, destination, blocked_segments)

    # Also find the unconstrained baseline (no blocks) for comparison
    baseline = None
    diversion_info = None

    if blocked_segments:
        try:
            baseline = find_optimal_route(origin, destination, blocked_segments=[])
        except (ValueError, KeyError):
            baseline = None

        if baseline:
            extra_days = optimal["total_days"] - baseline["total_days"]
            extra_km = optimal["total_km"] - baseline["total_km"]
            avoided = [s for s in baseline["segments"] if s in blocked_segments]

            diversion_info = {
                "reason": f"Blocked segments: {', '.join(blocked_segments)}",
                "avoided_segments": avoided,
                "extra_days": round(extra_days, 1),
                "extra_km": round(extra_km),
                "recommendation": (
                    f"Divert via {' → '.join(optimal['path'])} "
                    f"(+{extra_days} days, +{extra_km:,} km)"
                    if extra_days > 0
                    else "No significant delay — alternative route available"
                ),
            }

    result: dict[str, Any] = {
        "origin": origin,
        "destination": destination,
        "blocked_segments": blocked_segments,
        "recommended_route": {
            "path": optimal["path"],
            "waypoints": " → ".join(optimal["path"]),
            "total_days": optimal["total_days"],
            "total_km": optimal["total_km"],
            "segments": optimal["segments"],
            "intermediate_stops": optimal["stops"],
        },
    }

    if baseline and blocked_segments:
        result["baseline_route"] = {
            "path": baseline["path"],
            "waypoints": " → ".join(baseline["path"]),
            "total_days": baseline["total_days"],
            "total_km": baseline["total_km"],
        }

    if diversion_info:
        result["diversion"] = diversion_info

    log.info(
        "Route %s→%s: %d days, %d km, %d stops (blocked: %s)",
        origin, destination,
        optimal["total_days"], optimal["total_km"], optimal["stops"],
        blocked_segments or "none",
    )

    return result


# ---------------------------------------------------------------------------
# CLI test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=== Normal route: Mumbai → Rotterdam ===")
    r = compare_routes("Mumbai", "Rotterdam")
    print(f"Path: {r['recommended_route']['waypoints']}")
    print(f"Days: {r['recommended_route']['total_days']}")
    print(f"KM:   {r['recommended_route']['total_km']}")

    print("\n=== Scenario A: Red Sea + Suez Canal blocked ===")
    r2 = compare_routes("Mumbai", "Rotterdam", ["Red Sea", "Suez Canal"])
    print(f"Path: {r2['recommended_route']['waypoints']}")
    print(f"Days: {r2['recommended_route']['total_days']}")
    if "diversion" in r2:
        print(f"Extra days: {r2['diversion']['extra_days']}")
        print(f"Recommendation: {r2['diversion']['recommendation']}")

    print("\n=== Singapore → Rotterdam (no blocks) ===")
    r3 = compare_routes("Singapore", "Rotterdam")
    print(f"Path: {r3['recommended_route']['waypoints']}")
    print(f"Days: {r3['recommended_route']['total_days']}")