import { HomeSearch } from "@/components/route/home-search";

export default function Home() {
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
        <p className="text-2xl font-bold tracking-wide text-routeTeal">ROUTECRAFT</p>
      </header>
      <HomeSearch />
    </div>
  );
}
