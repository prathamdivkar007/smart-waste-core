-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('ADMIN','SUPERVISOR','DRIVER');
CREATE TYPE public.bin_status AS ENUM ('NORMAL','NEAR_FULL','FULL','OFFLINE');
CREATE TYPE public.vehicle_status AS ENUM ('AVAILABLE','EN_ROUTE','COLLECTING','OFFLINE');
CREATE TYPE public.alert_type AS ENUM ('BIN_FULL','BIN_OFFLINE','VEHICLE_OFFLINE','GPS_OFFLINE','SENSOR_ERROR','COLLECTION_OVERDUE');
CREATE TYPE public.alert_severity AS ENUM ('INFO','WARNING','CRITICAL');
CREATE TYPE public.alert_status AS ENUM ('OPEN','ACKNOWLEDGED','RESOLVED');
CREATE TYPE public.device_type AS ENUM ('BIN','VEHICLE');

-- ============ UTIL ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES (users) ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('ADMIN','SUPERVISOR'));
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'ADMIN'));

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ WARDS / AREAS ============
CREATE TABLE public.wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_code text NOT NULL UNIQUE,
  name text NOT NULL,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wards TO authenticated;
GRANT ALL ON public.wards TO service_role;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wards read" ON public.wards FOR SELECT TO authenticated USING (true);
CREATE POLICY "wards admin write" ON public.wards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));
GRANT INSERT, UPDATE, DELETE ON public.wards TO authenticated;
CREATE TRIGGER wards_updated BEFORE UPDATE ON public.wards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_code text NOT NULL UNIQUE,
  name text NOT NULL,
  ward_id uuid REFERENCES public.wards(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated;
GRANT ALL ON public.areas TO service_role;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "areas read" ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "areas admin write" ON public.areas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));
CREATE TRIGGER areas_updated BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ VEHICLES ============
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id text NOT NULL UNIQUE,
  driver_name text,
  driver_phone text,
  driver_user_id uuid,
  status public.vehicle_status NOT NULL DEFAULT 'OFFLINE',
  latitude double precision,
  longitude double precision,
  speed double precision,
  heading double precision,
  assigned_bin_id uuid,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles read" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicles staff write" ON public.vehicles FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER vehicles_updated BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BINS ============
CREATE TABLE public.bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bin_id text NOT NULL UNIQUE,
  label text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  ward_id uuid REFERENCES public.wards(id) ON DELETE SET NULL,
  latitude double precision,
  longitude double precision,
  fill_level numeric(5,2) NOT NULL DEFAULT 0 CHECK (fill_level >= 0 AND fill_level <= 100),
  moisture_level numeric(5,2) CHECK (moisture_level IS NULL OR (moisture_level >= 0 AND moisture_level <= 100)),
  metal_detected boolean NOT NULL DEFAULT false,
  battery_voltage numeric(5,2),
  status public.bin_status NOT NULL DEFAULT 'OFFLINE',
  assigned_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  last_collection_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bins TO authenticated;
GRANT ALL ON public.bins TO service_role;
ALTER TABLE public.bins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bins read" ON public.bins FOR SELECT TO authenticated USING (true);
CREATE POLICY "bins staff write" ON public.bins FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER bins_updated BEFORE UPDATE ON public.bins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_assigned_bin_fk FOREIGN KEY (assigned_bin_id) REFERENCES public.bins(id) ON DELETE SET NULL;

-- ============ TELEMETRY ============
CREATE TABLE public.bin_telemetry (
  id bigserial PRIMARY KEY,
  bin_id uuid NOT NULL REFERENCES public.bins(id) ON DELETE CASCADE,
  bin_code text NOT NULL,
  fill_level numeric(5,2) NOT NULL,
  moisture_level numeric(5,2),
  metal_detected boolean NOT NULL DEFAULT false,
  battery_voltage numeric(5,2),
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bin_telemetry_bin_time_idx ON public.bin_telemetry (bin_id, timestamp DESC);
GRANT SELECT ON public.bin_telemetry TO authenticated;
GRANT ALL ON public.bin_telemetry TO service_role;
ALTER TABLE public.bin_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telemetry read" ON public.bin_telemetry FOR SELECT TO authenticated USING (true);

-- ============ VEHICLE LOCATIONS ============
CREATE TABLE public.vehicle_locations (
  id bigserial PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_code text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed double precision,
  heading double precision,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_locations_vehicle_time_idx ON public.vehicle_locations (vehicle_id, timestamp DESC);
GRANT SELECT ON public.vehicle_locations TO authenticated;
GRANT ALL ON public.vehicle_locations TO service_role;
ALTER TABLE public.vehicle_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle locations read" ON public.vehicle_locations FOR SELECT TO authenticated USING (true);

-- ============ COLLECTIONS ============
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bin_id uuid REFERENCES public.bins(id) ON DELETE SET NULL,
  bin_code text,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_code text,
  driver_name text,
  collection_time timestamptz NOT NULL DEFAULT now(),
  previous_status public.bin_status,
  new_status public.bin_status,
  confirmation_method text NOT NULL DEFAULT 'BUTTON',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collections_time_idx ON public.collections (collection_time DESC);
GRANT SELECT, INSERT ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections read" ON public.collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "collections staff insert" ON public.collections FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'DRIVER'));

-- ============ ALERTS ============
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.alert_type NOT NULL,
  severity public.alert_severity NOT NULL DEFAULT 'WARNING',
  bin_id uuid REFERENCES public.bins(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  message text NOT NULL,
  status public.alert_status NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX alerts_status_idx ON public.alerts (status, created_at DESC);
CREATE UNIQUE INDEX alerts_open_bin_type_idx ON public.alerts (bin_id, type) WHERE status = 'OPEN' AND bin_id IS NOT NULL;
CREATE UNIQUE INDEX alerts_open_vehicle_type_idx ON public.alerts (vehicle_id, type) WHERE status = 'OPEN' AND vehicle_id IS NOT NULL;
GRANT SELECT, UPDATE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts read" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "alerts staff update" ON public.alerts FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ DEVICES ============
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  device_type public.device_type NOT NULL,
  bin_id uuid REFERENCES public.bins(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  device_secret_hash text NOT NULL,
  firmware_version text,
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT devices_target_chk CHECK (
    (device_type = 'BIN' AND bin_id IS NOT NULL AND vehicle_id IS NULL) OR
    (device_type = 'VEHICLE' AND vehicle_id IS NOT NULL AND bin_id IS NULL)
  )
);
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.devices TO authenticated;
CREATE POLICY "devices admin read" ON public.devices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN'));

-- ============ SYSTEM SETTINGS ============
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin write" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.system_settings (key, value, description) VALUES
  ('FULL_THRESHOLD', '90'::jsonb, 'Fill level percent at or above which a bin is FULL'),
  ('NEAR_FULL_THRESHOLD', '60'::jsonb, 'Fill level percent at or above which a bin is NEAR_FULL'),
  ('BIN_OFFLINE_TIMEOUT', '1800'::jsonb, 'Seconds without telemetry before a bin is OFFLINE'),
  ('VEHICLE_OFFLINE_TIMEOUT', '600'::jsonb, 'Seconds without GPS before a vehicle is OFFLINE'),
  ('COLLECTION_OVERDUE_HOURS', '24'::jsonb, 'Hours a bin may stay FULL before COLLECTION_OVERDUE'),
  ('MAX_SPEED_KMH', '120'::jsonb, 'Maximum plausible vehicle speed accepted from GPS');

-- ============ REALTIME ============
ALTER TABLE public.bins REPLICA IDENTITY FULL;
ALTER TABLE public.vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER TABLE public.bin_telemetry REPLICA IDENTITY FULL;
ALTER TABLE public.vehicle_locations REPLICA IDENTITY FULL;
ALTER TABLE public.collections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bin_telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;