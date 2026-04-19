"use client";

import Link from "next/link";
import { ResultCard } from "@/components/route/result-card";
import { useRouteStore } from "@/store/route-store";
import { RoutePlan } from "@/types/route";

const order = ["fastest", "cheapest", "best"] as const;

export default function ResultsPage() {
  const plans = useRouteStore((state) => state.plans);
  const ordered = order
    .map((type) => plans.find((plan) => plan.type === type))
    .filter((plan): plan is RoutePlan => Boolean(plan));

  return (
    <div className="space-y-4 pb-24">
      <header className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.2em] text-white/70">Smart Ride Recommendations</p>
      </header>
      {ordered.length === 3 ? (
        ordered.map((plan) => <ResultCard key={plan.id} plan={plan} />)
      ) : (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Route API must return exactly 3 plans: cheapest, fastest and best.
        </div>
      )}
      <Link href="/" className="block text-sm text-routeTeal">
        Back to home
      </Link>
    </div>
  );
}
