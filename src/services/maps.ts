/**
 * Fetches current weather and future forecast to predict rain during the trip.
 */
export async function getWeatherData(lat?: string, lng?: string, durationMin: number = 30) {
  const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
  if (!OPENWEATHER_API_KEY) return null;

  try {
    const latNum = lat || "12.9716";
    const lngNum = lng || "77.5946";
    
    // 1. Fetch Current Weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latNum}&lon=${lngNum}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const currentRes = await fetch(currentUrl);
    const currentData = await currentRes.json();

    // 2. Fetch Forecast (for prediction during arrival)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latNum}&lon=${lngNum}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const forecastRes = await fetch(forecastUrl);
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

export async function geocode(query: string): Promise<{ lat: string; lng: string; name: string } | null> {
  console.log(`[Nominatim] Geocoding: ${query}`);
  
  // Semantic Demo Fallback: If Nominatim is rate-limiting, provide high-accuracy coords for common BLR areas
  const q = query.toLowerCase();
  if (q.includes("hsr")) {
    return { lat: "12.9101", lng: "77.6450", name: "HSR Layout, Bangalore" };
  }
  if (q.includes("koramangala")) {
    return { lat: "12.9352", lng: "77.6245", name: "Koramangala, Bangalore" };
  }
  if (q.includes("indiranagar")) {
    return { lat: "12.9719", lng: "77.6412", name: "Indiranagar, Bangalore" };
  }
  if (q.includes("bangalore") || q.includes("bengaluru") || q.includes("city")) {
    return { lat: "12.9716", lng: "77.5946", name: "Bangalore Central" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for geocoding

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 
        "User-Agent": "RouteCraft-Mobility-App/1.1 (sj19052005@gmail.com)",
        "Accept": "application/json"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Nominatim] Error ${response.status}: ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.warn(`[Nominatim] Expected JSON but received: ${text.substring(0, 100)}...`);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: data[0].lat,
        lng: data[0].lon, // Mapping OSM's 'lon' to our 'lng'
        name: data[0].display_name
      };
    }
  } catch (error) {
    console.error("Nominatim Geocoding Error:", error);
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
  let sLat = sourceCoords?.lat, sLng = sourceCoords?.lng;
  let dLat = destCoords?.lat, dLng = destCoords?.lng;

  if (!sLat || !sLng) {
    const startGeo = await geocode(source);
    if (startGeo) { sLat = startGeo.lat; sLng = startGeo.lng; }
  }
  if (!dLat || !dLng) {
    const endGeo = await geocode(destination);
    if (endGeo) { dLat = endGeo.lat; dLng = endGeo.lng; }
  }

  if (sLat && sLng && dLat && dLng) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for routing

      // OSRM: Optimized Contraction Hierarchies (A* / Dijkstra hybrid)
      const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${dLng},${dLat}?overview=full&geometries=geojson`;
      const response = await fetch(url, { signal: controller.signal });
      const res = await response.json();
      
      clearTimeout(timeoutId);
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

  // Fallback for extreme failure cases
  return {
    provider: "fallback-simulated",
    distance_km: 5,
    duration_min: 15 * trafficMultiplier,
    geometry: [
      [sLat ? parseFloat(sLat) : 12.9716, sLng ? parseFloat(sLng) : 77.5946],
      [dLat ? parseFloat(dLat) : 12.9279, dLng ? parseFloat(dLng) : 77.6271]
    ]
  };
}

// Cache for geo and routing to avoid redundant OSRM calls
const routingCache = new Map<string, any>();

async function fetchWithCache(url: string) {
  if (routingCache.has(url)) return routingCache.get(url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    routingCache.set(url, data);
    return data;
  } catch (e) {
    return null;
  }
}

async function getWalkingGeometry(sLat: number, sLng: number, dLat: number, dLng: number) {
  const url = `https://router.project-osrm.org/route/v1/foot/${sLng},${sLat};${dLng},${dLat}?overview=full&geometries=geojson`;
  const data = await fetchWithCache(url);
  if (data?.code === "Ok") {
    return {
      duration: data.routes[0].duration / 60,
      geometry: data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]])
    };
  }
  return { duration: 15, geometry: [[sLat, sLng], [dLat, dLng]] };
}

async function getDrivingGeometry(sLat: number, sLng: number, dLat: number, dLng: number) {
  const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${dLng},${dLat}?overview=full&geometries=geojson`;
  const data = await fetchWithCache(url);
  if (data?.code === "Ok") {
    return {
      duration: data.routes[0].duration / 60,
      geometry: data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]])
    };
  }
  return { duration: 10, geometry: [[sLat, sLng], [dLat, dLng]] };
}

// Namma Metro Station Datasets
const METRO_STATIONS = {
  purple: [
    { name: "Baiyappanahalli", lat: 12.9907, lng: 77.6525 },
    { name: "Indiranagar", lat: 12.9783, lng: 77.6385 },
    { name: "Halasuru", lat: 12.9774, lng: 77.6247 },
    { name: "MG Road", lat: 12.9755, lng: 77.6068 },
    { name: "Majestic", lat: 12.9767, lng: 77.5726 },
    { name: "Challaghatta", lat: 12.9150, lng: 77.4640 }
  ],
  green: [
    { name: "Nagasandra", lat: 13.0483, lng: 77.5025 },
    { name: "Yeshwanthpur", lat: 13.0236, lng: 77.5503 },
    { name: "Majestic", lat: 12.9757, lng: 77.5714 },
    { name: "Jayayanagar", lat: 12.9275, lng: 77.5802 },
    { name: "Banashankari", lat: 12.9154, lng: 77.5736 },
    { name: "Silk Board", lat: 12.9177, lng: 77.6227 }
  ]
};

// Bengaluru Transit Hubs (used to pick pivot points)
export const BENGALURU_TRANSIT_HUBS = [
  { id: "hub_majestic_bus", lat: 12.9779, lon: 77.5724, name: "Kempegowda Bus Station (Majestic)", type: "bus", routes: ["500C", "335E", "356C", "365", "V-335E"] },
  { id: "hub_majestic_metro", lat: 12.9755, lon: 77.5728, name: "Majestic Metro Station", type: "metro", routes: ["Purple Line", "Green Line"] },
  { id: "hub_hebbal", lat: 13.0358, lon: 77.5977, name: "Hebbal Bus Hub", type: "bus", routes: ["500C", "500QP", "285", "BIAS-9"] },
  { id: "hub_shantinagar", lat: 12.9551, lon: 77.5921, name: "Shantinagar Bus Station", type: "bus", routes: ["365", "356C", "171", "G-4"] },
  { id: "hub_satellite", lat: 12.9511, lon: 77.5452, name: "KSRTC Satellite Bus Station (Mysuru Rd)", type: "bus", routes: ["225", "226", "G-6"] },
  { id: "hub_shivajinagar", lat: 12.9850, lon: 77.5980, name: "Shivajinagar Bus Station", type: "bus", routes: ["290", "300", "G-2", "G-3"] },
  { id: "hub_indiranagar", lat: 12.9785, lon: 77.6387, name: "Indiranagar Metro", type: "metro", routes: ["Purple Line"] },
  { id: "hub_mgroad", lat: 12.9755, lon: 77.6068, name: "MG Road Metro", type: "metro", routes: ["Purple Line"] },
  { id: "hub_silkboard", lat: 12.9176, lon: 77.6231, name: "Central Silk Board Stop", type: "bus", routes: ["500C", "201", "356C", "501"] },
  { id: "hub_marathahalli", lat: 12.9548, lon: 77.6996, name: "Marathahalli Bridge Stop", type: "bus", routes: ["500C", "335E", "500QP", "V-500C"] },
  { id: "hub_aecs", lat: 12.9645, lon: 77.7126, name: "AECS Layout Bus Stop", type: "bus", routes: ["335E", "500C", "V-335E"] },
  { id: "hub_itpl", lat: 12.9875, lon: 77.7376, name: "ITPL Main Gate", type: "bus", routes: ["335E", "500C", "BIAS-12"] },
  { id: "hub_tin_factory", lat: 13.0031, lon: 77.6749, name: "Tin Factory Hub", type: "bus", routes: ["500C", "V-500C", "290", "300"] },
  { id: "hub_byappanahalli", lat: 12.9908, lon: 77.6521, name: "Byappanahalli Metro", type: "metro", routes: ["Purple Line"] },
  { id: "hub_jayanagar", lat: 12.9284, lon: 77.5855, name: "Jayanagar 4th Block Hub", type: "bus", routes: ["215", "18"] },
  { id: "hub_banashankari", lat: 12.9152, lon: 77.5736, name: "Banashankari Bus Terminal", type: "bus", routes: ["201", "G-5", "210"] },
  { id: "hub_yeshwanthpur", lat: 13.0236, lon: 77.5522, name: "Yeshwanthpur Metro/Bus Station", type: "metro", routes: ["Green Line", "258", "401"] },
  { id: "hub_nagawara", lat: 13.0401, lon: 77.6256, name: "Nagawara Manyata Hub", type: "bus", routes: ["500C", "290", "V-500C"] },
  { id: "hub_electronic_city", lat: 12.8449, lon: 77.6633, name: "Electronic City Phase 1 Hub", type: "bus", routes: ["356C", "365", "V-356C"] },
  { id: "hub_whitefield", lat: 12.9691, lon: 77.7500, name: "Whitefield TTMC", type: "bus", routes: ["335E", "V-335E", "500C"] },
  { id: "hub_silk_institute", lat: 12.8687, lon: 77.5362, name: "Silk Institute Metro Station", type: "metro", routes: ["Green Line"] },
  { id: "hub_konanakunte", lat: 12.8851, lon: 77.5562, name: "Konanakunte Cross Metro", type: "metro", routes: ["Green Line"] },
  { id: "hub_kadugodi", lat: 12.9980, lon: 77.7610, name: "Kadugodi Tree Park Metro", type: "metro", routes: ["Purple Line"] },
  { id: "hub_krpuram", lat: 13.0016, lon: 77.6970, name: "K.R. Puram Metro/Railway", type: "metro", routes: ["Purple Line", "500-D", "500-CK"] },
  { id: "hub_kengeri", lat: 12.9150, lon: 77.4830, name: "Kengeri Bus Terminal", type: "bus", routes: ["225", "226", "G-6"] },
  { id: "hub_hsr_bda", lat: 12.9110, lon: 77.6380, name: "HSR Layout BDA Complex", type: "bus", routes: ["500-D", "356-C", "201"] },
  { id: "hub_koramangala_wipro", lat: 12.9270, lon: 77.6250, name: "Koramangala Wipro Park Stop", type: "bus", routes: ["201", "341", "342"] },
  { id: "hub_domlur", lat: 12.9610, lon: 77.6380, name: "Domlur Bridge Stop", type: "bus", routes: ["335-E", "G-1", "K-1"] }
];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function findNearestHubs(lat: number, lon: number, count = 2, maxDistanceMeters = 5000) {
  const all = BENGALURU_TRANSIT_HUBS.map(h => ({ ...h, distance: haversineDistance(lat, lon, h.lat, h.lon), lng: h.lon }));
  const filtered = all.filter(h => h.distance <= maxDistanceMeters).sort((a,b) => a.distance - b.distance);
  return filtered.slice(0, count);
}

async function findNearestStops(lat: number, lng: number, maxDistance: number = 800) {
  const allStops = [...METRO_STATIONS.purple.map(s => ({ ...s, type: 'metro', line: 'Purple Line' })), 
                    ...METRO_STATIONS.green.map(s => ({ ...s, type: 'metro', line: 'Green Line' }))];
  
  return allStops.filter(s => {
    const dist = Math.sqrt(Math.pow(s.lat - lat, 2) + Math.pow(s.lng - lng, 2)) * 111000;
    return dist < maxDistance;
  });
}

export async function getOptimizedMultiModalRoute(sLat: number, sLng: number, dLat: number, dLng: number) {
  // Prefer nearest transit hubs as pivot points (use hubs dataset)
  const hubSource = findNearestHubs(sLat, sLng, 2, 8000); // 8km radius to be generous
  const hubDest = findNearestHubs(dLat, dLng, 2, 8000);

  const results: any[] = [];

  // If both source and dest hubs exist, build a hub-based pivot option
  if (hubSource.length > 0 && hubDest.length > 0) {
    // pick the closest hub to each
    const sHub = hubSource[0];
    const dHub = hubDest[0];

    try {
      const firstLeg = await getWalkingGeometry(sLat, sLng, sHub.lat, sHub.lon);
      const middleLeg = await getDrivingGeometry(sHub.lat, sHub.lon, dHub.lat, dHub.lon);
      const lastLeg = await getWalkingGeometry(dHub.lat, dHub.lon, dLat, dLng);

      results.push({
        pivotPoints: [
          { name: sHub.name, lat: sHub.lat, lng: sHub.lon, type: sHub.type },
          { name: dHub.name, lat: dHub.lat, lng: dHub.lon, type: dHub.type }
        ],
        segments: [
          { mode: firstLeg.duration > 8 ? "auto" : "walk", fromName: "Origin", toName: sHub.name, duration: firstLeg.duration, price: firstLeg.duration > 8 ? 40 : 0, geometry: firstLeg.geometry },
          { mode: sHub.type === 'metro' && dHub.type === 'metro' ? "metro" : "bus", fromName: sHub.name, toName: dHub.name, duration: middleLeg.duration + 8, price: 30, geometry: middleLeg.geometry },
          { mode: lastLeg.duration > 8 ? "auto" : "walk", fromName: dHub.name, toName: "Destination", duration: lastLeg.duration, price: lastLeg.duration > 8 ? 35 : 0, geometry: lastLeg.geometry }
        ]
      });
    } catch (e) {
      // if hub-based construction fails, fall through to the other heuristics below
      console.warn("Hub-based route generation failed:", e);
    }
  }

  // Step 2 from prompt: Metro Corridor Detection
  const sourceStops = await findNearestStops(sLat, sLng, 1500);
  const destStops = await findNearestStops(dLat, dLng, 1500);
 

  for (const sNode of sourceStops) {
    const dNodes = destStops.filter(ds => ds.line === sNode.line && ds.name !== sNode.name);
    
    for (const dNode of dNodes) {
      // Combination: Source -> sNode -> dNode -> Destination
      const firstWalk = await getWalkingGeometry(sLat, sLng, sNode.lat, sNode.lng);
      const metroDist = Math.abs(METRO_STATIONS[sNode.line.toLowerCase().includes('green') ? 'green' : 'purple'].findIndex(s => s.name === sNode.name) - 
                               METRO_STATIONS[sNode.line.toLowerCase().includes('green') ? 'green' : 'purple'].findIndex(s => s.name === dNode.name));
      
      const metroDur = (metroDist * 4) + 8; // 4 mins between stations + wait time
      const trans = await getDrivingGeometry(sNode.lat, sNode.lng, dNode.lat, dNode.lng);
      const lastSegment = await getDrivingGeometry(dNode.lat, dNode.lng, dLat, dLng);

      const segments = [
        { 
          mode: firstWalk.duration > 8 ? "auto" : "walk", 
          fromName: "Origin", 
          toName: sNode.name, 
          duration: firstWalk.duration, 
          price: firstWalk.duration > 8 ? 40 : 0, 
          geometry: firstWalk.geometry 
        },
        { 
          mode: "metro", 
          fromName: sNode.name, 
          toName: dNode.name, 
          duration: metroDur, 
          price: 30, 
          geometry: trans.geometry,
          line: sNode.line
        },
        { 
          mode: lastSegment.duration > 8 ? "auto" : "walk", 
          fromName: dNode.name, 
          toName: "Destination", 
          duration: lastSegment.duration, 
          price: lastSegment.duration > 8 ? 35 : 0, 
          geometry: lastSegment.geometry
        }
      ];

      results.push({
        pivotPoints: [
          { name: sNode.name, lat: sNode.lat, lng: sNode.lng, type: 'metro' },
          { name: dNode.name, lat: dNode.lat, lng: dNode.lng, type: 'metro' }
        ],
        segments
      });
    }
  }
  
  // Also add Bus Option (Step 3: BMTC)
  if (results.length < 3) {
    const sourceNearbyStops = await findNearbyStops(sLat, sLng, 1500);
    const destNearbyStops = await findNearbyStops(dLat, dLng, 1500);

    const sourceBusStop = sourceNearbyStops.find(s => s.type === "bus");
    const destBusStop = destNearbyStops.find(s => s.type === "bus");

    const busLine = {
      busNo: "500-D",
      sLat: sourceBusStop?.lat ?? sLat,
      sLng: sourceBusStop?.lng ?? sLng,
      dLat: destBusStop?.lat ?? dLat,
      dLng: destBusStop?.lng ?? dLng,
      sourceStopName: sourceBusStop?.name ?? "Nearest Bus Stop",
      destStopName: destBusStop?.name ?? "Destination Bus Stop"
    };

    const firstLeg = await getWalkingGeometry(sLat, sLng, busLine.sLat, busLine.sLng);
    const busLeg = await getDrivingGeometry(busLine.sLat, busLine.sLng, busLine.dLat, busLine.dLng);
    const lastLeg = await getWalkingGeometry(busLine.dLat, busLine.dLng, dLat, dLng);

    results.push({
      pivotPoints: [
        { name: busLine.sourceStopName, lat: busLine.sLat, lng: busLine.sLng, type: 'bus' },
        { name: busLine.destStopName, lat: busLine.dLat, lng: busLine.dLng, type: 'bus' }
      ],
      segments: [
        { mode: "walk", fromName: "Current Location", toName: busLine.sourceStopName, duration: firstLeg.duration, price: 0, geometry: firstLeg.geometry },
        { mode: "bus", fromName: busLine.sourceStopName, toName: busLine.destStopName, duration: busLeg.duration + 12, price: 20, geometry: busLeg.geometry, busNo: busLine.busNo },
        { mode: "walk", fromName: busLine.destStopName, toName: "Destination", duration: lastLeg.duration, price: 0, geometry: lastLeg.geometry }
      ]
    });
  }

  return results;
}

/**
 * Find nearby transit stops (bus, metro) using Overpass API (OSM)
 */
export async function findNearbyStops(lat: number, lng: number, radius = 1000) {
  const distanceMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const p1 = toRad(aLat);
    const p2 = toRad(bLat);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const query = `
    [out:json][timeout:30];
    (
      node["highway"="bus_stop"](around:${radius},${lat},${lng});
      node["railway"="subway_entrance"](around:${radius},${lat},${lng});
      node["railway"="station"]["subway"="yes"](around:${radius},${lat},${lng});
    );
    out body;
  `;

  const mirrors = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter"
  ];

  for (const url of mirrors) {
    try {
      console.log(`[Overpass] Attempting mirror: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased to 20s for better completion rates

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "RouteCraft-Travel-Assistant/1.1 (mariyamomin03@gmail.com; Multi-modal-Engine)"
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[Overpass] Mirror ${url} returned status: ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (data && data.elements) {
        console.log(`[Overpass] Success with mirror: ${url}`);
        return data.elements.map((el: any) => ({
          id: el.id,
          lat: el.lat,
          lng: el.lon,
          name: el.tags.name || "Transit Stop",
          type: (el.tags.highway === "bus_stop") ? "bus" : "metro",
          distanceMeters: Math.round(distanceMeters(lat, lng, el.lat, el.lon))
        })).sort((a: any, b: any) => a.distanceMeters - b.distanceMeters);
      }
    } catch (error: any) {
      const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
      console.warn(`[Overpass] Mirror ${url} failed ${isTimeout ? '(Timeout)' : ''}:`, error.message);
      continue;
    }
  }

  // No synthetic stops: return empty so UI can avoid showing dummy values.
  console.warn("[Overpass] All mirrors failed, returning no stops.");
  return [];
}

export async function getTransitRoute(source: string, destination: string, sourceCoords?: any, destCoords?: any) {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const origin = sourceCoords ? `${sourceCoords.lat},${sourceCoords.lon}` : source;
      const dest = destCoords ? `${destCoords.lat},${destCoords.lon}` : destination;
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&mode=transit&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
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
              instruction: step.html_instructions
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
      { mode: "walk", duration: 5, distance: 0.5, instruction: "Walk to nearby stop" },
      { mode: "bus", duration: Math.round(dist * 0.6 * 3), distance: dist * 0.6, provider: "BMTC", busNo: "500C", instruction: "Take BMTC Bus" },
      { mode: "walk", duration: 3, distance: 0.3, instruction: "Walk to destination" }
    ]
  };
}
