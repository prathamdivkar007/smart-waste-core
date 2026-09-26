GRANT INSERT, DELETE ON public.user_roles TO authenticated;
CREATE POLICY "admin insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "admin delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::app_role));