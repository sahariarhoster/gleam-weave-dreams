-- ============ CONTACTS ============
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text,
  phone text NOT NULL,
  email text,
  tags text[] DEFAULT '{}',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand members manage contacts" ON public.contacts
  FOR ALL TO authenticated
  USING (public.is_brand_member(brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.is_brand_member(brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_contacts_brand ON public.contacts(brand_id);

-- ============ CONTACT GROUPS ============
CREATE TABLE public.contact_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_groups TO authenticated;
GRANT ALL ON public.contact_groups TO service_role;
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand members manage groups" ON public.contact_groups
  FOR ALL TO authenticated
  USING (public.is_brand_member(brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.is_brand_member(brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER trg_groups_updated_at BEFORE UPDATE ON public.contact_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ GROUP MEMBERS ============
CREATE TABLE public.contact_group_members (
  group_id uuid NOT NULL REFERENCES public.contact_groups(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, contact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_group_members TO authenticated;
GRANT ALL ON public.contact_group_members TO service_role;
ALTER TABLE public.contact_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand members manage group members" ON public.contact_group_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contact_groups g WHERE g.id = group_id AND (public.is_brand_member(g.brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contact_groups g WHERE g.id = group_id AND (public.is_brand_member(g.brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'))));

-- ============ CAMPAIGNS ============
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
  name text NOT NULL,
  message text NOT NULL,
  media_url text,
  status text NOT NULL DEFAULT 'draft', -- draft|scheduled|running|paused|completed|failed
  scheduled_at timestamptz,
  min_delay_seconds int NOT NULL DEFAULT 5,
  max_delay_seconds int NOT NULL DEFAULT 15,
  daily_limit int NOT NULL DEFAULT 500,
  send_window_start time DEFAULT '09:00',
  send_window_end time DEFAULT '21:00',
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand members manage campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING (public.is_brand_member(brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.is_brand_member(brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_campaigns_brand ON public.campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);

-- ============ CAMPAIGN MESSAGES ============
CREATE TABLE public.campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone text NOT NULL,
  rendered_message text NOT NULL,
  status text NOT NULL DEFAULT 'queued', -- queued|sent|delivered|failed|skipped|blocked
  gateway_response jsonb,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_messages TO authenticated;
GRANT ALL ON public.campaign_messages TO service_role;
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand members read/write messages" ON public.campaign_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND (public.is_brand_member(c.brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND (public.is_brand_member(c.brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'))));
CREATE INDEX idx_cmsg_campaign ON public.campaign_messages(campaign_id);
CREATE INDEX idx_cmsg_status ON public.campaign_messages(status);

-- ============ BLOCKED NUMBERS ============
CREATE TABLE public.blocked_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  phone text NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_numbers TO authenticated;
GRANT ALL ON public.blocked_numbers TO service_role;
ALTER TABLE public.blocked_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand members manage blocked" ON public.blocked_numbers
  FOR ALL TO authenticated
  USING (public.is_brand_member(brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.is_brand_member(brand_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'));
