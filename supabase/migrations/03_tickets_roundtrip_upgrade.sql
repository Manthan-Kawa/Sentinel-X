-- =============================================================================
-- Sentinel-X Migration 03: Ticket Roundtrip & Full Lifecycle Upgrade
-- Enables bidirectional communication: User Request -> Analyst -> User -> Resolution
-- Run this in your Supabase SQL Editor if you already ran Migration 02.
-- =============================================================================

-- 1. Relax status check constraint to allow 'in_review', 'analyzed', 'resolved', 'closed'
ALTER TABLE public.user_tickets DROP CONSTRAINT IF EXISTS user_tickets_status_check;
ALTER TABLE public.user_tickets ADD CONSTRAINT user_tickets_status_check 
    CHECK (status IN ('pending', 'in_review', 'analyzed', 'resolved', 'closed'));

-- 2. Add columns for user request enrichment
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS threat_category text DEFAULT 'phishing';
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS did_interact jsonb DEFAULT '{}'::jsonb;

-- 3. Add columns for analyst response & remediation guidance
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS assigned_analyst text DEFAULT 'sentinelx.analyst@gmail.com';
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS verdict text;
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS threat_score integer;
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS recommended_action text;
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS remediation_taken text;

-- 4. Add columns for user resolution, acknowledgement, and rating
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS user_acknowledged boolean DEFAULT false;
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS user_feedback text DEFAULT '';
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS user_rating integer DEFAULT 0;
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- 5. Add column for threaded conversation messages
ALTER TABLE public.user_tickets ADD COLUMN IF NOT EXISTS thread_messages jsonb DEFAULT '[]'::jsonb;

-- 6. Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_tickets_status ON public.user_tickets(status);
CREATE INDEX IF NOT EXISTS idx_user_tickets_priority ON public.user_tickets(priority);
