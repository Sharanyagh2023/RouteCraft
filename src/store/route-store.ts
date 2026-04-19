"use client";

import { create } from "zustand";
import { RoutePlan, WeatherState } from "@/types/route";

type LocationSelection = {
  name: string;
  lat: number;
  lng: number;
};

type RouteStore = {
  source?: LocationSelection;
  destination?: LocationSelection;
  sourceText: string;
  destinationText: string;
  weather?: WeatherState;
  plans: RoutePlan[];
  selectedPlanId?: string;
  setSourceText: (value: string) => void;
  setDestinationText: (value: string) => void;
  setSource: (value: LocationSelection) => void;
  setDestination: (value: LocationSelection) => void;
  swapLocations: () => void;
  setWeather: (weather?: WeatherState) => void;
  setPlans: (plans: RoutePlan[]) => void;
  setSelectedPlan: (planId?: string) => void;
};

export const useRouteStore = create<RouteStore>((set) => ({
  source: undefined,
  destination: undefined,
  sourceText: "",
  destinationText: "",
  plans: [],
  setSourceText: (value) => set({ sourceText: value, source: undefined }),
  setDestinationText: (value) => set({ destinationText: value, destination: undefined }),
  setSource: (value) => set({ source: value, sourceText: value.name }),
  setDestination: (value) => set({ destination: value, destinationText: value.name }),
  swapLocations: () =>
    set((state) => ({
      source: state.destination,
      destination: state.source,
      sourceText: state.destinationText,
      destinationText: state.sourceText,
    })),
  setWeather: (weather) => set({ weather }),
  setPlans: (plans) => set({ plans }),
  setSelectedPlan: (planId) => set({ selectedPlanId: planId }),
}));
