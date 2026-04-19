"use client";

import { useEffect, useRef, useState } from "react";
import { LiveMap } from "@/components/maps/live-map";
import { LatLng } from "@/types/route";

export default function SharedTrackingPage() {
  const [tripId, setTripId] = useState("");
  const [remotePosition, setRemotePosition] = useState<LatLng>();
  const targetRef = useRef<LatLng>();
  const [socketError, setSocketError] = useState<string>();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setTripId(query.get("tripId") ?? "");
  }, []);

  useEffect(() => {
    let frameId = 0;
    const animate = () => {
      setRemotePosition((current) => {
        if (!targetRef.current) return current;
        if (!current) return targetRef.current;
        return {
          lat: current.lat + (targetRef.current.lat - current.lat) * 0.22,
          lng: current.lng + (targetRef.current.lng - current.lng) * 0.22,
        };
      });
      frameId = window.requestAnimationFrame(animate);
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!tripId) return;
    const base = process.env.NEXT_PUBLIC_TRACKING_WS_URL;
    if (!base) {
      setSocketError("Missing NEXT_PUBLIC_TRACKING_WS_URL.");
      return;
    }
    const ws = new WebSocket(`${base}/${encodeURIComponent(tripId)}`);
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as { lat?: number; lng?: number };
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          targetRef.current = { lat: parsed.lat, lng: parsed.lng };
        }
      } catch {
        // Ignore malformed socket payload.
      }
    };
    ws.onerror = () => setSocketError("Socket error while watching trip.");
    return () => ws.close();
  }, [tripId]);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
        <h1 className="text-xl font-semibold">Live Trip Tracking</h1>
        <p className="mt-1 text-sm text-white/70">Trip ID: {tripId || "Missing"}</p>
      </header>
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="h-[520px]">
          <LiveMap userPosition={remotePosition} />
        </div>
      </section>
      {socketError && <p className="text-sm text-red-300">{socketError}</p>}
    </div>
  );
}
