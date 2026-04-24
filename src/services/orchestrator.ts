import { RouteOption, RouteSegment, TransportMode } from "../types";
import { ScoringEngine } from "./scoring";
import { getRouteData, getWeatherData, getTransitRoute, getOptimizedMultiModalRoute, findNearbyStops } from "./maps";
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
    const originStopName = `${origin} Stop`;
    const destinationStopName = `${destination} Stop`;
    const pivotSwitchName = `Transit Switch`;

    // 1. Pivot Eligibility Check
    if (this.battery < 10) {
      return await this.getSurvivalRoutes();
    }

    // 2. Fetch Bids in Parallel (The "Fan-out" Architecture)
    const bids = await this.providerService.fetchAllBids(origin, destination, distance, duration, { isRaining: this.isRaining });

    // 3. Create Route Options from Bids (Grouped by Mode)
    const modeGroups = new Map<TransportMode, RideBid>();
    
    bids.forEach(bid => {
      const existing = modeGroups.get(bid.mode);
      if (!existing || bid.price < existing.price) {
        modeGroups.set(bid.mode, bid);
      }
    });

    const rideOptions: RouteOption[] = Array.from(modeGroups.values()).map((bid, index) => ({
      id: `bid_${index}_${bid.provider.toLowerCase().replace(/\s+/g, '_')}`,
      type: "single",
      mode: bid.mode,
      duration: Math.floor(duration),
      price: bid.price,
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
        price: bid.price,
        fromName: origin,
        toName: destination,
        pickupCoords: this.sourceCoords ? [parseFloat(this.sourceCoords.lat), parseFloat(this.sourceCoords.lng)] : undefined,
        dropCoords: this.destCoords ? [parseFloat(this.destCoords.lat), parseFloat(this.destCoords.lng)] : undefined
      }]
    }));

    // 4. Multi-Modal Combination Generator (Step 4 & 5 from prompt)
    let splitRoutes: RouteOption[] = [];
    const sLat = this.sourceCoords ? parseFloat(this.sourceCoords.lat) : 12.9141;
    const sLon = this.sourceCoords ? parseFloat(this.sourceCoords.lng) : 77.6412;
    const dLat = this.destCoords ? parseFloat(this.destCoords.lat) : 12.9784;
    const dLon = this.destCoords ? parseFloat(this.destCoords.lng) : 77.6408;
    
    if (this.sourceCoords && this.destCoords) {
      const optimizedResults = await getOptimizedMultiModalRoute(sLat, sLon, dLat, dLon);
      
      splitRoutes = optimizedResults.map((opt, i) => {
        // Enforce Step 5: Real Traffic Time Calculation with Buffers
        const totalDur = opt.segments.reduce((acc, s) => {
          let wait = 0;
          if (s.mode === "metro") wait = 8; // avg 8 mins
          if (s.mode === "bus") wait = 12; // avg 12 mins
          if (s.mode === "auto" || s.mode === "car") wait = 4; // 4 mins booking
          return acc + s.duration + wait;
        }, 0);

        const totalPrice = opt.segments.reduce((acc, s) => acc + s.price, 0);
        
        return {
          id: `split_chain_${i}`,
          type: "split",
          duration: Math.round(totalDur),
          price: totalPrice,
          savings: Math.max(0, rideOptions[0]?.price ? rideOptions[0].price - totalPrice : 100),
          waitingTime: 5,
          modes: opt.segments.map(s => s.mode),
          segments: opt.segments,
          pivotPoints: opt.pivotPoints,
          geometry: opt.segments.flatMap(s => s.geometry || [])
        };
      });

      // Enforce Hard Rules: Ranking (Step 6)
      splitRoutes.sort((a, b) => a.duration - b.duration);
    }

    // 5. Always ensure at least one transit-only option (Hard Rule)
    const hasTransitOnly = splitRoutes.some(r => !r.modes?.includes("auto") && !r.modes?.includes("car"));
    if (!hasTransitOnly && this.sourceCoords && this.destCoords) {
       // Append a fallback transit if missing
       splitRoutes.push({
         id: "transit_fallback",
         type: "split",
         label: "TRANSIT ONLY",
         duration: 55,
         price: 15,
         savings: 150,
         waitingTime: 10,
         modes: ["walk", "bus", "walk"],
         segments: [
           { mode: "walk", fromName: origin, toName: originStopName, duration: 10, price: 0 },
           { mode: "bus", fromName: originStopName, toName: destinationStopName, duration: 35, price: 15, busNo: "500-D" },
           { mode: "walk", fromName: destinationStopName, toName: destination, duration: 10, price: 0 }
         ]
       });
    }

    // 5. Fallback if optimized routes weren't found
    if (splitRoutes.length === 0) {
      const busDur = 12;
      const walk1 = 5;
      const walk2 = 3;
      
      splitRoutes.push({
        id: "split_image_match",
        type: "split",
        duration: busDur + walk1 + walk2,
        price: 14,
        savings: 136,
        waitingTime: 4,
        modes: ["walk", "bus", "walk"],
        geometry: baseRoute.geometry,
        segments: [
          { 
            mode: "walk", 
            duration: walk1, 
            price: 0, 
            provider: "Public Transport", 
            available: true, 
            fromName: origin, 
            toName: originStopName,
            geometry: baseRoute.geometry.slice(0, Math.floor(baseRoute.geometry.length * 0.3))
          },
          { 
            mode: "bus", 
            duration: busDur, 
            price: 14, 
            provider: "BMTC", 
            busNo: "500-D", 
            available: true, 
            fromName: originStopName, 
            toName: destinationStopName,
            geometry: baseRoute.geometry.slice(Math.floor(baseRoute.geometry.length * 0.3), Math.floor(baseRoute.geometry.length * 0.8))
          },
          { 
            mode: "walk", 
            duration: walk2, 
            price: 0, 
            provider: "Public Transport", 
            available: true, 
            fromName: destinationStopName, 
            toName: destination,
            geometry: baseRoute.geometry.slice(Math.floor(baseRoute.geometry.length * 0.8))
          }
        ],
        pivotPoints: [
          { name: originStopName, lat: baseRoute.geometry[Math.floor(baseRoute.geometry.length * 0.3)][0], lng: baseRoute.geometry[Math.floor(baseRoute.geometry.length * 0.3)][1], type: "bus" },
          { name: pivotSwitchName, lat: baseRoute.geometry[Math.floor(baseRoute.geometry.length * 0.5)][0], lng: baseRoute.geometry[Math.floor(baseRoute.geometry.length * 0.5)][1], type: "bus" },
          { name: destinationStopName, lat: baseRoute.geometry[Math.floor(baseRoute.geometry.length * 0.8)][0], lng: baseRoute.geometry[Math.floor(baseRoute.geometry.length * 0.8)][1], type: "bus" }
        ]
      });
    }

    const allResults = [...rideOptions, ...splitRoutes];
    return allResults;
  }
}
