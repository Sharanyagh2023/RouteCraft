"use client";

import { useEffect, useRef, useState } from "react";
import { LatLng } from "@/types/route";

type LiveLocationOptions = {
  tripId: string;
  socketUrl: string;
  intervalMs?: number;
  onRemoteUpdate?: (coords: LatLng) => void;
};

export const useLiveLocation = ({
  tripId,
  socketUrl,
  intervalMs = 4000,
  onRemoteUpdate,
}: LiveLocationOptions) => {
  const [position, setPosition] = useState<LatLng>();
  const [error, setError] = useState<string>();
  const socketRef = useRef<WebSocket>();
  const targetRef = useRef<LatLng>();
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!tripId || !socketUrl) return;
    const socket = new WebSocket(`${socketUrl}/${encodeURIComponent(tripId)}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { lat?: number; lng?: number };
        if (typeof payload.lat === "number" && typeof payload.lng === "number") {
          onRemoteUpdate?.({ lat: payload.lat, lng: payload.lng });
        }
      } catch {
        // Ignore malformed updates.
      }
    };

    socket.onerror = () => setError("Live tracking socket error.");
    return () => socket.close();
  }, [onRemoteUpdate, socketUrl, tripId]);

  useEffect(() => {
    const animate = () => {
      if (!targetRef.current) return;
      setPosition((current) => {
        if (!current) return targetRef.current;
        const next = {
          lat: current.lat + (targetRef.current!.lat - current.lat) * 0.2,
          lng: current.lng + (targetRef.current!.lng - current.lng) * 0.2,
        };
        return next;
      });
      frameRef.current = window.requestAnimationFrame(animate);
    };
    frameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }

    const interval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          targetRef.current = coords;
          const socket = socketRef.current;
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "location", tripId, ...coords, ts: Date.now() }));
          }
        },
        (geoError) => setError(geoError.message),
        { enableHighAccuracy: true }
      );
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, tripId]);

  return { position, error };
};
