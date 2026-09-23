import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/vehicles/:vehicleId/location
 * Called by the ESP32 + NEO-6M GPS + SIM300 GPRS vehicle unit.
 *
 * Headers: x-device-id, x-device-secret
 * Body: { latitude, longitude, speed, heading, timestamp }
 */
export const Route = createFileRoute("/api/public/vehicles/$vehicleId/location")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { corsPreflight } = await import("@/lib/iot.server");
        return corsPreflight();
      },
      POST: async ({ request, params }) => {
        const iot = await import("@/lib/iot.server");
        const supabase = await iot.getAdmin();

        const auth = await iot.authenticateDevice(supabase, request, "VEHICLE");
        if ("error" in auth) return auth.error;
        const device = auth.device;

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return iot.fail("Invalid JSON body", 400);
        }

        const settings = await iot.getSettings(supabase);
        const errors: string[] = [];
        const latitude = iot.num(body["latitude"], "latitude", -90, 90, errors);
        const longitude = iot.num(body["longitude"], "longitude", -180, 180, errors);
        const speed = iot.num(body["speed"], "speed", 0, settings.MAX_SPEED_KMH, errors, true);
        const heading = iot.num(body["heading"], "heading", 0, 360, errors, true);
        const timestamp = iot.isoTimestamp(body["timestamp"]);
        if (errors.length > 0) return iot.fail(errors.join("; "), 422);

        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("id, vehicle_id, status")
          .eq("vehicle_id", params.vehicleId)
          .maybeSingle();

        if (!vehicle) return iot.fail("Unknown vehicle", 404);
        if (device.vehicle_id !== vehicle.id) {
          return iot.fail("Device is not bound to this vehicle", 403);
        }

        const now = new Date().toISOString();

        const { error: historyError } = await supabase.from("vehicle_locations").insert({
          vehicle_id: vehicle.id,
          vehicle_code: vehicle.vehicle_id,
          latitude,
          longitude,
          speed,
          heading,
          timestamp,
        });
        if (historyError) return iot.fail("Failed to store GPS location", 500);

        const nextStatus =
          vehicle.status === "OFFLINE"
            ? (speed ?? 0) > 1
              ? "EN_ROUTE"
              : "AVAILABLE"
            : vehicle.status;

        await supabase
          .from("vehicles")
          .update({
            latitude,
            longitude,
            speed,
            heading,
            status: nextStatus,
            last_seen_at: now,
          })
          .eq("id", vehicle.id);

        await supabase.from("devices").update({ last_seen_at: now }).eq("id", device.id);

        await iot.resolveOpenAlerts(supabase, {
          vehicle_id: vehicle.id,
          types: ["VEHICLE_OFFLINE", "GPS_OFFLINE"],
        });

        await iot.broadcast(supabase, "vehicles", "location", {
          vehicleId: vehicle.vehicle_id,
          latitude,
          longitude,
          speed,
          heading,
          timestamp,
        });

        return iot.jsonResponse({ success: true, message: "GPS location received" });
      },
    },
  },
});
