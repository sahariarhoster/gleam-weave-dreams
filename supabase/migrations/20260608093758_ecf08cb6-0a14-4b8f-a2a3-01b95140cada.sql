
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS send_mode text NOT NULL DEFAULT 'safety_basic'
  CHECK (send_mode IN ('direct','safety_basic','safety_max'));
