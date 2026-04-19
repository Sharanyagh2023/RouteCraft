import { LatLng } from "@/types/route";

export function getBookingLink(provider: string | undefined, pickup: LatLng, drop: LatLng) {
  const p = (provider ?? "").toLowerCase();
  if (p.includes("uber")) {
    return `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${drop.lat}&dropoff[longitude]=${drop.lng}`;
  }
  if (p.includes("ola")) {
    return `https://book.olacabs.com/?pickup=${pickup.lat},${pickup.lng}&drop=${drop.lat},${drop.lng}`;
  }
  if (p.includes("rapido") || p.includes("bike")) {
    return "https://rapido.bike/book";
  }
  if (p.includes("namma")) {
    return `nammayatri://book?pickup=${pickup.lat},${pickup.lng}&drop=${drop.lat},${drop.lng}`;
  }
  return `https://book.olacabs.com/?pickup=${pickup.lat},${pickup.lng}&drop=${drop.lat},${drop.lng}`;
}
