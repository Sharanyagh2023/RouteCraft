"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { LatLng } from "@/types/route";

type MapViewProps = {
  source?: LatLng;
  destination?: LatLng;
  path?: LatLng[];
  userPosition?: LatLng;
  className?: string;
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return null;
}

export function MapView({ source, destination, path, userPosition, className }: MapViewProps) {
  const center = source ?? userPosition ?? path?.[0] ?? { lat: 12.9716, lng: 77.5946 };
  const fitPoints = [source, destination, userPosition, ...(path ?? [])].filter(Boolean) as LatLng[];

  return (
    <div className={className ?? "h-full w-full"}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        className="h-full w-full rounded-3xl"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={fitPoints} />
        {path && path.length > 1 && (
          <Polyline
            positions={path.map((point) => [point.lat, point.lng])}
            pathOptions={{ color: "#00E5FF", weight: 4, opacity: 0.85 }}
          />
        )}
        {source && <Marker position={[source.lat, source.lng]} icon={markerIcon} />}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={markerIcon} />}
        {userPosition && <Marker position={[userPosition.lat, userPosition.lng]} icon={markerIcon} />}
      </MapContainer>
    </div>
  );
}
