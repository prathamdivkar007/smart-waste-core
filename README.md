# Smart Waste Core

Build ONLY the backend, database, REST APIs, authentication, realtime functionality and hardware integration layer for my project.

IMPORTANT:

DO NOT build any frontend.

DO NOT create React pages.

DO NOT create dashboard UI.

DO NOT create CSS or visual components.

DO NOT spend credits on frontend design.

This backend will later be connected to a separately developed React dashboard.

Focus entirely on Supabase PostgreSQL, Edge Functions/API endpoints, authentication, database logic, realtime updates, validation and IoT hardware communication.

PROJECT NAME:
Smart Waste Segregation & Collection Monitoring System for Urban Local Bodies

==================================================

PROJECT OVERVIEW
==================================================

The system has two physical units:

A) SMART DUSTBIN

Hardware:

ESP32

Ultrasonic sensor → measures fill level

Capacitive moisture sensor → measures moisture/wetness

Inductive metal sensor → detects metallic waste

The ESP32 will send sensor data to the backend through Wi-Fi/Internet.

B) GARBAGE COLLECTION VEHICLE

Hardware:

ESP32

NEO-6M GPS → latitude, longitude, speed, heading

SIM300 GSM/GPRS → internet communication

Push button → driver can confirm garbage collection

The vehicle continuously sends GPS data to the backend.

The backend must store, process and distribute this information to a future React dashboard.

==================================================
2. REQUIRED ARCHITECTURE

Smart Bin:

Ultrasonic Sensor
↓
Moisture Sensor
↓
Inductive Metal Sensor
↓
ESP32
↓
Wi-Fi
↓
Supabase API / Edge Function
↓
PostgreSQL
↓
Supabase Realtime
↓
Future React Dashboard

Vehicle:

NEO-6M GPS
↓
ESP32
↓
SIM300 GPRS
↓
Internet
↓
Supabase API / Edge Function
↓
PostgreSQL
↓
Supabase Realtime
↓
Future React Dashboard

==================================================
3. DATABASE

Use Supabase PostgreSQL.

Create proper SQL migrations and tables.

Required tables:

users

bins

bin_telemetry

vehicles

vehicle_locations

collections

alerts

areas

wards

devices

system_settings

USERS

Fields:

id
name
email
role
created_at
updated_at

Roles:

ADMIN
SUPERVISOR
DRIVER

Use Supabase Auth for authentication.

Do not store plaintext passwords.

BINS

Fields:

id
bin_id
area_id
ward_id
latitude
longitude
fill_level
moisture_level
metal_detected
status
assigned_vehicle_id
last_collection_at
last_seen_at
created_at
updated_at

Bin status:

NORMAL
NEAR_FULL
FULL
OFFLINE

BIN TELEMETRY

Fields:

id
bin_id
fill_level
moisture_level
metal_detected
battery_voltage
timestamp
created_at

Every sensor reading received from ESP32 must be stored here.

Do not overwrite historical telemetry.

VEHICLES

Fields:

id
vehicle_id
driver_name
driver_phone
status
latitude
longitude
speed
heading
assigned_bin_id
last_seen_at
created_at
updated_at

Vehicle status:

AVAILABLE
EN_ROUTE
COLLECTING
OFFLINE

VEHICLE LOCATIONS

Fields:

id
vehicle_id
latitude
longitude
speed
heading
timestamp

Store GPS history.

This will later allow the frontend to display the vehicle route/history.

COLLECTIONS

Fields:

id
bin_id
vehicle_id
driver_name
collection_time
previous_status
new_status
confirmation_method
notes
created_at

ALERTS

Fields:

id
type
severity
bin_id
vehicle_id
message
status
created_at
resolved_at

Alert types:

BIN_FULL
BIN_OFFLINE
VEHICLE_OFFLINE
GPS_OFFLINE
SENSOR_ERROR
COLLECTION_OVERDUE

DEVICES

Fields:

id
device_id
device_type
bin_id
vehicle_id
device_secret_hash
active
last_seen_at
created_at

device_type:

BIN
VEHICLE

This table is used to authenticate ESP32 hardware separately from normal users.

SYSTEM SETTINGS

Store configurable values such as:

FULL_THRESHOLD = 90
NEAR_FULL_THRESHOLD = 60
BIN_OFFLINE_TIMEOUT
VEHICLE_OFFLINE_TIMEOUT

Do NOT hardcode these permanently.

==================================================
4. SMART BIN API

Create an authenticated endpoint:

POST /api/bins/:binId/telemetry

Example:

POST /api/bins/BIN-001/telemetry

Request:

{
"fillLevel": 92,
"moistureLevel": 78,
"metalDetected": true,
"batteryVoltage": 3.9,
"timestamp": "2026-09-24T10:30:00Z"
}

The backend must:

Authenticate the ESP32 device.

Verify that the device is registered.

Verify that the Bin ID belongs to the device.

Validate all values.

Store telemetry.

Update current bin values.

Update last_seen_at.

Calculate bin status.

Generate alerts if necessary.

Broadcast a realtime update.

Return a small ESP32-friendly response:

{
"success": true,
"message": "Telemetry received",
"status": "FULL"
}

==================================================
5. BIN STATUS LOGIC

Use system_settings values.

Default:

fillLevel < 60
→ NORMAL

60 <= fillLevel < 90
→ NEAR_FULL

fillLevel >= 90
→ FULL

When FULL:

bins.status = FULL

create BIN_FULL alert

collection is required

publish realtime BIN_FULL event

The backend must NOT assume that moisture or metal detection alone determines the waste category.

Store these values as:

moisture_level
metal_detected

They are sensor observations.

==================================================
6. VEHICLE GPS API

Create:

POST /api/vehicles/:vehicleId/location

Example:

{
"latitude": 19.0760,
"longitude": 72.8777,
"speed": 24.5,
"heading": 120,
"timestamp": "2026-09-24T10:30:00Z"
}

Backend must:

Authenticate vehicle device.

Verify vehicle ID.

Validate coordinates.

Validate speed.

Validate heading.

Store GPS history.

Update latest vehicle position.

Update last_seen_at.

Broadcast realtime vehicle location event.

Return:

{
"success": true,
"message": "GPS location received"
}

==================================================
7. VEHICLE LOCATION HISTORY

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fcdd4a6c-077d-466e-9430-f754f49cf1a3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
