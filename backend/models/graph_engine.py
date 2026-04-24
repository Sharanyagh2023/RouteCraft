"""
Multi-Modal Graph-Based Routing Engine

Uses NetworkX DiGraph to model bus, metro, and walk networks
with transfer edges between nearby stops.
"""

import networkx as nx
from typing import Dict, List, Any, Optional, Tuple


class MultiModalGraph:
    """
    Graph engine for multi-modal routing (bus + metro + walk).
    
    Edge attributes:
        - mode: 'bus' | 'metro' | 'walk' | 'transfer'
        - weight: time cost (minutes)
        - cost: monetary cost (INR)
        - distance: distance in km
    """

    def __init__(self):
        self.G = nx.DiGraph()
        self._build_network()
        self._add_transfers()

    def _add_edge(self, u: str, v: str, mode: str, weight: float, cost: float, distance: float = 0.0):
        """Add a directed edge with multi-modal attributes."""
        self.G.add_edge(u, v, mode=mode, weight=weight, cost=cost, distance=distance)

    def _build_network(self):
        """Build a representative transit network (Bangalore-centric)."""
        # ============================================================
        # METRO (Purple Line)
        # weight=5 min/km, cost=10 INR/km
        # ============================================================
        purple_line = [
            ("Whitefield", "Kadugodi", 1.2),
            ("Kadugodi", "Hope Farm", 1.5),
            ("Hope Farm", "ITPL", 1.8),
            ("ITPL", "Phoenix Market City", 2.0),
            ("Phoenix Market City", "KR Puram", 2.5),
            ("KR Puram", "Baiyappanahalli", 2.2),
            ("Baiyappanahalli", "Swami Vivekananda Road", 1.4),
            ("Swami Vivekananda Road", "Indiranagar", 1.6),
            ("Indiranagar", "Halasuru", 1.3),
            ("Halasuru", "MG Road", 1.5),
            ("MG Road", "Cubbon Park", 1.2),
            ("Cubbon Park", "Vidhana Soudha", 1.0),
            ("Vidhana Soudha", "Sir M Visvesvaraya", 1.1),
            ("Sir M Visvesvaraya", "Krantivira Sangolli Rayanna", 1.3),
            ("Krantivira Sangolli Rayanna", "Magadi Road", 1.7),
            ("Magadi Road", "Balagangadharanatha Swamiji", 2.0),
            ("Balagangadharanatha Swamiji", "Vijayanagar", 1.8),
            ("Vijayanagar", "Attiguppe", 1.4),
            ("Attiguppe", "Deepanjali Nagar", 1.5),
            ("Deepanjali Nagar", "Mysore Road", 1.6),
        ]
        for u, v, dist in purple_line:
            self._add_edge(u, v, "metro", weight=dist * 5, cost=dist * 10, distance=dist)
            self._add_edge(v, u, "metro", weight=dist * 5, cost=dist * 10, distance=dist)

        # ============================================================
        # METRO (Green Line)
        # ============================================================
        green_line = [
            ("Silk Institute", "Thalaghattapura", 1.5),
            ("Thalaghattapura", "Vajarahalli", 1.3),
            ("Vajarahalli", "Doddakallasandra", 1.6),
            ("Doddakallasandra", "Konankunte Cross", 1.4),
            ("Konankunte Cross", "Yelachenahalli", 1.5),
            ("Yelachenahalli", "Jayaprakash Nagar", 1.3),
            ("Jayaprakash Nagar", "Banashankari", 1.4),
            ("Banashankari", "Rashtreeya Vidyalaya Road", 1.5),
            ("Rashtreeya Vidyalaya Road", "Jayanagar", 1.2),
            ("Jayanagar", "South End Circle", 1.0),
            ("South End Circle", "Lalbagh", 1.3),
            ("Lalbagh", "National College", 1.1),
            ("National College", "KR Market", 1.4),
            ("KR Market", "Chickpete", 1.0),
            ("Chickpete", "Krantivira Sangolli Rayanna", 1.2),
            ("Krantivira Sangolli Rayanna", "Nadaprabhu Kempegowda Majestic", 0.8),
            ("Nadaprabhu Kempegowda Majestic", "Sampige Road", 1.0),
            ("Sampige Road", "Srirampura", 1.2),
            ("Srirampura", "Mahakavi Kuvempu Road", 1.3),
            ("Mahakavi Kuvempu Road", "Rajajinagar", 1.1),
            ("Rajajinagar", "Mahalakshmi", 1.4),
            ("Mahalakshmi", "Sandal Soap Factory", 1.2),
            ("Sandal Soap Factory", "Yeshwanthpur", 1.5),
            ("Yeshwanthpur", "Goraguntepalya", 1.8),
            ("Goraguntepalya", "Peenya", 2.0),
            ("Peenya", "Peenya Industry", 1.5),
            ("Peenya Industry", "Jalahalli", 1.6),
            ("Jalahalli", "Dasarahalli", 1.4),
            ("Dasarahalli", "Nagasandra", 1.5),
        ]
        for u, v, dist in green_line:
            self._add_edge(u, v, "metro", weight=dist * 5, cost=dist * 10, distance=dist)
            self._add_edge(v, u, "metro", weight=dist * 5, cost=dist * 10, distance=dist)

        # ============================================================
        # BUS (BMTC trunk routes)
        # weight=10 min/km, cost=5 INR/km
        # ============================================================
        bus_routes = [
            # Outer Ring Road bus corridor
            ("Marathahalli", "Kadubeesanahalli", 2.0),
            ("Kadubeesanahalli", "Bellandur", 2.5),
            ("Bellandur", "Devarabeesanahalli", 1.8),
            ("Devarabeesanahalli", "Eco Space", 1.5),
            ("Eco Space", "Doddanekundi", 2.2),
            ("Doddanekundi", "Mahadevapura", 1.9),
            ("Mahadevapura", "KR Puram", 2.3),
            # Hosur Road bus corridor
            ("Silk Board", "HSR Layout", 2.0),
            ("HSR Layout", "Agara", 1.8),
            ("Agara", "Iblur", 2.1),
            ("Iblur", "Bellandur", 1.9),
            # Old Airport Road
            ("Domlur", "Indiranagar", 2.2),
            ("Indiranagar", "GM Palya", 1.7),
            ("GM Palya", "Vimanapura", 2.0),
            ("Vimanapura", "KR Puram", 2.5),
            # Koramangala connections
            ("Koramangala", "HSR Layout", 2.8),
            ("Koramangala", "Sony World Signal", 1.5),
            ("Sony World Signal", "Indiranagar", 2.3),
            # CBD connections
            ("MG Road", "Cubbon Park", 1.5),
            ("MG Road", "Trinity", 1.2),
            ("Trinity", "Domlur", 2.0),
            ("Shivajinagar", "MG Road", 1.8),
            ("Shivajinagar", "Commercial Street", 1.2),
            ("Commercial Street", "Cubbon Park", 1.5),
            # West Bangalore
            ("Vijayanagar", "Nagarabhavi", 2.5),
            ("Nagarabhavi", "Kengeri", 3.0),
            # North Bangalore
            ("Hebbal", "Yeshwanthpur", 3.5),
            ("Hebbal", "KR Puram", 4.0),
            # South Bangalore
            ("Jayanagar", "Banashankari", 2.2),
            ("Jayanagar", "JP Nagar", 1.8),
            ("JP Nagar", "Bannerghatta Road", 2.5),
        ]
        for u, v, dist in bus_routes:
            self._add_edge(u, v, "bus", weight=dist * 10, cost=dist * 5, distance=dist)
            self._add_edge(v, u, "bus", weight=dist * 10, cost=dist * 5, distance=dist)

        # ============================================================
        # WALK (short connectors + grid)
        # weight=5 min/km (12 min walking per km), cost=0
        # ============================================================
        walk_links = [
            ("HSR Layout", "Koramangala", 2.5),
            ("HSR Layout", "Bellandur", 3.0),
            ("Koramangala", "Sony World Signal", 1.2),
            ("Sony World Signal", "Domlur", 1.8),
            ("Domlur", "Indiranagar", 2.0),
            ("Indiranagar", "Halasuru", 1.5),
            ("MG Road", "Shivajinagar", 2.0),
            ("MG Road", "Trinity", 1.0),
            ("Jayanagar", "Lalbagh", 2.2),
            ("Lalbagh", "National College", 1.0),
            ("Banashankari", "Jayaprakash Nagar", 1.5),
            ("Banashankari", "Jayanagar", 2.0),
            ("KR Puram", "Mahadevapura", 2.0),
            ("Marathahalli", "Bellandur", 2.8),
            ("Whitefield", "ITPL", 3.0),
            ("Yeshwanthpur", "Rajajinagar", 2.0),
            ("Nadaprabhu Kempegowda Majestic", "KR Market", 1.5),
            ("Peenya", "Yeshwanthpur", 3.5),
            ("Hebbal", "Yeshwanthpur", 3.5),
            ("Vijayanagar", "Attiguppe", 1.5),
            ("JP Nagar", "Jayanagar", 1.8),
        ]
        for u, v, dist in walk_links:
            self._add_edge(u, v, "walk", weight=dist * 12, cost=0.0, distance=dist)
            self._add_edge(v, u, "walk", weight=dist * 12, cost=0.0, distance=dist)

    def _add_transfers(self):
        """
        Add transfer edges between stops of different modes that are
        physically close (within ~500m). Transfers cost time but no money.
        """
        # (stop_name, mode) -> list of nearby (stop_name, mode, walk_minutes)
        transfers = [
            # Metro <-> Metro interchange
            ("Krantivira Sangolli Rayanna", "Nadaprabhu Kempegowda Majestic", 3),
            # Metro <-> Bus
            ("Indiranagar", "Domlur", 4),
            ("MG Road", "Shivajinagar", 5),
            ("Baiyappanahalli", "KR Puram", 6),
            ("Jayanagar", "Jayanagar", 2),
            ("Banashankari", "Banashankari", 2),
            ("Yeshwanthpur", "Yeshwanthpur", 2),
            ("Vijayanagar", "Vijayanagar", 2),
            ("KR Puram", "KR Puram", 2),
            # Bus <-> Bus same stop (effectively zero-cost transfer)
            ("HSR Layout", "HSR Layout", 1),
            ("Koramangala", "Koramangala", 1),
            ("Bellandur", "Bellandur", 1),
            ("Marathahalli", "Marathahalli", 1),
        ]
        # Note: same-stop transfers are implicitly handled since stops share names
        # across modes in the graph. We add explicit transfer edges for clarity.
        for u, v, walk_min in transfers:
            # Only add if both nodes exist
            if u in self.G and v in self.G:
                self._add_edge(u, v, "transfer", weight=walk_min, cost=0.0, distance=walk_min / 12)
                self._add_edge(v, u, "transfer", weight=walk_min, cost=0.0, distance=walk_min / 12)

    def _path_to_segments(self, path: List[str]) -> List[Dict[str, Any]]:
        """Convert a node path into a list of route segments."""
        segments = []
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            edge = self.G[u][v]
            segments.append({
                "mode": edge["mode"],
                "from": u,
                "to": v,
                "time_min": round(edge["weight"], 1),
                "cost_inr": round(edge["cost"], 1),
                "distance_km": round(edge["distance"], 2),
            })
        return segments

    def _aggregate_route(self, path: List[str]) -> Dict[str, Any]:
        """Aggregate a path into a summary route object."""
        segments = self._path_to_segments(path)
        total_time = sum(s["time_min"] for s in segments)
        total_cost = sum(s["cost_inr"] for s in segments)
        total_dist = sum(s["distance_km"] for s in segments)
        modes = list(dict.fromkeys(s["mode"] for s in segments if s["mode"] != "transfer"))
        transfers = sum(1 for s in segments if s["mode"] == "transfer")

        return {
            "id": f"route_{'_'.join(path)}",
            "type": "multi_modal" if len(modes) > 1 else (modes[0] if modes else "walk"),
            "modes": modes,
            "duration": round(total_time, 1),
            "price": round(total_cost, 1),
            "distance_km": round(total_dist, 2),
            "transfers": transfers,
            "segments": segments,
            "path": path,
        }

    def get_tabs(self, start: str, end: str) -> Dict[str, List[Any]]:
        """
        Compute fastest, cheapest, and optimal routes.

        Returns:
            {
                "fastest": [route, ...],
                "cheapest": [route, ...],
                "optimal": [route, ...]
            }
        """
        if start not in self.G:
            raise ValueError(f"Start node '{start}' not found in network")
        if end not in self.G:
            raise ValueError(f"End node '{end}' not found in network")

        # Fastest: minimize total time (weight)
        fastest_path = nx.shortest_path(self.G, start, end, weight="weight")
        fastest_route = self._aggregate_route(fastest_path)

        # Cheapest: minimize total cost
        cheapest_path = nx.shortest_path(self.G, start, end, weight="cost")
        cheapest_route = self._aggregate_route(cheapest_path)

        # Optimal: minimize a balanced composite score
        # score = 0.6 * normalized_time + 0.4 * normalized_cost
        # We compute a composite edge weight for the optimal search
        H = nx.DiGraph()
        for u, v, data in self.G.edges(data=True):
            time = data["weight"]
            cost = data["cost"]
            # Heuristic composite: time is primary, cost secondary
            composite = time * 0.7 + cost * 1.5
            H.add_edge(u, v, composite=composite, **data)

        optimal_path = nx.shortest_path(H, start, end, weight="composite")
        optimal_route = self._aggregate_route(optimal_path)

        return {
            "fastest": [fastest_route],
            "cheapest": [cheapest_route],
            "optimal": [optimal_route],
        }

    def get_stops(self) -> List[str]:
        """Return all stops in the network."""
        return sorted(self.G.nodes())

    def get_neighbors(self, stop: str) -> List[str]:
        """Return neighbors of a given stop."""
        return list(self.G.neighbors(stop)) if stop in self.G else []


# Singleton instance
_graph_instance: Optional[MultiModalGraph] = None


def get_graph() -> MultiModalGraph:
    """Get or create the singleton graph instance."""
    global _graph_instance
    if _graph_instance is None:
        _graph_instance = MultiModalGraph()
    return _graph_instance

