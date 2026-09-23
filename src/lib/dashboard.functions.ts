import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Authenticated read/write API for the (separately built) React dashboard.
 * All queries run as the signed-in user, so RLS applies.
 */

export const listBins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bins")
      .select("*")
      .order("bin_id", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getBin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ binId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: bin, error } = await context.supabase
      .from("bins")
      .select("*")
      .eq("bin_id", data.binId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return bin;
  });

export const getBinTelemetry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        binId: z.string().min(1),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(1000).default(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("bin_telemetry")
      .select("*")
      .eq("bin_code", data.binId)
      .order("timestamp", { ascending: false })
      .limit(data.limit);
    if (data.from) query = query.gte("timestamp", data.from);
    if (data.to) query = query.lte("timestamp", data.to);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listVehicles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vehicles")
      .select("*")
      .order("vehicle_id", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getVehicleHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        vehicleId: z.string().min(1),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(5000).default(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("vehicle_locations")
      .select("*")
      .eq("vehicle_code", data.vehicleId)
      .order("timestamp", { ascending: false })
      .limit(data.limit);
    if (data.from) query = query.gte("timestamp", data.from);
    if (data.to) query = query.lte("timestamp", data.to);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        binId: z.string().optional(),
        vehicleId: z.string().optional(),
        limit: z.number().int().min(1).max(1000).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("collections")
      .select("*")
      .order("collection_time", { ascending: false })
      .limit(data.limit);
    if (data.binId) query = query.eq("bin_code", data.binId);
    if (data.vehicleId) query = query.eq("vehicle_code", data.vehicleId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateAlertStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        alertId: z.string().uuid(),
        status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("alerts")
      .update({
        status: data.status,
        resolved_at: data.status === "RESOLVED" ? new Date().toISOString() : null,
      })
      .eq("id", data.alertId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

/** Assign a vehicle to a bin (dispatch). */
export const assignVehicleToBin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ vehicleId: z.string().min(1), binId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: vehicle } = await context.supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_id", data.vehicleId)
      .maybeSingle();
    const { data: bin } = await context.supabase
      .from("bins")
      .select("id")
      .eq("bin_id", data.binId)
      .maybeSingle();
    if (!vehicle || !bin) throw new Error("Vehicle or bin not found");

    const { error: vErr } = await context.supabase
      .from("vehicles")
      .update({ assigned_bin_id: bin.id, status: "EN_ROUTE" })
      .eq("id", vehicle.id);
    if (vErr) throw new Error(vErr.message);

    const { error: bErr } = await context.supabase
      .from("bins")
      .update({ assigned_vehicle_id: vehicle.id })
      .eq("id", bin.id);
    if (bErr) throw new Error(bErr.message);

    return { success: true };
  });

/** Manual (supervisor) collection confirmation from the dashboard. */
export const confirmCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        binId: z.string().min(1),
        vehicleId: z.string().optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: bin } = await context.supabase
      .from("bins")
      .select("id, bin_id, status")
      .eq("bin_id", data.binId)
      .maybeSingle();
    if (!bin) throw new Error("Bin not found");

    let vehicleRow: { id: string; vehicle_id: string; driver_name: string | null } | null = null;
    if (data.vehicleId) {
      const { data: v } = await context.supabase
        .from("vehicles")
        .select("id, vehicle_id, driver_name")
        .eq("vehicle_id", data.vehicleId)
        .maybeSingle();
      vehicleRow = v ?? null;
    }

    const now = new Date().toISOString();
    const { error } = await context.supabase.from("collections").insert({
      bin_id: bin.id,
      bin_code: bin.bin_id,
      vehicle_id: vehicleRow?.id ?? null,
      vehicle_code: vehicleRow?.vehicle_id ?? null,
      driver_name: vehicleRow?.driver_name ?? null,
      collection_time: now,
      previous_status: bin.status,
      new_status: "NORMAL",
      confirmation_method: "MANUAL",
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);

    await context.supabase
      .from("bins")
      .update({ fill_level: 0, status: "NORMAL", last_collection_at: now, assigned_vehicle_id: null })
      .eq("id", bin.id);

    await context.supabase
      .from("alerts")
      .update({ status: "RESOLVED", resolved_at: now })
      .eq("bin_id", bin.id)
      .eq("status", "OPEN")
      .in("type", ["BIN_FULL", "COLLECTION_OVERDUE"]);

    return { success: true };
  });

export const getSystemSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("system_settings").select("*");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateSystemSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ key: z.string().min(1), value: z.number() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("system_settings")
      .update({ value: data.value })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { success: true };
  });

/** Aggregated counters for dashboard cards. */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [bins, vehicles, alerts] = await Promise.all([
      context.supabase.from("bins").select("status"),
      context.supabase.from("vehicles").select("status"),
      context.supabase.from("alerts").select("severity").eq("status", "OPEN"),
    ]);
    const count = (rows: Array<{ status?: string; severity?: string }> | null, key: string, field: "status" | "severity") =>
      (rows ?? []).filter((r) => r[field] === key).length;

    return {
      bins: {
        total: bins.data?.length ?? 0,
        full: count(bins.data, "FULL", "status"),
        nearFull: count(bins.data, "NEAR_FULL", "status"),
        normal: count(bins.data, "NORMAL", "status"),
        offline: count(bins.data, "OFFLINE", "status"),
      },
      vehicles: {
        total: vehicles.data?.length ?? 0,
        available: count(vehicles.data, "AVAILABLE", "status"),
        enRoute: count(vehicles.data, "EN_ROUTE", "status"),
        collecting: count(vehicles.data, "COLLECTING", "status"),
        offline: count(vehicles.data, "OFFLINE", "status"),
      },
      openAlerts: {
        total: alerts.data?.length ?? 0,
        critical: count(alerts.data, "CRITICAL", "severity"),
      },
    };
  });
