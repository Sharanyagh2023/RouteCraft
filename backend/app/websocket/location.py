from collections import defaultdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.tracking_service import should_ignore_noise

router = APIRouter()
connections: dict[str, set[WebSocket]] = defaultdict(set)
last_positions: dict[str, dict] = {}


@router.websocket("/location/{trip_id}")
async def location_socket(ws: WebSocket, trip_id: str):
    await ws.accept()
    connections[trip_id].add(ws)
    try:
        while True:
            payload = await ws.receive_json()
            point = {"lat": payload.get("lat"), "lng": payload.get("lng"), "trip_id": trip_id}
            if point["lat"] is None or point["lng"] is None:
                continue
            if should_ignore_noise(last_positions.get(trip_id), point):
                continue
            last_positions[trip_id] = point
            stale = []
            for client in connections[trip_id]:
                try:
                    await client.send_json(point)
                except Exception:
                    stale.append(client)
            for dead in stale:
                connections[trip_id].discard(dead)
    except WebSocketDisconnect:
        connections[trip_id].discard(ws)
