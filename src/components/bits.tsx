import type { ReactNode } from "react";
import { Loader2, AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const statusCls: Record<string, string> = {
  NORMAL: "bg-status-normal/15 text-status-normal border-status-normal/30",
  NEAR_FULL: "bg-status-near/15 text-status-near border-status-near/30",
  FULL: "bg-status-full/15 text-status-full border-status-full/30",
  OFFLINE: "bg-status-offline/15 text-status-offline border-status-offline/30",
  AVAILABLE: "bg-status-normal/15 text-status-normal border-status-normal/30",
  EN_ROUTE: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  COLLECTING: "bg-status-near/15 text-status-near border-status-near/30",
  OPEN: "bg-status-full/15 text-status-full border-status-full/30",
  ACKNOWLEDGED: "bg-status-near/15 text-status-near border-status-near/30",
  RESOLVED: "bg-status-normal/15 text-status-normal border-status-normal/30",
  CRITICAL: "bg-status-full/15 text-status-full border-status-full/30",
  WARNING: "bg-status-near/15 text-status-near border-status-near/30",
  INFO: "bg-chart-4/15 text-chart-4 border-chart-4/30",
};

export function Pill({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide", statusCls[value] ?? "bg-muted text-muted-foreground")}>
      {value.replace("_", " ")}
    </span>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, className, action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      {title && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, tone, icon }: { label: string; value: number | string; tone?: "normal" | "near" | "full" | "offline"; icon?: ReactNode }) {
  const bar = { normal: "bg-status-normal", near: "bg-status-near", full: "bg-status-full", offline: "bg-status-offline" }[tone ?? "normal"];
  return (
    <div className="relative overflow-hidden rounded-lg border bg-card p-4">
      <span className={cn("absolute inset-y-0 left-0 w-1", tone ? bar : "bg-primary")} />
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {icon}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}
export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4" /> {error instanceof Error ? error.message : "Something went wrong"}
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
      <Inbox className="h-6 w-6" /> {text}
    </div>
  );
}

export function QueryState({ q, empty, children }: { q: { isLoading: boolean; error: unknown; data?: unknown[] }; empty: string; children: ReactNode }) {
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data?.length) return <Empty text={empty} />;
  return <>{children}</>;
}
