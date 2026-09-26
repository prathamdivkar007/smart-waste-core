import { createFileRoute } from "@tanstack/react-router";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line } from "recharts";
import { useLive, type Bin, type Collection, type Alert, type Area, type VehicleLocation } from "@/lib/live";
import { PageHeader, Panel, Loading, Empty } from "@/components/bits";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — WasteFlow" }, { name: "description", content: "Charts for bin status, collections and fleet activity." }] }),
  component: Analytics,
});

const COLORS: Record<string, string> = { NORMAL: "var(--color-status-normal)", NEAR_FULL: "var(--color-status-near)", FULL: "var(--color-status-full)", OFFLINE: "var(--color-status-offline)" };
const STATUSES = ["NORMAL", "NEAR_FULL", "FULL", "OFFLINE"];

function lastDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function Analytics() {
  const bins = useLive<Bin>("bins");
  const cols = useLive<Collection>("collections", { order: "collection_time", limit: 1000 });
  const alerts = useLive<Alert>("alerts", { order: "created_at", limit: 1000 });
  const areas = useLive<Area>("areas");
  const locs = useLive<VehicleLocation>("vehicle_locations", { order: "timestamp", limit: 5000 });
  if (bins.isLoading || cols.isLoading) return <Loading />;

  const days = lastDays(14);
  const b = bins.data ?? [];
  const pie = STATUSES.map((s) => ({ name: s, value: b.filter((x) => x.status === s).length })).filter((x) => x.value);
  const daily = days.map((d) => {
    const cs = (cols.data ?? []).filter((c) => c.collection_time.startsWith(d));
    return {
      d: d.slice(5),
      total: cs.length,
      BUTTON: cs.filter((c) => c.confirmation_method === "BUTTON").length,
      MANUAL: cs.filter((c) => c.confirmation_method === "MANUAL").length,
      full: (alerts.data ?? []).filter((a) => a.type === "BIN_FULL" && a.created_at.startsWith(d)).length,
    };
  });
  const byArea = (areas.data ?? []).map((a) => {
    const row: Record<string, string | number> = { area: a.name };
    STATUSES.forEach((s) => (row[s] = b.filter((x) => x.area_id === a.id && x.status === s).length));
    return row;
  });
  const activity = Object.entries(
    (locs.data ?? []).reduce<Record<string, number>>((m, l) => ((m[l.vehicle_code] = (m[l.vehicle_code] ?? 0) + 1), m), {}),
  ).map(([vehicle, pings]) => ({ vehicle, pings }));

  const axis = { fontSize: 11 };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" sub="Last 14 days" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Bin status distribution">
          {pie.length === 0 ? <Empty text="No bins" /> : (
            <div className="h-64"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>{pie.map((p) => <Cell key={p.name} fill={COLORS[p.name]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
          )}
        </Panel>
        <Panel title="Collection history">
          <div className="h-64"><ResponsiveContainer><BarChart data={daily}>{grid}<XAxis dataKey="d" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip /><Bar dataKey="total" name="Collections" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Bins reaching full (per day)">
          <div className="h-64"><ResponsiveContainer><LineChart data={daily}>{grid}<XAxis dataKey="d" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip /><Line dataKey="full" name="Full events" stroke="var(--color-chart-3)" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Vehicle activity (GPS reports)">
          {activity.length === 0 ? <Empty text="No GPS data yet" /> : (
            <div className="h-64"><ResponsiveContainer><BarChart data={activity}>{grid}<XAxis dataKey="vehicle" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip /><Bar dataKey="pings" name="Reports" fill="var(--color-chart-4)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
          )}
        </Panel>
        <Panel title="Area-wise bin status">
          {byArea.length === 0 ? <Empty text="No areas" /> : (
            <div className="h-64"><ResponsiveContainer><BarChart data={byArea}>{grid}<XAxis dataKey="area" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip /><Legend />{STATUSES.map((s) => <Bar key={s} dataKey={s} stackId="a" fill={COLORS[s]} />)}</BarChart></ResponsiveContainer></div>
          )}
        </Panel>
        <Panel title="Collection trends by method">
          <div className="h-64"><ResponsiveContainer><LineChart data={daily}>{grid}<XAxis dataKey="d" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip /><Legend /><Line dataKey="BUTTON" name="Driver button" stroke="var(--color-chart-1)" strokeWidth={2} /><Line dataKey="MANUAL" name="Manual" stroke="var(--color-chart-2)" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
        </Panel>
      </div>
    </div>
  );
}
