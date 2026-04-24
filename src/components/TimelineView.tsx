import React, { useState, useEffect } from "react";
import { 
  Footprints, 
  Car, 
  Bus, 
  Train, 
  Bike, 
  MapPin, 
  ChevronRight, 
  Clock, 
  AlertTriangle, 
  Smartphone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RouteOption, RouteSegment, TransportMode, RideProvider } from "../types";
import { NammaYatriService, NYRideBid } from "../services/nammaYatriService";

interface TimelineViewProps {
  route: RouteOption;
  source: string;
  destination: string;
  userContext: {
    batteryLevel: number;
    isRaining: boolean;
  };
  onStartJourney?: (route: RouteOption) => void;
  isTripActive?: boolean;
}

const ModeIcon = ({ mode, className }: { mode: TransportMode; className?: string }) => {
  switch (mode) {
    case "car": return <Car className={className} />;
    case "auto": return <Car className={className} />;
    case "bus": return <Bus className={className} />;
    case "metro": return <Train className={className} />;
    case "walk": return <Footprints className={className} />;
    case "bike": return <Bike className={className} />;
    default: return <MapPin className={className} />;
  }
};

interface RideOption {
  name: string;
  price: number;
}

const PROVIDER_FACTORS: Record<string, number> = {
  "Namma Yatri": 1,
  "Rapido": 1.1,
  "Uber": 1.3,
  "Ola": 1.5
};

const resolveProviderName = (provider?: string): string | null => {
  if (!provider) return null;
  const normalized = provider.toLowerCase();
  if (normalized.includes("uber")) return "Uber";
  if (normalized.includes("ola")) return "Ola";
  if (normalized.includes("rapido")) return "Rapido";
  if (normalized.includes("namma")) return "Namma Yatri";
  return null;
};

const RideOptionsTable = ({
  providers,
  cheapestProvider,
  selectedProvider,
  onSelectProvider,
  source,
  destination
}: {
  providers: RideOption[];
  cheapestProvider: string;
  selectedProvider: string;
  onSelectProvider: (providerName: string) => void;
  source: string;
  destination: string;
}) => {

  const displayedProviders = [...providers].sort((a, b) => {
    if (a.name === selectedProvider) return -1;
    if (b.name === selectedProvider) return 1;
    return 0;
  });

  const getProviderBookingUrl = (providerName: string) => {
    const from = encodeURIComponent(source);
    const to = encodeURIComponent(destination);

    switch (providerName.toLowerCase()) {
      case "uber":
        return `https://m.uber.com/ul/?action=setPickup&pickup=${from}&dropoff=${to}`;
      case "ola":
        return `https://book.olacabs.com/?pickup=${from}&drop=${to}`;
      case "rapido":
        return "https://rapido.bike/";
      case "namma yatri":
        return "https://nammayatri.in/";
      default:
        return null;
    }
  };

  const handleBook = (providerName?: string) => {
    const providerToBook = providerName || selectedProvider;
    const url = getProviderBookingUrl(providerToBook);
    if (!url) {
      console.warn("[Booking] Unsupported provider", providerToBook);
      return;
    }

    window.open(url, "_blank");
  };

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border border-white/5 bg-[#151c2c] shadow-2xl">
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
        <Car className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ride Provider Comparison</span>
      </div>
      <div className="divide-y divide-white/5">
        {displayedProviders.map((p, i) => {
          const isCheapest = p.name === cheapestProvider;
          const isSelected = p.name === selectedProvider;

          return (
          <div
            key={i}
            className={cn(
              "p-4 flex items-center justify-between transition-colors cursor-pointer",
              isSelected ? "bg-[#2dd4bf]/10" : "hover:bg-white/5"
            )}
            onClick={() => onSelectProvider(p.name)}
          >
            <div className="flex flex-col">
              <span className={cn("text-sm font-black tracking-tight text-white", isCheapest && "text-[#2dd4bf]")}>
                {p.name}
              </span>
              {isCheapest && <span className="text-[8px] font-black uppercase text-[#2dd4bf]">Cheapest Option</span>}
            </div>
            <div className="flex items-center gap-6">
              <span className="text-lg font-black text-white">₹{p.price}</span>
              <Button 
                size="sm"
                className={cn(
                  "h-8 px-4 rounded-full font-black text-[10px] uppercase tracking-widest",
                  isSelected ? "bg-[#2dd4bf] text-[#0b1221]" : "bg-white/10 text-white"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProvider(p.name);
                  handleBook(p.name);
                }}
              >
                Book
              </Button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

const PivotBox = ({ distance, timeSaved }: { distance: number; timeSaved: number }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="my-3 p-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex gap-4 items-center"
  >
    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
      <Car className="w-6 h-6 text-primary" />
    </div>
    <div className="space-y-1">
      <div className="text-xs font-bold uppercase tracking-tight text-primary flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Auto Pivot Recommended
      </div>
      <p className="text-sm font-medium leading-tight">
        Distance is <span className="text-primary font-bold">{distance.toFixed(1)} km</span>. 
        We recommend an Auto to save <span className="text-primary font-bold">{timeSaved} mins</span>.
      </p>
    </div>
  </motion.div>
);

interface TimelineNodeProps {
  segment: RouteSegment;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  source: string;
  destination: string;
  userContext: { batteryLevel: number; isRaining: boolean; };
  key?: React.Key;
}function TimelineNode({ 
  segment, 
  index, 
  isFirst, 
  isLast,
  source,
  destination,
  userContext
}: TimelineNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const recommendedProvider = resolveProviderName(segment.provider);
  const recommendedFactor = recommendedProvider ? PROVIDER_FACTORS[recommendedProvider] : 1;
  const rideProviders: RideOption[] = Object.entries(PROVIDER_FACTORS).map(([name, factor]) => ({
    name,
    // Keep the recommended provider price exactly equal to segment.price.
    price: Math.round(segment.price * (factor / recommendedFactor))
  }));
  const cheapestProvider = rideProviders.reduce((min, current) => current.price < min.price ? current : min, rideProviders[0]).name;
  const [selectedProvider, setSelectedProvider] = useState<string>(recommendedProvider || cheapestProvider);

  useEffect(() => {
    setSelectedProvider(recommendedProvider || cheapestProvider);
  }, [recommendedProvider, cheapestProvider, segment.price, segment.mode]);
  
  // Pivot Logic: If walk distance > 800m (0.8km)
  const isWalk = segment.mode === 'walk';
  const isRideMode = ["auto", "bike", "car"].includes(segment.mode);
  const distance = segment.distanceKm || (segment.duration * 0.08);
  const showPivot = isWalk && distance > 0.8;
  const timeSaved = Math.round(segment.duration * 0.7);

  const showTransitIntelligence = segment.mode === 'bus' || segment.mode === 'metro';
  const transitArrival = Math.floor(Math.random() * 8) + 1;

  return (
    <div className="relative pl-12 pb-10 last:pb-0">
      {/* Vertical Line */}
      {!isLast && (
        <div className={cn(
          "absolute left-[15px] top-8 bottom-0 w-[2px]",
          segment.mode === 'walk' ? "bg-primary/30" : "bg-[#2dd4bf]"
        )} />
      )}

      {/* Node Icon */}
      <div className={cn(
        "absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-500 bg-[#0f172a]",
        isFirst || !isWalk ? "border-[#2dd4bf]" : "border-muted-foreground/30"
      )}>
        <ModeIcon 
          mode={segment.mode} 
          className={cn("w-4 h-4", isFirst || !isWalk ? "text-[#2dd4bf]" : "text-muted-foreground")} 
        />
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="text-xl font-bold text-white tracking-tight leading-none">
              {segment.mode === 'walk'
                ? 'Walk'
                : isRideMode
                  ? `${segment.mode.toUpperCase()} (${selectedProvider})`
                  : `${segment.mode === 'bus' ? 'Bus' : 'Metro'} (${segment.busNo || segment.provider})`}
            </h4>
            <div className="text-sm font-medium text-muted-foreground">
              {segment.duration} mins • {isRideMode ? selectedProvider : (segment.provider || 'Public Transport')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">
              {segment.price > 0 ? `₹${segment.price}` : '₹0'}
            </div>
          </div>
        </div>

        {/* Transit Arrival Badge */}
        {showTransitIntelligence && (
          <div className="max-w-fit px-4 py-2 rounded-full bg-[#111827] border border-white/5 flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-[#2dd4bf]" />
            <span className="text-xs font-bold text-white uppercase tracking-tight">
              {segment.mode === 'bus' ? 'Bus' : 'Metro'} {segment.busNo || '500-D'} arriving in {transitArrival} mins
            </span>
          </div>
        )}

        {/* Ride Options Table for Auto/Cab */}
        {isRideMode && (
          <RideOptionsTable
            providers={rideProviders}
            cheapestProvider={cheapestProvider}
            selectedProvider={selectedProvider}
            onSelectProvider={setSelectedProvider}
            source={source}
            destination={destination}
          />
        )}

        {/* Auto Pivot Recommendation */}
        {showPivot && <PivotBox distance={distance} timeSaved={timeSaved} />}
      </div>
    </div>
  );
}

export const TimelineView = ({ route, source, destination, userContext, onStartJourney, isTripActive }: TimelineViewProps) => {
  return (
    <div className="p-6 space-y-8 bg-[#0f172a]/50">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white leading-tight">Route Details</h2>
          <p className="text-sm font-medium text-muted-foreground">Total duration: {route.duration} mins</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-4xl font-black text-[#2dd4bf] flex items-baseline">
            <span className="text-2xl mr-0.5">₹</span>{route.price}
          </div>
        </div>
      </div>

      <div className="relative space-y-0">
        {route.segments.map((segment, index) => (
          <TimelineNode 
            key={index} 
            segment={segment} 
            index={index}
            isFirst={index === 0} 
            isLast={index === route.segments.length - 1}
            source={source}
            destination={destination}
            userContext={userContext}
          />
        ))}
      </div>

      {route.warning && (
        <Card className="bg-destructive/10 border-destructive/20 mt-4 overflow-hidden">
          <CardContent className="p-4 flex gap-3 items-center">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-xs font-bold text-destructive uppercase leading-tight">{route.warning}</p>
          </CardContent>
        </Card>
      )}

      {!route.warning && (
        <div className="pt-6">
          <Button 
            className={cn(
              "w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl gap-3 transition-all",
              isTripActive 
                ? "bg-secondary text-muted-foreground cursor-not-allowed" 
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
            )}
            onClick={() => onStartJourney?.(route)}
            disabled={isTripActive}
          >
            {isTripActive ? (
              <>
                <Clock className="w-6 h-6 animate-spin" />
                Journey in Progress
              </>
            ) : (
              <>
                <ShieldCheck className="w-6 h-6" />
                Start Optimized Journey
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
