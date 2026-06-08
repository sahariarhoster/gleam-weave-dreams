
-- Helper: is the user the owner (created_by) of this brand
CREATE OR REPLACE FUNCTION public.is_brand_owner_of(_brand_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.brands WHERE id = _brand_id AND created_by = _user_id);
$$;

-- BRANDS
DROP POLICY IF EXISTS brands_select ON public.brands;
CREATE POLICY brands_select ON public.brands FOR SELECT
  USING (has_role(auth.uid(),'owner') OR is_brand_member(id, auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS brands_brand_owner_modify ON public.brands;
CREATE POLICY brands_brand_owner_modify ON public.brands FOR ALL
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- DEVICES
DROP POLICY IF EXISTS devices_select ON public.devices;
CREATE POLICY devices_select ON public.devices FOR SELECT
  USING (has_role(auth.uid(),'owner')
      OR (brand_id IS NOT NULL AND (is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()))));

DROP POLICY IF EXISTS devices_brand_owner_modify ON public.devices;
CREATE POLICY devices_brand_owner_modify ON public.devices FOR ALL
  USING (brand_id IS NOT NULL AND is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (brand_id IS NOT NULL AND is_brand_owner_of(brand_id, auth.uid()));

-- CONTACTS
DROP POLICY IF EXISTS "Brand members manage contacts" ON public.contacts;
CREATE POLICY contacts_access ON public.contacts FOR ALL
  USING (has_role(auth.uid(),'owner') OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (has_role(auth.uid(),'owner') OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));

-- CONTACT GROUPS
DROP POLICY IF EXISTS "Brand members manage groups" ON public.contact_groups;
CREATE POLICY groups_access ON public.contact_groups FOR ALL
  USING (has_role(auth.uid(),'owner') OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (has_role(auth.uid(),'owner') OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));

-- CAMPAIGNS
DROP POLICY IF EXISTS "Brand members manage campaigns" ON public.campaigns;
CREATE POLICY campaigns_access ON public.campaigns FOR ALL
  USING (has_role(auth.uid(),'owner') OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (has_role(auth.uid(),'owner') OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));

-- BLOCKED NUMBERS
DROP POLICY IF EXISTS "Brand members manage blocked" ON public.blocked_numbers;
CREATE POLICY blocked_access ON public.blocked_numbers FOR ALL
  USING (has_role(auth.uid(),'owner') OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (has_role(auth.uid(),'owner') OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));

-- BRAND MEMBERS: brand owners manage members of their brands
DROP POLICY IF EXISTS brand_members_brand_owner_all ON public.brand_members;
CREATE POLICY brand_members_brand_owner_all ON public.brand_members FOR ALL
  USING (is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (is_brand_owner_of(brand_id, auth.uid()));

DROP POLICY IF EXISTS brand_members_select ON public.brand_members;
CREATE POLICY brand_members_select ON public.brand_members FOR SELECT
  USING (has_role(auth.uid(),'owner') OR user_id = auth.uid()
         OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
