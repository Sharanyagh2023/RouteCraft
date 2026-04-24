import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';

import { RouteSegment, PivotPoint } from '../types';

// Custom Icons for Source, Destination and User
const sourceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
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

const tealPivotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
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

const busPivotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const metroPivotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const orangePivotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapComponentProps {
  sourceCoords: { lat: number; lng: number } | null;
  destCoords: { lat: number; lng: number } | null;
  userCoords: { lat: number; lng: number } | null;
  routePolyline?: [number, number][];
  segments?: RouteSegment[];
  pivotPoints?: (PivotPoint | { lat: number; lng: number; label: string })[];
  isTracking?: boolean;
  onDestinationSelect?: (coords: { lat: number; lng: number }) => void;
}

const carIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const autoIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2855/2855737.png',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function ChangeView({ center, zoom, bounds }: { center: [number, number], zoom: number, bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

function MapClickHandler({
  setDestination
}: {
  setDestination: (coords: { lat: number; lng: number }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const onMapClick = (e: L.LeafletMouseEvent) => {
      setDestination({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    };

    map.on('click', onMapClick);
    return () => map.off('click', onMapClick);
  }, [map, setDestination]);

  return null;
}

export const MapComponent = ({ sourceCoords, destCoords, userCoords, routePolyline, segments, pivotPoints, isTracking, onDestinationSelect }: MapComponentProps) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]); // Bangalore
  const [zoom, setZoom] = useState(13);
  const [fleet, setFleet] = useState<{lat: number, lng: number, type: string}[]>([]);
  const [dynamicDestCoords, setDynamicDestCoords] = useState<{ lat: number; lng: number } | null>(destCoords);
  const [internalUserCoords, setInternalUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [animatedUserCoords, setAnimatedUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const animationRef = useRef<number | null>(null);

  const effectiveDestCoords = dynamicDestCoords || destCoords;
  const effectiveUserCoords = userCoords || internalUserCoords;

  const getPivotPoints = (
    source: { lat: number; lng: number } | null,
    destination: { lat: number; lng: number } | null
  ) => {
    if (!source || !destination) return [] as { lat: number; lng: number; label: string }[];

    const midLat = (source.lat + destination.lat) / 2;
    const midLng = (source.lng + destination.lng) / 2;
    const offset = Math.max(
      Math.abs(source.lat - destination.lat),
      Math.abs(source.lng - destination.lng)
    ) * 0.12;

    return [
      { lat: midLat + offset, lng: midLng - offset, label: 'Pivot 1' },
      { lat: midLat - offset, lng: midLng + offset, label: 'Pivot 2' }
    ];
  };

  const buildPath = (
    source: { lat: number; lng: number } | null,
    pivotsInput: { lat: number; lng: number }[],
    destination: { lat: number; lng: number } | null
  ) => {
    if (!source || !destination) return [] as [number, number][];

    const points: [number, number][] = [[source.lat, source.lng]];
    pivotsInput.forEach((p) => points.push([p.lat, p.lng]));
    points.push([destination.lat, destination.lng]);
    return points;
  };

  const normalizedPivotPoints = useMemo(() => {
    if (pivotPoints && pivotPoints.length > 0) {
      return pivotPoints
        .map((p) => ({
          // accept lat/lng or lat/lon or latitude/longitude
          lat: Number((p as any).lat ?? (p as any).latitude ?? (p as any).lat),
          lng: Number((p as any).lng ?? (p as any).longitude ?? (p as any).lon ?? (p as any).lon),
          label: 'label' in p ? (p as any).label : ('name' in p ? (p as any).name : 'Pivot Point'),
          type: (p as any).type
        }))
        .filter((p) => isFinite(p.lat) && isFinite(p.lng));
    }

    return getPivotPoints(sourceCoords, effectiveDestCoords);
  }, [pivotPoints, sourceCoords, effectiveDestCoords]);

  const pivots = useMemo(() => getPivotPoints(sourceCoords, effectiveDestCoords), [sourceCoords, effectiveDestCoords]);

  // Expose friendly names used by debug logs and the fix prompt
  const source = sourceCoords;
  const destination = effectiveDestCoords;
  const pivotsForRender = normalizedPivotPoints;

  console.log("SOURCE:", source);
  console.log("DEST:", destination);
  console.log("PIVOTS:", pivotsForRender);

  const path = useMemo(() => buildPath(sourceCoords, normalizedPivotPoints.length > 0 ? normalizedPivotPoints : pivots, effectiveDestCoords), [sourceCoords, normalizedPivotPoints, pivots, effectiveDestCoords]);

  const renderedPath = useMemo(() => {
    if (segments && segments.length > 0) return null;
    if (routePolyline && routePolyline.length > 0) return routePolyline;
    return path;
  }, [segments, routePolyline, path]);

  const onMapDestinationSelect = (coords: { lat: number; lng: number }) => {
    setDynamicDestCoords(coords);
    onDestinationSelect?.(coords);
  };

  console.log("SOURCE:", sourceCoords);
  console.log("DEST:", effectiveDestCoords);
  console.log("PIVOT POINTS:", pivotPoints);

  // Helper for mode styles
  const getModeStyle = (mode: string) => {
    switch (mode) {
      case "walk": return { color: "#3B82F6", dashArray: "10, 10" };
      case "bus": return { color: "#3B82F6", dashArray: undefined, weight: 6 };
      case "metro": return { color: "#3B82F6", dashArray: undefined, weight: 10 };
      case "car": case "auto": return { color: "#3B82F6", dashArray: undefined };
      default: return { color: "#3B82F6", dashArray: undefined };
    }
  };

  // Simulate moving fleet
  useEffect(() => {
    if (isTracking) {
      setFleet([]);
      return;
    }

    const initialFleet = Array.from({ length: 8 }).map(() => ({
      lat: 12.9716 + (Math.random() - 0.5) * 0.05,
      lng: 77.5946 + (Math.random() - 0.5) * 0.05,
      type: Math.random() > 0.5 ? 'car' : 'auto'
    }));
    setFleet(initialFleet);

    const interval = setInterval(() => {
      setFleet(prev => prev.map(p => ({
        ...p,
        lat: p.lat + (Math.random() - 0.5) * 0.0005,
        lng: p.lng + (Math.random() - 0.5) * 0.0005,
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, [isTracking]);

  useEffect(() => {
    if (effectiveUserCoords && isTracking) {
      setMapCenter([effectiveUserCoords.lat, effectiveUserCoords.lng]);
      setZoom(16);
    } else if (sourceCoords && effectiveDestCoords && !isTracking) {
      const midLat = (sourceCoords.lat + effectiveDestCoords.lat) / 2;
      const midLng = (sourceCoords.lng + effectiveDestCoords.lng) / 2;
      setMapCenter([midLat, midLng]);
      setZoom(12);
    }
  }, [effectiveUserCoords, sourceCoords, effectiveDestCoords, isTracking]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setInternalUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!effectiveUserCoords) return;

    if (!animatedUserCoords) {
      setAnimatedUserCoords(effectiveUserCoords);
      return;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const start = { ...animatedUserCoords };
    const end = { ...effectiveUserCoords };
    const duration = 450;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      setAnimatedUserCoords({
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t
      });

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [effectiveUserCoords]);

  useEffect(() => {
    setDynamicDestCoords(destCoords);
  }, [destCoords]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const bounds: L.LatLngBoundsExpression | undefined = useMemo(() => {
    const pathPoints = (renderedPath || []).filter(([lat, lng]) => isFinite(lat) && isFinite(lng));
    if (pathPoints.length >= 2) return pathPoints;

    if (
      sourceCoords &&
      effectiveDestCoords &&
      isFinite(sourceCoords.lat) &&
      isFinite(sourceCoords.lng) &&
      isFinite(effectiveDestCoords.lat) &&
      isFinite(effectiveDestCoords.lng)
    ) {
      return [
        [sourceCoords.lat, sourceCoords.lng],
        [effectiveDestCoords.lat, effectiveDestCoords.lng]
      ];
    }

    return undefined;
  }, [renderedPath, sourceCoords, effectiveDestCoords]);

  return (
    <div className="w-full h-full relative z-0 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#f8fafc]">
      <MapContainer 
        key={`${sourceCoords?.lat || ''}-${sourceCoords?.lng || ''}-${effectiveDestCoords?.lat || ''}-${effectiveDestCoords?.lng || ''}`}
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", background: "#f8fafc" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler setDestination={onMapDestinationSelect} />
        
        <ChangeView center={mapCenter} zoom={zoom} bounds={bounds} />
        
        {fleet.map((f, i) => (
          <Marker 
            key={i} 
            position={[f.lat, f.lng]} 
            icon={f.type === 'car' ? carIcon : autoIcon} 
            opacity={0.6}
          >
            <Popup>
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6]">Nearby {f.type}</div>
                <div className="text-[8px] opacity-70">En-route to pickup</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {source && (
          <Marker position={[source.lat, source.lng]} icon={sourceIcon}>
            <Popup>Source</Popup>
          </Marker>
        )}

        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {animatedUserCoords && (
          <>
            <Marker position={[animatedUserCoords.lat, animatedUserCoords.lng]} icon={userIcon}>
              <Popup>You are here</Popup>
            </Marker>
            <Circle 
              center={[animatedUserCoords.lat, animatedUserCoords.lng]} 
              radius={100} 
              pathOptions={{ fillColor: '#3B82F6', color: '#3B82F6', opacity: 0.1, fillOpacity: 0.1 }} 
            />
          </>
        )}

        {pivotsForRender && pivotsForRender.length > 0 &&
          pivotsForRender.map((p, i) => {
            const pivotIcon = p.type === 'metro' ? metroPivotIcon : (p.type === 'bus' ? busPivotIcon : tealPivotIcon);
            return (
              <Marker key={i} position={[p.lat, p.lng]} icon={pivotIcon}>
                <Popup>{p.label || p.name || 'Transit Hub'}</Popup>
              </Marker>
            );
          })
        }

        {/* Render Segmented Routes */}
        {segments && segments.length > 0 ? (
          segments.map((seg, idx) => seg.geometry && (
            <Polyline 
              key={idx}
              positions={seg.geometry}
              {...getModeStyle(seg.mode)}
              weight={7}
              opacity={0.9}
              lineJoin="round"
              lineCap="round"
            />
          ))
        ) : (
          renderedPath && renderedPath.length > 0 && (
            <Polyline 
              positions={renderedPath} 
              color="#3B82F6" 
              weight={7} 
              opacity={0.9}
              lineJoin="round"
              lineCap="round"
            />
          )
        )}
      </MapContainer>
    </div>
  );
};
