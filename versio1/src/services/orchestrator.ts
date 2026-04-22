import { RouteOption, RouteSegment, TransportMode } from "../types";
import { ScoringEngine } from "./scoring";
import { getRouteData, getWeatherData, getTransitRoute, findNearbyStops } from "./maps";
import { ProviderService, RideBid } from "./providers";
import { FareEngine } from "./fare_engine";

export class RouteOrchestrator {
  private battery: number;
  private isRaining: boolean;
  private sourceCoords?: any;
  private destCoords?: any;
  private providerService: ProviderService;

  constructor(context: { battery: number; raining: boolean; sourceCoords?: any; destCoords?: any }) {
    this.battery = context.battery;
    this.isRaining = context.raining;
    this.sourceCoords = context.sourceCoords;
    this.destCoords = context.destCoords;
    this.providerService = new ProviderService();
  }

  async getSurvivalRoutes(): Promise<RouteOption[]> {
    return [
      {
        id: "survival_001",
        type: "single",
        duration: 25,
        price: 0,
        savings: 100,
        waitingTime: 0,
        segments: [{ mode: "walk", duration: 25, price: 0 }],
      }
    ];
  }

  async generateSplitRoutes(origin: string, destination: string): Promise<RouteOption[]> {
    const baseRoute = await getRouteData(origin, destination, this.sourceCoords, this.destCoords);
    const distance = baseRoute.distance_km;
    const duration = baseRoute.duration_min;

    // 1. Pivot Eligibility Check
    if (this.battery < 10) {
      return await this.getSurvivalRoutes();
    }

    // 2. Fetch Bids in Parallel (The "Fan-out" Architecture)
    const bids = await this.providerService.fetchAllBids(
      origin, 
      destination, 
      distance, 
      duration, 
      { isRaining: this.isRaining },
      this.sourceCoords,
      this.destCoords
    );

    // 3. Create Route Options from Bids (Grouped by Mode)
    const modeGroups = new Map<TransportMode, RideBid>();
    
    bids.forEach(bid => {
      const existing = modeGroups.get(bid.mode);
      // Keep the best price for each mode, but prioritized by provider logic
      if (!existing || bid.price < existing.price) {
        modeGroups.set(bid.mode, bid);
      }
    });

    const rideOptions: RouteOption[] = Array.from(modeGroups.values()).map((bid, index) => ({
      id: `bid_${index}_${bid.provider.toLowerCase().replace(/\s+/g, '_')}`,
      type: "single",
      mode: bid.mode,
      duration: Math.floor(duration), // Duration now includes traffic factor from maps service
      price: bid.price, // Trust the provider-specific pricing from ProviderService
      savings: 0,
      waitingTime: bid.waitingTime,
      provider: bid.provider,
      isONDC: bid.isONDC,
      transactionId: bid.transactionId,
      geometry: baseRoute.geometry,
      segments: [{ 
        mode: bid.mode, 
        provider: bid.provider, 
        duration: Math.floor(duration), 
        price: bid.price
      }]
    }));

    // 4. Real Split Logic using Google Transit API
    let splitRoutes: RouteOption[] = [];
    
    if (!this.isRaining && this.battery > 20) {
      const transitData = await getTransitRoute(origin, destination, this.sourceCoords, this.destCoords);
      
      if (transitData && transitData.steps.length > 0) {
        const segments: RouteSegment[] = transitData.steps.map((step, idx) => ({
          mode: step.mode,
          duration: step.duration,
          price: FareEngine.calculatePrice(step.mode, step.distance),
          provider: step.provider,
          busNo: step.busNo,
          available: true,
          coords: step.start_location || (baseRoute.geometry && idx > 0 ? 
            baseRoute.geometry[Math.floor(baseRoute.geometry.length * (idx / transitData.steps.length))] : 
            undefined)
        }));

        // Optimization: If the first segment is a long walk (> 1km), suggest an Auto pivot
        if (segments[0].mode === "walk" && transitData.steps[0].distance > 0.8) {
          const autoBid = bids.find(b => b.mode === "auto");
          if (autoBid) {
            segments[0] = {
              mode: "auto",
              duration: Math.round(transitData.steps[0].duration * 0.6),
              price: FareEngine.calculatePrice("auto", transitData.steps[0].distance),
              provider: autoBid.provider,
              available: true
            };
          }
        }

        const totalPrice = segments.reduce((acc, s) => acc + s.price, 0);
        const totalDuration = segments.reduce((acc, s) => acc + s.duration, 0);
        const directCheapest = rideOptions.length > 0 ? Math.min(...rideOptions.map(r => r.price)) : 200;

        splitRoutes.push({
          id: "real_split_001",
          type: "split",
          duration: totalDuration,
          price: totalPrice,
          savings: Math.max(0, directCheapest - totalPrice),
          waitingTime: 5,
          modes: segments.map(s => s.mode),
          segments,
          geometry: baseRoute.geometry
        });
      }
    }

    // 5. Advanced Split Logic (Using Real Transit Stop Data)
    const sLat = parseFloat(this.sourceCoords?.lat || "12.9716");
    const sLon = parseFloat(this.sourceCoords?.lon || "77.5946");
    const dLat = parseFloat(this.destCoords?.lat || "12.9279");
    const dLon = parseFloat(this.destCoords?.lon || "77.6271");

    // Fetch real nearby stops around source and destination
    try {
      const sourceStops = await findNearbyStops(sLat, sLon, 800);
      const destStops = await findNearbyStops(dLat, dLon, 800);

      if (sourceStops.length > 0 && destStops.length > 0) {
        // 1. REAL BUS ROUTE
        const startBus = sourceStops.find(s => s.type === "bus") || sourceStops[0];
        const endBus = destStops.find(s => s.type === "bus") || destStops[0];

        splitRoutes.push({
          id: `split_bus_real_${startBus.id}`,
          type: "split",
          duration: Math.round(duration * 1.4),
          price: 45, 
          savings: 140,
          waitingTime: 7,
          modes: ["walk", "bus", "auto"],
          geometry: baseRoute.geometry,
          segments: [
            { 
              mode: "walk", 
              duration: 8, 
              price: 0, 
              provider: `Walk to ${startBus.name}`, 
              available: true,
              coords: [sLat, sLon]
            },
            { 
              mode: "bus", 
              duration: Math.round(duration * 0.9), 
              price: 15, 
              provider: `BMTC (${startBus.name})`, 
              available: true,
              coords: [startBus.lat, startBus.lon]
            },
            { 
              mode: "auto", 
              duration: 12, 
              price: 30, 
              provider: `Last Mile from ${endBus.name}`, 
              available: true,
              coords: [endBus.lat, endBus.lon]
            }
          ]
        });

        // 2. REAL METRO ROUTE
        const startMetro = sourceStops.find(s => s.type === "metro");
        const endMetro = destStops.find(s => s.type === "metro");

        if (startMetro && endMetro) {
          splitRoutes.push({
            id: `split_metro_real_${startMetro.id}`,
            type: "split",
            duration: Math.round(duration * 0.8),
            price: 120, // Auto + Metro + Auto
            savings: 60,
            waitingTime: 4,
            modes: ["auto", "metro", "auto"],
            geometry: baseRoute.geometry,
            segments: [
              { 
                mode: "auto", 
                duration: 6, 
                price: 50, 
                provider: `Auto to ${startMetro.name}`, 
                available: true,
                coords: [sLat, sLon]
              },
              { 
                mode: "metro", 
                duration: Math.round(duration * 0.5), 
                price: 30, 
                provider: `Namma Metro (${startMetro.name})`, 
                available: true,
                coords: [startMetro.lat, startMetro.lon]
              },
              { 
                mode: "auto", 
                duration: 6, 
                price: 40, 
                provider: `Auto to Destination from ${endMetro.name}`, 
                available: true,
                coords: [endMetro.lat, endMetro.lon]
              }
            ]
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch real stops for split route:", e);
    }

    // Keep the "Express Split" (Auto -> Metro -> Auto) for variety
    const metroDur = Math.round(duration * 0.65);
    splitRoutes.push({
      id: "split_rapid_metro",
      type: "split",
      duration: metroDur + 12, // 6 min auto + 6 min auto
      price: 110, // 40 (auto) + 30 (metro) + 40 (auto)
      savings: 80,
      waitingTime: 4,
      modes: ["auto", "metro", "auto"],
      geometry: baseRoute.geometry,
      segments: [
        { 
          mode: "auto", 
          duration: 6, 
          price: 40, 
          provider: "Namma Yatri Auto (First Mile)", 
          available: true,
          coords: [sLat, sLon]
        },
        { 
          mode: "metro", 
          duration: metroDur, 
          price: 30, 
          provider: "Namma Metro (Purple Line)", 
          available: true,
          coords: [sLat + (dLat - sLat) * 0.15, sLon + (dLon - sLon) * 0.15]
        },
        { 
          mode: "auto", 
          duration: 6, 
          price: 40, 
          provider: "Uber Auto (Last Mile)", 
          available: true,
          coords: [dLat - (dLat - sLat) * 0.15, dLon - (dLon - sLon) * 0.15]
        }
      ]
    });

    // "Public Economy" (Walk -> Bus -> Auto -> Walk)
    const busDur = Math.round(duration * 1.8);
    splitRoutes.push({
      id: "split_economy_bus",
      type: "split",
      duration: busDur + 10,
      price: 45, // 0 (walk) + 15 (bus) + 30 (auto)
      savings: 145,
      waitingTime: 8,
      modes: ["walk", "bus", "auto", "walk"],
      geometry: baseRoute.geometry,
      segments: [
        { 
          mode: "walk", 
          duration: 5, 
          price: 0, 
          provider: "Walk to Stop", 
          available: true,
          coords: [sLat, sLon]
        },
        { 
          mode: "bus", 
          duration: busDur, 
          price: 15, 
          provider: "BMTC Route 500C", 
          available: true,
          coords: [sLat + (dLat - sLat) * 0.1, sLon + (dLon - sLon) * 0.1]
        },
        { 
          mode: "auto", 
          duration: 5, 
          price: 30, 
          provider: "Local Auto", 
          available: true,
          coords: [dLat - (dLat - sLat) * 0.1, dLon - (dLon - sLon) * 0.1]
        },
        { 
          mode: "walk", 
          duration: 2, 
          price: 0, 
          provider: "Walk to Destination", 
          available: true,
          coords: [dLat - (dLat - sLat) * 0.02, dLon - (dLon - sLon) * 0.02]
        }
      ]
    });

    const allResults = [...rideOptions, ...splitRoutes];
    return allResults;
  }
}
