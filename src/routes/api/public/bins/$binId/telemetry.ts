import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/bins/:binId/telemetry
 * Called by the ESP32 smart-bin unit over Wi-Fi.
 *
 * Headers: x-device-id, x-device-secret
 * Body: { fillLevel, moistureLevel, metalDetected, batteryVoltage, timestamp }
 */
export const Route = createFileRoute("/api/public/bins/$binId/telemetry")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { corsPreflight } = await import("@/lib/iot.server");
        return corsPreflight();
      },
      POST: async ({ request, params }) => {
        const iot = await import("@/lib/iot.server");
        const supabase = await iot.getAdmin();

        const auth = await iot.authenticateDevice(supabase, request, "BIN");
        if ("error" in auth) return auth.error;
        const device = auth.device;

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return iot.fail("Invalid JSON body", 400);
        }

        const errors: string[] = [];
        const fillLevel = iot.num(body["fillLevel"], "fillLevel", 0, 100, errors);
        const moistureLevel = iot.num(body["moistureLevel"], "moistureLevel", 0, 100, errors, true);
        const batteryVoltage = iot.num(body["batteryVoltage"], "batteryVoltage", 0, 30, errors, true);
        const metalDetected = iot.bool(body["metalDetected"]);
        const timestamp = iot.isoTimestamp(body["timestamp"]);
        if (errors.length > 0) return iot.fail(errors.join("; "), 422);

        // Resolve the bin and verify it belongs to this device.
        const { data: bin } = await supabase
          .from("bins")
          .select("id, bin_id, status")
          .eq("bin_id", params.binId)
          .maybeSingle();

        if (!bin) return iot.fail("Unknown bin", 404);
        if (device.bin_id !== bin.id) return iot.fail("Device is not bound to this bin", 403);

        const settings = await iot.getSettings(supabase);
        const status = iot.computeBinStatus(fillLevel as number, settings);
        const previousStatus = bin.status as string;
        const now = new Date().toISOString();

        // 1. Append immutable telemetry history.
        const { error: telemetryError } = await supabase.from("bin_telemetry").insert({
          bin_id: bin.id,
          bin_code: bin.bin_id,
          fill_level: fillLevel,
          moisture_level: moistureLevel,
          metal_detected: metalDetected,
          battery_voltage: batteryVoltage,
          timestamp,
        });
        if (telemetryError) return iot.fail("Failed to store telemetry", 500);

        // 2. Update current bin snapshot (fires realtime postgres_changes).
        await supabase
          .from("bins")
          .update({
            fill_level: fillLevel,
            moisture_level: moistureLevel,
            metal_detected: metalDetected,
            battery_voltage: batteryVoltage,
            status,
            last_seen_at: now,
          })
          .eq("id", bin.id);

        await supabase.from("devices").update({ last_seen_at: now }).eq("id", device.id);

        // 3. Alerts.
        await iot.resolveOpenAlerts(supabase, { bin_id: bin.id, types: ["BIN_OFFLINE"] });
        if (status === "FULL") {
          if (previousStatus !== "FULL") {
            await iot.openAlert(supabase, {
              type: "BIN_FULL",
              severity: "CRITICAL",
              message: `Bin ${bin.bin_id} is full (${fillLevel}%) and requires collection`,
              bin_id: bin.id,
            });
          }
        } else {
          await iot.resolveOpenAlerts(supabase, {
            bin_id: bin.id,
            types: ["BIN_FULL", "COLLECTION_OVERDUE"],
          });
        }

        if (batteryVoltage !== null && batteryVoltage > 0 && batteryVoltage < 3.2) {
          await iot.openAlert(supabase, {
            type: "SENSOR_ERROR",
            severity: "WARNING",
            message: `Bin ${bin.bin_id} battery low (${batteryVoltage}V)`,
            bin_id: bin.id,
          });
        }

        // 4. Realtime broadcast for dashboards.
        await iot.broadcast(supabase, "bins", "telemetry", {
          binId: bin.bin_id,
          fillLevel,
          moistureLevel,
          metalDetected,
          batteryVoltage,
          status,
          timestamp,
        });
        if (status === "FULL" && previousStatus !== "FULL") {
          await iot.broadcast(supabase, "alerts", "BIN_FULL", { binId: bin.bin_id, fillLevel });
        }

        return iot.jsonResponse({ success: true, message: "Telemetry received", status });
      },
    },
  },
});
