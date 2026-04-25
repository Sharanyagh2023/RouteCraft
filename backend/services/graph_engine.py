import csv
import heapq
import os
import threading
from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt
from typing import Any, Dict, List, Optional, Tuple

import networkx as nx


TRANSFER_PENALTY_MINUTES = 15.0
WALK_SPEED_KMPH = 5.0
AUTO_SPEED_KMPH = 25.0
AUTO_BASE_FARE = 10.0
AUTO_PER_KM_FARE = 8.0


@dataclass
class EdgeInfo:
    to_node: str
    time: float
    cost: float
    mode: str


class GraphBuilder:
    """Builds and caches a directed transit graph from GTFS files."""

    _instance: Optional["GraphBuilder"] = None
    _lock = threading.Lock()

    def __init__(self, data_dir: Optional[str] = None) -> None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.data_dir = data_dir or os.path.join(base_dir, "data")
        self.graph: nx.DiGraph = nx.DiGraph()
        self.stop_coords: Dict[str, Tuple[float, float]] = {}
        self._build_graph()

    @classmethod
    def get_instance(cls, data_dir: Optional[str] = None) -> "GraphBuilder":
        """Singleton accessor to avoid rebuilding graph per request."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls(data_dir=data_dir)
        return cls._instance

    def _build_graph(self) -> None:
        routes_path = os.path.join(self.data_dir, "routes.txt")
        trips_path = os.path.join(self.data_dir, "trips.txt")
        stops_path = os.path.join(self.data_dir, "stops.txt")
        stop_times_path = os.path.join(self.data_dir, "stop_times.txt")

        route_modes = self._load_route_modes(routes_path)
        trip_route_map = self._load_trip_routes(trips_path)
        self._load_stops(stops_path)
        self._load_transit_edges(stop_times_path, trip_route_map, route_modes)

        print(f"Loaded stops: {self.graph.number_of_nodes()}")
        print(f"Created edges: {self.graph.number_of_edges()}")
        print("Graph successfully built")

    def _load_route_modes(self, routes_path: str) -> Dict[str, str]:
        route_modes: Dict[str, str] = {}
        with open(routes_path, "r", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                route_id = row.get("route_id")
                if not route_id:
                    continue
                route_type = row.get("route_type", "")
                route_modes[route_id] = self._route_type_to_mode(route_type)
        return route_modes

    def _load_trip_routes(self, trips_path: str) -> Dict[str, str]:
        trip_route_map: Dict[str, str] = {}
        with open(trips_path, "r", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                trip_id = row.get("trip_id")
                route_id = row.get("route_id")
                if trip_id and route_id:
                    trip_route_map[trip_id] = route_id
        return trip_route_map

    def _load_stops(self, stops_path: str) -> None:
        with open(stops_path, "r", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                stop_id = row.get("stop_id")
                lat_raw = row.get("stop_lat")
                lon_raw = row.get("stop_lon")
                if not stop_id or lat_raw is None or lon_raw is None:
                    continue
                try:
                    lat = float(lat_raw)
                    lon = float(lon_raw)
                except ValueError:
                    continue
                self.graph.add_node(stop_id, lat=lat, lon=lon)
                self.stop_coords[stop_id] = (lat, lon)

    def _load_transit_edges(
        self,
        stop_times_path: str,
        trip_route_map: Dict[str, str],
        route_modes: Dict[str, str],
    ) -> None:
        trip_rows: Dict[str, List[Dict[str, str]]] = {}

        with open(stop_times_path, "r", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                trip_id = row.get("trip_id")
                if not trip_id:
                    continue
                trip_rows.setdefault(trip_id, []).append(row)

        for trip_id, rows in trip_rows.items():
            rows.sort(key=lambda item: int(item.get("stop_sequence", "0") or "0"))
            route_id = trip_route_map.get(trip_id, "")
            mode = route_modes.get(route_id, "bus")

            for index in range(len(rows) - 1):
                current = rows[index]
                nxt = rows[index + 1]
                from_stop = current.get("stop_id")
                to_stop = nxt.get("stop_id")
                if not from_stop or not to_stop:
                    continue
                if from_stop not in self.graph or to_stop not in self.graph:
                    continue

                current_departure = self._parse_time_to_minutes(current.get("departure_time", "00:00:00"))
                next_arrival = self._parse_time_to_minutes(nxt.get("arrival_time", "00:00:00"))
                travel_time = max(1.0, next_arrival - current_departure)
                default_cost = float(current.get("fare", "10") or "10")

                existing = self.graph.get_edge_data(from_stop, to_stop)
                if existing and float(existing.get("time", 999999)) <= travel_time:
                    continue

                self.graph.add_edge(
                    from_stop,
                    to_stop,
                    time=travel_time,
                    cost=default_cost,
                    mode=mode,
                )

    @staticmethod
    def _route_type_to_mode(route_type: str) -> str:
        try:
            rt = int(route_type)
        except (ValueError, TypeError):
            return "bus"
        if rt == 1:
            return "metro"
        if rt == 3:
            return "bus"
        return "bus"

    @staticmethod
    def _parse_time_to_minutes(raw: str) -> float:
        parts = raw.split(":")
        if len(parts) != 3:
            return 0.0
        try:
            hour = int(parts[0])
            minute = int(parts[1])
            second = int(parts[2])
        except ValueError:
            return 0.0
        return float(hour * 60 + minute + (second / 60.0))


class RouteEngine:
    """Multi-modal route planner with virtual first/last mile edges."""

    def __init__(self, builder: Optional[GraphBuilder] = None) -> None:
        self.builder = builder or GraphBuilder.get_instance()
        self.graph = self.builder.graph
        self.stop_coords = self.builder.stop_coords

    def calculate_routes(
        self,
        origin_lat: float,
        origin_lng: float,
        destination_lat: float,
        destination_lng: float,
    ) -> Dict[str, Any]:
        origin_candidates = self._nearest_stops(origin_lat, origin_lng, 3, 1.0)
        destination_candidates = self._nearest_stops(destination_lat, destination_lng, 3, 1.0)

        if not origin_candidates or not destination_candidates:
            return self._no_route_payload()

        fastest = self._run_dijkstra(
            origin_candidates,
            destination_candidates,
            objective="fastest",
        )
        cheapest = self._run_dijkstra(
            origin_candidates,
            destination_candidates,
            objective="cheapest",
        )
        optimal = self._run_dijkstra(
            origin_candidates,
            destination_candidates,
            objective="optimal",
        )

        if fastest is None and cheapest is None and optimal is None:
            return self._no_route_payload()

        return {
            "fastest": fastest,
            "cheapest": cheapest,
            "optimal": optimal,
        }

    def _run_dijkstra(
        self,
        origin_candidates: List[Tuple[str, float]],
        destination_candidates: List[Tuple[str, float]],
        objective: str,
    ) -> Optional[Dict[str, Any]]:
        start_state = ("__origin__", "none")
        pq: List[Tuple[float, str, str]] = [(0.0, start_state[0], start_state[1])]
        best: Dict[Tuple[str, str], float] = {start_state: 0.0}
        prev: Dict[Tuple[str, str], Tuple[str, str, str, float, float]] = {}
        metrics: Dict[Tuple[str, str], Tuple[float, float, int]] = {start_state: (0.0, 0.0, 0)}

        destination_set = {stop_id for stop_id, _ in destination_candidates}

        while pq:
            weight, node, current_mode = heapq.heappop(pq)
            state = (node, current_mode)
            if weight > best.get(state, float("inf")):
                continue
            if node == "__destination__":
                return self._reconstruct_route(prev, metrics, state)

            for edge in self._iter_neighbors(
                node=node,
                origin_candidates=origin_candidates,
                destination_candidates=destination_candidates,
                destination_set=destination_set,
            ):
                is_switch = current_mode != "none" and current_mode != edge.mode
                switch_penalty = TRANSFER_PENALTY_MINUTES if is_switch else 0.0

                travel_time, total_cost, switches = metrics[state]
                next_travel_time = travel_time + edge.time + switch_penalty
                next_cost = total_cost + edge.cost
                next_switches = switches + (1 if is_switch else 0)

                if objective == "fastest":
                    edge_weight = edge.time + switch_penalty
                elif objective == "cheapest":
                    edge_weight = edge.cost
                else:
                    edge_weight = edge.time + (2 * switch_penalty)

                next_weight = weight + edge_weight
                next_state = (edge.to_node, edge.mode)

                if next_weight < best.get(next_state, float("inf")):
                    best[next_state] = next_weight
                    metrics[next_state] = (next_travel_time, next_cost, next_switches)
                    prev[next_state] = (node, current_mode, edge.mode, edge.time, edge.cost)
                    heapq.heappush(pq, (next_weight, edge.to_node, edge.mode))

        return None

    def _iter_neighbors(
        self,
        node: str,
        origin_candidates: List[Tuple[str, float]],
        destination_candidates: List[Tuple[str, float]],
        destination_set: set,
    ) -> List[EdgeInfo]:
        if node == "__origin__":
            edges: List[EdgeInfo] = []
            for stop_id, distance_km in origin_candidates:
                edges.append(
                    EdgeInfo(
                        to_node=stop_id,
                        time=(distance_km / WALK_SPEED_KMPH) * 60.0,
                        cost=0.0,
                        mode="walk",
                    )
                )
                edges.append(
                    EdgeInfo(
                        to_node=stop_id,
                        time=(distance_km / AUTO_SPEED_KMPH) * 60.0,
                        cost=AUTO_BASE_FARE + (AUTO_PER_KM_FARE * distance_km),
                        mode="auto",
                    )
                )
            return edges

        if node == "__destination__":
            return []

        edges = []
        for neighbor in self.graph.successors(node):
            data = self.graph[node][neighbor]
            edges.append(
                EdgeInfo(
                    to_node=neighbor,
                    time=float(data.get("time", 1.0)),
                    cost=float(data.get("cost", 10.0)),
                    mode=str(data.get("mode", "bus")),
                )
            )

        if node in destination_set:
            destination_lookup = {stop_id: distance_km for stop_id, distance_km in destination_candidates}
            distance_km = destination_lookup[node]
            edges.append(
                EdgeInfo(
                    to_node="__destination__",
                    time=(distance_km / WALK_SPEED_KMPH) * 60.0,
                    cost=0.0,
                    mode="walk",
                )
            )
            edges.append(
                EdgeInfo(
                    to_node="__destination__",
                    time=(distance_km / AUTO_SPEED_KMPH) * 60.0,
                    cost=AUTO_BASE_FARE + (AUTO_PER_KM_FARE * distance_km),
                    mode="auto",
                )
            )
        return edges

    def _reconstruct_route(
        self,
        prev: Dict[Tuple[str, str], Tuple[str, str, str, float, float]],
        metrics: Dict[Tuple[str, str], Tuple[float, float, int]],
        final_state: Tuple[str, str],
    ) -> Dict[str, Any]:
        path_nodes: List[str] = []
        modes: List[str] = []
        state = final_state

        while state in prev:
            from_node, from_mode, edge_mode, _, _ = prev[state]
            if state[0] != "__destination__":
                path_nodes.append(state[0])
            modes.append(edge_mode)
            state = (from_node, from_mode)

        path_nodes.reverse()
        modes.reverse()
        total_time, total_cost, _ = metrics[final_state]

        return {
            "total_time": round(total_time, 2),
            "total_cost": round(total_cost, 2),
            "path": path_nodes,
            "modes": modes,
        }

    def _nearest_stops(
        self,
        lat: float,
        lng: float,
        limit: int,
        max_distance_km: float,
    ) -> List[Tuple[str, float]]:
        candidates: List[Tuple[str, float]] = []
        for stop_id, (stop_lat, stop_lng) in self.stop_coords.items():
            dist = self._haversine_km(lat, lng, stop_lat, stop_lng)
            if dist <= max_distance_km:
                candidates.append((stop_id, dist))
        candidates.sort(key=lambda item: item[1])
        return candidates[:limit]

    @staticmethod
    def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        earth_radius_km = 6371.0
        d_lat = radians(lat2 - lat1)
        d_lon = radians(lon2 - lon1)
        a = (
            sin(d_lat / 2) ** 2
            + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
        )
        c = 2 * asin(sqrt(a))
        return earth_radius_km * c

    @staticmethod
    def _no_route_payload() -> Dict[str, Any]:
        return {
            "message": "No route found",
            "fastest": None,
            "cheapest": None,
            "optimal": None,
        }
