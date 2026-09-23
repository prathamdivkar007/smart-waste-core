import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/maintenance/offline-sweep
 * Scheduled job: marks bins/vehicles OFFLINE when they stop reporting and
 * raises COLLECTION_OVERDUE alerts. Requires the cron bearer secret.
 */
export const Route = createFileRoute("/api/public/maintenance/offline-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;

        const iot = await import("@/lib/iot.server");
        const supabase = await iot.getAdmin();
        const settings = await iot.getSettings(supabase);
        const now = Date.now();

        const binCutoff = new Date(now - settings.BIN_OFFLINE_TIMEOUT * 1000).toISOString();
        const vehicleCutoff = new Date(now - settings.VEHICLE_OFFLINE_TIMEOUT * 1000).toISOString();
        const overdueCutoff = new Date(
          now - settings.COLLECTION_OVERDUE_HOURS * 3600 * 1000,
        ).toISOString();

        // --- offline bins ---
        const { data: staleBins } = await supabase
          .from("bins")
          .select("id, bin_id, last_seen_at, status")
          .neq("status", "OFFLINE")
          .or(`last_seen_at.is.null,last_seen_at.lt.${binCutoff}`);

        for (const bin of (staleBins ?? []) as Array<{ id: string; bin_id: string }>) {
          await supabase.from("bins").update({ status: "OFFLINE" }).eq("id", bin.id);
          await iot.openAlert(supabase, {
            type: "BIN_OFFLINE",
            severity: "WARNING",
            message: `Bin ${bin.bin_id} has stopped reporting telemetry`,
            bin_id: bin.id,
          });
        }

        // --- offline vehicles ---
        const { data: staleVehicles } = await supabase
          .from("vehicles")
          .select("id, vehicle_id, last_seen_at, status")
          .neq("status", "OFFLINE")
          .or(`last_seen_at.is.null,last_seen_at.lt.${vehicleCutoff}`);

        for (const vehicle of (staleVehicles ?? []) as Array<{ id: string; vehicle_id: string }>) {
          await supabase.from("vehicles").update({ status: "OFFLINE" }).eq("id", vehicle.id);
          await iot.openAlert(supabase, {
            type: "VEHICLE_OFFLINE",
            severity: "WARNING",
            message: `Vehicle ${vehicle.vehicle_id} has stopped reporting GPS`,
            vehicle_id: vehicle.id,
          });
        }

        // --- overdue collections ---
        const { data: overdueBins } = await supabase
          .from("bins")
          .select("id, bin_id")
          .eq("status", "FULL")
          .or(`last_collection_at.is.null,last_collection_at.lt.${overdueCutoff}`);

        for (const bin of (overdueBins ?? []) as Array<{ id: string; bin_id: string }>) {
          await iot.openAlert(supabase, {
            type: "COLLECTION_OVERDUE",
            severity: "CRITICAL",
            message: `Bin ${bin.bin_id} has been full for more than ${settings.COLLECTION_OVERDUE_HOURS}h`,
            bin_id: bin.id,
          });
        }

        return iot.jsonResponse({
          success: true,
          binsOffline: staleBins?.length ?? 0,
          vehiclesOffline: staleVehicles?.length ?? 0,
          overdue: overdueBins?.length ?? 0,
        });
      },
    },
  },
});
