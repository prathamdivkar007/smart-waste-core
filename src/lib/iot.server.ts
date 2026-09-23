/**
 * Server-only helpers for IoT (ESP32) device endpoints.
 * Never import this from client code — it uses the service-role Supabase client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type Json = Record<string, unknown>;

export function jsonResponse(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, x-device-id, x-device-secret",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    },
  });
}

export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, x-device-id, x-device-secret",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    },
  });
}

export function fail(message: string, status = 400, extra: Json = {}): Response {
  return jsonResponse({ success: false, message, ...extra }, status);
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function getAdmin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export type DeviceRow = {
  id: string;
  device_id: string;
  device_type: "BIN" | "VEHICLE";
  bin_id: string | null;
  vehicle_id: string | null;
  device_secret_hash: string;
  active: boolean;
};

/**
 * Authenticates an ESP32 device from the `x-device-id` / `x-device-secret`
 * headers (Authorization: Bearer <deviceId>:<secret> is also accepted).
 */
export async function authenticateDevice(
  supabase: SupabaseClient,
  request: Request,
  expectedType: "BIN" | "VEHICLE",
): Promise<{ device: DeviceRow } | { error: Response }> {
  let deviceId = request.headers.get("x-device-id") ?? "";
  let secret = request.headers.get("x-device-secret") ?? "";

  if (!deviceId || !secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth.toLowerCase().startsWith("bearer ")) {
      const [id, ...rest] = auth.slice(7).trim().split(":");
      deviceId = deviceId || (id ?? "");
      secret = secret || rest.join(":");
    }
  }

  if (!deviceId || !secret) {
    return { error: fail("Missing device credentials", 401) };
  }

  const { data, error } = await supabase
    .from("devices")
    .select("id, device_id, device_type, bin_id, vehicle_id, device_secret_hash, active")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) return { error: fail("Device lookup failed", 500) };
  if (!data) return { error: fail("Unknown device", 401) };

  const device = data as DeviceRow;
  if (!device.active) return { error: fail("Device disabled", 403) };
  if (device.device_type !== expectedType) return { error: fail("Wrong device type", 403) };

  const hash = await sha256Hex(secret);
  if (!timingSafeEqual(hash, device.device_secret_hash)) {
    return { error: fail("Invalid device secret", 401) };
  }

  return { device };
}

export type Settings = {
  FULL_THRESHOLD: number;
  NEAR_FULL_THRESHOLD: number;
  BIN_OFFLINE_TIMEOUT: number;
  VEHICLE_OFFLINE_TIMEOUT: number;
  COLLECTION_OVERDUE_HOURS: number;
  MAX_SPEED_KMH: number;
};

const SETTING_DEFAULTS: Settings = {
  FULL_THRESHOLD: 90,
  NEAR_FULL_THRESHOLD: 60,
  BIN_OFFLINE_TIMEOUT: 1800,
  VEHICLE_OFFLINE_TIMEOUT: 600,
  COLLECTION_OVERDUE_HOURS: 24,
  MAX_SPEED_KMH: 120,
};

export async function getSettings(supabase: SupabaseClient): Promise<Settings> {
  const { data } = await supabase.from("system_settings").select("key, value");
  const out: Settings = { ...SETTING_DEFAULTS };
  for (const row of (data ?? []) as Array<{ key: string; value: unknown }>) {
    const num = typeof row.value === "number" ? row.value : Number(row.value);
    if (row.key in out && Number.isFinite(num)) {
      (out as unknown as Record<string, number>)[row.key] = num;
    }
  }
  return out;
}

export type BinStatus = "NORMAL" | "NEAR_FULL" | "FULL" | "OFFLINE";

export function computeBinStatus(fillLevel: number, settings: Settings): BinStatus {
  if (fillLevel >= settings.FULL_THRESHOLD) return "FULL";
  if (fillLevel >= settings.NEAR_FULL_THRESHOLD) return "NEAR_FULL";
  return "NORMAL";
}

/** Opens an alert unless an identical OPEN alert already exists (partial unique index). */
export async function openAlert(
  supabase: SupabaseClient,
  alert: {
    type: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    message: string;
    bin_id?: string | null;
    vehicle_id?: string | null;
  },
): Promise<void> {
  await supabase.from("alerts").insert({
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    bin_id: alert.bin_id ?? null,
    vehicle_id: alert.vehicle_id ?? null,
    status: "OPEN",
  });
}

export async function resolveOpenAlerts(
  supabase: SupabaseClient,
  filter: { bin_id?: string; vehicle_id?: string; types: string[] },
): Promise<void> {
  let query = supabase
    .from("alerts")
    .update({ status: "RESOLVED", resolved_at: new Date().toISOString() })
    .eq("status", "OPEN")
    .in("type", filter.types);
  if (filter.bin_id) query = query.eq("bin_id", filter.bin_id);
  if (filter.vehicle_id) query = query.eq("vehicle_id", filter.vehicle_id);
  await query;
}

/** Broadcasts an event on a realtime channel so dashboards get instant updates. */
export async function broadcast(
  supabase: SupabaseClient,
  channelName: string,
  event: string,
  payload: Json,
): Promise<void> {
  try {
    const channel = supabase.channel(channelName, { config: { broadcast: { ack: false } } });
    await channel.subscribe();
    await channel.send({ type: "broadcast", event, payload });
    await supabase.removeChannel(channel);
  } catch {
    // Realtime broadcast is best-effort; postgres_changes remains the source of truth.
  }
}

// ---------- validation helpers ----------

export function num(
  value: unknown,
  name: string,
  min: number,
  max: number,
  errors: string[],
  optional = false,
): number | null {
  if (value === undefined || value === null) {
    if (!optional) errors.push(`${name} is required`);
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    errors.push(`${name} must be a number`);
    return null;
  }
  if (n < min || n > max) {
    errors.push(`${name} must be between ${min} and ${max}`);
    return null;
  }
  return n;
}

export function bool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["true", "1", "yes"].includes(value.toLowerCase());
  return fallback;
}

export function isoTimestamp(value: unknown): string {
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}
