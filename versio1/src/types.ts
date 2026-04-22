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
  segments: RouteSegment[];
  isONDC?: boolean;
  transactionId?: string;
  geometry?: [number, number][];
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
