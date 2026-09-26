import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLive, fmtTime, type Collection } from "@/lib/live";
import { PageHeader, Panel, Pill, QueryState } from "@/components/bits";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/collections")({
  head: () => ({ meta: [{ title: "Collections — WasteFlow" }, { name: "description", content: "History of confirmed bin collections." }] }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const cols = useLive<Collection>("collections", { order: "collection_time", limit: 500 });
  const [q, setQ] = useState("");
  const rows = (cols.data ?? []).filter((c) => `${c.bin_code} ${c.vehicle_code} ${c.driver_name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Collections" sub="Confirmed by driver button or manually by staff" />
      <Panel>
        <Input placeholder="Search bin, vehicle or driver" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-xs" />
        <QueryState q={{ ...cols, data: rows }} empty="No collections yet">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">ID</th><th>Bin</th><th>Vehicle</th><th>Driver</th><th>Collected</th><th>Status change</th><th>Method</th><th>Notes</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2 font-mono text-xs text-muted-foreground">{c.id.slice(0, 8)}</td>
                    <td className="font-mono">{c.bin_code ?? "—"}</td>
                    <td className="font-mono">{c.vehicle_code ?? "—"}</td>
                    <td>{c.driver_name ?? "—"}</td>
                    <td>{fmtTime(c.collection_time)}</td>
                    <td className="space-x-1"><Pill value={c.previous_status} /> → <Pill value={c.new_status} /></td>
                    <td>{c.confirmation_method}</td>
                    <td className="max-w-xs truncate text-muted-foreground">{c.notes ?? ""}</td>
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
