import { useState, useEffect, useRef, useMemo } from "react";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Wallet, 
  Zap, 
  Car, 
  Bus, 
  Train, 
  Footprints, 
  ChevronRight, 
  ArrowRight,
  AlertTriangle,
  Battery,
  CloudSun,
  Menu,
  User,
  Search,
  ExternalLink,
  Smartphone,
  Bike,
  Locate,
  ArrowUpDown,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  RouteOption, 
  RouteStrategies, 
  CalculationResponse, 
  RideProvider,
  TransportMode 
} from "./types";
import { MapComponent } from "./components/MapComponent";

const ModeIcon = ({ mode, className }: { mode: TransportMode; className?: string }) => {
  switch (mode) {
    case "car": return <Car className={className} />;
    case "auto": return <Car className={className} />;
    case "bus": return <Bus className={className} />;
    case "metro": return <Train className={className} />;
    case "walk": return <Footprints className={className} />;
    case "bike": return <Bike className={className} />;
    default: return null;
  }
};

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export default function App() {
  const [source, setSource] = useState("HSR Layout");
  const [destination, setDestination] = useState("Indiranagar");
  const [sourceCoords, setSourceCoords] = useState<{lat: string, lon: string} | null>(null);
  const [destCoords, setDestCoords] = useState<{lat: string, lon: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CalculationResponse | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [activeStrategy, setActiveStrategy] = useState<keyof RouteStrategies>("fastest");
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [rideProviders, setRideProviders] = useState<RideProvider[]>([]);
  
  // Search UI State
  const [searchMode, setSearchMode] = useState<"source" | "destination" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Trip Tracking State
  const [tripStatus, setTripStatus] = useState<"planning" | "active" | "pivoted">("planning");
  const [userCoords, setUserCoords] = useState<{lat: number, lon: number} | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [activePivotPoints, setActivePivotPoints] = useState<{ lat: number; lon: number; label: string }[]>([]);
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timeout | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [pivotNotification, setPivotNotification] = useState<{message: string, route: RouteOption} | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [additionalOptions, setAdditionalOptions] = useState<RouteOption[]>([]);
  const [expandedCheapestMulti, setExpandedCheapestMulti] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);

  const handleMoreOptions = async () => {
    setShowMoreOptions(true);
    if (!sourceCoords || !destCoords) return;

    try {
      const res = await fetch(`/api/nearby-stops?lat=${sourceCoords.lat}&lon=${sourceCoords.lon}&radius=2000`);
      const stops = await res.json();
      
      const sLat = parseFloat(sourceCoords.lat);
      const sLon = parseFloat(sourceCoords.lon);
      const dLat = parseFloat(destCoords.lat);
      const dLon = parseFloat(destCoords.lon);

      const extraOptions: RouteOption[] = stops.slice(0, 2).map((stop: any, i: number) => {
        // Calculate a mid-point for the transit leg that is on the way to destination
        const stopLat = stop.lat;
        const stopLon = stop.lon;
        
        return {
          id: `extra_${i}_${stop.id}`,
          type: "split",
          duration: 40 + (i * 5),
          price: 20 + (i * 10),
          savings: 140 - (i * 20),
          waitingTime: 8 + i,
          modes: ["walk", stop.type, "auto"],
          segments: [
            { 
              mode: "walk", 
              duration: 7, 
              price: 0, 
              provider: `Walk to ${stop.name}`, 
              available: true,
              coords: [sLat, sLon]
            },
            { 
              mode: stop.type, 
              duration: 15, 
              price: 10, 
              provider: `${stop.name} (Stop ID: ${stop.id})`, 
              available: true,
              coords: [stopLat, stopLon]
            },
            { 
              mode: "auto", 
              duration: 20, 
              price: 15, 
              provider: "Last Mile Auto", 
              available: true,
              coords: [stopLat + (dLat - stopLat) * 0.5, stopLon + (dLon - stopLon) * 0.5]
            }
          ]
        };
      });
      
      if (extraOptions.length > 0) {
        setAdditionalOptions(extraOptions);
      }
    } catch (err) {
      console.error("Failed to fetch more options", err);
    }
  };

  // 1. Memoize route calculations and geometries to ensure reference stability
  // This prevents Leaflet from thinking the route has changed when App re-renders
  const routeGeometry = useMemo(() => {
    return activeRoute?.geometry || selectedRoute?.geometry || [];
  }, [activeRoute?.id, selectedRoute?.id, activeRoute?.geometry, selectedRoute?.geometry]);

  const startJourney = (route: RouteOption) => {
    // Only set active route if it's different to avoid re-renders
    if (activeRoute?.id !== route.id) {
      setActiveRoute(route);
    }
    setTripStatus("active");
    
    // Initialize pivot points from segments that have coordinates
    const pivots = route.segments
      .filter(s => s.coords)
      .map((s, idx) => ({
        lat: s.coords![0],
        lon: s.coords![1],
        label: `${s.mode.toUpperCase()}: ${s.provider || 'Transit'}`
      }));
    setActivePivotPoints(pivots);
    
    // Clean up existing tracking before starting new one
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }

    // Prefer Live Tracking if requested, otherwise simulate
    if (navigator.geolocation) {
      if (batterySaver) {
        // Battery Saver Mode: Get position every 10 minutes
        const updateLocation = () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => console.warn("Periodic location update failed", err),
            { enableHighAccuracy: false, maximumAge: 600000 }
          );
        };
        updateLocation();
        const interval = setInterval(updateLocation, 600000); 
        setTrackingInterval(interval);
      } else {
        // Normal Mode: High Accuracy Watch
        // NECESSARY: We only update userCoords state here. We DO NOT call calculateRoutes.
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            // Only update state if position changed significantly (> 2 meters) to reduce jitter
            setUserCoords(prev => {
              if (prev && getDistance(prev.lat, prev.lon, latitude, longitude) < 2) return prev;
              return { lat: latitude, lon: longitude };
            });
          },
          (err) => {
            console.warn("Geolocation watch failed, falling back to simulation", err);
            startSimulation(route);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
        setWatchId(id);
      }
    } else {
      startSimulation(route);
    }
  };

  const startSimulation = (route: RouteOption) => {
    if (route.geometry && route.geometry.length > 0) {
      let currentIndex = 0;
      setUserCoords({ lat: route.geometry[0][0], lon: route.geometry[0][1] });
      
      const interval = setInterval(() => {
        currentIndex++;
        if (currentIndex < route.geometry!.length) {
          const nextCoords = route.geometry![currentIndex];
          setUserCoords({ lat: nextCoords[0], lon: nextCoords[1] });
          
          if (currentIndex === Math.floor(route.geometry!.length * 0.3)) {
            checkPivots(nextCoords);
          }
        } else {
          stopTracking();
          alert("You have arrived at your destination!");
        }
      }, 1000);
      setTrackingInterval(interval);
    }
  };

  const stopTracking = () => {
    if (trackingInterval) clearInterval(trackingInterval);
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    setTrackingInterval(null);
    setWatchId(null);
    setTripStatus("planning");
    setActiveRoute(null);
    setSelectedRoute(null);
    setActivePivotPoints([]);
  };

  // Distance calculation helper (Haversine)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Unmark pivot points when user reaches them
  useEffect(() => {
    if (!userCoords || activePivotPoints.length === 0) return;

    const newPivots = activePivotPoints.filter(pivot => {
      const dist = getDistance(userCoords.lat, userCoords.lon, pivot.lat, pivot.lon);
      return dist > 50; // Keep if user is further than 50m
    });

    if (newPivots.length !== activePivotPoints.length) {
      setActivePivotPoints(newPivots);
    }
  }, [userCoords, activePivotPoints]);

  const checkPivots = async (currentPos: [number, number]) => {
    // Simulated Orchestrator re-run at pivot point
    console.log("Checking for pivots at", currentPos);
    
    // In a real app, we'd call /api/v1/orchestrate with currentPos as origin
    // For demo, if we find a "Optimal" route that is much better, we notify
    if (activeStrategy !== "fastest" && data && data.strategies.fastest.length > 0) {
      const bestAlternative = data.strategies.fastest[0];
      setPivotNotification({
        message: "A faster route was just found! Would you like to switch?",
        route: bestAlternative
      });
    }
  };

  const handlePivotSwitch = (newRoute: RouteOption) => {
    if (trackingInterval) clearInterval(trackingInterval);
    setPivotNotification(null);
    startJourney(newRoute); // Restart journey with new route from current position
  };

  const calculateRoutes = async () => {
    setLoading(true);
    try {
      // Get current weather from existing data if available
      const context = {
        battery: 85, // Could be dynamic
        raining: data?.weather?.condition?.toLowerCase()?.includes("rain") || false
      };

      const response = await fetch("/api/v1/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          origin: source, 
          destination,
          sourceCoords,
          destCoords,
          context
        }),
      });
      const result = await response.json();
      setData(result);
      if (result.sourceCoords && (!sourceCoords || sourceCoords.lat !== result.sourceCoords.lat)) {
        setSourceCoords(result.sourceCoords);
      }
      if (result.destCoords && (!destCoords || destCoords.lat !== result.destCoords.lat)) {
        setDestCoords(result.destCoords);
      }
      setProvider(result.provider);
      
      // Select the first fastest route by default for preview
      if (result.strategies?.fastest?.length > 0) {
        setSelectedRoute(result.strategies.fastest[0]);
      } else {
        setSelectedRoute(null);
      }
    } catch (error) {
      console.error("Failed to calculate routes", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRideProviders = async (mode: string, dest: string) => {
    try {
      const isRaining = data?.weather?.condition?.toLowerCase()?.includes("rain") || false;
      const response = await fetch(`/api/ride-providers?mode=${mode}&destination=${dest}&origin=${source}&isRaining=${isRaining}`);
      const providers = await response.json();
      setRideProviders(providers);
    } catch (error) {
      console.error("Failed to fetch ride providers", error);
    }
  };

  // ONDC Polling Logic
  useEffect(() => {
    if (!selectedRoute?.transactionId || !selectedRoute.isONDC) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ondc/results/${selectedRoute.transactionId}`);
        const newResults: RideProvider[] = await res.json();
        
        if (newResults.length > 0) {
          setRideProviders(prev => {
            // Merge results, avoiding duplicates
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNew = newResults.filter(p => !existingIds.has(p.id));
            return [...prev, ...uniqueNew];
          });
        }
      } catch (err) {
        console.error("ONDC polling failed", err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [selectedRoute?.transactionId]);

  useEffect(() => {
    calculateRoutes();
  }, []);

  // Location Search Logic
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&accept-language=en`);
        const results = await res.json();
        setSuggestions(results);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`);
        const result = await res.json();
        const address = result.display_name.split(',')[0] + ", " + result.display_name.split(',')[1];
        if (searchMode === "source") {
          setSource(address);
          setSourceCoords({ lat: latitude.toString(), lon: longitude.toString() });
        } else if (searchMode === "destination") {
          setDestination(address);
          setDestCoords({ lat: latitude.toString(), lon: longitude.toString() });
        }
        setSearchMode(null);
      } catch (err) {
        console.error("Reverse geocoding failed", err);
      }
    });
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    const shortName = suggestion.display_name.split(',')[0] + ", " + suggestion.display_name.split(',')[1];
    if (searchMode === "source") {
      setSource(shortName);
      setSourceCoords({ lat: suggestion.lat, lon: suggestion.lon });
    } else if (searchMode === "destination") {
      setDestination(shortName);
      setDestCoords({ lat: suggestion.lat, lon: suggestion.lon });
    }
    setSearchMode(null);
    setSearchQuery("");
  };

  const handleSwap = () => {
    const tempSource = source;
    const tempCoords = sourceCoords;
    setSource(destination);
    setSourceCoords(destCoords);
    setDestination(tempSource);
    setDestCoords(tempCoords);
  };

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route);
    const firstSegment = route.segments[0];
    if (firstSegment.mode === "car" || firstSegment.mode === "auto") {
      fetchRideProviders(firstSegment.mode, destination);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-background shadow-2xl overflow-hidden relative">
      {/* Search Overlay */}
      <AnimatePresence>
        {searchMode && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col"
          >
            <div className="p-4 border-b border-white/5 glass flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSearchMode(null)}>
                <ArrowRight className="w-5 h-5 rotate-180" />
              </Button>
              <div className="flex-1 relative">
                <Input 
                  autoFocus
                  placeholder={searchMode === "source" ? "Enter starting point" : "Enter destination"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-secondary/50 border-none h-12 rounded-xl pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                {searchQuery && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-14 rounded-xl hover:bg-primary/5 text-primary gap-3"
                  onClick={handleGetCurrentLocation}
                >
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Locate className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">Your Current Location</div>
                    <div className="text-[10px] opacity-70 uppercase tracking-widest">Using GPS</div>
                  </div>
                </Button>

                <Separator className="bg-white/5" />

                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium">Searching locations...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((s, i) => (
                      <Button 
                        key={i}
                        variant="ghost" 
                        className="w-full justify-start h-auto py-4 px-3 rounded-xl hover:bg-white/5 gap-3 items-start"
                        onClick={() => handleSelectSuggestion(s)}
                      >
                        <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="text-left">
                          <div className="font-bold text-sm line-clamp-1">{s.display_name.split(',')[0]}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{s.display_name.split(',').slice(1).join(',')}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/5 glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Menu className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary">ROUTECRAFT</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-white/10">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Search Section */}
          <div className="space-y-4">
            <div className="flex gap-2 items-stretch">
              <div className="flex-1 flex items-center gap-3 p-3 bg-secondary/50 rounded-2xl border border-white/5 relative">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 rounded-full border-2 border-primary" />
                  <div className="w-0.5 h-10 bg-white/10" />
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                
                <div className="flex-1 space-y-4">
                  <div 
                    className="space-y-1 cursor-pointer group"
                    onClick={() => setSearchMode("source")}
                  >
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">Source</label>
                    <div className="text-sm font-medium truncate pr-10">{source}</div>
                  </div>
                  
                  <Separator className="bg-white/5" />
                  
                  <div 
                    className="space-y-1 cursor-pointer group"
                    onClick={() => setSearchMode("destination")}
                  >
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">Destination</label>
                    <div className="text-sm font-medium truncate pr-10">{destination}</div>
                  </div>
                </div>

                {/* Swap Button - Repositioned to avoid overlap */}
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border border-white/10 shadow-lg z-10 hover:bg-secondary active:scale-90 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSwap();
                  }}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button 
                size="icon" 
                className="w-14 h-auto rounded-2xl glow-teal shrink-0 flex-col gap-1"
                onClick={calculateRoutes}
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span className="text-[8px] font-bold">GO</span>
                  </>
                )}
              </Button>
            </div>

            {/* Status Bar */}
            {data && (
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CloudSun className="w-3.5 h-3.5" />
                      <span>{data?.weather?.temp}°C {data?.weather?.condition}</span>
                    </div>
                    {data?.weather?.willRain && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500 animate-pulse uppercase tracking-tight">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>{data?.weather?.rainPredictionMessage}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Battery className="w-3.5 h-3.5" />
                    <span>{data.battery}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 gap-1.5 rounded-lg border border-transparent transition-all",
                      batterySaver ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "text-muted-foreground hover:bg-white/5"
                    )}
                    onClick={() => setBatterySaver(!batterySaver)}
                  >
                    <Battery className={cn("w-3.5 h-3.5", batterySaver && "fill-emerald-500")} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{batterySaver ? "Power Save ON" : "Normal Power"}</span>
                  </Button>
                  {provider && (
                    <div className="flex items-center gap-1 opacity-50">
                      <div className={`w-1.5 h-1.5 rounded-full ${provider === 'google' ? 'bg-blue-400' : 'bg-orange-400'}`} />
                      <span className="text-[8px] font-bold uppercase tracking-tighter">
                        {provider === 'google' ? 'Google Maps' : 'OSRM Fallback'}
                      </span>
                    </div>
                  )}
                  {data.isNight && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">
                      NIGHT
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Map View */}
          <div className={cn(
            "px-1 transition-all duration-500",
            tripStatus === "active" ? "h-[70vh]" : "h-64"
          )}>
            <MapComponent 
              sourceCoords={sourceCoords ? { lat: parseFloat(sourceCoords.lat), lon: parseFloat(sourceCoords.lon) } : null}
              destCoords={destCoords ? { lat: parseFloat(destCoords.lat), lon: parseFloat(destCoords.lon) } : null}
              userCoords={userCoords}
              routePolyline={routeGeometry}
              pivotPoints={tripStatus === "active" ? activePivotPoints : (selectedRoute?.segments
                ?.filter(s => s.coords)
                ?.map(s => ({ lat: s.coords![0], lon: s.coords![1], label: `Switch to ${s.mode}` })) || [])
              }
              isTracking={tripStatus === "active"}
            />
          </div>

          {tripStatus === "active" ? (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-4"
            >
              <Card className="glass border-primary/20 p-5 bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="font-black text-xl text-primary uppercase tracking-tighter">On Your Way</h3>
                    <p className="text-xs text-muted-foreground">Heading to {destination}</p>
                  </div>
                  <Badge className="bg-primary text-background font-bold px-3 py-1">LIVE</Badge>
                </div>
                
                {activePivotPoints.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Next Pivot Point</span>
                      </div>
                      {batterySaver && (
                        <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          10m Interval
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white">{activePivotPoints[0].label}</div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full mt-6 h-12 rounded-xl border-white/10 hover:bg-destructive/10 hover:text-destructive text-xs font-bold uppercase tracking-widest"
                  onClick={stopTracking}
                >
                  End Trip
                </Button>
              </Card>
            </motion.div>
          ) : (
            <>
              {!selectedRoute ? (
            <div className="space-y-6">
              {/* Strategy Tabs */}
              <Tabs value={activeStrategy} onValueChange={(v) => setActiveStrategy(v as any)} className="w-full">
                <TabsList className="grid grid-cols-3 bg-secondary/50 p-1 rounded-xl h-12">
                  <TabsTrigger value="fastest" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary">
                    <Zap className="w-4 h-4 mr-2" /> Fastest
                  </TabsTrigger>
                  <TabsTrigger value="cheapest" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary">
                    <Wallet className="w-4 h-4 mr-2" /> Cheapest
                  </TabsTrigger>
                  <TabsTrigger value="optimal" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary">
                    <Navigation className="w-4 h-4 mr-2" /> Optimal
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Route Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold capitalize">{activeStrategy} Strategy</h2>
                  <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Recommended</span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeStrategy}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {data?.strategies?.[activeStrategy]?.map((route, idx) => {
                      const isCheapestMulti = activeStrategy === 'cheapest' && route.type === 'split' && idx === 0;
                      const isHiddenDuplicateMulti = activeStrategy === 'cheapest' && route.type === 'split' && !isCheapestMulti;
                      
                      if (isHiddenDuplicateMulti) return null;

                      return (
                        <div key={route.id} className="space-y-4">
                          <Card 
                            className={cn(
                              "glass cursor-pointer transition-all hover:border-primary/50 group",
                              route.type === "split" ? "border-primary/20" : "border-white/5",
                              isCheapestMulti && "border-primary glow-teal"
                            )}
                            onClick={() => {
                              if (isCheapestMulti) {
                                setExpandedCheapestMulti(!expandedCheapestMulti);
                              } else {
                                handleRouteSelect(route);
                              }
                            }}
                          >
                            <CardContent className="p-4">
                              {isCheapestMulti && (
                                <div className="flex items-center gap-1 mb-2">
                                  <Wallet className="w-3 h-3 text-primary" />
                                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Cheapest Multi-Modal Way</span>
                                </div>
                              )}
                              <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                  <h3 className="font-bold text-lg">
                                    {route.type === "split" ? "Multi-Modal Split" : `${route.mode?.toUpperCase()} via ${route.provider}`}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    {route.type === "split" ? (
                                      <div className="flex items-center gap-2">
                                        {route.modes?.map((mode, i) => (
                                          <div key={i} className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5">
                                              <ModeIcon mode={mode} className="w-3.5 h-3.5 text-muted-foreground" />
                                              <span className="text-[10px] font-bold uppercase text-muted-foreground">{mode}</span>
                                            </div>
                                            {i < (route.modes?.length || 0) - 1 && <div className="w-4 h-px bg-white/10" />}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <ModeIcon mode={route.mode!} className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-xs font-bold uppercase text-primary tracking-wider">{route.mode}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-black text-primary">{route.duration} mins</div>
                                  <div className="text-sm font-medium text-muted-foreground">₹{route.price}</div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {route.type === "split" && (
                                    <>
                                      <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold">OPTIMIZED</Badge>
                                    </>
                                  )}
                                  {route.savings > 0 && (
                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-bold">
                                      SAVE ₹{route.savings}
                                    </Badge>
                                  )}
                                </div>
                                {isCheapestMulti && (
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="secondary" 
                                      className="h-7 text-[10px] font-bold px-3 rounded-lg border border-primary/20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedCheapestMulti(!expandedCheapestMulti);
                                      }}
                                    >
                                      {expandedCheapestMulti ? 'LESS OPTIONS' : 'MORE OPTIONS'}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="default" 
                                      className="h-7 text-[10px] font-bold text-background px-3 rounded-lg glow-teal"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRouteSelect(route);
                                      }}
                                    >
                                      SELECT <ChevronRight className="w-3 h-3 ml-1" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {isCheapestMulti && expandedCheapestMulti && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="pl-4 space-y-3"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Separator className="flex-1 bg-white/5" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap px-2">Other Top Multi-Modal Paths</span>
                                <Separator className="flex-1 bg-white/5" />
                              </div>
                              
                              {data.strategies.cheapest
                                .filter(r => r.type === 'split' && r.id !== route.id)
                                .slice(0, 2)
                                .map((altRoute) => (
                                  <Card 
                                    key={altRoute.id}
                                    className="bg-white/5 border-white/5 hover:border-primary/30 transition-all cursor-pointer group"
                                    onClick={() => handleRouteSelect(altRoute)}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                          <div className="flex -space-x-1">
                                            {altRoute.modes?.map((m, idx) => (
                                              <div key={idx} className="w-6 h-6 rounded-full bg-secondary border border-background flex items-center justify-center">
                                                <ModeIcon mode={m} className="w-3 h-3 text-muted-foreground" />
                                              </div>
                                            ))}
                                          </div>
                                          <div className="text-xs font-bold leading-none">{altRoute.duration} mins</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-black text-primary leading-none">₹{altRoute.price}</div>
                                          <div className="text-[8px] text-muted-foreground uppercase mt-1">Saves ₹{altRoute.savings}</div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          ) : (
            /* Route Detail View */
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Button 
                variant="ghost" 
                className="p-0 h-auto hover:bg-transparent text-muted-foreground"
                onClick={() => {
                  setSelectedRoute(null);
                  setShowMoreOptions(false);
                }}
              >
                <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to options
              </Button>

              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold">Route Details</h2>
                    <p className="text-sm text-muted-foreground">Total duration: {selectedRoute.duration} mins</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-primary">₹{selectedRoute.price}</div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative pl-8 space-y-10">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/10" />
                  
                  {selectedRoute.segments.map((segment, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[29px] top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                        <ModeIcon mode={segment.mode} className="w-2.5 h-2.5 text-primary" />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold capitalize">{segment.mode} {segment.busNo ? `(${segment.busNo})` : ""}</h4>
                            <p className="text-xs text-muted-foreground">{segment.duration} mins • {segment.provider || "Public Transport"}</p>
                          </div>
                          <div className="text-sm font-medium">₹{segment.price}</div>
                        </div>

                        {/* Pivot Point Comparison or Direct Booking */}
                        {(segment.mode === "car" || segment.mode === "auto" || segment.mode === "bike") && (
                          <div className="p-4 bg-secondary/30 rounded-2xl border border-white/5 space-y-4">
                            {selectedRoute.type === "single" ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <ModeIcon mode={segment.mode} className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold">{segment.provider} ({segment.mode?.toUpperCase()})</div>
                                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Best Price for {segment.mode}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-black text-primary">₹{segment.price}</div>
                                    <div className="text-[10px] text-muted-foreground">{selectedRoute.waitingTime}m wait</div>
                                  </div>
                                </div>
                                <Button 
                                  className="w-full h-12 rounded-xl font-bold glow-teal"
                                  onClick={() => {
                                    // Find the provider in rideProviders to get the deepLink
                                    const p = rideProviders.find(rp => rp.name === segment.provider);
                                    if (p) window.location.href = p.deepLink;
                                  }}
                                >
                                  CONTINUE TO BOOK {segment.provider?.toUpperCase()}
                                </Button>
                              </div>
                            ) : (
                              /* Split route comparison logic remains for pivot points */
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Book Cheapest Transport</span>
                                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px]">INTELLIGENT SELECTION</Badge>
                                </div>
                                
                                {(() => {
                                  const relevantProviders = rideProviders.filter(rp => rp.mode === segment.mode);
                                  const cheapest = relevantProviders.length > 0 
                                    ? relevantProviders.reduce((prev, curr) => prev.price < curr.price ? prev : curr)
                                    : null;
                                  
                                  return cheapest ? (
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-primary/20">
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 bg-primary/10 rounded-lg">
                                            <Smartphone className="w-3.5 h-3.5 text-primary" />
                                          </div>
                                          <div>
                                            <div className="text-xs font-bold">{cheapest.name}</div>
                                            <div className="text-[9px] text-muted-foreground uppercase">{cheapest.waitingTime} min pickup</div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-black text-emerald-500">₹{cheapest.price}</div>
                                          <div className="text-[8px] text-muted-foreground uppercase">Cheapest</div>
                                        </div>
                                      </div>
                                      <Button 
                                        className="w-full h-10 rounded-xl text-xs font-bold glow-teal"
                                        onClick={() => window.location.href = cheapest.deepLink}
                                      >
                                        BOOK {cheapest.name.toUpperCase()} NOW
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-muted-foreground italic text-center py-2">
                                      Searching for best local {segment.mode} providers...
                                    </div>
                                  );
                                })()}

                                <div className="pt-2 border-t border-white/5">
                                  <Button 
                                    variant="ghost" 
                                    className="w-full h-7 text-[10px] text-muted-foreground hover:bg-white/5 font-bold uppercase"
                                    onClick={() => {
                                      // Toggle showing all if needed, but the prompt says focus on booking the cheapest
                                      setShowMoreOptions(true); // Re-using state for demo
                                    }}
                                  >
                                    View other {segment.mode} providers
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {segment.mode === "bus" && (
                          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                            <Smartphone className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-medium">Bus {segment.busNo} arriving in 4 mins</span>
                          </div>
                        )}

                        {segment.mode === "metro" && segment.traffic === "High" && (
                          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                            <span className="text-xs font-medium text-destructive">High traffic in metro station</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-3">
                  <Button 
                    className="w-full h-14 rounded-2xl text-lg font-bold glow-teal"
                    onClick={() => startJourney(selectedRoute)}
                    disabled={tripStatus === "active"}
                  >
                    {tripStatus === "active" ? "JOURNEY IN PROGRESS..." : "START JOURNEY"}
                  </Button>
                  
                  {!showMoreOptions && (
                    <Button 
                      variant="ghost"
                      className="w-full h-12 rounded-xl text-xs font-bold uppercase tracking-widest text-primary/70 hover:text-primary hover:bg-primary/5"
                      onClick={handleMoreOptions}
                    >
                      More Options
                    </Button>
                  )}

                  {showMoreOptions && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4 pt-4 border-t border-white/5"
                    >
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nearby Transit Points</h4>
                        <Badge variant="outline" className="text-[8px] opacity-50">SYNCED WITH MAP</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {additionalOptions.map((option) => (
                          <Card 
                            key={option.id}
                            className="bg-white/5 border-white/5 hover:border-primary/30 transition-all cursor-pointer group"
                            onClick={() => setSelectedRoute(option)}
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className="flex -space-x-1">
                                    {option.modes?.map((m, idx) => (
                                      <div key={idx} className="w-6 h-6 rounded-full bg-secondary border border-background flex items-center justify-center">
                                        <ModeIcon mode={m} className="w-3 h-3 text-muted-foreground" />
                                      </div>
                                    ))}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold">{option.duration} mins</div>
                                    <div className="text-[9px] text-muted-foreground">Via {option.segments.map(s => s.provider).join(' → ')}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-black text-emerald-500">₹{option.price}</div>
                                  <div className="text-[9px] text-muted-foreground">SAVINGS ₹{option.savings}</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <p className="text-center text-[10px] text-muted-foreground mt-4 uppercase tracking-widest font-bold">
                    Notifications will alert you at pivot points
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Pivot Notification Overlay */}
          <AnimatePresence>
            {pivotNotification && (
              <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-24 left-4 right-4 z-[150]"
              >
                <Card className="glass border-primary/50 shadow-2xl overflow-hidden bg-[#1a1b1e]/90 backdrop-blur-xl">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Better Route Found!</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{pivotNotification.message}</p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Fastest Option</div>
                        <div className="text-sm font-bold text-primary">{pivotNotification.route.duration} mins • ₹{pivotNotification.route.price}</div>
                      </div>
                      <div className="flex gap-2">
                         <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 px-3 rounded-lg text-xs"
                          onClick={() => setPivotNotification(null)}
                        >
                          Keep Current
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="h-9 px-4 rounded-lg text-xs font-bold glow-teal"
                          onClick={() => handlePivotSwitch(pivotNotification.route)}
                        >
                          Switch Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Navigation Bar */}
      <nav className="p-4 grid grid-cols-4 border-t border-white/5 glass">
        <div className="flex flex-col items-center gap-1 text-primary">
          <Navigation className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Explore</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Train className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Routes</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Saved</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Settings</span>
        </div>
      </nav>

      {/* Floating Action Button (Simulated Agent) */}
      <motion.div 
        className="absolute bottom-24 right-4 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg glow-teal z-50 cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Smartphone className="w-6 h-6 text-background" />
      </motion.div>
    </div>
  );
}
