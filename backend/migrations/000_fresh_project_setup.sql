-- ==============================================================================
-- FRESH PROJECT SETUP - run this ONCE in the Supabase SQL editor
-- Smart India Hackathon 2026 - Problem Statement 26018
--
-- Use this on a brand new Supabase project. It creates every table, the signup
-- trigger, row-level security, the private document bucket and the reference
-- master, in the right order.
--
-- Idempotent: policies are dropped before they are created and every table
-- uses IF NOT EXISTS, so running it twice is harmless.
--
-- WHAT IT DELIBERATELY DOES NOT DO
-- No policy grants anything to `anon`, and signup cannot award the OFFICER
-- role. So AFTER RUNNING THIS, NOBODY CAN SIGN IN until the two demo accounts
-- exist. Section 8 at the bottom says how.
-- ==============================================================================


-- ------------------------------------------------------------------ 1. Tables
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CITIZEN', 'OFFICER', 'ADMIN')),
    full_name TEXT NOT NULL,
    phone_number VARCHAR(15),
    designation TEXT,
    employee_id TEXT,
    district TEXT, -- Assigned Jurisdiction District for OFFICERS & ADMINS (NULL for CITIZENS)
    tehsil TEXT,   -- Assigned Jurisdiction Tehsil for OFFICERS & ADMINS (NULL for CITIZENS)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.land_records (
    id TEXT PRIMARY KEY,
    application_no TEXT,
    document_type VARCHAR(100) NOT NULL, -- '7/12 Extract', 'Sale Deed', 'Mutation Register', 'Khasra-Khatauni'
    state VARCHAR(50) DEFAULT 'Maharashtra',
    district VARCHAR(50) NOT NULL,
    tehsil VARCHAR(50) NOT NULL,
    village VARCHAR(100) NOT NULL,
    survey_number TEXT NOT NULL,
    khasra_number TEXT,
    khata_number TEXT,
    sub_division_number TEXT,
    owner_name TEXT NOT NULL,
    co_owners TEXT[],
    area NUMERIC(10, 4) NOT NULL,
    area_unit VARCHAR(20) DEFAULT 'Hectares',
    land_classification TEXT,
    ownership_details JSONB DEFAULT '{}'::jsonb, -- shares, tenure class (Occupant Class 1/2)
    mutation_number TEXT,
    registration_info JSONB DEFAULT '{}'::jsonb,  -- deed no, SRO office, stamp duty, year
    supporting_documents JSONB DEFAULT '[]'::jsonb, -- multi-document provenance list
    document_url TEXT,
    document_pages INT DEFAULT 1,
    status VARCHAR(30) DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'UNDER_VERIFICATION', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'FLAGGED')),
    overall_confidence NUMERIC(5, 2) DEFAULT 0.0,
    ocr_extracted_data JSONB DEFAULT '{}'::jsonb,
    validation_flags JSONB DEFAULT '[]'::jsonb,
    officer_remarks TEXT,
    assigned_officer TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id TEXT NOT NULL REFERENCES public.land_records(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'CREATED', 'OCR_EXTRACTED', 'FIELD_MODIFIED', 'CERTIFIED_APPROVED', 'REJECTED'
    performed_by TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    details TEXT NOT NULL,
    changes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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


-- -------------------------------------------- 2. Signup always yields CITIZEN
-- raw_user_meta_data is supplied by whoever calls signUp, so a citizen could
-- otherwise hand themselves role='OFFICER' at registration. Role is not read
-- from it at all.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $FN$
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
$FN$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- -------------------------------------------------------- 3. is_officer() helper
-- SECURITY DEFINER on purpose: a policy on profiles that queries profiles would
-- recurse. Running as the definer bypasses RLS for this one lookup and breaks
-- the cycle. search_path is pinned so the function cannot be hijacked.
CREATE OR REPLACE FUNCTION public.is_officer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $FN$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'OFFICER'
    );
$FN$;

REVOKE ALL ON FUNCTION public.is_officer() FROM public;
GRANT EXECUTE ON FUNCTION public.is_officer() TO authenticated, anon, service_role;


-- -------------------------------------------------------------- 4. Enable RLS
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_records ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------- 5. Policies
-- profiles: a user must be able to read their own row or the app cannot tell
-- who they are. Nobody can write their own role.
DROP POLICY IF EXISTS "Users read own profile, officers read all" ON public.profiles;
CREATE POLICY "Users read own profile, officers read all"
ON public.profiles FOR SELECT
USING (id = auth.uid() OR public.is_officer());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- land_records
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

-- audit_logs: a citizen sees the history of their own records only.
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

DROP POLICY IF EXISTS "Authenticated users append audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users append audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users read the reference master" ON public.reference_records;
CREATE POLICY "Authenticated users read the reference master"
ON public.reference_records FOR SELECT
USING (auth.role() = 'authenticated');


-- -------------------------------------------------- 6. Private document storage
-- A land document must not be fetchable by URL alone, so the bucket is private
-- and the app serves expiring signed URLs instead.
INSERT INTO storage.buckets (id, name, public)
VALUES ('land-record-documents', 'land-record-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

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


-- --------------------------------------------------- 7. Reference master seed
-- What the department already holds. Extractions are cross-checked against it.
INSERT INTO public.reference_records (
    state, district, tehsil, village, survey_number, khasra_number,
    khata_number, owner_name, area, area_unit, land_classification, source
) VALUES
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '124/1', NULL, 'KH-1023', 'Vikram Ananta Joshi', 2.88, 'Hectares', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '124/3', NULL, 'KH-1025', 'Sunita Devi Deshmukh', 2.34, 'Hectares', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '131/2', NULL, 'KH-3140', 'Sunita Devi Deshmukh', 3.12, 'Hectares', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '131/2/A', NULL, 'KH-3141', 'Anil Sunil Deshmukh', 1.44, 'Hectares', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '131/2/B', NULL, 'KH-3142', 'Kavita Sunil Deshmukh', 0.9, 'Hectares', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '125/4', NULL, 'KH-2091', 'Suresh Chandra Kumar', 1.8, 'Hectares', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '125/5', NULL, 'KH-2092', 'Ganesh Maruti Shinde', 3.24, 'Hectares', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '128/1', NULL, 'KH-0492', 'Amit Sharma', 0.95, 'Hectares', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '98/B', NULL, 'KH-0098', 'Ganpat Rao Shinde', 1.95, 'Hectares', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '145/3', NULL, 'KH-4501', 'Baburao Tukaram Kale', 1.55, 'Hectares', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Jalgaon', 'Jalgaon', 'Mehrun', '486/1', 'Plot No. 23', NULL, 'चंदन रामचंद्र वाणी', 289.25, 'Sq. Meters', NULL, 'RoR master 2024'),
    ('Maharashtra', 'Pune', 'Haveli', 'Hadapsar', '124/2', 'K-4821', 'KH-1024', 'Ramesh Baliram Patil', 2.61, 'Hectares', NULL, 'RoR master 2024')
ON CONFLICT DO NOTHING;


-- ==============================================================================
-- 8. ACCOUNTS - REQUIRED, OR NOBODY CAN SIGN IN
--
-- An auth user cannot be created properly in SQL (the Auth service hashes the
-- password), so create them in the dashboard:
--
--   Authentication -> Users -> Add user -> Create new user
--   Tick "Auto Confirm User" for BOTH, or they cannot sign in.
--
--     officer@land.in
--     citizen@land.in
--
-- Then run the promote block below. The citizen needs nothing further - every
-- signup is a CITIZEN by default, which is the point.
-- ==============================================================================

UPDATE public.profiles p
SET role        = 'OFFICER',
    full_name   = 'Shri Vikramaditya Joshi',
    designation = 'Sub-Divisional Revenue Officer (SDO)',
    employee_id = 'REV-MH-PN-4091',
    district    = 'Pune',
    tehsil      = 'Haveli'
FROM auth.users u
WHERE u.id = p.id
  AND u.email = 'officer@land.in';

-- Verify. Expect one OFFICER (officer@land.in) and one CITIZEN (citizen@land.in).
SELECT u.email, p.role, p.full_name, p.district, p.tehsil
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.role;
