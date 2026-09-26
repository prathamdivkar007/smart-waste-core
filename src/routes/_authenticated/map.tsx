import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLive, fmtTime, type Bin, type Vehicle, type Area } from "@/lib/live";
import { PageHeader, Panel, Pill } from "@/components/bits";
import { GoogleMap } from "@/components/GoogleMap";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({ meta: [{ title: "Live Map — WasteFlow" }, { name: "description", content: "Real-time map of smart bins and collection vehicles." }] }),
  component: MapPage,
});

type Sel = { kind: "bin"; item: Bin } | { kind: "vehicle"; item: Vehicle } | null;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3 border-b py-2 text-sm last:border-0"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></div>;
}

function MapPage() {
  const bins = useLive<Bin>("bins", { order: "bin_id", ascending: true });
  const vehicles = useLive<Vehicle>("vehicles", { order: "vehicle_id", ascending: true });
  const areas = useLive<Area>("areas", { order: "name", ascending: true });
  const [sel, setSel] = useState<Sel>(null);
  const b = bins.data ?? [];
  const v = vehicles.data ?? [];
  const areaName = (id: string | null) => areas.data?.find((a) => a.id === id)?.name ?? "—";
  // Pull the freshest copy of the selected item so the panel updates live.
  const bin = sel?.kind === "bin" ? b.find((x) => x.id === sel.item.id) ?? sel.item : null;
  const veh = sel?.kind === "vehicle" ? v.find((x) => x.id === sel.item.id) ?? sel.item : null;

  return (
    <div>
      <PageHeader title="Live Map" sub="Click a marker for details">
        <div className="flex flex-wrap gap-3 text-xs">
          {[["bg-status-normal", "Normal"], ["bg-status-near", "Near full"], ["bg-status-full", "Full"], ["bg-status-offline", "Offline"], ["bg-chart-4", "Vehicle"]].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{l}</span>
          ))}
        </div>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <GoogleMap bins={b} vehicles={v} onSelect={setSel} className="h-[70vh]" />
        <Panel title={bin ? `Bin ${bin.bin_id}` : veh ? `Vehicle ${veh.vehicle_id}` : "Details"}>
          {bin && (<>
            <Row k="Status" v={<Pill value={bin.status} />} />
            <Row k="Label" v={bin.label ?? "—"} />
            <Row k="Area" v={areaName(bin.area_id)} />
            <Row k="Location" v={<span className="font-mono text-xs">{bin.latitude?.toFixed(5)}, {bin.longitude?.toFixed(5)}</span>} />
            <Row k="Fill" v={`${Math.round(Number(bin.fill_level))}%`} />
            <Row k="Moisture" v={bin.moisture_level != null ? `${bin.moisture_level}%` : "—"} />
            <Row k="Metal detected" v={bin.metal_detected ? "Yes" : "No"} />
            <Row k="Last update" v={fmtTime(bin.last_seen_at)} />
            <Row k="Assigned vehicle" v={v.find((x) => x.id === bin.assigned_vehicle_id)?.vehicle_id ?? "—"} />
          </>)}
          {veh && (<>
            <Row k="Status" v={<Pill value={veh.status} />} />
            <Row k="Driver" v={veh.driver_name ?? "—"} />
            <Row k="Location" v={<span className="font-mono text-xs">{veh.latitude?.toFixed(5)}, {veh.longitude?.toFixed(5)}</span>} />
            <Row k="Speed" v={veh.speed != null ? `${veh.speed} km/h` : "—"} />
            <Row k="Last update" v={fmtTime(veh.last_seen_at)} />
            <Row k="Assigned bin" v={b.find((x) => x.id === veh.assigned_bin_id)?.bin_id ?? "—"} />
          </>)}
          {!bin && !veh && <p className="text-sm text-muted-foreground">Select a bin or vehicle on the map.</p>}
        </Panel>
      </div>
    </div>
  );
}
