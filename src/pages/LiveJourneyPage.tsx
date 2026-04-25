import {
  Map,
  Share2,
  X,
  ChevronRight,
  Search,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MapComponent from '@/src/components/MapComponent';

export default function LiveJourneyPage() {
  return (
    <div className="bg-background text-foreground flex flex-col h-screen">
      {/* Map */}
      <div className="flex-grow relative">
        <MapComponent />
        <div className="absolute top-4 right-4">
          <Button size="icon" className="rounded-full h-12 w-12 bg-primary/80 backdrop-blur-sm">
            <Search className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="bg-card p-6 rounded-t-3xl shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-primary">ON YOUR WAY</h2>
              <Badge variant="live">LIVE</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              HEADING TO <span className="font-semibold">HEBBAL, BENGALURU NORTH CITY CORPORATION</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">17</p>
            <p className="text-xs text-muted-foreground">MINS REMAINING</p>
          </div>
        </div>

        {/* Next Pivot */}
        <div className="flex items-center justify-between bg-secondary p-3 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <p className="text-sm font-semibold">NEXT PIVOT POINT</p>
          </div>
          <p className="text-sm font-bold text-yellow-400">17 MINS AWAY</p>
        </div>

        {/* Action Card */}
        <div className="bg-secondary p-4 rounded-lg mb-4">
          <p className="text-xs font-bold text-primary mb-1">AUTO</p>
          <p className="text-lg font-bold mb-3">Book your ride to the next stop</p>
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            <Navigation className="w-4 h-4 mr-2" /> BOOK AUTO (UBER)
          </Button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Button variant="secondary" className="font-bold">
            <Share2 className="w-4 h-4 mr-2" /> SHARE
          </Button>
          <Button variant="secondary" className="font-bold">
            <X className="w-4 h-4 mr-2" /> END TRIP
          </Button>
        </div>

        {/* Complete Trip */}
        <Button
          size="lg"
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg"
        >
          COMPLETE TRIP <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// Add a new variant to badge component if it doesn't exist
// components/ui/badge.tsx
// live: "bg-green-500 text-white border-transparent",
