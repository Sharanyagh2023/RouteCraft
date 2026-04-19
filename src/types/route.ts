export type LatLng = {
  lat: number;
  lng: number;
};

export type CommuteMode = "auto" | "metro" | "walk" | "car" | "bike" | "bus";

export type RouteStep = {
  id: string;
  mode: CommuteMode;
  provider?: string;
  lat?: number;
  lng?: number;
  distanceKm: number;
  durationMin: number;
  costInr: number;
  pickup?: LatLng;
  dropoff?: LatLng;
  path?: LatLng[];
};

export type RoutePlanType = "cheapest" | "fastest" | "best";

export type RoutePlan = {
  id: string;
  type: RoutePlanType;
  title: string;
  totalDurationMin: number;
  totalCostInr: number;
  totalDistanceKm?: number;
  tags: string[];
  steps: RouteStep[];
  path?: LatLng[];
  tripId?: string;
};

export type WeatherState = {
  tempC: number;
  description: string;
  humidity: number;
};

export type OptimizeResponse = {
  plans: RoutePlan[];
};
