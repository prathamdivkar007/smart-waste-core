import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Admin-only hardware provisioning: register ESP32 units and rotate their secrets. */

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "ADMIN",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

function randomSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const listDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("devices")
      .select("id, device_id, device_type, bin_id, vehicle_id, active, last_seen_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Registers a new ESP32 device and returns its secret exactly once.
 * Only the SHA-256 hash of the secret is stored.
 */
export const registerDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        deviceId: z.string().min(3).max(64),
        deviceType: z.enum(["BIN", "VEHICLE"]),
        targetCode: z.string().min(1), // bin_id (BIN-001) or vehicle_id (VEH-001)
        firmwareVersion: z.string().max(32).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let binId: string | null = null;
    let vehicleId: string | null = null;

    if (data.deviceType === "BIN") {
      const { data: bin } = await supabaseAdmin
        .from("bins")
        .select("id")
        .eq("bin_id", data.targetCode)
        .maybeSingle();
      if (!bin) throw new Error("Bin not found");
      binId = bin.id;
    } else {
      const { data: vehicle } = await supabaseAdmin
        .from("vehicles")
        .select("id")
        .eq("vehicle_id", data.targetCode)
        .maybeSingle();
      if (!vehicle) throw new Error("Vehicle not found");
      vehicleId = vehicle.id;
    }

    const secret = randomSecret();
    const { error } = await supabaseAdmin.from("devices").insert({
      device_id: data.deviceId,
      device_type: data.deviceType,
      bin_id: binId,
      vehicle_id: vehicleId,
      device_secret_hash: await sha256Hex(secret),
      firmware_version: data.firmwareVersion ?? null,
      active: true,
    });
    if (error) throw new Error(error.message);

    return {
      success: true,
      deviceId: data.deviceId,
      deviceSecret: secret,
      note: "Store this secret in the ESP32 firmware. It is shown only once.",
    };
  });

export const rotateDeviceSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ deviceId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const secret = randomSecret();
    const { error } = await supabaseAdmin
      .from("devices")
      .update({ device_secret_hash: await sha256Hex(secret) })
      .eq("device_id", data.deviceId);
    if (error) throw new Error(error.message);
    return { success: true, deviceId: data.deviceId, deviceSecret: secret };
  });

export const setDeviceActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ deviceId: z.string().min(1), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("devices")
      .update({ active: data.active })
      .eq("device_id", data.deviceId);
    if (error) throw new Error(error.message);
    return { success: true };
  });
