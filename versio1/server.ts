import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { RouteOrchestrator } from "./src/services/orchestrator";
import { ProviderService } from "./src/services/providers";
import { ScoringEngine } from "./src/services/scoring";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { getRouteData, geocode, getWeatherData, findNearbyStops } from "./src/services/maps";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ONDC In-Memory Store (Production should use Redis or Firestore)
  const ondcResults = new Map<string, any[]>();

  // ONDC Callback Endpoint (Beckn Protocol)
  app.post("/api/ondc/callback", (req, res) => {
    const { context, message } = req.body;
    const transactionId = context.transaction_id;
    
    console.log(`[ONDC Callback] Received results for ${transactionId}`);
    
    if (message?.catalog?.providers) {
      const currentResults = ondcResults.get(transactionId) || [];
      const newBids = message.catalog.providers.flatMap((p: any) => 
        p.items.map((item: any) => ({
          provider: p.descriptor.name,
          price: parseFloat(item.price.value),
          type: item.descriptor.name,
          eta: 5, // Simulated
          waitingTime: 5,
          deepLink: `nammayatri://booking?id=${item.id}`, // Example
          isONDC: true,
          transactionId
        }))
      );
      
      ondcResults.set(transactionId, [...currentResults, ...newBids]);
    }
    
    res.status(200).json({ message: { ack: { status: "ACK" } } });
  });

  // Fetch ONDC results for a specific transaction
  app.get("/api/ondc/results/:transactionId", (req, res) => {
    const { transactionId } = req.params;
    const results = ondcResults.get(transactionId) || [];
    res.json(results);
  });

  app.get("/api/nearby-stops", async (req, res) => {
    const { lat, lon, radius } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "Missing coordinates" });
    try {
      const stops = await findNearbyStops(
        parseFloat(lat as string), 
        parseFloat(lon as string), 
        radius ? parseInt(radius as string) : 1500
      );
      res.json(stops);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch nearby stops" });
    }
  });

  // Dummy API for Ride-Hailing (Now using ProviderService for consistency)
  app.get("/api/ride-providers", async (req, res) => {
    const { destination, origin, isRaining } = req.query;
    const providerService = new ProviderService();
    
    try {
      // Calculate distance for realistic pricing approximation
      const routeData = await getRouteData(origin as string, destination as string);
      const distanceKm = routeData.distance_km || 5; // Fallback to 5km if routing fails

      const bids = await providerService.fetchAllBids(
        (origin as string) || "Current Location", 
        destination as string, 
        distanceKm,
        routeData.duration_min,
        { isRaining: isRaining === "true" }
      );
      
      // Map to the format the frontend expects
      const formattedProviders = bids.map(bid => ({
        id: bid.provider.toLowerCase().replace(/\s+/g, '-'),
        name: bid.provider,
        price: bid.price,
        waitingTime: bid.waitingTime,
        deepLink: bid.deepLink,
        isONDC: bid.isONDC
      }));

      res.json(formattedProviders);
    } catch (error) {
      console.error("Error fetching ride providers:", error);
      res.status(500).json({ error: "Failed to fetch providers" });
    }
  });

  // Trip History & Preference Layer (Demo Implementation)
  const tripHistory: any[] = [];
  let userPreferences = {
    optimization_priority: "optimal", // default
    preferred_modes: ["auto", "metro", "car", "bike"]
  };

  app.get("/api/trips", (req, res) => {
    res.json(tripHistory);
  });

  app.post("/api/trips", (req, res) => {
    const { route } = req.body;
    const trip = {
      id: `trip_${Date.now()}`,
      timestamp: new Date().toISOString(),
      route
    };
    tripHistory.unshift(trip);
    res.status(201).json(trip);
  });

  app.get("/api/preferences", (req, res) => {
    res.json(userPreferences);
  });

  app.put("/api/preferences", (req, res) => {
    userPreferences = { ...userPreferences, ...req.body };
    res.json({ status: "updated", preferences: userPreferences });
  });

  // Health Check
  app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString(), engine: "RouteCraft-v1-Hybrid" });
  });

  // Industrial Orchestrator (TS Implementation of your Microservices Diagram)
  // API Layer: Interaction Handlers
  app.post("/api/v1/chat", async (req, res) => {
    const { message } = req.body;
    
    // Efficient Keyword Extraction (Rule-based NLP Pipeline)
    const normalized = message.toLowerCase();
    let source = "";
    let destination = "";
    
    if (normalized.includes("from") && normalized.includes("to")) {
      const match = normalized.match(/from (.*) to (.*)/);
      if (match) {
        source = match[1];
        destination = match[2];
      }
    }

    res.json({
      intent: "route_request",
      entities: { source, destination },
      suggestedAction: source && destination ? "orchestrate" : "ask_clarification"
    });
  });

  app.post("/api/v1/orchestrate", async (req, res) => {
    try {
      const { origin, destination, context, sourceCoords, destCoords } = req.body;
      
      // 1. Fetch Routing Data (Primary duration for weather lookahead)
      const routeData = await getRouteData(origin, destination, sourceCoords, destCoords);
      const durationMin = routeData.duration_min;
      
      // Extract coordinates from routing data if not provided
      const resolvedSourceCoords = sourceCoords || (routeData.geometry?.[0] ? { lat: routeData.geometry[0][0].toString(), lon: routeData.geometry[0][1].toString() } : null);
      const resolvedDestCoords = destCoords || (routeData.geometry?.[routeData.geometry.length - 1] ? { lat: routeData.geometry[routeData.geometry.length - 1][0].toString(), lon: routeData.geometry[routeData.geometry.length - 1][1].toString() } : null);

      // 2. Fetch Predictive Weather based on trip duration
      // Priority coords: resolvedSourceCoords -> Bangalore
      const weatherCoords = resolvedSourceCoords || { lat: "12.9716", lon: "77.5946" };
      const weather = await getWeatherData(weatherCoords.lat, weatherCoords.lon, durationMin);

      // 3. Service Layer: Instantiate Orchestrator with autonomous context
      const orchestrator = new RouteOrchestrator({ 
        battery: context?.battery || 85,
        raining: weather?.isRaining || false,
        sourceCoords,
        destCoords
      });

      // 4. Business Logic: Generate Multi-Modal Plans
      const results = await orchestrator.generateSplitRoutes(origin, destination);
      
      // 5. Schema Layer: Map to Optimization Strategies
      const strategies = {
        fastest: ScoringEngine.getFastest(results),
        cheapest: ScoringEngine.getCheapest(results),
        optimal: ScoringEngine.getOptimal(results)
      };

      const now = new Date();
      const hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(now));

      res.json({
        strategies,
        weather: weather || { temp: 28, condition: "Clear", isRaining: false, willRain: false, rainPredictionMessage: "Predictive weather unavailable." },
        battery: context?.battery || 100,
        isNight: hour >= 22 || hour <= 5,
        sourceCoords: resolvedSourceCoords,
        destCoords: resolvedDestCoords,
        provider: "RouteCraft Predictive-Hybrid Engine"
      });
    } catch (error) {
      console.error("Orchestration Error:", error);
      res.status(500).json({ error: "Failed to optimize route plan" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
