import dotenv from "dotenv";
import express from "express";

import { RouteOrchestrator } from "../src/services/orchestrator";
import { getRouteData, geocode, getWeatherData, findNearbyStops } from "../src/services/maps";
import { ProviderService } from "../src/services/providers";
import { ScoringEngine } from "../src/services/scoring";

dotenv.config();

const app = express();
app.use(express.json());

const sosCooldownByClient = new Map<string, number>();
const SOS_COOLDOWN_MS = 45000;
const ondcResults = new Map<string, any[]>();
const tripHistory: any[] = [];
let userPreferences = {
  optimization_priority: "optimal",
  preferred_modes: ["auto", "metro", "car", "bike"],
};

const sendTelegramMessage = async (botToken: string, chatId: string, text: string) => {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} - ${errText}`);
  }
  return response.json();
};

const sendTelegramLocation = async (botToken: string, chatId: string, lat: number, lng: number) => {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendLocation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      latitude: lat,
      longitude: lng,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Telegram sendLocation failed: ${response.status} - ${errText}`);
  }
  return response.json();
};

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString(), engine: "RouteCraft-v1-Hybrid" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString(), engine: "RouteCraft-v1-Hybrid" });
});

app.post("/api/ondc/callback", (req, res) => {
  const { context, message } = req.body;
  const transactionId = context?.transaction_id;
  if (!transactionId) return res.status(400).json({ error: "Missing transaction_id" });

  if (message?.catalog?.providers) {
    const currentResults = ondcResults.get(transactionId) || [];
    const newBids = message.catalog.providers.flatMap((p: any) =>
      p.items.map((item: any) => ({
        provider: p.descriptor.name,
        price: parseFloat(item.price.value),
        type: item.descriptor.name,
        eta: 5,
        waitingTime: 5,
        deepLink: `nammayatri://booking?id=${item.id}`,
        isONDC: true,
        transactionId,
      })),
    );
    ondcResults.set(transactionId, [...currentResults, ...newBids]);
  }
  res.status(200).json({ message: { ack: { status: "ACK" } } });
});

app.get("/api/ondc/results/:transactionId", (req, res) => {
  const { transactionId } = req.params;
  res.json(ondcResults.get(transactionId) || []);
});

app.post("/api/sos", async (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return res.status(500).json({ error: "SOS service is not configured" });
  }

  const clientKey = req.headers["x-forwarded-for"]?.toString() || "unknown";
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
    `⏰ Time: ${timestamp}`,
  ];
  if (!hasCoords && reason) messageLines.push(`⚠️ Geo Error: ${reason}`);
  const message = messageLines.join("\n");

  try {
    await sendTelegramMessage(botToken, chatId, message);
    if (hasCoords) await sendTelegramLocation(botToken, chatId, lat, lng);
    sosCooldownByClient.set(clientKey, now);
    return res.json({ ok: true, sentAt: now, hasCoords });
  } catch (error: any) {
    return res.status(502).json({ error: "Failed to dispatch SOS alert", details: error.message });
  }
});

app.get("/api/nearby-stops", async (req, res) => {
  const { lat, lon, radius } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "Missing coordinates" });
  try {
    const stops = await findNearbyStops(
      parseFloat(lat as string),
      parseFloat(lon as string),
      radius ? parseInt(radius as string, 10) : 1500,
    );
    return res.json(stops);
  } catch {
    return res.status(500).json({ error: "Failed to fetch nearby stops" });
  }
});

app.get("/api/ride-providers", async (req, res) => {
  const { destination, origin, isRaining, battery } = req.query;
  const providerService = new ProviderService();
  try {
    const routeData = await getRouteData((origin as string) || "Current Location", destination as string);
    const distanceKm = routeData.distance_km || 5;
    const bids = await providerService.fetchAllBids(
      (origin as string) || "Current Location",
      destination as string,
      distanceKm,
      routeData.duration_min,
      { isRaining: isRaining === "true" },
      { batteryLevel: battery ? parseInt(battery as string, 10) : 100 },
    );
    return res.json(
      bids.map((bid) => ({
        id: bid.provider.toLowerCase().replace(/\s+/g, "-"),
        name: bid.provider,
        price: bid.price,
        waitingTime: bid.waitingTime,
        deepLink: bid.deepLink,
        isONDC: bid.isONDC,
      })),
    );
  } catch {
    return res.status(500).json({ error: "Failed to fetch providers" });
  }
});

app.get("/api/trips", (_req, res) => res.json(tripHistory));
app.post("/api/trips", (req, res) => {
  const { route } = req.body;
  const trip = { id: `trip_${Date.now()}`, timestamp: new Date().toISOString(), route };
  tripHistory.unshift(trip);
  res.status(201).json(trip);
});

app.get("/api/preferences", (_req, res) => res.json(userPreferences));
app.put("/api/preferences", (req, res) => {
  userPreferences = { ...userPreferences, ...req.body };
  res.json({ status: "updated", preferences: userPreferences });
});

app.post("/api/calculate-route", async (_req, res) => {
  return res.status(501).json({
    error: "Python routing backend not available on Vercel deployment",
    details: "Deploy FastAPI separately and point this endpoint to that URL.",
  });
});

app.post("/api/v1/chat", async (req, res) => {
  const { message } = req.body;
  const normalized = String(message || "").toLowerCase();
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
  return res.json({
    intent: "route_request",
    entities: { source, destination, preference },
    suggestedAction: source && destination ? "orchestrate" : "ask_clarification",
  });
});

app.post("/api/v1/orchestrate", async (req, res) => {
  try {
    const { origin, destination, context, sourceCoords, destCoords } = req.body;
    const routeData = await getRouteData(origin, destination, sourceCoords, destCoords);
    const durationMin = routeData.duration_min;
    const weatherCoords = sourceCoords || (await geocode(origin)) || { lat: "12.9716", lon: "77.5946" };
    const weather = await getWeatherData(weatherCoords.lat, weatherCoords.lon, durationMin);
    const orchestrator = new RouteOrchestrator({
      battery: context?.battery || 85,
      raining: weather?.isRaining || false,
      sourceCoords,
      destCoords,
    });
    const results = await orchestrator.generateSplitRoutes(origin, destination);
    const strategies = {
      fastest: ScoringEngine.getFastest(results),
      cheapest: ScoringEngine.getCheapest(results),
      optimal: ScoringEngine.getOptimal(results),
    };
    const hour = parseInt(
      new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(new Date()),
      10,
    );
    return res.json({
      strategies,
      weather: weather || {
        temp: 28,
        condition: "Clear",
        isRaining: false,
        willRain: false,
        rainPredictionMessage: "Predictive weather unavailable.",
      },
      battery: context?.battery || 100,
      isNight: hour >= 22 || hour <= 5,
      provider: "RouteCraft Predictive-Hybrid Engine",
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to optimize route plan" });
  }
});

export default app;
