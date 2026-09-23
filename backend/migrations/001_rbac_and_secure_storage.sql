-- ==============================================================================
-- 001 · Role-based access control and private document storage
-- Smart India Hackathon 2026 • Problem Statement 26018
--
-- Paste this whole file into the Supabase SQL editor and run it once.
-- It is idempotent: every statement either uses IF NOT EXISTS or drops before
-- creating, so running it twice is harmless.
--
-- WHAT THIS CHANGES, AND WHY IT LOCKS THINGS DOWN
-- Until now every policy ended in `OR auth.role() = 'anon'`, which means an
-- unauthenticated caller could read and write every land record, and the
-- document bucket was public, so any scanned 7/12 could be fetched by URL by
-- anyone who had it. Both are removed here.
--
-- AFTER RUNNING THIS, NOBODY CAN SIGN IN UNTIL TWO USERS EXIST.
-- That is deliberate — the app used to fabricate a user when auth failed.
-- See the bottom of this file for the two-minute account setup.
-- ==============================================================================


-- ------------------------------------------------------------------ 0. Catch-up
-- Columns added by earlier work that may not have been applied yet. Harmless
-- if they are already there.
ALTER TABLE public.land_records ADD COLUMN IF NOT EXISTS data_source TEXT;
ALTER TABLE public.land_records ADD COLUMN IF NOT EXISTS ocr_extracted_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.land_records ADD COLUMN IF NOT EXISTS validation_flags JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.reference_records (
    id SERIAL PRIMARY KEY,
    state TEXT NOT NULL,
    district TEXT,
    tehsil TEXT,
    village TEXT NOT NULL,
    survey_number TEXT NOT NULL,
    khasra_number TEXT,
    khata_number TEXT,
    owner_name TEXT,
    area NUMERIC,
    area_unit TEXT,
    land_classification TEXT,
    source TEXT DEFAULT 'RoR master 2024',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS reference_records_lookup_idx
    ON public.reference_records (village, survey_number);


-- ------------------------------------------------------- 1. is_officer() helper
-- SECURITY DEFINER on purpose. A policy on profiles that queries profiles would
-- recurse; running this as the definer bypasses RLS for the lookup and breaks
-- the cycle. search_path is pinned so the function cannot be hijacked by a
-- caller-supplied schema.
CREATE OR REPLACE FUNCTION public.is_officer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'OFFICER'
    );
$$;

REVOKE ALL ON FUNCTION public.is_officer() FROM public;
GRANT EXECUTE ON FUNCTION public.is_officer() TO authenticated, anon, service_role;


-- --------------------------------------------- 2. Signup always yields CITIZEN
-- raw_user_meta_data is supplied by whoever calls signUp, so a citizen could
-- previously hand themselves role='OFFICER' at registration. Role is no longer
-- read from it at all; officers are promoted deliberately (see bottom).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name, phone_number, designation, employee_id, district, tehsil)
    VALUES (
        new.id,
        'CITIZEN',
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'phone_number',
        NULL,
        NULL,
        new.raw_user_meta_data->>'district',
        new.raw_user_meta_data->>'tehsil'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name;   -- never role
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------------ 3. Enable RLS
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_records ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------- 4. Policies
-- profiles ---------------------------------------------------------------
-- RLS was enabled on profiles with no policy at all, which denied every read
-- and is why the app had been reading role out of user_metadata. A user must
-- be able to read their own row for the app to know who they are.
DROP POLICY IF EXISTS "Users read own profile, officers read all" ON public.profiles;
CREATE POLICY "Users read own profile, officers read all"
ON public.profiles FOR SELECT
USING (id = auth.uid() OR public.is_officer());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- land_records -----------------------------------------------------------
DROP POLICY IF EXISTS "Citizens view own records, Officers view all" ON public.land_records;
CREATE POLICY "Citizens view own records, Officers view all"
ON public.land_records FOR SELECT
USING (created_by = auth.uid() OR public.is_officer());

DROP POLICY IF EXISTS "Citizens can insert their own records" ON public.land_records;
CREATE POLICY "Citizens can insert their own records"
ON public.land_records FOR INSERT
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Officers can update verification status & remarks" ON public.land_records;
CREATE POLICY "Officers can update verification status & remarks"
ON public.land_records FOR UPDATE
USING (public.is_officer())
WITH CHECK (public.is_officer());

-- audit_logs -------------------------------------------------------------
-- The trail was world-readable. A citizen may see the history of their own
-- records; an officer sees everything.
DROP POLICY IF EXISTS "Public read audit logs for verification" ON public.audit_logs;
DROP POLICY IF EXISTS "Officers read all audit logs, citizens read their own" ON public.audit_logs;
CREATE POLICY "Officers read all audit logs, citizens read their own"
ON public.audit_logs FOR SELECT
USING (
    public.is_officer()
    OR EXISTS (
        SELECT 1 FROM public.land_records lr
        WHERE lr.id = audit_logs.record_id AND lr.created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS "Allow system insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users append audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users append audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- reference_records ------------------------------------------------------
DROP POLICY IF EXISTS "Anyone may read the reference master" ON public.reference_records;
DROP POLICY IF EXISTS "Authenticated users read the reference master" ON public.reference_records;
CREATE POLICY "Authenticated users read the reference master"
ON public.reference_records FOR SELECT
USING (auth.role() = 'authenticated');


-- ------------------------------------------------- 5. Private document storage
-- The bucket was created with public = true, so every uploaded land document
-- was fetchable by anyone with the URL and no token at all. Reads now go
-- through short-lived signed URLs issued by the backend.
UPDATE storage.buckets SET public = false WHERE id = 'land-record-documents';

DROP POLICY IF EXISTS "Users access own document folder, Officers access all" ON storage.objects;
CREATE POLICY "Users access own document folder, Officers access all"
ON storage.objects FOR ALL
USING (
    bucket_id = 'land-record-documents'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_officer()
    )
)
WITH CHECK (
    bucket_id = 'land-record-documents'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_officer()
    )
);


-- ==============================================================================
-- 6. ACCOUNT SETUP — REQUIRED, OR NOBODY CAN LOG IN
--
-- Creating an auth user cannot be done properly in SQL (passwords are hashed by
-- the Auth service), so use one of these two routes.
--
-- ROUTE A — dashboard, no service-role key needed:
--   1. Authentication -> Users -> Add user -> Create new user.
--      Tick "Auto Confirm User" for both.
--        officer:  officer@dolr.gov.in   / <choose a password>
--        citizen:  citizen@example.in    / <choose a password>
--   2. Come back here and run the promote block below, with the officer's email.
--
-- ROUTE B — from the repo, needs SUPABASE_SERVICE_ROLE_KEY in backend/.env:
--        python scripts/seed_officer.py
--      That creates both accounts and sets the officer profile in one step;
--      no SQL needed for this section.
-- ==============================================================================

-- Promote block for ROUTE A. Edit the email, then run.
UPDATE public.profiles p
SET role        = 'OFFICER',
    full_name   = 'Shri Vikramaditya Joshi',
    designation = 'Sub-Divisional Revenue Officer (SDO)',
    employee_id = 'REV-MH-PN-4091',
    district    = 'Pune',
    tehsil      = 'Haveli'
FROM auth.users u
WHERE u.id = p.id
  AND u.email = 'officer@dolr.gov.in';   -- <-- change to your officer's email

-- Check it worked. Expect exactly one OFFICER row.
SELECT u.email, p.role, p.full_name, p.district, p.tehsil
FROM public.profiles p JOIN auth.users u ON u.id = p.id
ORDER BY p.role;
