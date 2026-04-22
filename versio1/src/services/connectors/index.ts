import { TransportMode } from "../../types";
import { RideBid } from "../providers";
import { FareEngine } from "../fare_engine";

export interface Connector {
  name: string;
  fetchBids(
    origin: string, 
    dest: string, 
    distanceKm: number, 
    durationMin: number, 
    weather: { isRaining: boolean },
    sourceCoords?: { lat: number; lon: number } | null,
    destCoords?: { lat: number; lon: number } | null
  ): Promise<RideBid[]>;
}

/**
 * Namma Yatri Connector
 * Inspired by nammayatri/ny-connectors
 */
export class NYConnector implements Connector {
  name = "Namma Yatri";

  /**
   * Real-time Fetch Tip: 
   * Namma Yatri's open data can sometimes be queried via:
   * https://api.leaderboard.nammayatri.in/v1/search
   */
  async fetchBids(
    origin: string, 
    dest: string, 
    distanceKm: number, 
    durationMin: number, 
    weather: { isRaining: boolean },
    sourceCoords?: { lat: number; lon: number } | null,
    destCoords?: { lat: number; lon: number } | null
  ): Promise<RideBid[]> {
    // In a real implementation, this would hit the Namma Yatri partner API or ONDC Bridge
    const price = FareEngine.calculateProviderPrice("Namma Yatri", "auto", {
      distanceKm,
      durationMin,
      isRaining: weather.isRaining
    });
    
    // Random wait time simulation
    const wait = Math.floor(Math.random() * 5);

    const latLonParams = (sourceCoords && destCoords) 
      ? `&pickup_lat=${sourceCoords.lat}&pickup_lng=${sourceCoords.lon}&dropoff_lat=${destCoords.lat}&dropoff_lng=${destCoords.lon}`
      : `&dest=${encodeURIComponent(dest)}`;

    return [{
      provider: "Namma Yatri",
      mode: "auto" as TransportMode,
      price: Math.round(price),
      type: "Auto",
      eta: wait + 2,
      waitingTime: wait,
      deepLink: `nammayatri://booking?source=routecraft${latLonParams}`,
      isONDC: true
    }];
  }
}

/**
 * Uber Connector
 * Inspired by nammayatri/ny-connectors
 */
export class UberConnector implements Connector {
  name = "Uber";

  async fetchBids(
    origin: string, 
    dest: string, 
    distanceKm: number, 
    durationMin: number, 
    weather: { isRaining: boolean },
    sourceCoords?: { lat: number; lon: number } | null,
    destCoords?: { lat: number; lon: number } | null
  ): Promise<RideBid[]> {
    const carPrice = FareEngine.calculateProviderPrice("Uber", "car", {
      distanceKm,
      durationMin,
      isRaining: weather.isRaining
    });
    const bikePrice = FareEngine.calculateProviderPrice("Uber", "bike", {
      distanceKm,
      durationMin,
      isRaining: weather.isRaining
    });

    const uberPickup = sourceCoords 
      ? `&pickup[latitude]=${sourceCoords.lat}&pickup[longitude]=${sourceCoords.lon}` 
      : `&pickup=my_location`;
    
    const uberDropoff = destCoords 
      ? `&dropoff[latitude]=${destCoords.lat}&dropoff[longitude]=${destCoords.lon}` 
      : `&dropoff[formatted_address]=${encodeURIComponent(dest)}`;

    const uberBase = `${uberPickup}${uberDropoff}`;

    return [
      {
        provider: "Uber",
        mode: "car" as TransportMode,
        price: Math.round(carPrice),
        type: "UberGo",
        eta: 4,
        waitingTime: 3,
        deepLink: `uber://?action=setPickup${uberBase}`
      },
      {
        provider: "Uber",
        mode: "bike" as TransportMode,
        price: Math.round(bikePrice),
        type: "Moto",
        eta: 2,
        waitingTime: 1,
        deepLink: `uber://?action=setPickup${uberBase}`
      }
    ];
  }
}

/**
 * Ola Connector
 * Inspired by nammayatri/ny-connectors
 */
export class OlaConnector implements Connector {
  name = "Ola";

  async fetchBids(
    origin: string, 
    dest: string, 
    distanceKm: number, 
    durationMin: number, 
    weather: { isRaining: boolean },
    sourceCoords?: { lat: number; lon: number } | null,
    destCoords?: { lat: number; lon: number } | null
  ): Promise<RideBid[]> {
    const carPrice = FareEngine.calculateProviderPrice("Ola", "car", {
      distanceKm,
      durationMin,
      isRaining: weather.isRaining
    });
    const autoPrice = FareEngine.calculateProviderPrice("Ola", "auto", {
      distanceKm,
      durationMin,
      isRaining: weather.isRaining
    });

    const latLonParams = (sourceCoords && destCoords)
      ? `&pickup_lat=${sourceCoords.lat}&pickup_lng=${sourceCoords.lon}&dropoff_lat=${destCoords.lat}&dropoff_lng=${destCoords.lon}`
      : `&dest=${encodeURIComponent(dest)}`;

    return [
      {
        provider: "Ola",
        mode: "car" as TransportMode,
        price: Math.round(carPrice),
        type: "Mini",
        eta: 5,
        waitingTime: 4,
        deepLink: `olacabs://book?category=mini${latLonParams}`
      },
      {
        provider: "Ola",
        mode: "auto" as TransportMode,
        price: Math.round(autoPrice),
        type: "Auto",
        eta: 3,
        waitingTime: 2,
        deepLink: `olacabs://book?category=auto${latLonParams}`
      }
    ];
  }
}

/**
 * Transit Connector (Bus & Metro)
 * Inspired by nammayatri/ny-connectors open data
 */
export class TransitConnector implements Connector {
  name = "Public Transit";

  async fetchBids(
    origin: string, 
    dest: string, 
    distanceKm: number, 
    durationMin: number, 
    weather: { isRaining: boolean },
    sourceCoords?: { lat: number; lon: number } | null,
    destCoords?: { lat: number; lon: number } | null
  ): Promise<RideBid[]> {
    // Metro Pricing: 10 base + 5 per 3km
    const metroPrice = 10 + Math.floor(distanceKm / 3) * 5;
    
    // Bus Pricing: 5 base + 3 per 5km
    const busPrice = 5 + Math.floor(distanceKm / 5) * 3;

    return [
      {
        provider: "BMRCL",
        mode: "metro" as TransportMode,
        price: Math.min(60, metroPrice),
        type: "Metro",
        eta: 5,
        waitingTime: 4,
        deepLink: "https://www.bmrcl.co.in/"
      },
      {
        provider: "BMTC",
        mode: "bus" as TransportMode,
        price: Math.min(45, busPrice),
        type: "City Bus",
        eta: 10,
        waitingTime: 8,
        deepLink: "https://mybmtc.karnataka.gov.in/"
      }
    ];
  }
}
