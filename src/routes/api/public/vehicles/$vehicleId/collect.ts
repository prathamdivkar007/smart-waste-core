import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/vehicles/:vehicleId/collect
 * Driver presses the push button on the vehicle ESP32 to confirm a collection.
 *
 * Headers: x-device-id, x-device-secret
 * Body: { binId?: "BIN-001", latitude?, longitude?, notes?, timestamp? }
 *
 * When binId is omitted the backend picks the vehicle's assigned bin, or the
 * nearest bin (within 150 m) when coordinates are supplied.
 */
export const Route = createFileRoute("/api/public/vehicles/$vehicleId/collect")({
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

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }

        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("id, vehicle_id, driver_name, assigned_bin_id, latitude, longitude")
          .eq("vehicle_id", params.vehicleId)
          .maybeSingle();

        if (!vehicle) return iot.fail("Unknown vehicle", 404);
        if (device.vehicle_id !== vehicle.id) {
          return iot.fail("Device is not bound to this vehicle", 403);
        }

        const errors: string[] = [];
        const latitude = iot.num(body["latitude"], "latitude", -90, 90, errors, true);
        const longitude = iot.num(body["longitude"], "longitude", -180, 180, errors, true);
        if (errors.length > 0) return iot.fail(errors.join("; "), 422);

        const binCode = typeof body["binId"] === "string" ? (body["binId"] as string) : null;
        const collectionTime = iot.isoTimestamp(body["timestamp"]);

        type BinRow = {
          id: string;
          bin_id: string;
          status: string;
          latitude: number | null;
          longitude: number | null;
        };
        let bin: BinRow | null = null;

        if (binCode) {
          const { data } = await supabase
            .from("bins")
            .select("id, bin_id, status, latitude, longitude")
            .eq("bin_id", binCode)
            .maybeSingle();
          bin = (data as BinRow) ?? null;
          if (!bin) return iot.fail("Unknown bin", 404);
        } else if (vehicle.assigned_bin_id) {
          const { data } = await supabase
            .from("bins")
            .select("id, bin_id, status, latitude, longitude")
            .eq("id", vehicle.assigned_bin_id)
            .maybeSingle();
          bin = (data as BinRow) ?? null;
        }

        const lat = latitude ?? vehicle.latitude;
        const lon = longitude ?? vehicle.longitude;

        if (!bin && lat !== null && lon !== null) {
          const { data } = await supabase
            .from("bins")
            .select("id, bin_id, status, latitude, longitude")
            .not("latitude", "is", null)
            .not("longitude", "is", null);
          let best: { row: BinRow; distance: number } | null = null;
          for (const row of (data ?? []) as BinRow[]) {
            const distance = haversineMeters(lat, lon, row.latitude!, row.longitude!);
            if (!best || distance < best.distance) best = { row, distance };
          }
          if (best && best.distance <= 150) bin = best.row;
        }

        if (!bin) return iot.fail("Could not determine which bin was collected", 422);

        const previousStatus = bin.status;

        const { data: collection, error: collectionError } = await supabase
          .from("collections")
          .insert({
            bin_id: bin.id,
            bin_code: bin.bin_id,
            vehicle_id: vehicle.id,
            vehicle_code: vehicle.vehicle_id,
            driver_name: vehicle.driver_name,
            collection_time: collectionTime,
            previous_status: previousStatus,
            new_status: "NORMAL",
            confirmation_method: "BUTTON",
            notes: typeof body["notes"] === "string" ? (body["notes"] as string) : null,
          })
          .select("id")
          .single();

        if (collectionError) return iot.fail("Failed to record collection", 500);

        await supabase
          .from("bins")
          .update({
            fill_level: 0,
            status: "NORMAL",
            last_collection_at: collectionTime,
            assigned_vehicle_id: null,
          })
          .eq("id", bin.id);

        await supabase
          .from("vehicles")
          .update({ status: "AVAILABLE", assigned_bin_id: null })
          .eq("id", vehicle.id);

        await iot.resolveOpenAlerts(supabase, {
          bin_id: bin.id,
          types: ["BIN_FULL", "COLLECTION_OVERDUE"],
        });

        await iot.broadcast(supabase, "collections", "collected", {
          collectionId: collection?.id,
          binId: bin.bin_id,
          vehicleId: vehicle.vehicle_id,
          collectionTime,
        });

        return iot.jsonResponse({
          success: true,
          message: "Collection confirmed",
          binId: bin.bin_id,
          status: "NORMAL",
        });
      },
    },
  },
});

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
