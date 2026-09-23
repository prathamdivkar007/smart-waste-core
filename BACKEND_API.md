# Smart Waste Backend — API reference

Backend only: database, device APIs, auth, realtime. No frontend.

## Device (ESP32) endpoints — public prefix, device-credential authenticated

Every request must send both headers:

```
x-device-id: ESP32-BIN-001
x-device-secret: <secret shown once at registration>
```

(`Authorization: Bearer <deviceId>:<secret>` also works.)

### 1. Bin telemetry
`POST /api/public/bins/:binId/telemetry`

```json
{ "fillLevel": 92, "moistureLevel": 78, "metalDetected": true, "batteryVoltage": 3.9, "timestamp": "2026-09-24T10:30:00Z" }
```

Response: `{ "success": true, "message": "Telemetry received", "status": "FULL" }`

Stores immutable history in `bin_telemetry`, updates the `bins` snapshot,
recomputes status from `system_settings` thresholds, opens/resolves
`BIN_FULL`, `BIN_OFFLINE`, `SENSOR_ERROR` alerts, and broadcasts realtime.

### 2. Vehicle GPS
`POST /api/public/vehicles/:vehicleId/location`

```json
{ "latitude": 19.0760, "longitude": 72.8777, "speed": 24.5, "heading": 120, "timestamp": "2026-09-24T10:30:00Z" }
```

Response: `{ "success": true, "message": "GPS location received" }`

### 3. Driver push-button collection
`POST /api/public/vehicles/:vehicleId/collect`

```json
{ "binId": "BIN-001", "latitude": 19.11, "longitude": 72.84, "notes": "optional" }
```

`binId` optional — falls back to the assigned bin, then the nearest bin within 150 m.

### 4. Scheduled sweep (cron only)
`POST /api/public/maintenance/offline-sweep` — Bearer cron secret required.
Marks bins/vehicles OFFLINE past their timeout and raises `COLLECTION_OVERDUE`.

## Dashboard API (signed-in users, RLS enforced)

`src/lib/dashboard.functions.ts`: `listBins`, `getBin`, `getBinTelemetry`,
`listVehicles`, `getVehicleHistory`, `listCollections`, `listAlerts`,
`updateAlertStatus`, `assignVehicleToBin`, `confirmCollection`,
`getSystemSettings`, `updateSystemSetting`, `getDashboardStats`.

`src/lib/devices.functions.ts` (ADMIN only): `listDevices`, `registerDevice`
(returns the device secret once), `rotateDeviceSecret`, `setDeviceActive`.

## Realtime

Live tables: `bins`, `vehicles`, `alerts`, `bin_telemetry`,
`vehicle_locations`, `collections`. Broadcast channels: `bins`, `vehicles`,
`alerts`, `collections`.

## Roles

`user_roles` table with `ADMIN | SUPERVISOR | DRIVER`, checked via the
`has_role()` security-definer function. Profiles are auto-created on signup.

## Configurable thresholds (`system_settings`)

`FULL_THRESHOLD` 90, `NEAR_FULL_THRESHOLD` 60, `BIN_OFFLINE_TIMEOUT` 1800s,
`VEHICLE_OFFLINE_TIMEOUT` 600s, `COLLECTION_OVERDUE_HOURS` 24, `MAX_SPEED_KMH` 120.
