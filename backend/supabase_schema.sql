-- ==============================================================================
-- DEPARTMENT OF LAND RESOURCES (DoLR) - DATABASE SCHEMA
-- Smart India Hackathon 2026 • Problem Statement 26018
-- ==============================================================================

-- 1. Profiles Table (Users: Citizens, Revenue Officers & Admins)
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

-- Automatic Profile Creation Trigger on Supabase Auth User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name, phone_number, designation, employee_id, district, tehsil)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'role', 'CITIZEN'),
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'phone_number',
        new.raw_user_meta_data->>'designation',
        new.raw_user_meta_data->>'employeeId',
        new.raw_user_meta_data->>'district',
        new.raw_user_meta_data->>'tehsil'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        district = EXCLUDED.district,
        tehsil = EXCLUDED.tehsil;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- 2. Land Records Table (Supporting all 12 SIH Fields)
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

-- 3. Immutable Audit Logs Table
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

-- Provenance of the field values on a record: SARVAM_LIVE (read from the
-- document), DEMO_FALLBACK (built-in fixture, no key configured) or MANUAL
-- (typed by the citizen). An officer must be able to see which before certifying.
ALTER TABLE public.land_records ADD COLUMN IF NOT EXISTS data_source TEXT;

-- 3b. Reference Master (read-only government RoR extract used for cross-verification)
-- Not a record of applications: this is what the department already holds, and is
-- what an extracted document is checked against for owner and area discrepancies.
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_records ENABLE ROW LEVEL SECURITY;

-- 5. Row-Level Security Policies:
CREATE POLICY "Citizens view own records, Officers view all" 
ON public.land_records FOR SELECT 
USING (
    auth.uid() = created_by 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'OFFICER'
    )
    OR auth.role() = 'anon' -- Development fallback
);

CREATE POLICY "Citizens can insert their own records" 
ON public.land_records FOR INSERT 
WITH CHECK (
    auth.uid() = created_by 
    OR auth.role() = 'anon'
);

CREATE POLICY "Officers can update verification status & remarks" 
ON public.land_records FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'OFFICER'
    )
    OR auth.role() = 'anon'
);

CREATE POLICY "Public read audit logs for verification" 
ON public.audit_logs FOR SELECT USING (true);

CREATE POLICY "Allow system insert audit logs" 
ON public.audit_logs FOR INSERT WITH CHECK (true);

-- The reference master is read-only to the application: it is maintained by the
-- department, never written by a citizen submission or an officer action.
CREATE POLICY "Anyone may read the reference master"
ON public.reference_records FOR SELECT
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 6. Storage Bucket RLS Policies (Strict User Document Isolation)
-- Users can only upload and read files in their own folder: land-record-documents/{user_id}/*
CREATE POLICY "Users access own document folder, Officers access all"
ON storage.objects FOR ALL
USING (
    bucket_id = 'land-record-documents' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'OFFICER'
        )
        OR auth.role() = 'anon'
    )
);

-- 6. Insert Mock Records for Immediate Demo
INSERT INTO public.land_records (
    id, application_no, document_type, state, district, tehsil, village, 
    survey_number, khasra_number, khata_number, owner_name, co_owners, area, area_unit, 
    mutation_number, land_classification, status, overall_confidence, officer_remarks, assigned_officer
) VALUES 
(
    'LR-2026-1021', 'APP-MH-2026-00481', '7/12 Extract', 'Maharashtra', 'Pune', 'Haveli', 'Hadapsar', 
    '124/2', 'K-4821', 'KH-1024', 'Ramesh Baliram Patil', ARRAY['Suresh Baliram Patil'], 2.4500, 'Hectares', '5821', 
    'Jirayat (Agricultural Dry)', 'UNDER_VERIFICATION', 94.0, 
    'Mutation number verified against original RoR volume.', 'SDO Pune Haveli'
),
(
    'LR-2026-1019', 'APP-MH-2026-00465', '7/12 Extract', 'Maharashtra', 'Pune', 'Haveli', 'Kharadi', 
    '131/2', 'K-9012', 'KH-3140', 'Sunita Devi Deshmukh', ARRAY[]::TEXT[], 3.1200, 'Hectares', '5902', 
    'Bagayat (Irrigated Garden)', 'VERIFIED', 98.0, 
    'Certified and verified against cadastral index sheet.', 'Shri Vikramaditya Joshi (SDO Haveli)'
),
(
    'LR-2026-1020', 'APP-MH-2026-00470', 'Mutation Register', 'Maharashtra', 'Pune', 'Haveli', 'Hadapsar', 
    '112/4-B', 'K-3310', 'KH-0891', 'Ganesh Vitthal Shinde', ARRAY[]::TEXT[], 3.1000, 'Hectares', '5789', 
    'Jirayat', 'FLAGGED', 62.0, 
    'Area sum mismatch detected against parent parcel 112.', 'SDO Pune Haveli'
)
ON CONFLICT (id) DO NOTHING;

-- 7. Reference Master Seed (generated from app/data/hadapsar_records.json,
-- plus the two rows the demo documents are checked against).
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
