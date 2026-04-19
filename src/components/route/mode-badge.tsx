import { CommuteMode } from "@/types/route";

const modeLabel: Record<CommuteMode, string> = {
  auto: "AUTO",
  metro: "METRO",
  walk: "WALK",
  car: "CAR",
  bike: "BIKE",
  bus: "BUS",
};

export function ModeBadge({ mode }: { mode: CommuteMode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] tracking-[0.16em] text-routeTeal/90">
      {modeLabel[mode]}
    </span>
  );
}
