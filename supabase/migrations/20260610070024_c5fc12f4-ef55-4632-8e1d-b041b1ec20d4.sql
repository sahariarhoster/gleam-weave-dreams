
-- Mirror "owner can do everything" policies for support_agent on the tables
-- support staff need to read/update. Destructive deletes are still gated in app code.

-- devices
CREATE POLICY "devices_support_all" ON public.devices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support_agent'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'support_agent'::public.app_role));

-- brands
CREATE POLICY "brands_support_all" ON public.brands
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support_agent'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'support_agent'::public.app_role));

-- plugin_licenses (read + write, delete still blocked at app layer)
CREATE POLICY "plugin_licenses_support_all" ON public.plugin_licenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support_agent'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'support_agent'::public.app_role));

-- orders
CREATE POLICY "orders_support_all" ON public.orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support_agent'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'support_agent'::public.app_role));

-- coupons
CREATE POLICY "coupons_support_all" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support_agent'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'support_agent'::public.app_role));

-- packages (read; owner still owns writes)
CREATE POLICY "packages_support_read" ON public.packages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'support_agent'::public.app_role));

-- campaign_messages
CREATE POLICY "campaign_messages_support_read" ON public.campaign_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'support_agent'::public.app_role));

-- activity_log
CREATE POLICY "activity_log_support_read" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'support_agent'::public.app_role));

-- device_requests already allows sales_agent; add support_agent for full control
CREATE POLICY "device_requests_support_all" ON public.device_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support_agent'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'support_agent'::public.app_role));

-- system_settings (notify settings for device requests are stored here)
CREATE POLICY "system_settings_support_all" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support_agent'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'support_agent'::public.app_role));
