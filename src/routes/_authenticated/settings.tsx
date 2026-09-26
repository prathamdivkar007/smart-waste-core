import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLive, useMe, type Setting, type AppRole } from "@/lib/live";
import { updateSystemSetting } from "@/lib/dashboard.functions";
import { PageHeader, Panel, QueryState, Empty } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — WasteFlow" }, { name: "description", content: "Thresholds and user roles." }] }),
  component: SettingsPage,
});

function SettingRow({ s }: { s: Setting }) {
  const [v, setV] = useState(String(s.value));
  const save = useServerFn(updateSystemSetting);
  useEffect(() => setV(String(s.value)), [s.value]);
  const submit = async () => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return toast.error("Enter a positive number");
    try { await save({ data: { key: s.key, value: n } }); toast.success(`${s.key} saved`); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <div className="flex flex-wrap items-center gap-3 border-t py-3 first:border-0">
      <div className="min-w-48 flex-1"><div className="font-mono text-sm">{s.key}</div><div className="text-xs text-muted-foreground">{s.description}</div></div>
      <Input type="number" value={v} onChange={(e) => setV(e.target.value)} className="w-32" />
      <Button size="sm" onClick={submit} disabled={v === String(s.value)}>Save</Button>
    </div>
  );
}

const ROLES: AppRole[] = ["ADMIN", "SUPERVISOR", "DRIVER"];

function Users() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["users-roles"],
    queryFn: async () => {
      const [p, r] = await Promise.all([supabase.from("profiles").select("id,name,email").order("email"), supabase.from("user_roles").select("user_id,role")]);
      if (p.error) throw new Error(p.error.message);
      return (p.data ?? []).map((u) => ({ ...u, roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role as AppRole) }));
    },
  });
  const toggle = async (uid: string, role: AppRole, has: boolean) => {
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["users-roles"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  };
  return (
    <QueryState q={q} empty="No users">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">User</th>{ROLES.map((r) => <th key={r} className="text-center">{r}</th>)}</tr></thead>
        <tbody>
          {q.data?.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="py-2">{u.email}<div className="text-xs text-muted-foreground">{u.name}</div></td>
              {ROLES.map((r) => { const has = u.roles.includes(r); return <td key={r} className="text-center"><input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" checked={has} onChange={() => toggle(u.id, r, has)} /></td>; })}
            </tr>
          ))}
        </tbody>
      </table>
    </QueryState>
  );
}

function SettingsPage() {
  const me = useMe();
  const settings = useLive<Setting>("system_settings", { order: "key", ascending: true });
  if (me.data && !me.data.isAdmin) return <Empty text="Settings are available to administrators only." />;
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" sub="Thresholds are read by the devices' backend on every report" />
      <Panel title="System thresholds"><QueryState q={settings} empty="No settings">{settings.data?.map((s) => <SettingRow key={s.key} s={s} />)}</QueryState></Panel>
      <Panel title="Users & roles"><Users /></Panel>
    </div>
  );
}
