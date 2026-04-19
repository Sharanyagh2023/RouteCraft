"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getWeather, optimizeRoutes, searchLocations } from "@/lib/api";
import { useRouteStore } from "@/store/route-store";

type Suggestion = {
  name: string;
  lat: number;
  lng: number;
};

export function HomeSearch() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sourceSuggestions, setSourceSuggestions] = useState<Suggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Suggestion[]>([]);
  const [selectedSourceName, setSelectedSourceName] = useState<string>();
  const [selectedDestinationName, setSelectedDestinationName] = useState<string>();
  const [error, setError] = useState<string>();

  const sourceLocation = useRouteStore((state) => state.source);
  const destinationLocation = useRouteStore((state) => state.destination);
  const source = useRouteStore((state) => state.sourceText);
  const destination = useRouteStore((state) => state.destinationText);
  const weather = useRouteStore((state) => state.weather);
  const setSourceText = useRouteStore((state) => state.setSourceText);
  const setDestinationText = useRouteStore((state) => state.setDestinationText);
  const setSource = useRouteStore((state) => state.setSource);
  const setDestination = useRouteStore((state) => state.setDestination);
  const setPlans = useRouteStore((state) => state.setPlans);
  const setWeather = useRouteStore((state) => state.setWeather);
  const swapLocations = useRouteStore((state) => state.swapLocations);

  const canSearch = useMemo(() => Boolean(sourceLocation?.lat && destinationLocation?.lat), [destinationLocation?.lat, sourceLocation?.lat]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (source.length < 2) {
        setSourceSuggestions([]);
        return;
      }
      const suggestions = await searchLocations(source);
      setSourceSuggestions(suggestions);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [source]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (destination.length < 2) {
        setDestinationSuggestions([]);
        return;
      }
      const suggestions = await searchLocations(destination);
      setDestinationSuggestions(suggestions);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [destination]);

  const pickSource = (suggestion: Suggestion) => {
    setSource(suggestion);
    setSelectedSourceName(suggestion.name);
    setSourceSuggestions([]);
  };

  const pickDestination = (suggestion: Suggestion) => {
    setDestination(suggestion);
    setSelectedDestinationName(suggestion.name);
    setDestinationSuggestions([]);
  };

  const handleSwapLocations = () => {
    swapLocations();
    setSourceSuggestions([]);
    setDestinationSuggestions([]);
    setSelectedSourceName(destinationLocation?.name);
    setSelectedDestinationName(sourceLocation?.name);
  };

  const onSearch = async () => {
    setError(undefined);
    if (!sourceLocation?.lat || !destinationLocation?.lat) {
      alert("Please select valid locations from suggestions");
      return;
    }

    const payload = {
      source: sourceLocation,
      destination: destinationLocation,
    };
    console.log("ROUTE PAYLOAD:", payload);

    setLoading(true);
    try {
      try {
        const weatherData = await getWeather(sourceLocation);
        setWeather(weatherData);
      } catch {
        setWeather(undefined);
      }
      const response = await optimizeRoutes(payload);
      setPlans(response.plans);
      router.push("/results");
    } catch (err: unknown) {
      console.error(err);
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSourceEnter = async () => {
    const results = await searchLocations(source.trim());
    if (results.length > 0) {
      pickSource(results[0]);
    }
  };

  const handleDestinationEnter = async () => {
    const results = await searchLocations(destination.trim());
    if (results.length > 0) {
      pickDestination(results[0]);
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-xl">
      <div className="relative space-y-3">
        <div className="relative">
          <input
            className="h-14 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 text-sm text-white outline-none"
            placeholder="Source"
            value={source}
            onChange={(event) => {
              setSourceText(event.target.value);
              setSelectedSourceName(undefined);
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                await handleSourceEnter();
              }
            }}
          />
          {sourceSuggestions.length > 0 && (
            <div className="absolute z-[1000] mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/95 p-1">
              {sourceSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.lat}-${suggestion.lng}-${suggestion.name}`}
                  type="button"
                  onClick={() => pickSource(suggestion)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10 ${
                    selectedSourceName === suggestion.name ? "bg-white/15" : ""
                  }`}
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <input
            className="h-14 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 text-sm text-white outline-none"
            placeholder="Destination"
            value={destination}
            onChange={(event) => {
              setDestinationText(event.target.value);
              setSelectedDestinationName(undefined);
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                await handleDestinationEnter();
              }
            }}
          />
          {destinationSuggestions.length > 0 && (
            <div className="absolute z-[1000] mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/95 p-1">
              {destinationSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.lat}-${suggestion.lng}-${suggestion.name}`}
                  type="button"
                  onClick={() => pickDestination(suggestion)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10 ${
                    selectedDestinationName === suggestion.name ? "bg-white/15" : ""
                  }`}
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleSwapLocations}
          className="absolute right-3 top-14 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-slate-900 text-white"
          aria-label="Swap source and destination"
        >
          ⇅
        </button>
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm text-white/80">
        <span>{weather ? `${Math.round(weather.tempC)}°C ${weather.description}` : "Weather unavailable"}</span>
        <span>{weather ? `${weather.humidity}% humidity` : "--"}</span>
      </div>
      <button
        onClick={onSearch}
        disabled={!canSearch || loading}
        className="mt-5 h-14 w-full rounded-3xl bg-routeTeal/85 text-sm font-bold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-routeTeal disabled:opacity-60"
      >
        {loading ? "Searching..." : "Search Routes"}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}
