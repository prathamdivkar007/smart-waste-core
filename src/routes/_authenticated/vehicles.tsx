import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLive, ago, type Vehicle, type Bin, type VehicleLocation } from "@/lib/live";
import { PageHeader, Panel, Pill, QueryState, Empty } from "@/components/bits";
import { GoogleMap } from "@/components/GoogleMap";

export const Route = createFileRoute("/_authenticated/vehicles")({
  head: () => ({ meta: [{ title: "Vehicles — WasteFlow" }, { name: "description", content: "Collection vehicles, drivers and GPS route history." }] }),
  component: VehiclesPage,
});

function VehiclesPage() {
  const vehicles = useLive<Vehicle>("vehicles", { order: "vehicle_id", ascending: true });
  const bins = useLive<Bin>("bins");
  const [sel, setSel] = useState<string | null>(null);
  const hist = useLive<VehicleLocation>("vehicle_locations", { filter: ["vehicle_code", sel ?? ""], order: "timestamp", limit: 500, enabled: !!sel });
  const path = useMemo(() => [...(hist.data ?? [])].reverse().map((p) => ({ lat: p.latitude, lng: p.longitude })), [hist.data]);
  const current = vehicles.data?.filter((v) => v.vehicle_id === sel) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Vehicles" sub="Select a vehicle to see its recent route" />
      <Panel>
        <QueryState q={vehicles} empty="No vehicles registered">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Vehicle</th><th>Driver</th><th>Status</th><th>Location</th><th>Speed</th><th>Last update</th><th>Assignment</th></tr></thead>
              <tbody>
                {vehicles.data?.map((v) => (
                  <tr key={v.id} onClick={() => setSel(v.vehicle_id)} className={`cursor-pointer border-t hover:bg-muted/50 ${sel === v.vehicle_id ? "bg-accent" : ""}`}>
                    <td className="py-2 font-mono">{v.vehicle_id}</td>
                    <td>{v.driver_name ?? "—"}<div className="text-xs text-muted-foreground">{v.driver_phone}</div></td>
                    <td><Pill value={v.status} /></td>
                    <td className="font-mono text-xs">{v.latitude != null ? `${v.latitude.toFixed(4)}, ${v.longitude?.toFixed(4)}` : "—"}</td>
                    <td>{v.speed != null ? `${v.speed} km/h` : "—"}</td>
                    <td className="text-muted-foreground">{ago(v.last_seen_at)}</td>
                    <td className="font-mono">{bins.data?.find((b) => b.id === v.assigned_bin_id)?.bin_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Panel>
      {sel && (
        <Panel title={`Route history · ${sel} · ${hist.data?.length ?? 0} points`}>
          {hist.data && hist.data.length === 0 ? <Empty text="No GPS history yet" /> : <GoogleMap vehicles={current} path={path} className="h-96" />}
        </Panel>
      )}
    </div>
  );
}
