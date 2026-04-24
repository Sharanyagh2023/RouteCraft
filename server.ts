import dotenv from "dotenv";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { RouteOrchestrator } from "./src/services/orchestrator";
import { ProviderService } from "./src/services/providers";
import { ScoringEngine } from "./src/services/scoring";

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { getRouteData, geocode, getWeatherData, findNearbyStops } from "./src/services/maps";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const sosCooldownByClient = new Map<string, number>();
  const SOS_COOLDOWN_MS = 45000;

  app.use(express.json());

  const sendTelegramMessage = async (botToken: string, chatId: string, text: string) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: false
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Telegram API error (${response.status}):`, errText);
        throw new Error(`Telegram sendMessage failed: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      console.log("Telegram message sent successfully:", data);
      return data;
    } catch (error: any) {
      console.error("Failed to send Telegram message:", error.message);
      throw error;
    }
  };

  const sendTelegramLocation = async (botToken: string, chatId: string, lat: number, lng: number) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendLocation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          latitude: lat,
          longitude: lng
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Telegram API error (${response.status}):`, errText);
        throw new Error(`Telegram sendLocation failed: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      console.log("Telegram location sent successfully:", data);
      return data;
    } catch (error: any) {
      console.error("Failed to send Telegram location:", error.message);
      throw error;
    }
  };

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

  app.post("/api/sos", async (req, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN is not configured in environment");
      return res.status(500).json({ 
        error: "SOS service is not configured",
        details: "Missing TELEGRAM_BOT_TOKEN environment variable"
      });
    }

    if (!chatId) {
      console.error("TELEGRAM_CHAT_ID is not configured in environment");
      return res.status(500).json({ 
        error: "SOS service is not configured",
        details: "Missing TELEGRAM_CHAT_ID environment variable. Set it in .env file"
      });
    }

    const clientKey = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const lastSentAt = sosCooldownByClient.get(clientKey) || 0;

    if (now - lastSentAt < SOS_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((SOS_COOLDOWN_MS - (now - lastSentAt)) / 1000);
      return res.status(429).json({ error: `Cooldown active. Retry in ${retryAfterSec}s` });
    }

    const rawLat = req.body?.lat;
    const rawLng = req.body?.lng;
    const reason = req.body?.locationUnavailableReason;

    const lat = typeof rawLat === "number" ? rawLat : Number(rawLat);
    const lng = typeof rawLng === "number" ? rawLng : Number(rawLng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const locationLink = hasCoords ? `https://maps.google.com/?q=${lat},${lng}` : "Location unavailable";

    const messageLines = [
      "🚨 SOS ALERT 🚨",
      "User needs immediate help!",
      "",
      "📍 Location:",
      locationLink,
      "",
      "🧭 Coordinates:",
      `Lat: ${hasCoords ? lat : "Unavailable"}`,
      `Lng: ${hasCoords ? lng : "Unavailable"}`,
      "",
      `⏰ Time: ${timestamp}`
    ];

    if (!hasCoords && reason) {
      messageLines.push(`⚠️ Geo Error: ${reason}`);
    }

    const message = messageLines.join("\n");

    try {
      console.log(`[SOS] Sending alert to Telegram (Chat ID: ${chatId})`);
      await sendTelegramMessage(botToken, chatId, message);

      if (hasCoords) {
        await sendTelegramLocation(botToken, chatId, lat, lng);
      }

      sosCooldownByClient.set(clientKey, now);
      console.log("[SOS] Alert sent successfully");
      return res.json({ ok: true, sentAt: now, hasCoords });
    } catch (error: any) {
      console.error("[SOS] Dispatch failed:", error.message);
      return res.status(502).json({ 
        error: "Failed to dispatch SOS alert",
        details: error.message
      });
    }
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
    const { destination, origin, isRaining, battery } = req.query;
    const providerService = new ProviderService();
    
    try {
      // Calculate distance for realistic pricing approximation
      const routeData = await getRouteData((origin as string) || "Current Location", destination as string);
      const distanceKm = routeData.distance_km || 5; // Fallback to 5km if routing fails

      const bids = await providerService.fetchAllBids(
        (origin as string) || "Current Location", 
        destination as string, 
        distanceKm,
        routeData.duration_min,
        { isRaining: isRaining === "true" },
        { batteryLevel: battery ? parseInt(battery as string) : 100 }
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

  // ============================================================
  // Python Multi-Modal Graph Router Proxy
  // ============================================================
  app.post("/api/calculate-route", async (req, res) => {
    const { source, destination } = req.body;

    if (!source || !destination) {
      return res.status(400).json({ error: "Missing source or destination" });
    }

    try {
      const response = await fetch("http://localhost:8000/get_route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, destination }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[GraphRouter] Python backend error (${response.status}):`, errText);
        return res.status(response.status).json({
          error: "Graph routing engine error",
          details: errText,
        });
      }

      const data = await response.json();
      console.log(`[GraphRouter] ${source} -> ${destination} | fastest=${data.fastest?.[0]?.duration}min cheapest=₹${data.cheapest?.[0]?.price}`);
      res.json(data);
    } catch (error: any) {
      console.error("[GraphRouter] Python backend unreachable:", error.message);
      res.status(503).json({
        error: "Routing engine unavailable",
        details: "Python FastAPI backend is not running on port 8000. Start it with: uvicorn main:app --port 8000",
      });
    }
  });

  // Industrial Orchestrator (TS Implementation of your Microservices Diagram)
  // API Layer: Interaction Handlers
  app.post("/api/v1/chat", async (req, res) => {
    const { message } = req.body;
    
    // Efficient Keyword Extraction (Rule-based NLP Pipeline)
    const normalized = message.toLowerCase();
    let source = "";
    let destination = "";
    let preference: "cheaper" | "faster" | "comfortable" | null = null;
    
    if (normalized.includes("cheaper") || normalized.includes("cheap")) preference = "cheaper";
    if (normalized.includes("faster") || normalized.includes("fast") || normalized.includes("quick") || normalized.includes("late")) preference = "faster";
    if (normalized.includes("comfortable") || normalized.includes("comfort") || normalized.includes("cab") || normalized.includes("auto")) preference = "comfortable";

    if (normalized.includes("from") && normalized.includes("to")) {
      const match = normalized.match(/from (.*?) to (.*)/);
      if (match) {
        source = match[1].trim();
        destination = match[2].trim();
      }
    } else if (normalized.includes(" to ")) {
       const match = normalized.match(/(.*?) to (.*)/);
       if (match) {
         source = match[1].trim();
         destination = match[2].trim();
       }
    }

    res.json({
      intent: "route_request",
      entities: { source, destination, preference },
      suggestedAction: source && destination ? "orchestrate" : "ask_clarification"
    });
  });

  app.post("/api/v1/orchestrate", async (req, res) => {
    try {
      const { origin, destination, context, sourceCoords, destCoords } = req.body;
      
      // 1. Fetch Routing Data (Primary duration for weather lookahead)
      const routeData = await getRouteData(origin, destination, sourceCoords, destCoords);
      const durationMin = routeData.duration_min;
      
      // 2. Fetch Predictive Weather based on trip duration
      // Priority coords: sourceCoords -> geocoded origin -> Bangalore
      const weatherCoords = sourceCoords || (await geocode(origin)) || { lat: "12.9716", lon: "77.5946" };
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
