CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "wards read" ON public.wards;
CREATE POLICY "wards read" ON public.wards FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
DROP POLICY IF EXISTS "areas read" ON public.areas;
CREATE POLICY "areas read" ON public.areas FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
DROP POLICY IF EXISTS "bins read" ON public.bins;
CREATE POLICY "bins read" ON public.bins FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
DROP POLICY IF EXISTS "telemetry read" ON public.bin_telemetry;
CREATE POLICY "telemetry read" ON public.bin_telemetry FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
DROP POLICY IF EXISTS "vehicles read" ON public.vehicles;
CREATE POLICY "vehicles read" ON public.vehicles FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
DROP POLICY IF EXISTS "vehicle locations read" ON public.vehicle_locations;
CREATE POLICY "vehicle locations read" ON public.vehicle_locations FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
DROP POLICY IF EXISTS "collections read" ON public.collections;
CREATE POLICY "collections read" ON public.collections FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
DROP POLICY IF EXISTS "alerts read" ON public.alerts;
CREATE POLICY "alerts read" ON public.alerts FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
DROP POLICY IF EXISTS "settings read" ON public.system_settings;
CREATE POLICY "settings read" ON public.system_settings FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));