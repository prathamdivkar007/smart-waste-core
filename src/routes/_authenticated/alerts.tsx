import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useLive, useMe, fmtTime, type Alert, type Bin, type Vehicle } from "@/lib/live";
import { updateAlertStatus } from "@/lib/dashboard.functions";
import { PageHeader, Panel, Pill, QueryState } from "@/components/bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({ meta: [{ title: "Alerts — WasteFlow" }, { name: "description", content: "Bin, vehicle and sensor alerts." }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const me = useMe();
  const alerts = useLive<Alert>("alerts", { order: "created_at", limit: 500 });
  const bins = useLive<Bin>("bins");
  const vehicles = useLive<Vehicle>("vehicles");
  const update = useServerFn(updateAlertStatus);
  const [filter, setFilter] = useState("ACTIVE");
  const rows = (alerts.data ?? []).filter((a) => (filter === "ACTIVE" ? a.status !== "RESOLVED" : filter === "ALL" || a.status === filter));
  const set = async (id: string, status: "ACKNOWLEDGED" | "RESOLVED") => {
    try { await update({ data: { alertId: id, status } }); toast.success(`Alert ${status.toLowerCase()}`); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <div>
      <PageHeader title="Alerts">
        <div className="flex rounded-md border bg-card p-0.5 text-sm">
          {["ACTIVE", "OPEN", "ACKNOWLEDGED", "RESOLVED", "ALL"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded px-3 py-1 ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{f.charAt(0) + f.slice(1).toLowerCase()}</button>
          ))}
        </div>
      </PageHeader>
      <Panel>
        <QueryState q={{ ...alerts, data: rows }} empty="No alerts here">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Type</th><th>Bin / vehicle</th><th>Severity</th><th>Message</th><th>Created</th><th>Status</th>{me.data?.isStaff && <th />}</tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-2 font-mono text-xs">{a.type}</td>
                    <td className="font-mono">{bins.data?.find((b) => b.id === a.bin_id)?.bin_id ?? vehicles.data?.find((v) => v.id === a.vehicle_id)?.vehicle_id ?? "—"}</td>
                    <td><Pill value={a.severity} /></td>
                    <td>{a.message}</td>
                    <td className="whitespace-nowrap text-muted-foreground">{fmtTime(a.created_at)}</td>
                    <td><Pill value={a.status} /></td>
                    {me.data?.isStaff && (
                      <td className="whitespace-nowrap text-right">
                        {a.status === "OPEN" && <Button size="sm" variant="outline" onClick={() => set(a.id, "ACKNOWLEDGED")}>Acknowledge</Button>}{" "}
                        {a.status !== "RESOLVED" && <Button size="sm" onClick={() => set(a.id, "RESOLVED")}>Resolve</Button>}
                      </td>
                    )}
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
