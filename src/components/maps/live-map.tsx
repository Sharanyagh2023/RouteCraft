"use client";

import { useMemo } from "react";
import { MapView } from "@/components/MapView";
import { LatLng } from "@/types/route";

type LiveMapProps = {
  path?: LatLng[];
  userPosition?: LatLng;
  stepMarkers?: LatLng[];
};

export function LiveMap({ path, userPosition, stepMarkers }: LiveMapProps) {
  const source = useMemo(() => stepMarkers?.[0] ?? path?.[0], [path, stepMarkers]);
  const destination = useMemo(() => path?.[path.length - 1], [path]);

  return (
    <MapView source={source} destination={destination} path={path} userPosition={userPosition} className="h-full w-full" />
  );
}
