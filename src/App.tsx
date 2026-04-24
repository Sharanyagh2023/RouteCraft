import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
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
  X,
  ShieldCheck,
  MessageSquare,
  Send,
  Sparkles,
  Info,
  CheckCircle2,
  Loader2,
  Trash2,
  Heart,
  Bookmark,
  Bell,
  Moon,
  Sun,
  History
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
  TransportMode,
  SavedRoute,
  AppSettings,
  UserProfile,
  TravelStats,
  ChatMessage,
  ChatRouteOption
} from "./types";
import { v4 as uuidv4 } from 'uuid';
import { MapComponent } from "./components/MapComponent";
import { TimelineView } from "./components/TimelineView";
import { NavigationScreen } from "./components/NavigationScreen";
const NAMMA_YATRI_URL = "https://nammayatri.in/";

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
  lng: string;
}

const RoutesTab = ({ recentRoutes, onSelect }: { recentRoutes: SavedRoute[], onSelect: (route: SavedRoute) => void }) => (
  <div className="p-4 space-y-6">
    <div className="flex items-center gap-2 mb-2">
      <History className="w-5 h-5 text-primary" />
      <h2 className="text-xl font-bold uppercase tracking-tight">Recent Routes</h2>
    </div>
    
    {recentRoutes.length === 0 ? (
      <div className="py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto opacity-50">
          <Search className="w-8 h-8" />
        </div>
        <p className="text-muted-foreground text-sm">No recent routes yet.<br/>Start searching to see them here.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {recentRoutes.map((route) => (
          <Card 
            key={route.id} 
            className="glass border-white/5 hover:border-primary/50 cursor-pointer group transition-all"
            onClick={() => onSelect(route)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full border border-primary shrink-0" />
                    <div className="text-sm font-bold truncate uppercase tracking-tight">{route.source}</div>
                  </div>
                  <div className="w-0.5 h-3 bg-white/10 ml-0.75" />
                  <div className="flex items-center gap-2">
                    <MapPin className="w-2.5 h-2.5 text-primary shrink-0" />
                    <div className="text-sm font-bold truncate uppercase tracking-tight">{route.destination}</div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-black text-primary">₹{route.price}</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">{route.duration} mins</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </div>
);

const SavedTab = ({ savedRoutes, onSelect, onToggle }: { savedRoutes: SavedRoute[], onSelect: (route: SavedRoute) => void, onToggle: (route: SavedRoute) => void }) => (
  <div className="p-4 space-y-6">
    <div className="flex items-center gap-2 mb-2">
      <Bookmark className="w-5 h-5 text-primary" />
      <h2 className="text-xl font-bold uppercase tracking-tight">Saved Routes</h2>
    </div>
    
    {savedRoutes.length === 0 ? (
      <div className="py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto opacity-50">
          <Heart className="w-8 h-8" />
        </div>
        <p className="text-muted-foreground text-sm">You haven't saved any routes yet.<br/>Save your frequent routes for quick access.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {savedRoutes.map((route) => (
          <Card 
            key={route.id} 
            className="glass border-primary/20 hover:border-primary/50 cursor-pointer group transition-all"
            onClick={() => onSelect(route)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full border border-primary shrink-0" />
                    <div className="text-sm font-bold truncate uppercase tracking-tight">{route.source}</div>
                  </div>
                  <div className="w-0.5 h-3 bg-white/10 ml-0.75" />
                  <div className="flex items-center gap-2">
                    <MapPin className="w-2.5 h-2.5 text-primary shrink-0" />
                    <div className="text-sm font-bold truncate uppercase tracking-tight">{route.destination}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <div className="text-lg font-black text-primary">₹{route.price}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">{route.duration} mins</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-primary hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(route);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </div>
);

const SettingsTab = ({ settings, setSettings, onClear, showToast }: { settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>>, onClear: () => void, showToast: (msg: string) => void }) => {
  const browserInfo = `${navigator.userAgent.split(' ')[0]} on ${navigator.platform}`;
  
  return (
    <div className="p-4 space-y-8">
      <div className="flex items-center gap-2 mb-2">
        <User className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold uppercase tracking-tight">App Settings</h2>
      </div>

      <div className="space-y-4">
        <div className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-xl">
              {settings.darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <div className="font-bold text-sm">Dark Appearance</div>
              <div className="text-[10px] text-muted-foreground uppercase font-medium">Standard theme preference</div>
            </div>
          </div>
          <div 
            className={cn(
              "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors",
              settings.darkMode ? "bg-primary" : "bg-muted"
            )}
            onClick={() => setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }))}
          >
            <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", settings.darkMode ? "translate-x-6" : "translate-x-0")} />
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-xl">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-bold text-sm">Notifications</div>
              <div className="text-[10px] text-muted-foreground uppercase font-medium">Route alerts & pivots</div>
            </div>
          </div>
          <div 
            className={cn(
              "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors",
              settings.notifications ? "bg-primary" : "bg-muted"
            )}
            onClick={() => {
              const next = !settings.notifications;
              setSettings(prev => ({ ...prev, notifications: next }));
              if (next) showToast("Notifications Enabled 🔔");
            }}
          >
            <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", settings.notifications ? "translate-x-6" : "translate-x-0")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 rounded-2xl border border-white/5 space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Language</label>
            <select 
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value as any }))}
              className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 outline-none p-0"
            >
              <option value="EN" className="bg-background">English (EN)</option>
              <option value="HI" className="bg-background">Hindi (HI)</option>
              <option value="KN" className="bg-background">Kannada (KN)</option>
            </select>
          </div>
          <div className="glass p-4 rounded-2xl border border-white/5 space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Default Mode</label>
            <select 
              value={settings.defaultTransport}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultTransport: e.target.value as any }))}
              className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 outline-none p-0"
            >
              <option value="auto" className="bg-background">Auto</option>
              <option value="metro" className="bg-background">Metro</option>
              <option value="bike" className="bg-background">Bike</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Storage Management</h3>
        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/50 font-bold gap-3"
          onClick={onClear}
        >
          <Trash2 className="w-5 h-5" />
          CLEAR ALL APP DATA
        </Button>
      </div>

      <div className="pt-20 text-center space-y-1">
        <div className="text-xs font-black tracking-[0.2em] text-primary/30 uppercase italic">Version 2.4.0-Beta</div>
        <div className="text-[9px] text-muted-foreground font-mono uppercase opacity-50">{browserInfo}</div>
      </div>
    </div>
  );
};

const StatsTab = ({ stats }: { stats: TravelStats }) => (
  <div className="p-4 space-y-6">
    <div className="flex items-center gap-2 mb-2">
      <Zap className="w-5 h-5 text-primary" />
      <h2 className="text-xl font-bold uppercase tracking-tight">Travel Analytics</h2>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <Card className="glass border-white/5 p-4 space-y-1">
        <div className="text-[10px] font-bold text-muted-foreground uppercase">Trips Planned</div>
        <div className="text-2xl font-black text-primary">{stats.totalRoutes}</div>
      </Card>
      <Card className="glass border-white/5 p-4 space-y-1">
        <div className="text-[10px] font-bold text-muted-foreground uppercase">Favorite Mode</div>
        <div className="text-lg font-black text-primary uppercase">{stats.favMode}</div>
      </Card>
      <Card className="glass border-white/5 p-4 space-y-1">
        <div className="text-[10px] font-bold text-muted-foreground uppercase">Total Spent</div>
        <div className="text-2xl font-black text-emerald-500">₹{stats.totalSpent}</div>
      </Card>
      <Card className="glass border-white/5 p-4 space-y-1">
        <div className="text-[10px] font-bold text-muted-foreground uppercase">Total Saved</div>
        <div className="text-2xl font-black text-emerald-500">₹{stats.savings}</div>
      </Card>
    </div>

    <Card className="glass border-primary/20 p-4 relative overflow-hidden">
      <div className="relative z-10 space-y-2">
        <div className="text-[10px] font-black text-primary uppercase tracking-widest">Efficiency Rating</div>
        <div className="text-3xl font-black italic">OPTIMIZED TRAVELER</div>
        <p className="text-xs text-muted-foreground">You’re saving 24% more money than average commuters this month.</p>
      </div>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-20 h-20 text-primary" />
      </div>
    </Card>
  </div>
);

const TrackPage = ({ lat, lng }: { lat: number, lng: number }) => {
  const [currentPos, setCurrentPos] = useState<{lat: number, lng: number}>({ lat, lng });
  const [path, setPath] = useState<[number, number][]>([[lat, lng]]);
  const [eta, setEta] = useState(900); // Initial simulated ETA in seconds (15 mins)
  const [isCentered, setIsCentered] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPos(newCoords);
        setPath(prev => [...prev, [newCoords.lat, newCoords.lng]]);
      },
      (err) => console.error("Tracking error", err),
      { enableHighAccuracy: true }
    );

    const etaInterval = setInterval(() => {
      setEta(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000); // Decrease ETA every second for live feel

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(etaInterval);
    };
  }, []);

  const formatEta = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <header className="p-4 border-b border-white/5 glass flex items-center justify-between z-10">
        <h1 className="text-xl font-bold tracking-tight text-primary">LIVE TRACKING</h1>
        <Badge className="bg-primary text-background animate-pulse font-bold px-3">ACTIVE</Badge>
      </header>
      
      <div className="flex-1 relative">
        <MapComponent 
          sourceCoords={null}
          destCoords={null}
          userCoords={isCentered ? currentPos : null}
          routePolyline={path}
          isTracking={isCentered}
        />
        
        {/* Re-center Button Overlay */}
        {!isCentered && (
          <Button 
            className="absolute top-4 right-4 z-20 rounded-full shadow-2xl glow-teal"
            size="sm"
            onClick={() => setIsCentered(true)}
          >
            <Locate className="w-4 h-4 mr-2" />
            Re-center
          </Button>
        )}

        <div className="absolute bottom-6 left-4 right-4 z-10 space-y-3">
          <Card className="glass border-primary/30 p-4 bg-background/80 backdrop-blur-xl">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estimated Arrival</div>
                <div className="text-2xl font-black text-primary">{formatEta(eta)} MINS</div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-secondary"
                onClick={() => window.location.href = window.location.origin}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </Card>
          <div className="text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter bg-background/50 inline-block px-3 py-1 rounded-full">
              Sharing live location via RouteCraft
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const navigate = useNavigate();
  const [isTakingPath, setIsTrackingPath] = useState(false);
  const [trackingParams, setTrackingParams] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lng = params.get('lng');
    if (lat && lng) {
      setTrackingParams({ lat: parseFloat(lat), lng: parseFloat(lng) });
    }
  }, []);
  const [source, setSource] = useState("HSR Layout");
  const [destination, setDestination] = useState("Indiranagar");
  const [sourceCoords, setSourceCoords] = useState<{lat: string, lng: string} | null>(null);
  const [destCoords, setDestCoords] = useState<{lat: string, lng: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CalculationResponse | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [activeStrategy, setActiveStrategy] = useState<keyof RouteStrategies>("fastest");
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [pivotPoints, setPivotPoints] = useState<any[]>([]);

  // Helper function to extract pivot points from route
  const extractPivotPoints = (route: RouteOption) => {
    if (!route || !route.segments || route.segments.length <= 1) return [];
    
    const pivots = route.segments
      .filter(s => s.coords && s.coords.length === 2)
      .map((s) => ({
        lat: s.coords![0],
        lng: s.coords![1],
        label: `${s.mode.toUpperCase()} - ${s.provider || "Interchange"}`
      }));

    console.log("PIVOTS:", pivots);
    return pivots;
  };

  useEffect(() => {
    if (selectedRoute) {
      setPivotPoints(extractPivotPoints(selectedRoute));
    } else {
      setPivotPoints([]);
    }
  }, [selectedRoute]);

  const [rideProviders, setRideProviders] = useState<RideProvider[]>([]);
  
  // Search UI State
  const [searchMode, setSearchMode] = useState<"source" | "destination" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Trip Tracking State
  const [tripStatus, setTripStatus] = useState<"planning" | "active" | "pivoted">("planning");
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);

  // Real-time weather state
  const [weather, setWeather] = useState<{ temp: number, desc: string, willRain: boolean } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!sourceCoords || !sourceCoords.lat) return;
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${sourceCoords.lat}&longitude=${sourceCoords.lng}&current=temperature_2m,weather_code&timezone=auto`);
        if (!res.ok) return;
        const weatherData = await res.json();
        
        const wmoCode = weatherData.current.weather_code;
        let desc = "Clear";
        let willRain = false;
        
        if (wmoCode >= 1 && wmoCode <= 3) desc = "Cloudy";
        else if (wmoCode >= 51 && wmoCode <= 67) { desc = "Rain"; willRain = true; }
        else if (wmoCode >= 71 && wmoCode <= 77) { desc = "Snow"; willRain = true; }
        else if (wmoCode >= 80 && wmoCode <= 82) { desc = "Heavy Rain"; willRain = true; }
        else if (wmoCode >= 95 && wmoCode <= 99) { desc = "Storm"; willRain = true; }

        setWeather({ temp: weatherData.current.temperature_2m, desc, willRain });
      } catch (e) {
        console.error("Weather error:", e);
      }
    };
    fetchWeather();
  }, [sourceCoords]);
  const [showNavigationScreen, setShowNavigationScreen] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timeout | null>(null);
  const [pivotNotification, setPivotNotification] = useState<{message: string, route: RouteOption} | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [additionalOptions, setAdditionalOptions] = useState<RouteOption[]>([]);
  const lastRerouteAtRef = useRef(0);
  const lastRerouteCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const distanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const p1 = toRad(a.lat);
    const p2 = toRad(b.lat);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatState, setChatState] = useState<{
    source: string | null;
    destination: string | null;
    preference: string | null;
  }>({
    source: null,
    destination: null,
    preference: null
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', type: 'text', content: "Hi! I'm your RouteCraft AI. Where would you like to go today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Safety State
  const [isSafetyOpen, setIsSafetyOpen] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [lastSosAt, setLastSosAt] = useState<number | null>(null);

  // Profile & Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : { name: "Guest User", email: "guest@routecraft.app" };
  });

  // Tab State
  const [activeTab, setActiveTab] = useState<"explore" | "routes" | "saved" | "settings" | "stats">(
    (localStorage.getItem("activeTab") as any) || "explore"
  );
  const [recentRoutes, setRecentRoutes] = useState<SavedRoute[]>(() => 
    JSON.parse(localStorage.getItem("recentRoutes") || "[]")
  );
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(() => 
    JSON.parse(localStorage.getItem("savedRoutes") || "[]")
  );
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("settings");
    return saved ? JSON.parse(saved) : { darkMode: true, notifications: true, language: "EN", defaultTransport: "metro" };
  });

  // Analytics Stats
  const [stats, setStats] = useState<TravelStats>({
    totalRoutes: 0,
    favMode: "none",
    totalSpent: 0,
    savings: 0
  });

  // Battery State
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.body.classList.toggle("dark", savedTheme === "dark");
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
    const theme = settings.darkMode ? "dark" : "light";
    localStorage.setItem("theme", theme);
    document.body.classList.toggle("dark", settings.darkMode);
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  // Chat auto-scroll effect
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  // Battery Listener
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener("levelchange", () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
  }, []);

  // Location Watcher
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(newPos);
          // Log for debugging
          console.log("Real-time Location Update:", newPos);
        },
        (err) => console.error("Location tracking error:", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Sync Stats
  useEffect(() => {
    const totalSpent = recentRoutes.reduce((acc, r) => acc + r.price, 0);
    const cheapest = Math.min(...recentRoutes.map(r => r.price), 0);
    const fastest = Math.min(...recentRoutes.map(r => r.duration), 0);
    
    setStats({
      totalRoutes: recentRoutes.length,
      favMode: recentRoutes.length > 0 ? (recentRoutes[0].price < 50 ? "metro" : "auto") : "none",
      totalSpent,
      savings: Math.round(totalSpent * 0.18)
    });
  }, [recentRoutes]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSavedRoute = (route: RouteOption | SavedRoute) => {
    const routeSource = 'source' in route ? route.source : source;
    const routeDest = 'destination' in route ? route.destination : destination;
    
    const isSaved = savedRoutes.some(r => 
      r.source === routeSource && r.destination === routeDest
    );

    if (isSaved) {
      const updated = savedRoutes.filter(r => 
        !(r.source === routeSource && r.destination === routeDest)
      );
      setSavedRoutes(updated);
      localStorage.setItem("savedRoutes", JSON.stringify(updated));
      showToast("Route removed from saved 🗑️");
    } else {
      const newSaved: SavedRoute = 'source' in route ? route : {
        id: uuidv4(),
        source: routeSource,
        destination: routeDest,
        price: route.price,
        duration: route.duration,
        timestamp: Date.now()
      };
      const updated = [newSaved, ...savedRoutes];
      setSavedRoutes(updated);
      localStorage.setItem("savedRoutes", JSON.stringify(updated));
      showToast("Route saved successfully! ✅");
    }
  };

  const clearAppData = () => {
    localStorage.removeItem("recentRoutes");
    localStorage.removeItem("savedRoutes");
    localStorage.removeItem("user");
    setRecentRoutes([]);
    setSavedRoutes([]);
    setUser({ name: "Guest User", email: "guest@routecraft.app" });
    alert("App data cleared (settings kept)!");
    navigate('/');
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation || !userCoords) {
      alert("Location data not available yet.");
      return;
    }

    const { lat, lng } = userCoords;
    const appUrl = `${window.location.origin}/track?lat=${lat}&lng=${lng}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Live Location",
        text: "Track me here",
        url: appUrl
      }).catch(err => console.log('Share failed', err));
    } else {
      navigator.clipboard.writeText(appUrl);
      showToast("Tracking link copied! 🔗");
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', type: 'text', content: userMsg }]);
    setChatInput("");
    setIsTyping(true);

    try {
      // 1. Intent Parsing
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      
      setIsTyping(false);

      // Handle specific follow-up questions
      const msgLower = userMsg.toLowerCase();
      
      // Update state from current context if bot finds entities
      const { source: extractedSource, destination: extractedDest, preference: extractedPreference } = data.entities;
      
      let nextState = { ...chatState };
      if (extractedSource) nextState.source = extractedSource;
      if (extractedDest) nextState.destination = extractedDest;
      if (extractedPreference) nextState.preference = extractedPreference;
      
      // Manual preference capture if state has source/dest but asking for preference
      if (chatState.source && chatState.destination && !chatState.preference) {
        if (msgLower.includes("cheap")) nextState.preference = "cheaper";
        if (msgLower.includes("fast") || msgLower.includes("quick")) nextState.preference = "faster";
        if (msgLower.includes("comfort") || msgLower.includes("cab")) nextState.preference = "comfortable";
      }

      setChatState(nextState);

      if (msgLower.includes("safer at night") || msgLower.includes("safety")) {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          type: 'text', 
          content: "Safety first! At this hour, I recommend a tracked Cab or Auto. Avoid walking in dimly lit areas." 
        }]);
        return;
      }
      if (msgLower.includes("luggage")) {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          type: 'text', 
          content: "Got heavy bags? I'd recommend an Auto or Cab for door-to-door comfort. Metro can be quite a struggle with large luggage." 
        }]);
        return;
      }
      if (msgLower.includes("run late") || msgLower.includes("running late") || msgLower.includes("late")) {
        setChatMessages(prev => [...prev, { role: 'assistant', type: 'text', content: "Speeding things up! Showing you only the absolute fastest options available right now." }]);
        nextState.preference = "faster";
        setChatState(nextState);
      }
      
      if (msgLower.includes("bus") && msgLower.includes("timing")) {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          type: 'text', 
          content: "Bus 500C is expected at HSR BDA Complex in 4 mins. It's moderately crowded." 
        }]);
        return;
      }

      const finalSource = nextState.source;
      const finalDest = nextState.destination;

      if (finalSource && finalDest) {
        setSource(finalSource);
        setDestination(finalDest);
        
        if (!nextState.preference) {
          setChatMessages(prev => [...prev, { 
            role: 'assistant', 
            type: 'text', 
            content: `Found it! Routing from ${finalSource} to ${finalDest}. Do you want the fastest or cheapest route?` 
          }]);
          return;
        }

        // We have source, destination and preference
        setIsTyping(true);
        
        // Use geocode to get distance for smart suggestions
        const sourceResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(finalSource)}&limit=1`);
        const sourceData = await sourceResp.json();
        const destResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(finalDest)}&limit=1`);
        const destData = await destResp.json();

        let distance = 0;
        let sCoords: [number, number] | undefined;
        let dCoords: [number, number] | undefined;
        if (sourceData[0] && destData[0]) {
            const lat1 = parseFloat(sourceData[0].lat);
            const lon1 = parseFloat(sourceData[0].lon);
            const lat2 = parseFloat(destData[0].lat);
            const lon2 = parseFloat(destData[0].lon);
            sCoords = [lat1, lon1];
            dCoords = [lat2, lon2];
            distance = Math.sqrt(Math.pow(lat1-lat2, 2) + Math.pow(lon1-lon2, 2)) * 111;
        }

        const context = { battery: 85, raining: false }; // Mock
        const orchRes = await fetch("/api/v1/orchestrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: finalSource, destination: finalDest, context })
        });
        const orchData = await orchRes.json();
        setData(orchData);
        setIsTyping(false);

        const now = new Date();
        const hour = now.getHours();
        const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);

        if (isPeak) {
           setChatMessages(prev => [...prev, { role: 'assistant', type: 'alert', content: "🚨 Peak hour - expect heavy crowds in Metro and traffic on roads." }]);
        }

        if (distance < 2 && distance > 0) {
           setChatMessages(prev => [...prev, { role: 'assistant', type: 'text', content: `🚶 It's only ${distance.toFixed(1)}km away. It's walkable in about 20 mins, want directions?` }]);
        }

        const allOptions: ChatRouteOption[] = [];
        
        // Step 6: Rank by fastest real traffic time
        const sortedOptimal = [...orchData.strategies.optimal].sort((a, b) => a.duration - b.duration);
        const sortedCheapest = [...orchData.strategies.optimal, ...orchData.strategies.cheapest].sort((a, b) => a.price - b.price);

        if (sortedOptimal[0]) {
           const r = sortedOptimal[0];
           allOptions.push({
              label: "FASTEST",
              time: r.duration,
              price: r.price,
              mode: r.modes?.[0] || r.mode || 'walk',
              segments: r.segments,
              route: r,
              pickupCoords: sCoords,
              destinationCoords: dCoords
           });
        }
        
        if (sortedCheapest[0] && sortedCheapest[0].id !== sortedOptimal[0]?.id) {
           const r = sortedCheapest[0];
           allOptions.push({
              label: "CHEAPEST",
              time: r.duration,
              price: r.price,
              mode: r.modes?.[0] || r.mode || 'walk',
              segments: r.segments,
              route: r,
              pickupCoords: sCoords,
              destinationCoords: dCoords
           });
        }

        allOptions.push({
          label: "COMFORTABLE",
          time: Math.round(distance * 5 + 10),
          price: Math.round(distance * 15 + 30),
          mode: "car",
          segments: [],
          bookingMode: 'uber',
          pickupCoords: sCoords,
          destinationCoords: dCoords
        });

        allOptions.push({
          label: "COMFORTABLE",
          time: 25,
          price: 110,
          mode: "car",
          segments: [],
          bookingMode: 'ola',
          pickupCoords: sCoords,
          destinationCoords: dCoords
        });

        let filteredOptions = allOptions;
        if (nextState.preference === "cheaper") filteredOptions = allOptions.filter(o => o.label === "CHEAPEST" || o.price < 50);
        if (nextState.preference === "faster") filteredOptions = allOptions.filter(o => o.label === "FASTEST" || o.time < 30);
        if (nextState.preference === "comfortable") filteredOptions = allOptions.filter(o => o.label === "COMFORTABLE");

        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          type: 'routeCard', 
          options: filteredOptions.slice(0, 3) 
        }]);

      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', type: 'text', content: "I'd love to help! Could you tell me where you're starting from and where you want to go? (e.g., 'From HSR to Palace')" }]);
      }
    } catch (err) {
      setIsTyping(false);
      console.error("Chat failed", err);
    }
  };

  const SOS_COOLDOWN_MS = 45000;
  const remainingSosCooldownMs = lastSosAt ? Math.max(0, SOS_COOLDOWN_MS - (Date.now() - lastSosAt)) : 0;

  const playSosTone = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.35);
    } catch (err) {
      console.warn("Unable to play SOS tone", err);
    }
  };

  const getCurrentPositionSafe = () => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const triggerSOS = async () => {
    if (sosLoading) return;

    if (remainingSosCooldownMs > 0) {
      showToast(`SOS cooldown active: ${Math.ceil(remainingSosCooldownMs / 1000)}s`);
      return;
    }

    const confirmed = window.confirm("Send SOS alert now? This will notify emergency contacts with your latest location.");
    if (!confirmed) return;

    if (navigator.vibrate) {
      navigator.vibrate([250, 120, 250]);
    }
    playSosTone();

    setSosLoading(true);

    let coords: { lat: number; lng: number } | null = null;
    let locationUnavailableReason: string | null = null;

    try {
      coords = await getCurrentPositionSafe();
      setUserCoords(coords);
    } catch (geoErr: any) {
      locationUnavailableReason = geoErr?.message || "Geolocation unavailable";
      console.error("SOS geolocation failed", geoErr);
    }

    try {
      const response = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coords?.lat,
          lng: coords?.lng,
          locationUnavailableReason
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMsg = payload?.details || payload?.error || "Failed to send SOS alert";
        throw new Error(errorMsg);
      }

      setSosActive(true);
      setLastSosAt(Date.now());
      showToast("✅ SOS alert sent successfully!");
    } catch (err: any) {
      console.error("SOS send failed", err);
      const errorMsg = err?.message || "Unknown error";
      showToast(`❌ SOS failed: ${errorMsg}`);
    } finally {
      setSosLoading(false);
    }
  };

  const handleMoreOptions = async () => {
    setShowMoreOptions(true);
    if (!sourceCoords) return;

    try {
      const res = await fetch(`/api/nearby-stops?lat=${sourceCoords.lat}&lon=${sourceCoords.lng}&radius=2000`);
      const stops = await res.json();

      const extraOptions: RouteOption[] = (Array.isArray(stops) ? stops : []).slice(0, 3).map((stop: any, i: number) => {
        const stopMode = stop.type === "metro" ? "metro" : "bus";
        const walkMinutes = Math.max(3, Math.round(((stop.distanceMeters || 500) / 1000) * 12));
        const transitMinutes = stopMode === "metro" ? 18 : 24;
        const transitPrice = stopMode === "metro" ? 30 : 15;
        const totalDuration = walkMinutes + transitMinutes + 3;

        return {
        id: `extra_${i}_${stop.id}`,
        type: "split",
        duration: totalDuration,
        price: transitPrice,
        savings: Math.max(0, 60 - i * 10),
        waitingTime: stopMode === "metro" ? 6 : 8,
        modes: ["walk", stopMode],
        segments: [
          {
            mode: "walk",
            duration: walkMinutes,
            price: 0,
            provider: "Walk",
            fromName: source,
            toName: stop.name,
            available: true
          },
          {
            mode: stopMode,
            duration: transitMinutes,
            price: transitPrice,
            provider: stop.name,
            fromName: stop.name,
            toName: destination,
            available: true
          }
        ]
      };
      });
      
      if (extraOptions.length > 0) {
        setAdditionalOptions(extraOptions);
      } else {
        setAdditionalOptions([]);
      }
    } catch (err) {
      console.error("Failed to fetch more options", err);
    }
  };

  useEffect(() => {
    if (tripStatus !== "active" || !userCoords || !destination) return;

    const now = Date.now();
    const minRerouteIntervalMs = 20000;
    const minMovementMeters = 75;

    const lastCoords = lastRerouteCoordsRef.current;
    const movedEnough = !lastCoords || distanceMeters(lastCoords, userCoords) >= minMovementMeters;
    const intervalPassed = now - lastRerouteAtRef.current >= minRerouteIntervalMs;

    if (!movedEnough || !intervalPassed) return;

    let cancelled = false;

    const rerouteFromLivePosition = async () => {
      try {
        const liveSourceCoords = {
          lat: userCoords.lat.toString(),
          lng: userCoords.lng.toString()
        };

        const context = {
          battery: batteryLevel ?? 85,
          raining: data?.weather?.condition?.toLowerCase().includes("rain") || false
        };

        const response = await fetch("/api/v1/orchestrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: source,
            destination,
            sourceCoords: liveSourceCoords,
            destCoords,
            context
          })
        });

        if (!response.ok || cancelled) return;
        const result = await response.json();
        if (cancelled) return;

        setData(result);
        setSourceCoords(liveSourceCoords);

        const fastestLiveRoute = result?.strategies?.fastest?.[0] as RouteOption | undefined;
        if (fastestLiveRoute) {
          setActiveRoute(fastestLiveRoute);
          setCurrentSegmentIndex(0);
        }

        lastRerouteAtRef.current = now;
        lastRerouteCoordsRef.current = userCoords;
      } catch (err) {
        console.error("Live reroute failed", err);
      }
    };

    rerouteFromLivePosition();

    return () => {
      cancelled = true;
    };
  }, [tripStatus, userCoords, destination, destCoords, source, batteryLevel, data?.weather?.condition]);

  const startJourney = (route: RouteOption) => {
    setActiveRoute(route);
    setTripStatus("active");
    setCurrentSegmentIndex(0);
    setShowNavigationScreen(true);
    
    // Simulate user movement along geometry if available
    if (route.geometry && route.geometry.length > 0) {
      setUserCoords({ lat: route.geometry[0][0], lng: route.geometry[0][1] });
      // Movement simulation can happen in the background or be triggered by steps
    }
  };

  const handleEndTrip = () => {
    if (trackingInterval) clearInterval(trackingInterval);
    setTripStatus("planning");
    setActiveRoute(null);
    setSelectedRoute(null);
    setCurrentSegmentIndex(0);
    setShowNavigationScreen(false);
  };

  const handleNextStep = () => {
    if (!activeRoute) return;
    if (currentSegmentIndex < activeRoute.segments.length - 1) {
      const nextSegmentIndex = currentSegmentIndex + 1;
      setCurrentSegmentIndex(nextSegmentIndex);
      
      // Update user coords to the start of the next segment
      const nextSegment = activeRoute.segments[nextSegmentIndex];
      if (nextSegment.pickupCoords) {
        setUserCoords({ lat: nextSegment.pickupCoords[0], lng: nextSegment.pickupCoords[1] });
      } else if (nextSegment.geometry && nextSegment.geometry.length > 0) {
        setUserCoords({ lat: nextSegment.geometry[0][0], lng: nextSegment.geometry[0][1] });
      }
    } else {
      handleEndTrip();
      alert("You have arrived at your destination!");
    }
  };

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
        raining: data?.weather?.condition?.toLowerCase().includes("rain") || false
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
      if (!response.ok) throw new Error("API Error");
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) throw new Error("Invalid Response");
      const result = await response.json();
      setData(result);
      setProvider(result.provider);
      setSelectedRoute(null);

      // Save to recent routes
      const newRecent: SavedRoute = {
        id: uuidv4(),
        source,
        destination,
        price: result.strategies.fastest[0]?.price || 0,
        duration: result.strategies.fastest[0]?.duration || 0,
        timestamp: Date.now()
      };
      
      setRecentRoutes(prev => {
        const filtered = prev.filter(r => !(r.source === source && r.destination === destination));
        const updated = [newRecent, ...filtered].slice(0, 10);
        localStorage.setItem("recentRoutes", JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error("Failed to calculate routes", error);
    } finally {
      setLoading(false);
    }
  };

    const handleBooking = (provider: any) => {
    if (!provider || !provider.deepLink) {
      console.warn("[Booking] No deep link available for provider", provider);
      return;
    }
    
    const url = provider.deepLink;
    console.log(`[Booking] Launching app for ${provider.name}: ${url}`);
    
    // Create a temporary hidden anchor to trigger deep link
    // This is often more reliable than window.location in mobile browsers
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('target', '_top');
    link.setAttribute('rel', 'noopener noreferrer');
    
    // Append, click, and remove
    document.body.appendChild(link);
    try {
      link.click();
    } catch (e) {
      console.error("[Booking] Error triggering link click", e);
      window.location.href = url;
    }
    document.body.removeChild(link);
  };

  const fetchRideProviders = async (mode: string, dest: string) => {
    try {
      const isRaining = data?.weather?.condition?.toLowerCase().includes("rain") || false;
      const response = await fetch(`/api/ride-providers?mode=${mode}&destination=${dest}&origin=${source}&isRaining=${isRaining}&battery=${data?.battery || 85}`);
      if (!response.ok) throw new Error("API Error");
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) throw new Error("Invalid Response");
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
        setSuggestions(results.map((r: any) => ({
          ...r,
          lng: r.lon
        })));
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
          setSourceCoords({ lat: latitude.toString(), lng: longitude.toString() });
        } else if (searchMode === "destination") {
          setDestination(address);
          setDestCoords({ lat: latitude.toString(), lng: longitude.toString() });
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
      setSourceCoords({ lat: suggestion.lat, lng: suggestion.lng });
    } else if (searchMode === "destination") {
      setDestination(shortName);
      setDestCoords({ lat: suggestion.lat, lng: suggestion.lng });
    }
    setSearchMode(null);
    setSearchQuery("");
  };

  const handleSwap = () => {
    // Basic swap of string values immediately
    const tempSourceStr = source;
    setSource(destination);
    setDestination(tempSourceStr);
    
    // Swap coords
    const tempCoords = sourceCoords;
    setSourceCoords(destCoords);
    setDestCoords(tempCoords);
  };

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route);
    const firstSegment = route.segments[0];
    if (firstSegment.mode === "car" || firstSegment.mode === "auto") {
      fetchRideProviders(firstSegment.mode, destination);
    }
  };

  if (trackingParams) {
    return <TrackPage lat={trackingParams.lat} lng={trackingParams.lng} />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-background shadow-2xl relative">
      <AnimatePresence>
        {tripStatus === "active" && activeRoute && showNavigationScreen && (
          <NavigationScreen 
            route={activeRoute}
            currentSegmentIndex={currentSegmentIndex}
            userCoords={userCoords}
            onAdvance={handleNextStep}
            onEndTrip={handleEndTrip}
            onBackToMain={() => setShowNavigationScreen(false)}
            destinationName={destination}
          />
        )}
      </AnimatePresence>

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
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0f172a] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 hover:bg-white/5 rounded-lg cursor-pointer" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-[#2dd4bf]">ROUTECRAFT</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all",
              isSafetyOpen
                ? "bg-[#ef4444] text-white shadow-[0_8px_24px_rgba(239,68,68,0.45)]"
                : "bg-[#ef4444] text-white hover:bg-[#e53945] shadow-[0_8px_20px_rgba(239,68,68,0.35)]"
            )}
            onClick={() => setIsSafetyOpen((prev) => !prev)}
            aria-label="Toggle SOS panel"
            title="Emergency Alerts"
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div 
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5"
            onClick={() => setIsProfileOpen(true)}
          >
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      {/* Sidebar Menu Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[300] overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-72 bg-card border-r border-white/5 shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black tracking-tighter text-[#2dd4bf]">ROUTECRAFT</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 space-y-2">
                {[
                  { id: 'explore', label: 'Explore', icon: Navigation },
                  { id: 'routes', label: 'Recent Routes', icon: Train },
                  { id: 'saved', label: 'Saved Places', icon: Bookmark },
                  { id: 'stats', label: 'Travel Stats', icon: Zap },
                  { id: 'settings', label: 'App Settings', icon: User },
                ].map((item) => (
                  <Button 
                    key={item.id}
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start h-12 rounded-xl gap-4 font-bold uppercase text-[10px] tracking-widest",
                      activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5"
                    )}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                ))}
              </div>

              <Separator className="my-6 bg-white/5" />
              
              <Button 
                variant="ghost" 
                className="w-full justify-start h-12 rounded-xl gap-4 font-bold uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10"
                onClick={() => {
                  clearAppData();
                  setIsSidebarOpen(false);
                }}
              >
                <Trash2 className="w-5 h-5" />
                Logout (Clear Data)
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass border border-white/10 p-6 rounded-3xl shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">User Profile</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsProfileOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center relative group">
                  <User className="w-12 h-12 text-primary" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity flex items-center justify-center cursor-pointer">
                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Change</span>
                  </div>
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-lg">{user.name}</h4>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Display Name</label>
                  <Input 
                    value={user.name} 
                    onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-secondary/50 border-none h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Email Address</label>
                  <Input 
                    value={user.email} 
                    onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-secondary/50 border-none h-12 rounded-xl"
                  />
                </div>
                <Button className="w-full h-12 rounded-xl font-bold mt-4 glow-teal" onClick={() => {
                  localStorage.setItem("user", JSON.stringify(user));
                  setIsProfileOpen(false);
                }}>
                  SAVE PROFILE
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Safety SOS Tray */}
      <AnimatePresence>
        {isSafetyOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden z-40 border-y border-[#ff4b5f]/25 bg-[linear-gradient(180deg,#2b1722_0%,#1f1320_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#ff4b5f]">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-[0.18em]">Emergency Dashboard</span>
                </div>
                <Badge className="h-7 px-3 rounded-full bg-[#ff4b5f] text-white border-none text-[10px] font-black tracking-wide shadow-[0_6px_20px_rgba(255,75,95,0.35)]">
                  {remainingSosCooldownMs > 0 ? `COOLDOWN ${Math.ceil(remainingSosCooldownMs / 1000)}s` : "ACTIVE TRACKING"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className={cn(
                    "h-24 rounded-[34px] border-none text-white flex-col gap-2 font-black tracking-wide",
                    sosLoading
                      ? "bg-[#ef4444]/80"
                      : "bg-[#ef4444] hover:bg-[#e53945] animate-pulse shadow-[0_12px_30px_rgba(239,68,68,0.45)]",
                    sosActive ? "ring-2 ring-[#ff8a95]/70" : ""
                  )}
                  onClick={triggerSOS}
                  disabled={sosLoading || remainingSosCooldownMs > 0}
                >
                  {sosLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
                  <span className="text-[9px] leading-none">{sosLoading ? "SENDING..." : "SOS PANIC"}</span>
                </Button>
                 <Button 
                   variant="outline" 
                   className="h-24 rounded-[34px] border border-[#ff4b5f]/20 bg-[#1c1f35] hover:bg-[#232845] text-[#ff4b5f] hover:text-[#ff4b5f] flex-col gap-2 font-black tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                   onClick={handleShareLocation}
                 >
                    <MapPin className="w-5 h-5" />
                    <span className="text-[9px] leading-none">SHARE LIVE</span>
                 </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1">
        {activeTab === "explore" && (
          <div className="p-4 space-y-6 bg-[#0f172a]">
            {/* Search Section */}
            <div className="space-y-4">
              <div className="p-6 bg-[#151c2c] rounded-[32px] border border-white/5 shadow-2xl flex items-center gap-4">
                <div className="flex-1 space-y-6 relative">
                  {/* Vertical Line Connector (Dashed) */}
                  <div className="absolute left-[7px] top-6 bottom-6 w-0 border-l border-dashed border-muted-foreground/30" />
                  
                  <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => setSearchMode("source")}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] ml-6">Source</span>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-primary shrink-0" />
                      <div className="text-white font-black text-lg tracking-tight truncate">{source || "HSR Layout"}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => setSearchMode("destination")}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] ml-6">Destination</span>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <div className="text-white font-black text-lg tracking-tight truncate">{destination || "Indiranagar"}</div>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 rounded-full border border-white/10 z-10 w-8 h-8 flex items-center justify-center shrink-0 cursor-pointer pointer-events-auto"
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      handleSwap(); 
                    }}
                  >
                    <ArrowUpDown className="w-4 h-4 text-white" />
                  </Button>
                </div>

                <Button 
                  className="w-16 h-40 rounded-[32px] bg-[#4fd1c5] hover:bg-[#4fd1c5]/90 text-[#0b1221] shadow-[0_0_30px_rgba(79,209,197,0.3)] flex-col gap-2 shrink-0 transition-all active:scale-95"
                  onClick={calculateRoutes}
                  disabled={loading}
                >
                  <Search className="w-6 h-6 stroke-[3px]" />
                  <span className="text-[10px] font-black tracking-widest">GO</span>
                </Button>
              </div>

            {/* Status Bar */}
            {data && (
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CloudSun className="w-3.5 h-3.5" />
                      <span>{weather ? `${Math.round(weather.temp)}°C ${weather.desc}` : `${data.weather?.temp ?? '--'}°C ${data.weather?.condition ?? 'Unknown'}`}</span>
                    </div>
                    {(weather?.willRain || data.weather?.willRain) && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500 animate-pulse uppercase tracking-tight">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>{"Rain Expected"}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Battery className={cn("w-3.5 h-3.5", (batteryLevel ?? 0) < 20 ? "text-destructive animate-pulse" : "text-muted-foreground")} />
                    <span>{batteryLevel ?? data.battery}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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

          <div className="px-1 h-64">
            <MapComponent 
              sourceCoords={sourceCoords && sourceCoords.lat && sourceCoords.lng ? { lat: parseFloat(sourceCoords.lat), lng: parseFloat(sourceCoords.lng) } : null}
              destCoords={destCoords && destCoords.lat && destCoords.lng ? { lat: parseFloat(destCoords.lat), lng: parseFloat(destCoords.lng) } : null}
              userCoords={userCoords}
              routePolyline={(selectedRoute || activeRoute)?.geometry}
              segments={(selectedRoute || activeRoute)?.segments}
              pivotPoints={pivotPoints.length > 0 ? pivotPoints : (
                (selectedRoute || activeRoute)?.type === "split" 
                  ? ((selectedRoute || activeRoute)?.segments || [])
                      .filter(seg => seg.mode === "bus" || seg.mode === "metro")
                      .map(seg => ({ lat: seg.fromCoords?.[0] || 0, lng: seg.fromCoords?.[1] || 0, label: seg.fromName }))
                      .filter(p => !!p.lat && !!p.lng)
                  : []
              )}
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
                
                <div className="flex gap-4">
                  <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">ETA</div>
                    <div className="text-lg font-black text-white">12 mins</div>
                  </div>
                  <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Savings</div>
                    <div className="text-lg font-black text-emerald-500">₹{activeRoute?.savings || 0}</div>
                  </div>
                </div>

                {!showNavigationScreen && (
                  <Button
                    variant="secondary"
                    className="w-full mt-4 h-11 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-xs font-bold uppercase tracking-widest"
                    onClick={() => setShowNavigationScreen(true)}
                  >
                    Open Live Navigation
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className="w-full mt-6 h-12 rounded-xl border-white/10 hover:bg-destructive/10 hover:text-destructive text-xs font-bold uppercase tracking-widest"
                  onClick={handleEndTrip}
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
                    {data?.strategies[activeStrategy].map((route) => (
                      <Card 
                        key={route.id} 
                        className={cn(
                          "glass cursor-pointer transition-all hover:border-primary/50 group",
                          route.type === "split" ? "border-primary/20" : "border-white/5"
                        )}
                        onClick={() => handleRouteSelect(route)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                  <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-lg">
                                      {route.type === "split" ? "Multi-Modal Split" : `${route.mode?.toUpperCase()} via ${route.provider}`}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                      {route.price === data?.strategies.cheapest[0]?.price && (
                                        <Badge className="bg-emerald-500 text-white border-none text-[8px] px-1 h-4">CHEAPEST</Badge>
                                      )}
                                      {route.duration === data?.strategies.fastest[0]?.duration && (
                                        <Badge className="bg-primary text-background border-none text-[8px] px-1 h-4">FASTEST</Badge>
                                      )}
                                      {((route.price < (data?.strategies.cheapest[0]?.price || 0) * 1.2) && (route.duration < (data?.strategies.fastest[0]?.duration || 0) * 1.2)) && (
                                        <Badge className="bg-amber-500 text-white border-none text-[8px] px-1 h-4">RECOMMENDED</Badge>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("h-8 w-8 rounded-full", savedRoutes.some(sr => sr.source === source && sr.destination === destination) ? "text-primary" : "text-muted-foreground")}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSavedRoute(route);
                                        }}
                                      >
                                        <Bookmark className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
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

                          {route.warning && (
                            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg mb-4">
                              <AlertTriangle className="w-3 h-3 text-destructive" />
                              <span className="text-[10px] font-bold text-destructive uppercase">{route.warning}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            {route.type === "split" && (
                              <>
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold">OPTIMIZED</Badge>
                                <Badge variant="secondary" className="bg-white/5 text-muted-foreground border-none text-[10px] font-bold">ECO-FRIENDLY</Badge>
                              </>
                            )}
                            {route.savings > 0 && (
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-bold">
                                SAVE ₹{route.savings}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
                className="p-0 h-auto hover:bg-transparent text-[#94a3b8] flex items-center gap-2"
                onClick={() => {
                  setSelectedRoute(null);
                  setShowMoreOptions(false);
                }}
              >
                <ArrowRight className="w-4 h-4 rotate-180 text-primary" /> 
                <span className="text-sm font-medium">Back to options</span>
              </Button>

              <div className="glass rounded-3xl border border-white/5 overflow-hidden">
                <TimelineView 
                  route={selectedRoute} 
                  source={source}
                  destination={destination}
                  userContext={{ 
                    batteryLevel: batteryLevel || 80, 
                    isRaining: data?.weather?.condition?.toLowerCase().includes("rain") || false 
                  }} 
                  onStartJourney={startJourney}
                  isTripActive={tripStatus === "active"}
                />
              </div>

              <div className="pt-4 space-y-3 px-6 pb-6">
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
              </motion.div>
            )}
          </>
        )}
      </div>
    )}

      {activeTab === "routes" && (
        <RoutesTab 
          recentRoutes={recentRoutes} 
          onSelect={(r) => {
            setSource(r.source);
            setDestination(r.destination);
            setActiveTab("explore");
            calculateRoutes();
          }} 
        />
      )}

      {activeTab === "saved" && (
        <SavedTab 
          savedRoutes={savedRoutes} 
          onSelect={(r) => {
            setSource(r.source);
            setDestination(r.destination);
            setActiveTab("explore");
            calculateRoutes();
          }}
          onToggle={(r) => toggleSavedRoute(r)}
        />
      )}

      {activeTab === "settings" && (
        <SettingsTab 
          settings={settings} 
          setSettings={setSettings} 
          onClear={clearAppData}
          showToast={showToast}
        />
      )}

      {activeTab === "stats" && (
        <StatsTab stats={stats} />
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

      {/* Navigation Bar */}
      <nav className="p-4 grid grid-cols-4 border-t border-white/5 glass">
        <div 
          className={cn("flex flex-col items-center gap-1 cursor-pointer transition-colors", activeTab === "explore" ? "text-primary" : "text-muted-foreground hover:text-primary")}
          onClick={() => setActiveTab("explore")}
        >
          <Navigation className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Explore</span>
        </div>
        <div 
          className={cn("flex flex-col items-center gap-1 cursor-pointer transition-colors", activeTab === "routes" ? "text-primary" : "text-muted-foreground hover:text-primary")}
          onClick={() => setActiveTab("routes")}
        >
          <Train className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Routes</span>
        </div>
        <div 
          className={cn("flex flex-col items-center gap-1 cursor-pointer transition-colors", activeTab === "saved" ? "text-primary" : "text-muted-foreground hover:text-primary")}
          onClick={() => setActiveTab("saved")}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Saved</span>
        </div>
        <div 
          className={cn("flex flex-col items-center gap-1 cursor-pointer transition-colors", activeTab === "settings" ? "text-primary" : "text-muted-foreground hover:text-primary")}
          onClick={() => setActiveTab("settings")}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Settings</span>
        </div>
      </nav>

      {/* Chatbot Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 max-w-md mx-auto z-[200] bg-background flex flex-col overflow-hidden"
          >
            {/* Chat Header - Fixed */}
            <div className="p-4 border-b border-white/5 bg-background flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">AI Assistant</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Always Online</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "max-w-[85%] rounded-2xl",
                      msg.role === 'user' ? "ml-auto" : "mr-auto",
                      msg.type === 'text' && (msg.role === 'user' ? "bg-primary text-background p-4 font-medium" : "bg-secondary text-foreground p-4"),
                      msg.type === 'alert' && "p-4 bg-destructive/10 border border-destructive/20 text-destructive font-bold text-xs uppercase"
                    )}
                  >
                    {msg.type === 'text' && <p className="text-sm">{msg.content}</p>}
                    {msg.type === 'alert' && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {msg.content}
                      </div>
                    )}
                    {msg.type === 'routeCard' && (
                      <div className="space-y-3 w-full">
                        {msg.options?.map((opt, idx) => (
                          <Card key={idx} className="bg-[#1a2332] border border-primary/30 overflow-hidden">
                            <CardContent className="p-3 space-y-3">
                              <div className="flex justify-between items-start">
                                <Badge className="bg-primary text-background text-[8px] font-black tracking-widest h-5">{opt.label}</Badge>
                                <div className="text-right">
                                  <div className="text-lg font-black text-primary leading-none">{opt.time} mins</div>
                                  <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Estimated Time</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs font-medium text-foreground py-1">
                                {opt.segments.length > 0 ? (
                                  opt.segments.map((s, si) => (
                                    <React.Fragment key={si}>
                                      <div className="flex items-center gap-1">
                                        <ModeIcon mode={s.mode} className="w-3 h-3 text-muted-foreground" />
                                        <span className="capitalize">{s.mode}</span>
                                      </div>
                                      {si < opt.segments.length - 1 && <ChevronRight className="w-3 h-3 opacity-30" />}
                                    </React.Fragment>
                                  ))
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <Car className="w-3.5 h-3.5 text-primary" />
                                    <span className="capitalize">{opt.mode} (Direct)</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-between items-center border-t border-white/5 pt-3">
                                <div className="text-xl font-black text-emerald-500">₹{opt.price}</div>
                                <Button 
                                  size="sm" 
                                  className="h-9 px-5 rounded-xl font-black text-[10px] tracking-widest bg-[#2dd4bf] hover:bg-[#2dd4bf]/90 text-[#0b1221]"
                                  onClick={() => {
                                    setIsChatOpen(false);
                                    if (opt.route) {
                                      setSelectedRoute(opt.route);
                                    } else if (data) {
                                      const matchingRoute = [...data.strategies.fastest, ...data.strategies.cheapest, ...data.strategies.optimal].find(r => r.price === opt.price && r.duration === opt.time) || data.strategies.optimal[0];
                                      setSelectedRoute(matchingRoute);
                                    }
                                  }}
                                >
                                  GO →
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="bg-secondary text-foreground mr-auto max-w-[85%] p-4 rounded-2xl flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75" />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150" />
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Chat Input - Fixed at bottom */}
            <div className="p-4 bg-secondary/30 border-t border-white/5 shrink-0">
              <div className="flex gap-2">
                <Input 
                  placeholder="Ask for a route (e.g. 'From HSR to Palace')"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="bg-background/50 border-none h-12 rounded-xl"
                />
                <Button 
                  size="icon" 
                  className="h-12 w-12 rounded-xl glow-teal"
                  onClick={handleSendMessage}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (AI Assistant) */}
      <motion.div 
        className="absolute bottom-24 right-4 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg glow-teal z-50 cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsChatOpen(true)}
      >
        <MessageSquare className="w-6 h-6 text-background" />
      </motion.div>
      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-28 left-4 right-4 z-[500] flex justify-center pointer-events-none"
          >
            <div className="bg-primary text-background px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl font-bold text-xs uppercase tracking-widest border border-white/20">
              <CheckCircle2 className="w-4 h-4" />
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
