import { TransportMode } from "../types";

export interface PricingContext {
  distanceKm: number;
  durationMin?: number; // Actual travel time from OSRM
  isRaining?: boolean;
  isWeekend?: boolean;
}

export class FareEngine {
  /**
   * Deterministic pricing model approximating real-time prices for major providers.
   * Based on Bangalore (India) market rates and real-world surge patterns.
   */
  static calculateProviderPrice(
    provider: string,
    mode: TransportMode,
    context: PricingContext
  ): number {
    const { distanceKm, durationMin, isRaining } = context;

    // 1. Determine Current Bangalore Time (Asia/Kolkata)
    const now = new Date();
    const bglTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false
    }).format(now);
    const timeOfDay = parseInt(bglTime);
    
    // 2. Base Rate Calculation (Market Standard)
    let basePrice = 0;
    let ratePerKm = 0;
    let minFare = 0;

    const normalizedProvider = provider.toLowerCase();

    // Provider Specific Models
    if (normalizedProvider.includes("uber")) {
      switch (mode) {
        case "bike": basePrice = 30; ratePerKm = 10; minFare = 45; break;
        case "auto": basePrice = 50; ratePerKm = 15; minFare = 65; break;
        case "car": basePrice = 100; ratePerKm = 24; minFare = 160; break;
      }
    } else if (normalizedProvider.includes("ola")) {
      switch (mode) {
        case "bike": basePrice = 25; ratePerKm = 9.5; minFare = 40; break;
        case "auto": basePrice = 45; ratePerKm = 14; minFare = 60; break;
        case "car": basePrice = 95; ratePerKm = 23; minFare = 150; break;
      }
    } else if (normalizedProvider.includes("namma") || normalizedProvider.includes("ondc")) {
      // Government / ONDC Rates (Aggressive transparency)
      switch (mode) {
        case "bike": basePrice = 20; ratePerKm = 8; minFare = 35; break;
        case "auto": basePrice = 35; ratePerKm = 16; minFare = 35; break;
        case "car": basePrice = 80; ratePerKm = 20; minFare = 110; break;
      }
    }

    // 3. Distance Calculation
    let total = basePrice + (distanceKm * ratePerKm);
    total = Math.max(total, minFare);

    // 4. Dynamic Surge Predictor
    let surgeMultiplier = 1.0;

    // Peak Hour Surge (Bangalore Specific)
    const isPeakMorning = timeOfDay >= 8 && timeOfDay <= 11;
    const isPeakEvening = timeOfDay >= 17 && timeOfDay <= 21;
    const isLateNight = timeOfDay >= 23 || timeOfDay <= 4;
    
    if (isPeakMorning || isPeakEvening) {
      const peakFactor = normalizedProvider.includes("ondc") ? 1.2 : 1.6;
      surgeMultiplier *= peakFactor;
    } else if (isLateNight) {
      surgeMultiplier *= 1.4; // Night shift charges
    }

    // Weather Surge
    if (isRaining) {
      surgeMultiplier *= 1.45;
    }

    // Traffic Intensity Sensitivity
    if (durationMin && distanceKm > 0) {
      const avgSpeed = (distanceKm / (durationMin / 60));
      if (avgSpeed < 12) { // Severe Traffic (speed < 12km/h)
        surgeMultiplier *= 1.25;
      } else if (avgSpeed < 18) { // Moderate Traffic
        surgeMultiplier *= 1.1;
      }
    }

    // 5. Volatility Index (±4% jitter to mimic real-time fluctuation)
    // Using an ID-safe seed or just Math.random for real-time feel
    const jitter = 0.96 + (Math.random() * 0.08); 

    return Math.round(total * surgeMultiplier * jitter);
  }

  /**
   * Generic pricing for non-provider specific modes (Public Transport)
   */
  static calculatePrice(mode: TransportMode, distanceKm: number): number {
    switch (mode) {
      case "metro":
        // BMRCL: 10 base + incremental per station (approx 3/km)
        return 10 + Math.round(distanceKm * 3.2);
      case "bus":
        // BMTC: 5 base + approx 2/km
        return 5 + Math.round(distanceKm * 2.1);
      case "walk":
        return 0;
      default:
        // Use a generic mid-tier rate if no provider is specified
        return this.calculateProviderPrice("Namma Yatri", mode, { distanceKm });
    }
  }

  static getModeDescription(mode: TransportMode): string {
    switch (mode) {
      case "bike": return "Quick solo ride";
      case "auto": return "Standard rickshaw";
      case "car": return "Comfortable sedan";
      case "metro": return "Namma Metro (Split)";
      case "bus": return "BMTC Bus (Split)";
      case "walk": return "Walking";
      default: return "";
    }
  }
}
