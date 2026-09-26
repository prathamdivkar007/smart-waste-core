import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useLive, useMe, fmtTime, type Bin, type Vehicle, type Telemetry, type Area } from "@/lib/live";
import { assignVehicleToBin, confirmCollection } from "@/lib/dashboard.functions";
import { PageHeader, Panel, Pill, Loading, Empty, QueryState } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/bins/$binId")({
  head: ({ params }) => ({ meta: [{ title: `Bin ${params.binId} — WasteFlow` }, { name: "description", content: "Bin details and sensor history." }] }),
  component: BinDetail,
});

function BinDetail() {
  const { binId } = Route.useParams();
  const me = useMe();
  const bins = useLive<Bin>("bins", { filter: ["bin_id", binId] });
  const bin = bins.data?.[0];
  const vehicles = useLive<Vehicle>("vehicles", { order: "vehicle_id", ascending: true });
  const areas = useLive<Area>("areas");
  const tel = useLive<Telemetry>("bin_telemetry", { filter: ["bin_code", binId], order: "timestamp", limit: 200 });
  const assign = useServerFn(assignVehicleToBin);
  const confirm = useServerFn(confirmCollection);
  const [veh, setVeh] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (bins.isLoading) return <Loading />;
  if (!bin) return <Empty text={`Bin ${binId} not found`} />;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  };
  const chart = [...(tel.data ?? [])].reverse().map((t) => ({ t: new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), fill: Number(t.fill_level), moisture: t.moisture_level != null ? Number(t.moisture_level) : null }));
  const cell = (k: string, v: React.ReactNode) => <div><div className="text-xs uppercase text-muted-foreground">{k}</div><div className="mt-1 font-medium">{v}</div></div>;

  return (
    <div className="space-y-6">
      <Link to="/bins" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Bins</Link>
      <PageHeader title={bin.bin_id} sub={bin.label ?? undefined}><Pill value={bin.status} /></PageHeader>
      <Panel>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cell("Fill", `${Math.round(Number(bin.fill_level))}%`)}
          {cell("Moisture", bin.moisture_level != null ? `${bin.moisture_level}%` : "—")}
          {cell("Metal detected", bin.metal_detected ? "Yes" : "No")}
          {cell("Battery", bin.battery_voltage != null ? `${bin.battery_voltage} V` : "—")}
          {cell("Area", areas.data?.find((a) => a.id === bin.area_id)?.name ?? "—")}
          {cell("Location", <span className="font-mono text-xs">{bin.latitude?.toFixed(5)}, {bin.longitude?.toFixed(5)}</span>)}
          {cell("Last update", fmtTime(bin.last_seen_at))}
          {cell("Last collection", fmtTime(bin.last_collection_at))}
        </div>
      </Panel>
      <Panel title="Fill history">
        {tel.isLoading ? <Loading /> : chart.length === 0 ? <Empty text="No telemetry yet" /> : (
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="t" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip />
                <Line dataKey="fill" name="Fill %" stroke="var(--color-chart-1)" dot={false} strokeWidth={2} />
                <Line dataKey="moisture" name="Moisture %" stroke="var(--color-chart-4)" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      {me.data?.isStaff && (
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Dispatch vehicle">
            <div className="flex gap-2">
              <select className="h-9 flex-1 rounded-md border bg-card px-2 text-sm" value={veh} onChange={(e) => setVeh(e.target.value)}>
                <option value="">Choose vehicle…</option>
                {vehicles.data?.map((v) => <option key={v.id} value={v.vehicle_id}>{v.vehicle_id} · {v.driver_name ?? "no driver"} · {v.status}</option>)}
              </select>
              <Button disabled={!veh || busy} onClick={() => run(() => assign({ data: { vehicleId: veh, binId: bin.bin_id } }), "Vehicle dispatched")}>Assign</Button>
            </div>
          </Panel>
          <Panel title="Confirm collection manually">
            <Textarea placeholder="Notes (optional)" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button className="mt-2" disabled={busy} onClick={() => run(() => confirm({ data: { binId: bin.bin_id, notes: notes || undefined } }), "Collection recorded")}>Mark collected</Button>
          </Panel>
        </div>
      )}
      <Panel title="Telemetry log">
        <QueryState q={tel} empty="No readings">
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Time</th><th>Fill</th><th>Moisture</th><th>Metal</th><th>Battery</th></tr></thead>
              <tbody>{tel.data?.map((t) => (<tr key={t.id} className="border-t"><td className="py-1.5">{fmtTime(t.timestamp)}</td><td>{Number(t.fill_level)}%</td><td>{t.moisture_level ?? "—"}</td><td>{t.metal_detected ? "Yes" : "No"}</td><td>{t.battery_voltage ?? "—"}</td></tr>))}</tbody>
            </table>
          </div>
        </QueryState>
      </Panel>
    </div>
  );
}
