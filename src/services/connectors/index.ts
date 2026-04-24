import { TransportMode } from "../../types";
import { RideBid } from "../providers";
import { FareEngine } from "../fare_engine";
import { NammaYatriService, NYRideBid } from "../nammaYatriService";
import { geocode } from "../maps";

export interface Connector {
  name: string;
  fetchBids(origin: string, dest: string, distanceKm: number, durationMin: number, weather: { isRaining: boolean }, context?: { batteryLevel: number }): Promise<RideBid[]>;
}

/**
 * Namma Yatri Connector
 * INTEGRATED with MCP Server via NammaYatriService
 */
export class NYConnector implements Connector {
  name = "Namma Yatri";

  async fetchBids(origin: string, dest: string, distanceKm: number, durationMin: number, weather: { isRaining: boolean }, context?: { batteryLevel: number }): Promise<RideBid[]> {
    try {
      // 1. Geocode strings to get coordinates for MCP tool
      let [sourceCoords, destCoords] = await Promise.all([
        geocode(origin),
        geocode(dest)
      ]);

      // Resilience: If geocoding is rate-limited (429), use Bangalore baseline to ensure search isn't blocked
      if (!sourceCoords) {
        console.warn(`[NYConnector] Geocoding failed for origin: ${origin}. Using fallback baseline.`);
        sourceCoords = { lat: "12.9716", lng: "77.5946", name: "Bangalore" };
      }
      if (!destCoords) {
        console.warn(`[NYConnector] Geocoding failed for destination: ${dest}. Using fallback baseline.`);
        destCoords = { lat: "12.9279", lng: "77.6271", name: "Destination" };
      }

      // 2. Call the MCP-integrated Service
      const nyBids: NYRideBid[] = await NammaYatriService.searchRides(
        { lat: parseFloat(sourceCoords.lat), lon: parseFloat(sourceCoords.lng) },
        { lat: parseFloat(destCoords.lat), lon: parseFloat(destCoords.lng) },
        { 
          isRaining: weather.isRaining, 
          batteryLevel: context?.batteryLevel || 100 
        },
        distanceKm
      );

      // 3. Map to internal application RideBid interface for UI compatibility
      return nyBids.map(bid => {
        // Construct Direct Protocol Link for the Namma Yatri App
        // nammayatri://booking is the standard intent for ride booking
        const baseUrl = "nammayatri://booking";
        const params = new URLSearchParams({
          sLat: String(sourceCoords!.lat),
          sLng: String(sourceCoords!.lng),
          dLat: String(destCoords!.lat),
          dLng: String(destCoords!.lng),
          sName: origin,
          dName: dest,
          utm_source: "routecraft",
          // Add extra aliases for different app versions/platforms
          pickup_lat: String(sourceCoords!.lat),
          pickup_lng: String(sourceCoords!.lng),
          drop_lat: String(destCoords!.lat),
          drop_lng: String(destCoords!.lng)
        });
        
        return {
          id: `ny-${bid.vehicleType}-${Math.random()}`,
          provider: "Namma Yatri", // Constant name for easier matching
          name: "Namma Yatri",
          mode: bid.vehicleType.toLowerCase().includes("auto") ? "auto" : ("car" as TransportMode),
          price: bid.price,
          type: bid.vehicleType,
          eta: bid.etaMinutes,
          waitingTime: bid.etaMinutes - 2 > 0 ? bid.etaMinutes - 2 : 1,
          deepLink: `${baseUrl}?${params.toString()}`,
          isONDC: true
        };
      });

    } catch (error) {
      console.error("[NYConnector] Integration Error:", error);
      // Fallback: If integration fails (tunnel offline), return empty to keep app running
      return [];
    }
  }
}

/**
 * Uber Connector
 * Inspired by nammayatri/ny-connectors
 */
export class UberConnector implements Connector {
  name = "Uber";

  async fetchBids(origin: string, dest: string, distanceKm: number, durationMin: number, weather: { isRaining: boolean }): Promise<RideBid[]> {
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

    // Get coordinates for precision
    const [sourceCoords, destCoords] = await Promise.all([
      geocode(origin),
      geocode(dest)
    ]);

    const sLat = sourceCoords?.lat || "";
    const sLng = sourceCoords?.lng || "";
    const dLat = destCoords?.lat || "";
    const dLng = destCoords?.lng || "";

    const uberParams = new URLSearchParams({
      action: "setPickup",
      pickup: "my_location",
      "pickup[latitude]": sLat,
      "pickup[longitude]": sLng,
      "pickup[nickname]": origin,
      "dropoff[latitude]": dLat,
      "dropoff[longitude]": dLng,
      "dropoff[nickname]": dest,
      "dropoff[formatted_address]": dest
    });

    return [
      {
        provider: "Uber",
        mode: "car" as TransportMode,
        price: Math.round(carPrice),
        type: "UberGo",
        eta: 4,
        waitingTime: 3,
        deepLink: `uber://?${uberParams.toString()}`
      },
      {
        provider: "Uber",
        mode: "bike" as TransportMode,
        price: Math.round(bikePrice),
        type: "Moto",
        eta: 2,
        waitingTime: 1,
        deepLink: `uber://?${uberParams.toString()}`
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

  async fetchBids(origin: string, dest: string, distanceKm: number, durationMin: number, weather: { isRaining: boolean }): Promise<RideBid[]> {
    const [sourceCoords, destCoords] = await Promise.all([
      geocode(origin),
      geocode(dest)
    ]);

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

    const sLat = sourceCoords?.lat || "";
    const sLng = sourceCoords?.lng || "";
    const dLat = destCoords?.lat || "";
    const dLng = destCoords?.lng || "";

    // Ola usually supports latitude/longitude in deep links
    const olaParams = new URLSearchParams({
      pickup_lat: sLat,
      pickup_lng: sLng,
      pickup_name: origin,
      drop_lat: dLat,
      drop_lng: dLng,
      drop_name: dest
    });

    return [
      {
        provider: "Ola",
        mode: "car" as TransportMode,
        price: Math.round(carPrice),
        type: "Mini",
        eta: 5,
        waitingTime: 4,
        deepLink: `ola://booking?${olaParams.toString()}`
      },
      {
        provider: "Ola",
        mode: "auto" as TransportMode,
        price: Math.round(autoPrice),
        type: "Auto",
        eta: 3,
        waitingTime: 2,
        deepLink: `ola://booking?${olaParams.toString()}`
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

  async fetchBids(origin: string, dest: string, distanceKm: number, durationMin: number, weather: { isRaining: boolean }): Promise<RideBid[]> {
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
