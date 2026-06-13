
-- Remove device_requests feature
DROP TABLE IF EXISTS public.device_requests CASCADE;

-- Support tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  subject text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_select" ON public.support_tickets FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'support_agent')
  OR (brand_id IS NOT NULL AND public.is_brand_owner_of(brand_id, auth.uid()))
  OR (brand_id IS NOT NULL AND public.is_brand_member(brand_id, auth.uid()))
);

CREATE POLICY "ticket_insert" ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "ticket_update" ON public.support_tickets FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'support_agent')
);

CREATE POLICY "ticket_delete" ON public.support_tickets FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'support_agent')
);

CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ticket messages
CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_msg_select" ON public.support_ticket_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (
        t.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'owner')
        OR public.has_role(auth.uid(), 'support_agent')
        OR (t.brand_id IS NOT NULL AND public.is_brand_owner_of(t.brand_id, auth.uid()))
        OR (t.brand_id IS NOT NULL AND public.is_brand_member(t.brand_id, auth.uid()))
      )
  )
  AND (
    is_internal = false
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'support_agent')
  )
);

CREATE POLICY "ticket_msg_insert" ON public.support_ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (
        t.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'owner')
        OR public.has_role(auth.uid(), 'support_agent')
        OR (t.brand_id IS NOT NULL AND public.is_brand_owner_of(t.brand_id, auth.uid()))
        OR (t.brand_id IS NOT NULL AND public.is_brand_member(t.brand_id, auth.uid()))
      )
  )
);

CREATE INDEX idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);
CREATE INDEX idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX idx_support_tickets_brand ON public.support_tickets(brand_id);
