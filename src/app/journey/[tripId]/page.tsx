"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LiveMap } from "@/components/maps/live-map";
import { useLiveLocation } from "@/hooks/use-live-location";
import { useRouteStore } from "@/store/route-store";
import { LatLng } from "@/types/route";
import { haversineMeters } from "@/lib/geo";
import { getBookingLink } from "@/lib/providers";

export default function JourneyTrackerPage() {
  const params = useParams<{ tripId: string }>();
  const selectedPlanId = useRouteStore((state) => state.selectedPlanId);
  const plans = useRouteStore((state) => state.plans);
  const selected = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
  const [remotePosition, setRemotePosition] = useState<LatLng>();
  const [bookedSteps, setBookedSteps] = useState<Record<string, boolean>>({});
  const { position, error } = useLiveLocation({
    tripId: params.tripId,
    socketUrl: process.env.NEXT_PUBLIC_TRACKING_WS_URL ?? "",
    intervalMs: 4000,
    onRemoteUpdate: setRemotePosition,
  });

  const stepMarkers = useMemo(
    () =>
      selected?.steps
        .map((step) => step.pickup ?? { lat: step.lat ?? 0, lng: step.lng ?? 0 })
        .filter((point) => point.lat !== 0 || point.lng !== 0) as LatLng[],
    [selected]
  );
  const livePoint = position ?? remotePosition;
  const statuses = selected.steps.map((step, idx) => {
    const point = step.pickup ?? stepMarkers[idx];
    const reached = point && livePoint ? haversineMeters(livePoint, point) < 40 : false;
    if (reached) return "completed";
    return idx === 0 ? "active" : "pending";
  });

  if (!selected) return <div className="text-sm text-red-300">No selected journey. Search routes first.</div>;

  return (
    <div className="grid min-h-[88vh] gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Journey Tracker</h1>
          <Link href={`/track?tripId=${encodeURIComponent(params.tripId)}`} className="text-sm text-routeTeal">
            Share live link
          </Link>
        </div>
        <div className="mt-5 space-y-4">
          <AnimatePresence>
            {selected.steps.map((step, idx) => {
              const status = statuses[idx];
              const anchor = step.pickup ?? stepMarkers[idx] ?? selected.path?.[0];
              const dest = step.dropoff ?? stepMarkers[idx + 1] ?? selected.path?.[selected.path.length - 1];
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-2xl border border-white/10 bg-slate-900/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="capitalize">{step.mode}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-routeTeal">{status}</p>
                  </div>
                  <p className="mt-1 text-sm text-white/70">
                    {step.durationMin} mins • {step.distanceKm} km • ₹{step.costInr}
                  </p>
                  {anchor && dest && (
                    <a
                      href={getBookingLink(step.provider, anchor, dest)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setBookedSteps((prev) => ({ ...prev, [step.id]: true }))}
                      className="mt-2 inline-flex rounded-xl bg-routeTeal/85 px-3 py-2 text-xs font-semibold text-slate-950"
                    >
                      Book Ride
                    </a>
                  )}
                  {bookedSteps[step.id] && <p className="mt-1 text-xs text-routeTeal">Ride Booked?</p>}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      </section>
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="h-[420px]">
          <LiveMap path={selected.path} stepMarkers={stepMarkers} userPosition={position ?? remotePosition} />
        </div>
      </section>
    </div>
  );
}
