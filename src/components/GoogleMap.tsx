import { useEffect, useRef, useState } from "react";
import type { Bin, Vehicle } from "@/lib/live";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    __gmapsInit?: () => void;
  }
}

// Marker fills must be literal colors for the Maps SVG renderer; they mirror the --status-* tokens.
const BIN_COLORS: Record<string, string> = { NORMAL: "#22a55a", NEAR_FULL: "#f08c1a", FULL: "#dc3a2c", OFFLINE: "#8a8f98" };
const VEHICLE_COLOR = "#1f6fb2";

let loader: Promise<any> | null = null;
function loadMaps() {
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    window.__gmapsInit = () => resolve(window.google);
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const ch = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"];
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__gmapsInit&channel=${ch}`;
    s.async = true;
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return loader;
}

type Props = {
  bins?: Bin[];
  vehicles?: Vehicle[];
  path?: { lat: number; lng: number }[];
  onSelect?: (s: { kind: "bin"; item: Bin } | { kind: "vehicle"; item: Vehicle }) => void;
  className?: string;
};

export function GoogleMap({ bins = [], vehicles = [], path, onSelect, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const overlays = useRef<any[]>([]);
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cb = useRef(onSelect);
  cb.current = onSelect;

  useEffect(() => {
    loadMaps()
      .then((g) => {
        if (!el.current) return;
        map.current = new g.maps.Map(el.current, {
          center: { lat: 19.076, lng: 72.8777 },
          zoom: 12,
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        setReady(true);
      })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const g = window.google;
    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];
    const bounds = new g.maps.LatLngBounds();
    let n = 0;
    bins.forEach((b) => {
      if (b.latitude == null || b.longitude == null) return;
      const pos = { lat: b.latitude, lng: b.longitude };
      const m = new g.maps.Marker({
        position: pos,
        map: map.current,
        title: b.bin_id,
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: 9, fillColor: BIN_COLORS[b.status] ?? "#888", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
      m.addListener("click", () => cb.current?.({ kind: "bin", item: b }));
      overlays.current.push(m);
      bounds.extend(pos);
      n++;
    });
    vehicles.forEach((v) => {
      if (v.latitude == null || v.longitude == null) return;
      const pos = { lat: v.latitude, lng: v.longitude };
      const m = new g.maps.Marker({
        position: pos,
        map: map.current,
        title: v.vehicle_id,
        icon: { path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6, rotation: v.heading ?? 0, fillColor: VEHICLE_COLOR, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1.5 },
      });
      m.addListener("click", () => cb.current?.({ kind: "vehicle", item: v }));
      overlays.current.push(m);
      bounds.extend(pos);
      n++;
    });
    if (path && path.length > 1) {
      overlays.current.push(new g.maps.Polyline({ path, map: map.current, strokeColor: VEHICLE_COLOR, strokeWeight: 3, strokeOpacity: 0.8 }));
      path.forEach((p) => bounds.extend(p));
      map.current.fitBounds(bounds);
    } else if (n > 0 && !fitted.current) {
      fitted.current = true;
      if (n === 1) map.current.setCenter(bounds.getCenter());
      else map.current.fitBounds(bounds);
    }
  }, [ready, bins, vehicles, path]);

  return (
    <div className={className ?? "h-80"}>
      {err ? (
        <div className="flex h-full items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">{err}</div>
      ) : (
        <div ref={el} className="h-full w-full rounded-md bg-muted" />
      )}
    </div>
  );
}
