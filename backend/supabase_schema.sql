-- ==============================================================================
-- DEPARTMENT OF LAND RESOURCES (DoLR) - DATABASE SCHEMA
-- Smart India Hackathon 2026 • Problem Statement 26018
-- ==============================================================================

-- 1. Profiles Table (Users: Citizens & SDO Officers)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CITIZEN', 'OFFICER', 'ADMIN')),
    full_name TEXT NOT NULL,
    phone_number VARCHAR(15),
    designation TEXT,
    district TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

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
