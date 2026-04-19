"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { RoutePlan } from "@/types/route";
import { ModeBadge } from "./mode-badge";

type ResultCardProps = {
  plan: RoutePlan;
};

export function ResultCard({ plan }: ResultCardProps) {
  const primaryStep = plan.steps[0];
  const cardLabel = plan.type === "best" ? "Optimal" : plan.type === "fastest" ? "Fastest" : "Cheapest";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glass backdrop-blur-xl"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">{cardLabel}</h3>
          <p className="mt-1 text-sm capitalize text-white/65">Mode: {primaryStep?.mode ?? "car"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.steps.map((step) => (
              <ModeBadge key={step.id} mode={step.mode} />
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-extrabold leading-none text-routeTeal">{plan.totalDurationMin} mins</p>
          <p className="mt-1 text-lg text-white/80">₹{plan.totalCostInr}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {plan.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-routeTeal/30 bg-routeTeal/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-routeTeal"
          >
            {tag}
          </span>
        ))}
      </div>
      <Link
        href={`/details/${plan.id}`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-routeTeal/85 px-4 py-3 text-sm font-semibold tracking-[0.12em] text-slate-950 transition hover:bg-routeTeal"
      >
        View Details
      </Link>
    </motion.article>
  );
}
