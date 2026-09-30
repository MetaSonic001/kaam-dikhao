"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { initMaplibre } from "@/lib/maplibre";
import { Map as MlMap, Marker, NavigationControl } from "maplibre-gl";
import { useEffect, useRef } from "react";

/** Tap the map to drop a pin. Used when a photo carries no GPS and the device location is unavailable. */
export function PinPicker({ center, onPick, className }: { center: [number, number]; onPick: (c: { lat: number; lng: number }) => void; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const cb = useRef(onPick);
  useEffect(() => { cb.current = onPick; });
  useEffect(() => {
    if (!el.current) return;
    initMaplibre();
    const m = new MlMap({ container: el.current, style: "https://tiles.openfreemap.org/styles/positron", center: [center[1], center[0]], zoom: 14, attributionControl: { compact: true } });
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    let marker: Marker | null = null;
    m.on("click", (e) => {
      marker ??= new Marker({ color: "#f97316" }).setLngLat(e.lngLat).addTo(m);
      marker.setLngLat(e.lngLat);
      cb.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={el} className={className} role="application" aria-label="Map: tap to drop a pin" />;
}
