"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRouteStore } from "@/store/route-store";
import { ModeBadge } from "@/components/route/mode-badge";

export default function RouteDetailsPage() {
  const params = useParams<{ planId: string }>();
  const router = useRouter();
  const plans = useRouteStore((state) => state.plans);
  const setSelectedPlan = useRouteStore((state) => state.setSelectedPlan);
  const plan = plans.find((item) => item.id === params.planId);

  if (!plan) {
    return <div className="text-sm text-red-300">Route details unavailable. Please search again.</div>;
  }

  return (
    <div className="space-y-5 pb-24">
      <Link href="/results" className="inline-block text-sm text-white/75">
        ← Back to options
      </Link>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold">Route Details</h1>
            <p className="mt-2 text-xl text-white/80">Total duration: {plan.totalDurationMin} mins</p>
          </div>
          <p className="text-5xl font-extrabold text-routeTeal">₹{plan.totalCostInr}</p>
        </div>
        <div className="mt-6 space-y-6">
          {plan.steps.map((step) => (
            <div key={step.id} className="flex gap-3">
              <div className="mt-2 h-3 w-3 rounded-full bg-routeTeal" />
              <div className="flex-1 border-b border-white/10 pb-5 last:border-none">
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-semibold capitalize">{step.mode}</p>
                  <p className="text-xl text-white/85">₹{step.costInr}</p>
                </div>
                <p className="mt-1 text-sm text-white/70">
                  {step.durationMin} mins • {step.distanceKm} km {step.provider ? `• ${step.provider}` : ""}
                </p>
                <div className="mt-3">
                  <ModeBadge mode={step.mode} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <button
        className="h-14 w-full rounded-3xl bg-routeTeal text-base font-bold uppercase tracking-[0.12em] text-slate-950"
        onClick={() => {
          setSelectedPlan(plan.id);
          router.push(`/journey/${plan.tripId ?? plan.id}`);
        }}
      >
        Continue
      </button>
    </div>
  );
}
