import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Map, Trash2, Truck, ClipboardCheck, Bell, BarChart3, Settings, LogOut, Menu, Recycle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/live";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, who: "all" },
  { to: "/map", label: "Live Map", icon: Map, who: "all" },
  { to: "/bins", label: "Bins", icon: Trash2, who: "staff" },
  { to: "/vehicles", label: "Vehicles", icon: Truck, who: "staff" },
  { to: "/collections", label: "Collections", icon: ClipboardCheck, who: "all" },
  { to: "/alerts", label: "Alerts", icon: Bell, who: "staff" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, who: "staff" },
  { to: "/settings", label: "Settings", icon: Settings, who: "admin" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const qc = useQueryClient();
  const d = me.data;
  const items = NAV.filter((n) => n.who === "all" || (n.who === "staff" && d?.isStaff) || (n.who === "admin" && d?.isAdmin));

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    nav({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
          <Recycle className="h-6 w-6 text-sidebar-primary" />
          <div>
            <div className="font-display text-base font-semibold leading-tight">WasteFlow</div>
            <div className="text-[11px] uppercase tracking-wider opacity-60">ULB Control Room</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {items.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm opacity-80 hover:bg-sidebar-accent hover:opacity-100" activeProps={{ className: "bg-sidebar-accent !opacity-100 text-sidebar-primary" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs">
          <div className="truncate opacity-80">{d?.user.email}</div>
          <div className="mt-1 font-mono uppercase text-sidebar-primary">{d?.roles.join(" · ") || "no role"}</div>
          <button onClick={signOut} className="mt-3 flex items-center gap-2 opacity-70 hover:opacity-100">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 md:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <span className="font-display font-semibold">WasteFlow</span>
        </header>
        <main className="flex-1 p-4 md:p-8">
          {d && d.roles.length === 0 ? (
            <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center">
              <h2 className="font-display text-lg font-semibold">Waiting for access</h2>
              <p className="mt-2 text-sm text-muted-foreground">Your account has no role yet. Ask an administrator to assign you Admin, Supervisor or Driver.</p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
