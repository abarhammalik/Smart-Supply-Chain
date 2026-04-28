import networkx as nx
import logging
from typing import Any

log = logging.getLogger(__name__)

ROUTE_GRAPH_DATA = [
    ("Shanghai","Singapore",{"weight":5,"distance_km":4450,"segment":"South China Sea"}),
    ("Singapore","Colombo",{"weight":3,"distance_km":1900,"segment":"Indian Ocean"}),
    ("Singapore","Mumbai",{"weight":5,"distance_km":3900,"segment":"Indian Ocean"}),
    ("Colombo","Mumbai",{"weight":2,"distance_km":1400,"segment":"Indian Ocean"}),
    ("Mumbai","Jeddah",{"weight":4,"distance_km":3200,"segment":"Arabian Sea"}),
    ("Jeddah","Suez Canal",{"weight":2,"distance_km":1800,"segment":"Red Sea"}),
    ("Suez Canal","Port Said",{"weight":1,"distance_km":195,"segment":"Suez Canal"}),
    ("Port Said","Rotterdam",{"weight":7,"distance_km":5200,"segment":"Mediterranean Sea"}),
    ("Mumbai","Cape Town",{"weight":10,"distance_km":8000,"segment":"Indian Ocean South"}),
    ("Colombo","Cape Town",{"weight":9,"distance_km":7200,"segment":"Indian Ocean South"}),
    ("Singapore","Cape Town",{"weight":14,"distance_km":10500,"segment":"Indian Ocean South"}),
    ("Cape Town","Rotterdam",{"weight":14,"distance_km":9700,"segment":"Atlantic Ocean"}),
    ("Rotterdam","Hamburg",{"weight":1,"distance_km":450,"segment":"North Sea"}),
    ("Shanghai","Los Angeles",{"weight":14,"distance_km":10250,"segment":"Pacific Ocean"}),
    ("Los Angeles","New York",{"weight":5,"distance_km":4900,"segment":"Panama Canal"}),
    ("New York","Rotterdam",{"weight":8,"distance_km":5800,"segment":"Atlantic Ocean"}),
    ("Singapore","Mombasa",{"weight":8,"distance_km":6100,"segment":"Indian Ocean"}),
    ("Mombasa","Cape Town",{"weight":6,"distance_km":4500,"segment":"Indian Ocean South"}),
    ("Mombasa","Jeddah",{"weight":4,"distance_km":2900,"segment":"Arabian Sea"}),
]

def _build_graph(blocked_segments=None):
    blocked = {s.strip().lower() for s in (blocked_segments or [])}
    G = nx.Graph()
    for u, v, data in ROUTE_GRAPH_DATA:
        if data["segment"].lower() not in blocked:
            G.add_edge(u, v, **data)
            G.add_edge(v, u, **data)
    return G

def find_optimal_route(origin, destination, blocked_segments=None):
    G = _build_graph(blocked_segments)
    all_ports = {u for u,v,_ in ROUTE_GRAPH_DATA} | {v for u,v,_ in ROUTE_GRAPH_DATA}
    if origin not in all_ports:
        raise KeyError(f"Unknown origin port: '{origin}'")
    if destination not in all_ports:
        raise KeyError(f"Unknown destination port: '{destination}'")
    try:
        path = nx.dijkstra_path(G, origin, destination, weight="weight")
        total_days = nx.dijkstra_path_length(G, origin, destination, weight="weight")
    except nx.NetworkXNoPath:
        raise ValueError(f"No available route from '{origin}' to '{destination}' with blocked: {blocked_segments}")
    segments_used, total_km = [], 0
    for i in range(len(path)-1):
        e = G[path[i]][path[i+1]]
        segments_used.append(e["segment"])
        total_km += e["distance_km"]
    return {"path":path,"total_days":total_days,"total_km":total_km,"segments":segments_used,"stops":len(path)-2}

def compare_routes(origin, destination, blocked_segments=None):
    blocked_segments = blocked_segments or []
    optimal = find_optimal_route(origin, destination, blocked_segments)
    baseline, diversion_info = None, None
    if blocked_segments:
        try:
            baseline = find_optimal_route(origin, destination, [])
        except:
            baseline = None
        if baseline:
            extra_days = optimal["total_days"] - baseline["total_days"]
            extra_km = optimal["total_km"] - baseline["total_km"]
            diversion_info = {"reason":f"Blocked: {', '.join(blocked_segments)}","extra_days":round(extra_days,1),"extra_km":round(extra_km),"recommendation":f"Divert via {' -> '.join(optimal['path'])} (+{extra_days} days)"}
    result = {"origin":origin,"destination":destination,"blocked_segments":blocked_segments,"recommended_route":{"path":optimal["path"],"waypoints":" -> ".join(optimal["path"]),"total_days":optimal["total_days"],"total_km":optimal["total_km"],"segments":optimal["segments"],"intermediate_stops":optimal["stops"]}}
    if baseline and blocked_segments:
        result["baseline_route"] = {"path":baseline["path"],"waypoints":" -> ".join(baseline["path"]),"total_days":baseline["total_days"],"total_km":baseline["total_km"]}
    if diversion_info:
        result["diversion"] = diversion_info
    return result
