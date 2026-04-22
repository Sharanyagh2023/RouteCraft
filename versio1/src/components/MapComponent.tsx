import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

// Custom Icons for Source, Destination and User
const sourceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pivotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapComponentProps {
  sourceCoords: { lat: number; lon: number } | null;
  destCoords: { lat: number; lon: number } | null;
  userCoords: { lat: number; lon: number } | null;
  routePolyline?: [number, number][];
  pivotPoints?: { lat: number; lon: number; label: string }[];
  isTracking?: boolean;
}

// Component to handle map view changes separately to avoid unnecessary re-renders
const ChangeView = ({ center, zoom, bounds }: { center: [number, number], zoom: number, bounds?: L.LatLngBounds }) => {
  const map = useMap();
  useEffect(() => {
    // Only fitBounds if bounds are valid and not just tracking a moving user
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else {
      map.setView(center, zoom, { animate: true });
    }
  }, [bounds, center, zoom, map]);
  return null;
};

// Component to handle initial map sizing
const InvalidateSize = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 500);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

export const MapComponent = ({ sourceCoords, destCoords, userCoords, routePolyline, pivotPoints, isTracking }: MapComponentProps) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]); // Bangalore
  const [zoom, setZoom] = useState(13);

  // Calculate static bounds for the journey (source to destination + pivots)
  // We keep this separate from moving userCoords to prevent map jumping
  const staticBounds = L.latLngBounds([]);
  if (sourceCoords) staticBounds.extend([sourceCoords.lat, sourceCoords.lon]);
  if (destCoords) staticBounds.extend([destCoords.lat, destCoords.lon]);
  pivotPoints?.forEach(p => staticBounds.extend([p.lat, p.lon]));

  useEffect(() => {
    if (isTracking && userCoords) {
      // During tracking, we might want to follow the user, but we update state directly
      // rather than using fitBounds, which is more performant for markers.
      setMapCenter([userCoords.lat, userCoords.lon]);
      setZoom(16);
    } else if (sourceCoords && destCoords && !isTracking) {
      setMapCenter([(sourceCoords.lat + destCoords.lat) / 2, (sourceCoords.lon + destCoords.lon) / 2]);
      setZoom(12);
    }
  }, [isTracking, userCoords?.lat, userCoords?.lon, sourceCoords?.lat, sourceCoords?.lon, destCoords?.lat, destCoords?.lon]);

  return (
    <div className="w-full h-full relative z-0 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#1a1b1e]" id="leaflet-map-container">
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", background: "#1a1b1e" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Only use fitBounds on the static route, or use direct view centering */}
        <ChangeView 
          center={mapCenter} 
          zoom={zoom} 
          bounds={!isTracking && staticBounds.isValid() ? staticBounds : undefined} 
        />
        <InvalidateSize />

        {sourceCoords && (
          <Marker position={[sourceCoords.lat, sourceCoords.lon]} icon={sourceIcon} id="source-marker">
            <Popup>Source Location</Popup>
          </Marker>
        )}

        {destCoords && (
          <Marker position={[destCoords.lat, destCoords.lon]} icon={destIcon} id="dest-marker">
            <Popup>Destination</Popup>
          </Marker>
        )}

        {userCoords && (
          <Marker position={[userCoords.lat, userCoords.lon]} icon={userIcon} id="user-location-marker">
            <Popup>You are here</Popup>
          </Marker>
        )}

        {pivotPoints?.map((p, idx) => (
          <Marker key={`pivot-${idx}`} position={[p.lat, p.lon]} icon={pivotIcon} id={`pivot-marker-${idx}`}>
            <Popup>{p.label}</Popup>
          </Marker>
        ))}

        {routePolyline && routePolyline.length > 0 && (
          <Polyline 
            key="route-layer"
            positions={routePolyline} 
            color="#2dd4bf" 
            weight={5} 
            opacity={0.8}
            lineJoin="round"
          />
        )}
      </MapContainer>
    </div>
  );
};
