/**
 * Fetches current weather and future forecast to predict rain during the trip.
 */
export async function getWeatherData(lat?: string, lon?: string, durationMin: number = 30) {
  const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
  if (!OPENWEATHER_API_KEY) return null;

  try {
    const latNum = lat || "12.9716";
    const lonNum = lon || "77.5946";
    
    // 1. Fetch Current Weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latNum}&lon=${lonNum}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const currentRes = await fetch(currentUrl);
    if (!currentRes.ok) throw new Error(`Weather Current API error: ${currentRes.status}`);
    const currentData = await currentRes.json();

    // 2. Fetch Forecast (for prediction during arrival)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latNum}&lon=${lonNum}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) throw new Error(`Weather Forecast API error: ${forecastRes.status}`);
    const forecastData = await forecastRes.json();

    let willRain = false;
    let rainPredictionMessage = "Clear skies ahead.";

    if (forecastData.list) {
      // Check forecast for the period of the trip (next few hours)
      const lookaheadPeriods = Math.ceil(durationMin / 180) + 1; // 3-hour blocks
      const upcomingWeather = forecastData.list.slice(0, lookaheadPeriods);
      
      const rainRisk = upcomingWeather.find((p: any) => 
        p.weather[0].main.toLowerCase().includes("rain") || 
        p.weather[0].description.toLowerCase().includes("rain")
      );

      if (rainRisk) {
        willRain = true;
        rainPredictionMessage = `Expected to rain in about ${Math.round((new Date(rainRisk.dt * 1000).getTime() - Date.now()) / 60000)} mins.`;
      }
    }

    if (currentData.cod === 200) {
      return {
        temp: Math.round(currentData.main.temp),
        condition: currentData.weather[0].main,
        isRaining: currentData.weather[0].main.toLowerCase().includes("rain"),
        willRain,
        rainPredictionMessage
      };
    }
  } catch (error) {
    console.error("Weather API Error:", error);
  }
  return null;
}

export async function geocode(query: string): Promise<{ lat: string; lon: string; name: string } | null> {
  console.log(`[Nominatim] Geocoding: ${query}`);
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 
        "User-Agent": "RouteCraft-Applet/1.0",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.warn(`[Nominatim] API returned status ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.warn(`[Nominatim] Expected JSON but got ${contentType}. Response preview: ${text.substring(0, 100)}`);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        lat: data[0].lat,
        lon: data[0].lon,
        name: data[0].display_name
      };
    }
  } catch (error) {
    console.error("Nominatim Geocoding Error:", error instanceof Error ? error.message : error);
  }
  return null;
}

/**
 * Traffic factor based on Bangalore peak hours
 */
function getTrafficMultiplier(): number {
  const now = new Date();
  const bglTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false
  }).format(now);
  const hour = parseInt(bglTime);

  // Peak intervals
  if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) {
    return 1.8; // Peak mobility slowdown
  }
  if (hour >= 13 && hour <= 15) {
    return 1.3; // Afternoon lull
  }
  if (hour >= 23 || hour <= 5) {
    return 0.8; // Open roads
  }
  return 1.1; // Baseline
}

export async function getRouteData(source: string, destination: string, sourceCoords?: any, destCoords?: any) {
  const trafficMultiplier = getTrafficMultiplier();
  
  // Primary Open Source Path: OSRM (Directly implemented for Best FREE setup)
  let sLat = sourceCoords?.lat, sLon = sourceCoords?.lon;
  let dLat = destCoords?.lat, dLon = destCoords?.lon;

  if (!sLat || !sLon) {
    const startGeo = await geocode(source);
    if (startGeo) { sLat = startGeo.lat; sLon = startGeo.lon; }
  }
  if (!dLat || !dLon) {
    const endGeo = await geocode(destination);
    if (endGeo) { dLat = endGeo.lat; dLon = endGeo.lon; }
  }

  if (sLat && sLon && dLat && dLon) {
    try {
      // OSRM: Optimized Contraction Hierarchies (A* / Dijkstra hybrid)
      const url = `https://router.project-osrm.org/route/v1/driving/${sLon},${sLat};${dLon},${dLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`OSRM API error: ${response.status}`);
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`OSRM expected JSON but got ${contentType}`);
      }
      
      const res = await response.json();
      if (res.code === "Ok") {
        const baseDuration = res.routes[0].duration / 60;
        return {
          provider: "osrm",
          distance_km: res.routes[0].distance / 1000,
          duration_min: baseDuration * trafficMultiplier,
          geometry: res.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]) // [lat, lon]
        };
      }
    } catch (error) {
      console.error("OSRM API Error:", error);
    }
  }

  // Fallback: Create a semi-road-like step geometry instead of a single straight line
  const seed = (source?.length || 0) + (destination?.length || 0);
  const fallbackLat = sLat ? parseFloat(sLat) : 12.9716;
  const fallbackLon = sLon ? parseFloat(sLon) : 77.5946;
  const destLat = dLat ? parseFloat(dLat) : fallbackLat + 0.05;
  const destLon = dLon ? parseFloat(dLon) : fallbackLon + 0.05;

  const midLat = (fallbackLat + destLat) / 2;
  const midLon = (fallbackLon + destLon) / 2;

  return {
    provider: "fallback-simulated",
    distance_km: Math.max(2, seed * 0.3),
    duration_min: Math.max(5, seed * 1.2) * trafficMultiplier,
    geometry: [
      [fallbackLat, fallbackLon],
      [fallbackLat, midLon], // Step 1: Longitude shift
      [midLat, midLon],      // Step 2: Midpoint
      [destLat, midLon],     // Step 3: Latitude shift
      [destLat, destLon]
    ] // Manhattan-style road approximation
  };
}

import { BENGALURU_TRANSIT_HUBS } from "./bmtcData";

// Simple in-memory cache and circuit breakers
let isGooglePlacesDisabled = false;
let googlePlacesDisabledUntil = 0;

// Transit stop cache to prevent rapid-fire redundant calls
const transitCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Highly Resilient Multi-Provider Transit stop discovery
 * Tier 0: Bengaluru Optimized Static Hubs (Instant)
 * Tier 1: Nimmbus / BMTC Community APIs (Bengaluru Specific) 
 * Tier 2: Google Places (New) -> High Speed, Global
 * Tier 3: Nominatim -> Stable Fallback, Open Source
 * Tier 4: Overpass API -> Specialized Data, Multi-Mirror
 */
export async function findNearbyStops(lat: number, lon: number, radius = 1000) {
  const isBengaluru = lat > 12.8 && lat < 13.2 && lon > 77.4 && lon < 77.8;
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)},${radius}`;
  const cached = transitCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    console.log("[Transit] Returning cached transit stops.");
    return cached.data;
  }

  // Tier 0: Bengaluru Static Hubs (Guaranteed Zero Latency)
  if (isBengaluru) {
    const hubs = BENGALURU_TRANSIT_HUBS.filter(h => {
      const dist = Math.sqrt(Math.pow(h.lat - lat, 2) + Math.pow(h.lon - lon, 2));
      return dist < 0.05; // ~5km radius for major hubs
    });
    if (hubs.length > 0) {
      console.log("[Transit] Found major Bengaluru hubs in local cache.");
      // We don't return here yet, we'll combine them with live data if possible
    }
  }

  // Tier 1: Community BMTC APIs (Nimmbus / Tachyons)
  if (isBengaluru) {
    try {
      // Trying Nimmbus Community API (The "Best" community option)
      const nimmbusUrl = `https://nimmbus.onrender.com/api/v1/stops/nearby?lat=${lat}&lng=${lon}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const nimmRes = await fetch(nimmbusUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (nimmRes.ok) {
        const nimmData = await nimmRes.ok ? await nimmRes.json() : [];
        if (nimmData.length > 0) {
          console.log("[Nimmbus] Found Bengaluru stops successfully.");
          const results = nimmData.map((s: any) => ({
            id: s.stopId || s.id,
            lat: s.latitude || s.lat,
            lon: s.longitude || s.lon,
            name: s.stopName || s.name,
            type: "bus"
          }));
          transitCache.set(cacheKey, { data: results, timestamp: now });
          return results;
        }
      }
    } catch (e) {
      console.warn("[Nimmbus] BMTC specific search failed, falling back.");
    }
  }

  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (isGooglePlacesDisabled && now < googlePlacesDisabledUntil) {
    console.log("[Transit] Google Places is in standby. Using high-speed fallbacks.");
  } else {
    // 1. Primary High-Reliability Source: Google Places API (New)
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const url = `https://places.googleapis.com/v1/places:searchNearby`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.types"
          },
          body: JSON.stringify({
            includedTypes: ["transit_station", "bus_stop", "subway_station", "train_station"],
            maxResultCount: 10,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lon },
                radius: radius
              }
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.places && data.places.length > 0) {
            const results = data.places.map((place: any) => ({
              id: place.id,
              lat: place.location.latitude,
              lon: place.location.longitude,
              name: place.displayName?.text || "Transit Stop",
              type: (place.types?.some((t: string) => t.includes("subway") || t.includes("train") || t.includes("transit_station"))) ? "metro" : "bus"
            }));
            transitCache.set(cacheKey, { data: results, timestamp: now });
            return results;
          }
        } else {
          const err = await response.json();
          if (err.error?.status === "PERMISSION_DENIED" || err.error?.message?.includes("not enabled")) {
            isGooglePlacesDisabled = true;
            googlePlacesDisabledUntil = now + (15 * 60 * 1000);
          }
        }
      } catch (e) {
        console.warn("[Google Places New] Failed, falling back.");
      }
    }
  }

  // 2. Secondary Real-Data Source: Nominatim
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=bus+stop+metro+station&format=json&limit=5&viewbox=${lon-0.02},${lat+0.02},${lon+0.02},${lat-0.02}&bounded=1`;
    const nomRes = await fetch(nominatimUrl, {
      headers: { "User-Agent": "RouteCraft-Applet/1.0" }
    });
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        const results = nomData.map((item: any) => ({
          id: item.place_id.toString(),
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          name: item.display_name.split(',')[0],
          type: (item.type === "subway" || item.class === "railway") ? "metro" : "bus"
        }));
        transitCache.set(cacheKey, { data: results, timestamp: now });
        return results;
      }
    }
  } catch (e) {}

  // 3. Open Source Failover: Overpass API
  const query = `[out:json][timeout:10];(node["highway"="bus_stop"](around:${radius},${lat},${lon});node["railway"="subway_entrance"](around:${radius},${lat},${lon});node["railway"="station"]["subway"="yes"](around:${radius},${lat},${lon}););out body;`;

  // Randomized mirror list to distribute load
  const mirrors = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter"
  ].sort(() => Math.random() - 0.5);

  for (const url of mirrors) {
    try {
      const controller = new AbortController();
      // First 2 mirrors get shorter 6s timeout to skip dead servers fast
      const timeoutVal = mirrors.indexOf(url) < 2 ? 6000 : 12000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutVal);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "RouteCraft-Applet/1.0" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.elements && data.elements.length > 0) {
          const results = data.elements.map((el: any) => ({
            id: el.id,
            lat: el.lat,
            lon: el.lon,
            name: el.tags.name || (el.tags.highway === "bus_stop" ? "Bus Stop" : "Metro Station"),
            type: (el.tags.highway === "bus_stop") ? "bus" : "metro"
          }));
          transitCache.set(cacheKey, { data: results, timestamp: now });
          return results;
        }
      }
    } catch (error) {
      console.warn(`[Overpass] Mirror skip: ${url}`);
    }
  }

  // 4. Fallback simulation
  const fallbacks = [
    { id: "sim_bus_1", lat: lat + 0.002, lon: lon + 0.002, name: "Point-Alpha Bus Stop", type: "bus" },
    { id: "sim_metro_1", lat: lat - 0.003, lon: lon - 0.001, name: "Pivot Link Station", type: "metro" }
  ];
  return fallbacks;
}

export async function getTransitRoute(source: string, destination: string, sourceCoords?: any, destCoords?: any) {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const origin = sourceCoords ? `${sourceCoords.lat},${sourceCoords.lon}` : source;
      const dest = destCoords ? `${destCoords.lat},${destCoords.lon}` : destination;
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&mode=transit&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Google Transit API error: ${response.status}`);
      const data = await response.json();

      if (data.status === "OK" && data.routes.length > 0) {
        const leg = data.routes[0].legs[0];
        return {
          distance_km: leg.distance.value / 1000,
          duration_min: leg.duration.value / 60,
          steps: leg.steps.map((step: any) => {
            const mode = step.travel_mode.toLowerCase();
            let transportMode: any = "walk";
            let provider = "";
            let busNo = "";

            if (mode === "transit") {
              const type = step.transit_details.line.vehicle.type;
              provider = step.transit_details.line.agencies[0].name;
              busNo = step.transit_details.line.short_name || step.transit_details.line.name;
              transportMode = (type === "BUS") ? "bus" : "metro";
            }
            return {
              mode: transportMode,
              duration: Math.round(step.duration.value / 60),
              distance: step.distance.value / 1000,
              provider,
              busNo,
              instruction: step.html_instructions,
              start_location: [step.start_location.lat, step.start_location.lng]
            };
          })
        };
      }
    } catch (e) { console.error("Google Transit Error:", e); }
  }

  // Best FREE Setup: Simulated Multi-modal based on derived distances
  console.log("[Transit] Using free simulated multimodal logic");
  const sLat = parseFloat(sourceCoords?.lat || "12.9716");
  const sLon = parseFloat(sourceCoords?.lon || "77.5946");
  const dLat = parseFloat(destCoords?.lat || "12.9279");
  const dLon = parseFloat(destCoords?.lon || "77.6271");

  // Calculate Haversine distance for simulation
  const dist = Math.sqrt(Math.pow(dLat - sLat, 2) + Math.pow(dLon - sLon, 2)) * 111;
  
  return {
    distance_km: dist,
    duration_min: dist * 4, // Avg speed inclusive of stops
    steps: [
      { mode: "walk", duration: 5, distance: 0.5, instruction: "Walk to nearby stop", start_location: [sLat, sLon] },
      { mode: "bus", duration: Math.round(dist * 0.6 * 3), distance: dist * 0.6, provider: "BMTC", busNo: "500C", instruction: "Take BMTC Bus", start_location: [sLat + (dLat - sLat) * 0.2, sLon + (dLon - sLon) * 0.2] },
      { mode: "walk", duration: 3, distance: 0.3, instruction: "Walk to destination", start_location: [dLat - (dLat - sLat) * 0.1, dLon - (dLon - sLon) * 0.1] }
    ]
  };
}
