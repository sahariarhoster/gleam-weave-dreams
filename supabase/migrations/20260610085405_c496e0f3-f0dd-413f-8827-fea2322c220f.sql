
-- Restrict destructive operations on brand-scoped tables to owners, brand creators, and brand_admin members.
-- All brand members (including 'sender') can still SELECT and INSERT, but UPDATE/DELETE require elevated role.

-- Helper predicates inlined per policy.

-- campaigns
DROP POLICY IF EXISTS campaigns_access ON public.campaigns;
CREATE POLICY campaigns_select ON public.campaigns FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY campaigns_insert ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY campaigns_update ON public.campaigns FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY campaigns_delete ON public.campaigns FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));

-- contacts
DROP POLICY IF EXISTS contacts_access ON public.contacts;
CREATE POLICY contacts_select ON public.contacts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY contacts_insert ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY contacts_update ON public.contacts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY contacts_delete ON public.contacts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));

-- contact_groups
DROP POLICY IF EXISTS groups_access ON public.contact_groups;
CREATE POLICY groups_select ON public.contact_groups FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY groups_insert ON public.contact_groups FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY groups_update ON public.contact_groups FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY groups_delete ON public.contact_groups FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));

-- contact_group_members
DROP POLICY IF EXISTS "Brand members manage group members" ON public.contact_group_members;
CREATE POLICY group_members_select ON public.contact_group_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contact_groups g WHERE g.id = contact_group_members.group_id
    AND (has_role(auth.uid(), 'owner'::app_role) OR is_brand_member(g.brand_id, auth.uid()) OR is_brand_owner_of(g.brand_id, auth.uid()))));
CREATE POLICY group_members_write ON public.contact_group_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contact_groups g WHERE g.id = contact_group_members.group_id
    AND (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(g.brand_id, auth.uid()) OR is_brand_owner_of(g.brand_id, auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contact_groups g WHERE g.id = contact_group_members.group_id
    AND (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(g.brand_id, auth.uid()) OR is_brand_owner_of(g.brand_id, auth.uid()))));

-- blocked_numbers
DROP POLICY IF EXISTS blocked_access ON public.blocked_numbers;
CREATE POLICY blocked_select ON public.blocked_numbers FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_member(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY blocked_insert ON public.blocked_numbers FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY blocked_update ON public.blocked_numbers FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY blocked_delete ON public.blocked_numbers FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(brand_id, auth.uid()) OR is_brand_owner_of(brand_id, auth.uid()));

-- campaign_messages
DROP POLICY IF EXISTS campaign_messages_access ON public.campaign_messages;
CREATE POLICY campaign_messages_select ON public.campaign_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_messages.campaign_id
    AND (has_role(auth.uid(), 'owner'::app_role) OR is_brand_member(c.brand_id, auth.uid()) OR is_brand_owner_of(c.brand_id, auth.uid()))));
CREATE POLICY campaign_messages_write ON public.campaign_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_messages.campaign_id
    AND (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(c.brand_id, auth.uid()) OR is_brand_owner_of(c.brand_id, auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_messages.campaign_id
    AND (has_role(auth.uid(), 'owner'::app_role) OR is_brand_admin(c.brand_id, auth.uid()) OR is_brand_owner_of(c.brand_id, auth.uid()))));
