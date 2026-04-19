import {
  LatLng,
  OptimizeResponse,
  RoutePlan,
  RoutePlanType,
  RouteStep,
  WeatherState,
} from "@/types/route";

const modeMap: Record<string, RouteStep["mode"]> = {
  AUTO: "auto",
  METRO: "metro",
  WALK: "walk",
  CAR: "car",
  BIKE: "bike",
  BUS: "bus",
};
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const toLatLng = (value: unknown): LatLng | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  if (typeof v.lat === "number" && typeof v.lng === "number") return { lat: v.lat, lng: v.lng };
  if (typeof v.latitude === "number" && typeof v.longitude === "number") {
    return { lat: v.latitude, lng: v.longitude };
  }
  return undefined;
};

const normalizeStep = (raw: Record<string, unknown>, idx: number): RouteStep => ({
  id: String(raw.id ?? `step-${idx}`),
  mode: modeMap[String(raw.mode ?? "").toUpperCase()] ?? "walk",
  provider: raw.provider ? String(raw.provider) : undefined,
  lat: typeof raw.lat === "number" ? raw.lat : undefined,
  lng: typeof raw.lng === "number" ? raw.lng : undefined,
  distanceKm: Number(raw.distanceKm ?? raw.distance_km ?? raw.distance ?? 0),
  durationMin: Number(raw.durationMin ?? raw.time_min ?? raw.timeMin ?? 0),
  costInr: Number(raw.costInr ?? raw.cost_inr ?? raw.cost ?? 0),
  pickup: toLatLng(raw.pickup),
  dropoff: toLatLng(raw.dropoff),
  path: Array.isArray(raw.path) ? raw.path.map(toLatLng).filter(Boolean) as LatLng[] : undefined,
});

const normalizePlan = (
  raw: Record<string, unknown>,
  type: RoutePlanType,
  fallbackTitle: string
): RoutePlan => ({
  id: String(raw.id ?? type),
  type,
  title: String(raw.title ?? fallbackTitle),
  totalDurationMin: Number(raw.totalDurationMin ?? raw.total_duration_min ?? raw.timeMin ?? 0),
  totalCostInr: Number(raw.totalCostInr ?? raw.total_cost_inr ?? raw.cost ?? 0),
  totalDistanceKm: Number(raw.totalDistanceKm ?? raw.total_distance_km ?? 0) || undefined,
  tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
  steps: Array.isArray(raw.steps)
    ? raw.steps.map((step, idx) => normalizeStep(step as Record<string, unknown>, idx))
    : [],
  path: Array.isArray(raw.path) ? raw.path.map(toLatLng).filter(Boolean) as LatLng[] : undefined,
  tripId: raw.tripId ? String(raw.tripId) : raw.trip_id ? String(raw.trip_id) : undefined,
});

const parseOptimizeResponse = (payload: unknown): OptimizeResponse => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid optimize response.");
  }

  const data = payload as Record<string, unknown>;
  const plans: RoutePlan[] = [];

  if (Array.isArray(data.plans)) {
    for (const plan of data.plans) {
      if (typeof plan !== "object" || !plan) continue;
      const type = String((plan as Record<string, unknown>).type ?? "").toLowerCase() as RoutePlanType;
      if (!["cheapest", "fastest", "best"].includes(type)) continue;
      plans.push(normalizePlan(plan as Record<string, unknown>, type, type.toUpperCase()));
    }
  } else {
    const quickest = data.fastest as Record<string, unknown> | undefined;
    const budget = data.cheapest as Record<string, unknown> | undefined;
    const balanced = data.best as Record<string, unknown> | undefined;
    if (budget) plans.push(normalizePlan(budget, "cheapest", "Cheapest"));
    if (quickest) plans.push(normalizePlan(quickest, "fastest", "Fastest"));
    if (balanced) plans.push(normalizePlan(balanced, "best", "Best"));
  }

  if (plans.length !== 3) {
    throw new Error("Expected exactly 3 plans (cheapest, fastest, best) from API.");
  }

  return { plans };
};

export const optimizeRoutes = async (payload: {
  source: { name: string; lat?: number; lng?: number };
  destination: { name: string; lat?: number; lng?: number };
}) => {
  console.log("ROUTE PAYLOAD:", payload);
  const response = await fetch(`${API_BASE}/api/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: payload.source,
      destination: payload.destination,
    }),
  });

  if (!response.ok) {
    throw new Error(`Route optimization failed (${response.status}).`);
  }
  const data = await response.json();
  return parseOptimizeResponse(data);
};

export const searchLocations = async (query: string): Promise<Array<{ name: string; lat: number; lng: number }>> => {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    format: "json",
    q: query,
    addressdetails: "1",
    limit: "5",
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "Accept-Language": "en",
      },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as Array<{ display_name?: string; lat?: string; lon?: string }>;
    return data
      .filter((item) => item.display_name && item.lat && item.lon)
      .map((item) => ({
        name: item.display_name as string,
        lat: Number(item.lat),
        lng: Number(item.lon),
      }));
  } catch {
    return [];
  }
};

export const getWeather = async (coords: LatLng): Promise<WeatherState> => {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_OPENWEATHER_API_KEY.");
  const query = new URLSearchParams({
    lat: String(coords.lat),
    lon: String(coords.lng),
    appid: apiKey,
    units: "metric",
  });
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${query.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch weather.");
  const data = await response.json();
  return {
    tempC: Number(data.main?.temp ?? 0),
    description: String(data.weather?.[0]?.description ?? "N/A"),
    humidity: Number(data.main?.humidity ?? 0),
  };
};

export const chatAssist = async (message: string) => {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error("Chat assistant failed.");
  return (await response.json()) as { source?: string; destination?: string; response?: string };
};
