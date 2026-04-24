export type TransportMode = "car" | "auto" | "bus" | "metro" | "walk" | "bike";

export interface RouteSegment {
  mode: TransportMode;
  price: number;
  duration: number;
  provider?: string;
  busNo?: string;
  available?: boolean;
  traffic?: "Low" | "Medium" | "High";
  coords?: [number, number]; // Added for pivot point visualization
  geometry?: [number, number][]; // Full segment path
  fromName?: string;
  toName?: string;
  distanceKm?: number;
  type?: string; // Internal alias for mode
  line?: string;
  routeNumber?: string;
  boardAt?: string;
  alightAt?: string;
  pickupCoords?: [number, number];
  dropCoords?: [number, number];
  dropName?: string;
  toStop?: string;
}

export interface PivotPoint {
  name: string;
  lat: number;
  lng: number;
  type: "bus" | "metro";
}

export interface RouteOption {
  id: string;
  type: "single" | "split";
  mode?: TransportMode;
  modes?: TransportMode[];
  provider?: string;
  price: number;
  duration: number;
  waitingTime: number;
  savings: number;
  warning?: string;
  label?: string;
  segments: RouteSegment[];
  isONDC?: boolean;
  transactionId?: string;
  geometry?: [number, number][];
  pivotPoints?: PivotPoint[];
}

export interface RouteStrategies {
  fastest: RouteOption[];
  cheapest: RouteOption[];
  optimal: RouteOption[];
}

export interface RideProvider {
  id: string;
  name: string;
  mode: TransportMode;
  type: string;
  price: number;
  waitingTime: number;
  deepLink: string;
  isONDC?: boolean;
  transactionId?: string;
}

export interface CalculationResponse {
  weather: { 
    temp: number; 
    condition: string;
    isRaining: boolean;
    willRain: boolean;
    rainPredictionMessage: string;
  };
  battery: number;
  strategies: RouteStrategies;
  isNight: boolean;
}

export interface SavedRoute {
  id: string;
  source: string;
  destination: string;
  price: number;
  duration: number;
  timestamp: number;
}

export interface AppSettings {
  darkMode: boolean;
  notifications: boolean;
  language: "EN" | "HI" | "KN";
  defaultTransport: TransportMode;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

export interface TravelStats {
  totalRoutes: number;
  favMode: TransportMode | "none";
  totalSpent: number;
  savings: number;
}

export interface ChatRouteOption {
  label: "FASTEST" | "CHEAPEST" | "COMFORTABLE";
  time: number;
  price: number;
  mode: TransportMode;
  route?: RouteOption;
  segments: RouteSegment[];
  bookingMode?: 'uber' | 'auto' | 'metro' | 'ola';
  pickupCoords?: [number, number];
  destinationCoords?: [number, number];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  type: 'text' | 'routeCard' | 'alert';
  content?: string;
  options?: ChatRouteOption[];
}
