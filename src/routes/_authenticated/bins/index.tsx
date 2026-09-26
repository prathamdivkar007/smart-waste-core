import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLive, ago, type Bin, type Area } from "@/lib/live";
import { PageHeader, Panel, Pill, QueryState } from "@/components/bits";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/bins/")({
  head: () => ({ meta: [{ title: "Bins — WasteFlow" }, { name: "description", content: "All smart dustbins with fill level and sensor readings." }] }),
  component: BinsPage,
});

function BinsPage() {
  const bins = useLive<Bin>("bins", { order: "bin_id", ascending: true });
  const areas = useLive<Area>("areas", { order: "name", ascending: true });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [area, setArea] = useState("ALL");
  const areaName = (id: string | null) => areas.data?.find((a) => a.id === id)?.name ?? "—";
  const rows = (bins.data ?? []).filter(
    (b) =>
      (status === "ALL" || b.status === status) &&
      (area === "ALL" || b.area_id === area) &&
      `${b.bin_id} ${b.label ?? ""} ${areaName(b.area_id)}`.toLowerCase().includes(q.toLowerCase()),
  );
  const sel = "h-9 rounded-md border bg-card px-2 text-sm";

  return (
    <div>
      <PageHeader title="Bins" sub={`${bins.data?.length ?? 0} registered`} />
      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input placeholder="Search bin ID, label or area" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
            {["ALL", "NORMAL", "NEAR_FULL", "FULL", "OFFLINE"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <select className={sel} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="ALL">All areas</option>
            {areas.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <QueryState q={{ ...bins, data: rows }} empty="No bins match">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Bin ID</th><th>Area</th><th>Fill</th><th>Moisture</th><th>Metal</th><th>Status</th><th>Last updated</th></tr></thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="border-t hover:bg-muted/50">
                    <td className="py-2"><Link to="/bins/$binId" params={{ binId: b.bin_id }} className="font-mono text-primary hover:underline">{b.bin_id}</Link><div className="text-xs text-muted-foreground">{b.label}</div></td>
                    <td>{areaName(b.area_id)}</td>
                    <td className="w-40"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded bg-muted"><div className={`h-full rounded ${b.status === "FULL" ? "bg-status-full" : b.status === "NEAR_FULL" ? "bg-status-near" : "bg-status-normal"}`} style={{ width: `${Math.min(100, Number(b.fill_level))}%` }} /></div><span className="tabular-nums">{Math.round(Number(b.fill_level))}%</span></div></td>
                    <td>{b.moisture_level != null ? `${b.moisture_level}%` : "—"}</td>
                    <td>{b.metal_detected ? "Yes" : "No"}</td>
                    <td><Pill value={b.status} /></td>
                    <td className="text-muted-foreground">{ago(b.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Panel>
    </div>
  );
}
