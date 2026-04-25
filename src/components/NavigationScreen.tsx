import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  Share2, 
  ArrowLeft,
  ArrowRight, 
  ChevronRight, 
  X, 
  Zap, 
  Phone, 
  Navigation, 
  Locate, 
  ExternalLink,
  MessageSquare,
  Bus,
  Train,
  Car,
  Footprints
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RouteOption, RouteSegment, TransportMode } from "../types";
import { MapComponent } from "./MapComponent";

interface NavigationScreenProps {
  route: RouteOption;
  currentSegmentIndex: number;
  userCoords: { lat: number; lng: number } | null;
  sourceCoords: { lat: number; lng: number } | null;
  destCoords: { lat: number; lng: number } | null;
  onAdvance: () => void;
  onEndTrip: () => void;
  onBackToMain: () => void;
  destinationName: string;
}

export const NavigationScreen = ({
  route,
  currentSegmentIndex,
  userCoords,
  sourceCoords,
  destCoords,
  onAdvance,
  onEndTrip,
  onBackToMain,
  destinationName
}: NavigationScreenProps) => {
  const currentSegment = route.segments[currentSegmentIndex];
  const isLastSegment = currentSegmentIndex === route.segments.length - 1;

  const resolveWalkTarget = () => {
    const rawTarget = currentSegment.toName || currentSegment.boardAt || destinationName || "your destination";
    const normalized = rawTarget.trim().toLowerCase();

    if (
      normalized === "destination" ||
      normalized === "final destination" ||
      normalized === "dest stop" ||
      normalized === "bus stop"
    ) {
      return destinationName;
    }

    return rawTarget;
  };

  // Fallback for userCoords if null
  const effectiveUserCoords = userCoords || (currentSegment.pickupCoords ? { lat: currentSegment.pickupCoords[0], lng: currentSegment.pickupCoords[1] } : (currentSegment.geometry?.[0] ? { lat: currentSegment.geometry[0][0], lng: currentSegment.geometry[0][1] } : null));

  const handleUberBooking = () => {
    const mode = currentSegment.mode || (currentSegment as any).type;
    if (mode !== 'auto' && mode !== 'car') return;

    const lat = currentSegment.pickupCoords?.[0] || 12.97;
    const lng = currentSegment.pickupCoords?.[1] || 77.64;
    const dropLat = currentSegment.dropCoords?.[0] || 12.98;
    const dropLng = currentSegment.dropCoords?.[1] || 77.65;
    const dropName = currentSegment.dropName || "Destination";

    const deepLink = `uber://?action=setPickup&pickup[latitude]=${lat}&pickup[longitude]=${lng}&dropoff[latitude]=${dropLat}&dropoff[longitude]=${dropLng}&dropoff[nickname]=${encodeURIComponent(dropName)}`;
    const webLink = `https://m.uber.com/ul/`;

    window.location.href = deepLink;

    setTimeout(() => {
      // If we're still on the page after 2 seconds, the deep link likely failed
      if (document.visibilityState === 'visible') {
        window.open(webLink, "_blank");
      }
    }, 2000);
  };

  const handleShare = async () => {
    const text = `I'm on my way to ${destinationName} using RouteCraft! ETA: ${route.duration} mins.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'RouteCraft Trip',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(text);
      alert("Trip details copied to clipboard!");
    }
  };

  const renderInstruction = () => {
    const mode = currentSegment.mode || (currentSegment as any).type;
    switch (mode) {
      case 'walk':
        return (
          <div className="space-y-1">
            <span className="text-[#00d4b8] text-[10px] font-black uppercase tracking-widest">WALK</span>
            <p className="text-base font-bold leading-tight">
              Walk to {resolveWalkTarget()}
            </p>
          </div>
        );
      case 'metro':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[#00d4b8] text-[10px] font-black uppercase tracking-widest">METRO: {currentSegment.line || "Green Line"}</span>
              <p className="text-base font-bold leading-tight">
                Board at {currentSegment.fromName || currentSegment.boardAt} → Alight at {currentSegment.toName || currentSegment.alightAt}
              </p>
            </div>
            <Button 
              className="w-full h-10 bg-[#00d4b8] hover:bg-[#00d4b8]/90 text-black font-black uppercase tracking-widest text-[10px] gap-2 rounded-xl shadow-lg shadow-[#00d4b8]/20"
              onClick={() => window.open("https://english.bmrc.co.in/", "_blank")}
            >
              <Smartphone className="w-4 h-4" />
              BOOK METRO TICKET
            </Button>
          </div>
        );
      case 'bus':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
               <span className="text-[#00d4b8] text-[10px] font-black uppercase tracking-widest">BUS</span>
               <Badge className="bg-[#00d4b8] text-background font-black text-[9px] px-1.5 h-4">
                 {currentSegment.routeNumber || currentSegment.busNo}
               </Badge>
            </div>
            <p className="text-base font-bold leading-tight">
              Board at {currentSegment.boardAt || currentSegment.fromName} → Get off at {currentSegment.alightAt || currentSegment.toName}
            </p>
          </div>
        );
      case 'auto':
      case 'car':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[#00d4b8] text-[10px] font-black uppercase tracking-widest">AUTO</span>
              <p className="text-base font-bold leading-tight">Book your ride to {currentSegment.dropName || "the next stop"}</p>
            </div>
            <Button 
              onClick={handleUberBooking}
              className="w-full h-10 bg-[#00d4b8] hover:bg-[#00d4b8]/90 text-black font-black uppercase tracking-widest text-[10px] gap-2 rounded-xl shadow-lg shadow-[#00d4b8]/20"
            >
              <Smartphone className="w-4 h-4" />
              BOOK AUTO (UBER)
            </Button>
          </div>
        );
      default:
        return <p className="text-base font-bold">Heading to next point</p>;
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-[#0d1117] text-white">
      {/* Top Map View */}
      <div className="flex-1 relative overflow-hidden">
        <MapComponent 
          sourceCoords={sourceCoords}
          destCoords={destCoords}
          userCoords={effectiveUserCoords}
          routePolyline={route.geometry}
          segments={route.segments}
          pivotPoints={route.pivotPoints}
          isTracking={true}
        />

        <Button
          variant="secondary"
          size="icon"
          className="absolute top-6 left-6 z-20 rounded-full bg-[#1a2332]/85 backdrop-blur-md border border-white/10 shadow-xl text-[#00d4b8]"
          onClick={onBackToMain}
          title="Back to main page"
          aria-label="Back to main page"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {/* Floating Re-center Action */}
        <Button 
          variant="secondary" 
          size="icon" 
          className="absolute top-6 right-6 z-20 rounded-full bg-[#1a2332]/80 backdrop-blur-md border border-white/5 shadow-xl text-[#00d4b8]"
        >
          <Locate className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation Card */}
      <Card className="rounded-t-3xl bg-[#1a2332] border-t border-white/5 shadow-2xl relative z-30 -mt-8">
        <div className="p-5 space-y-5 pb-24">
          {/* Status Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black uppercase tracking-tight text-[#00d4b8]">ON YOUR WAY</h1>
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Badge className="bg-[#00d4b8]/20 text-[#00d4b8] border-none text-[8px] font-black uppercase tracking-widest h-4 px-1.5">
                    LIVE
                  </Badge>
                </motion.div>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 uppercase tracking-widest">
                Heading to <span className="text-white">{destinationName}</span>
              </p>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-xl font-black text-[#00d4b8]">{route.duration} <span className="text-[10px] font-bold text-muted-foreground">MINS</span></div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">Remaining</div>
            </div>
          </div>

          {/* Pivot Info */}
          <div className="flex items-center gap-3 py-3 border-y border-white/5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">NEXT PIVOT POINT</div>
            <div className="ml-auto text-[10px] font-bold text-[#f59e0b]">{Math.max(1, Math.round(currentSegment.duration))} MINS AWAY</div>
          </div>

          {/* Core Instruction */}
          <div className="min-h-[100px] flex flex-col justify-center">
            {renderInstruction()}
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-2 gap-3 pb-1">
            <Button 
               variant="outline"
               onClick={handleShare}
               className="h-12 rounded-xl border-white/5 bg-white/5 text-[10px] font-bold uppercase tracking-widest gap-2 hover:bg-white/10"
            >
              <Share2 className="w-4 h-4 text-[#00d4b8]" />
              SHARE
            </Button>
            <Button 
              variant="outline"
               onClick={onEndTrip}
               className="h-12 rounded-xl border-white/5 bg-white/5 text-[10px] font-bold uppercase tracking-widest gap-2 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-4 h-4" />
              END TRIP
            </Button>
          </div>

          {!isLastSegment && (
            <Button 
              className="w-full h-12 rounded-xl bg-[#00d4b8] hover:bg-[#00d4b8]/90 text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#00d4b8]/20 gap-3"
              onClick={onAdvance}
            >
              NEXT STEP
              <ArrowRight className="w-5 h-5" />
            </Button>
          )}

          {isLastSegment && (
            <Button 
               className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 gap-3"
               onClick={onEndTrip}
            >
              COMPLETE TRIP
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
      </Card>

      {/* Floating Action Button */}
      <Button 
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-[#00d4b8] text-black shadow-2xl shadow-[#00d4b8]/50 flex items-center justify-center p-0 z-50 hover:scale-110 active:scale-95 transition-transform"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      {/* Bottom Navbar (Static Mock) */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 grid grid-cols-4 bg-[#1a2332] border-t border-white/5 z-[60]">
        <div className="flex flex-col items-center gap-1 text-[#00d4b8]">
          <Navigation className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Explore</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground opacity-50">
          <ChevronRight className="rotate-90 w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Routes</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground opacity-50">
          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
          <span className="text-[10px] font-bold uppercase">Saved</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground opacity-50">
          <div className="w-5 h-5 rounded-sm border-2 border-muted-foreground" />
          <span className="text-[10px] font-bold uppercase">Settings</span>
        </div>
      </nav>
    </div>
  );
};

function Smartphone(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}
