
DROP POLICY IF EXISTS "Brand members read/write messages" ON public.campaign_messages;
CREATE POLICY campaign_messages_access ON public.campaign_messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_messages.campaign_id
      AND (has_role(auth.uid(),'owner')
           OR is_brand_member(c.brand_id, auth.uid())
           OR is_brand_owner_of(c.brand_id, auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_messages.campaign_id
      AND (has_role(auth.uid(),'owner')
           OR is_brand_member(c.brand_id, auth.uid())
           OR is_brand_owner_of(c.brand_id, auth.uid()))
  ));
