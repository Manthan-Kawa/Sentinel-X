-- ============================================================================
-- SENTINEL-X: MODULE 1 - AUTOMATED EMAIL INGESTION & THREAT ANALYSIS
-- PostgreSQL / Supabase Migration Schema
-- ============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Table: user_emails
-- Stores raw and parsed incoming email data ingested from Gmail
create table if not exists public.user_emails (
    id uuid primary key default uuid_generate_v4(),
    user_email text not null,
    gmail_message_id text not null,
    thread_id text,
    sender text not null,
    sender_name text,
    recipient text not null,
    subject text not null,
    snippet text,
    body_text text,
    body_html text,
    headers jsonb default '{}'::jsonb,
    extracted_urls text[] default array[]::text[],
    is_read boolean default false,
    received_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint uq_user_gmail_msg unique (user_email, gmail_message_id)
);

-- 2. Table: email_threat_analyses
-- Stores automated Gemini AI triage evaluation and threat scoring
create table if not exists public.email_threat_analyses (
    id uuid primary key default uuid_generate_v4(),
    email_id uuid not null references public.user_emails(id) on delete cascade,
    threat_level text not null check (threat_level in ('clean', 'suspicious', 'malicious')),
    threat_score integer not null check (threat_score >= 0 and threat_score <= 100),
    confidence integer not null check (confidence >= 0 and confidence <= 100),
    summary text not null,
    indicators jsonb default '[]'::jsonb,
    recommended_action text,
    model_used text not null default 'gemini-1.5-flash',
    is_reviewed boolean default false,
    escalated_to_soc boolean default false,
    analyzed_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint uq_analysis_email unique (email_id)
);

-- 3. Table: email_sync_states
-- Tracks mailbox sync watermarks, history IDs, and scheduled poller status
create table if not exists public.email_sync_states (
    id uuid primary key default uuid_generate_v4(),
    user_email text not null unique,
    history_id text,
    last_synced_at timestamptz not null default now(),
    sync_status text not null default 'idle' check (sync_status in ('idle', 'syncing', 'error')),
    last_error text,
    total_emails_synced integer default 0,
    updated_at timestamptz not null default now()
);

-- 4. Indexes for rapid querying and filtering
create index if not exists idx_user_emails_user on public.user_emails(user_email);
create index if not exists idx_user_emails_received on public.user_emails(received_at desc);
create index if not exists idx_user_emails_sender on public.user_emails(sender);
create index if not exists idx_email_analyses_level on public.email_threat_analyses(threat_level);
create index if not exists idx_email_analyses_score on public.email_threat_analyses(threat_score desc);

-- 5. Row Level Security (RLS)
alter table public.user_emails enable row level security;
alter table public.email_threat_analyses enable row level security;
alter table public.email_sync_states enable row level security;

-- Policy: Users can only read their own ingested emails
create policy "Users can view own emails"
    on public.user_emails for select
    using (auth.jwt() ->> 'email' = user_email);

-- Policy: Users can view threat analyses of their own emails
create policy "Users can view own email analyses"
    on public.email_threat_analyses for select
    using (
        exists (
            select 1 from public.user_emails
            where public.user_emails.id = public.email_threat_analyses.email_id
            and public.user_emails.user_email = auth.jwt() ->> 'email'
        )
    );

-- Policy: Users can view own sync states
create policy "Users can view own sync states"
    on public.email_sync_states for select
    using (auth.jwt() ->> 'email' = user_email);
