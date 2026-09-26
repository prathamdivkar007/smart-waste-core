import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, Truck, Bell, ClipboardList } from "lucide-react";
import { useLive, useMe, ago, type Bin, type Vehicle, type Alert, type Collection } from "@/lib/live";
import { PageHeader, Panel, Stat, Pill, QueryState, Loading } from "@/components/bits";
import { GoogleMap } from "@/components/GoogleMap";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — WasteFlow" }, { name: "description", content: "Live overview of bins, vehicles, collections and alerts." }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useMe();
  const bins = useLive<Bin>("bins", { order: "bin_id", ascending: true });
  const vehicles = useLive<Vehicle>("vehicles", { order: "vehicle_id", ascending: true });
  const alerts = useLive<Alert>("alerts", { order: "created_at", limit: 200 });
  const cols = useLive<Collection>("collections", { order: "collection_time", limit: 8 });

  if (bins.isLoading || me.isLoading) return <Loading />;
  const b = bins.data ?? [];
  const v = vehicles.data ?? [];
  const open = (alerts.data ?? []).filter((a) => a.status !== "RESOLVED");
  const c = (s: string) => b.filter((x) => x.status === s).length;
  const myVehicle = me.data?.isDriver && !me.data.isStaff ? v.find((x) => x.driver_user_id === me.data?.user.id) : undefined;
  const myBin = myVehicle ? b.find((x) => x.id === myVehicle.assigned_bin_id) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" sub="Live — updates automatically as devices report" />
      {me.data?.isDriver && !me.data.isStaff && (
        <Panel title="My assignment">
          {myVehicle ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div><div className="text-xs text-muted-foreground">Vehicle</div><div className="font-mono text-lg">{myVehicle.vehicle_id}</div><Pill value={myVehicle.status} /></div>
              <div><div className="text-xs text-muted-foreground">Assigned bin</div>{myBin ? (<><div className="font-mono text-lg">{myBin.bin_id}</div><div className="text-sm">{myBin.label} · {Math.round(Number(myBin.fill_level))}% full</div></>) : <div className="text-sm text-muted-foreground">No bin assigned. Press the vehicle button after collecting to confirm.</div>}</div>
            </div>
          ) : <p className="text-sm text-muted-foreground">No vehicle is linked to your account yet.</p>}
        </Panel>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total bins" value={b.length} icon={<Trash2 className="h-4 w-4" />} />
        <Stat label="Normal" value={c("NORMAL")} tone="normal" />
        <Stat label="Near full" value={c("NEAR_FULL")} tone="near" />
        <Stat label="Full" value={c("FULL")} tone="full" />
        <Stat label="Total vehicles" value={v.length} icon={<Truck className="h-4 w-4" />} />
        <Stat label="Active vehicles" value={v.filter((x) => x.status !== "OFFLINE").length} tone="normal" />
        <Stat label="Offline vehicles" value={v.filter((x) => x.status === "OFFLINE").length} tone="offline" />
        <Stat label="Pending collections" value={c("FULL")} tone="near" icon={<ClipboardList className="h-4 w-4" />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Live map" className="lg:col-span-2" action={<Link to="/map" className="text-xs text-primary">Open full map →</Link>}>
          <GoogleMap bins={b} vehicles={v} className="h-80" />
        </Panel>
        <Panel title={`Active alerts · ${open.length}`} action={<Bell className="h-4 w-4 text-muted-foreground" />}>
          <QueryState q={{ ...alerts, data: open }} empty="No active alerts">
            <ul className="space-y-3">
              {open.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
                  <div><div className="font-medium">{a.message}</div><div className="text-xs text-muted-foreground">{ago(a.created_at)}</div></div>
                  <Pill value={a.severity} />
                </li>
              ))}
            </ul>
          </QueryState>
        </Panel>
      </div>
      <Panel title="Recent collections">
        <QueryState q={cols} empty="No collections recorded yet">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Bin</th><th>Vehicle</th><th>Driver</th><th>Method</th><th>When</th></tr></thead>
              <tbody>{cols.data?.map((r) => (<tr key={r.id} className="border-t"><td className="py-2 font-mono">{r.bin_code}</td><td className="font-mono">{r.vehicle_code ?? "—"}</td><td>{r.driver_name ?? "—"}</td><td>{r.confirmation_method}</td><td>{ago(r.collection_time)}</td></tr>))}</tbody>
            </table>
          </div>
        </QueryState>
      </Panel>
    </div>
  );
}
