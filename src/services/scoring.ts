import { RouteOption, RouteSegment, TransportMode } from "../types";

export class ScoringEngine {
  /**
   * Multi-criteria optimization logic.
   * Implementation: Weighted Score Model
   */
  static calculateBestScore(route: RouteOption, maxPrice: number, maxDuration: number): number {
    // Weights (Dynamic based on system design)
    const costWeight = 0.4;
    const timeWeight = 0.4;
    const transferWeight = 0.1;
    const walkWeight = 0.1;

    // Normalization (0 to 1)
    const normalizedCost = maxPrice > 0 ? route.price / maxPrice : 0;
    const normalizedTime = maxDuration > 0 ? route.duration / maxDuration : 0;
    
    // Penalties
    const transfers = route.type === "split" ? route.segments.filter(s => s.mode !== "walk").length - 1 : 0;
    const walkingDistance = route.segments
      .filter(s => s.mode === "walk")
      .reduce((sum, s) => sum + (s.duration * 0.08), 0); // Approx 5km/h -> 0.083 km/min

    return (costWeight * normalizedCost) + 
           (timeWeight * normalizedTime) + 
           (transferWeight * (transfers / 3)) + 
           (walkWeight * (walkingDistance / 2));
  }

  static getFastest(routes: RouteOption[]): RouteOption[] {
    return [...routes].sort((a, b) => a.duration - b.duration);
  }

  static getCheapest(routes: RouteOption[]): RouteOption[] {
    return [...routes].sort((a, b) => a.price - b.price);
  }

  static getOptimal(routes: RouteOption[]): RouteOption[] {
    if (routes.length === 0) return [];
    
    const maxPrice = Math.max(...routes.map(r => r.price), 1);
    const maxDuration = Math.max(...routes.map(r => r.duration), 1);

    return [...routes].sort((a, b) => 
      this.calculateBestScore(a, maxPrice, maxDuration) - 
      this.calculateBestScore(b, maxPrice, maxDuration)
    );
  }
}
