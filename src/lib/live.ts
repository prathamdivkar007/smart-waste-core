import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Bin = T["bins"]["Row"];
export type Vehicle = T["vehicles"]["Row"];
export type Alert = T["alerts"]["Row"];
export type Collection = T["collections"]["Row"];
export type Area = T["areas"]["Row"];
export type Telemetry = T["bin_telemetry"]["Row"];
export type VehicleLocation = T["vehicle_locations"]["Row"];
export type Setting = T["system_settings"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

type Opts = { order?: string; ascending?: boolean; limit?: number; filter?: [string, string] ; enabled?: boolean };

/** Reads a table with RLS and keeps it fresh through the existing realtime publication. */
export function useLive<R>(table: keyof T, opts: Opts = {}) {
  const qc = useQueryClient();
  const key = [table, opts.order, opts.limit, opts.filter?.join("=")];
  const q = useQuery({
    queryKey: key,
    enabled: opts.enabled ?? true,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase.from(table).select("*");
      if (opts.filter) query = query.eq(opts.filter[0], opts.filter[1]);
      if (opts.order) query = query.order(opts.order, { ascending: opts.ascending ?? false });
      query = query.limit(opts.limit ?? 500);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as R[];
    },
  });
  useEffect(() => {
    const ch = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () =>
        qc.invalidateQueries({ queryKey: [table] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [table, qc]);
  return q;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const list = (roles ?? []).map((r) => r.role as AppRole);
      return {
        user,
        roles: list,
        isAdmin: list.includes("ADMIN"),
        isStaff: list.includes("ADMIN") || list.includes("SUPERVISOR"),
        isDriver: list.includes("DRIVER"),
      };
    },
  });
}

export const fmtTime = (s?: string | null) => (s ? new Date(s).toLocaleString() : "—");
export const ago = (s?: string | null) => {
  if (!s) return "never";
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};
