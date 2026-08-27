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

-- 2. Land Records Table
CREATE TABLE IF NOT EXISTS public.land_records (
    id TEXT PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL, -- '7/12 Extract', 'Khasra-Khatauni', 'Mutation Deed'
    state VARCHAR(50) DEFAULT 'Maharashtra',
    district VARCHAR(50) NOT NULL,
    tehsil VARCHAR(50) NOT NULL,
    village VARCHAR(100) NOT NULL,
    survey_number TEXT NOT NULL,
    sub_division_number TEXT,
    owner_name TEXT NOT NULL,
    co_owners TEXT[],
    area NUMERIC(10, 4) NOT NULL,
    area_unit VARCHAR(20) DEFAULT 'Hectares',
    mutation_number TEXT,
    land_classification TEXT,
    document_url TEXT,
    status VARCHAR(30) DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'FLAGGED')),
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
-- Citizen can only view/insert their own records; Officers can view all queue records.
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
    id, document_type, state, district, tehsil, village, 
    survey_number, owner_name, area, area_unit, mutation_number, 
    land_classification, status, overall_confidence, officer_remarks, assigned_officer
) VALUES 
(
    'LR-2026-1021', '7/12 Extract', 'Maharashtra', 'Pune', 'Haveli', 'Hadapsar', 
    '124/2', 'Ramesh Baliram Patil', 2.4500, 'Hectares', '5821', 
    'Jirayat (Agricultural Dry)', 'PENDING_VERIFICATION', 74.5, 
    'Mutation number flagged with low confidence. Physical verification required.', 'SDO Pune Haveli'
),
(
    'LR-2026-1019', '7/12 Extract', 'Maharashtra', 'Pune', 'Haveli', 'Hadapsar', 
    '131/2', 'Sunita Devi Deshmukh', 1.8500, 'Hectares', '5902', 
    'Bagayat (Irrigated Garden)', 'VERIFIED', 98.2, 
    'Certified and verified against cadastral index sheet.', 'Shri Vikramaditya Joshi (SDO Haveli)'
),
(
    'LR-2026-1020', 'Mutation Register', 'Maharashtra', 'Pune', 'Haveli', 'Hadapsar', 
    '112/4-B', 'Ganesh Vitthal Shinde', 3.1000, 'Hectares', '5789', 
    'Jirayat', 'FLAGGED', 62.0, 
    'Area sum mismatch detected against parent parcel 112.', 'SDO Pune Haveli'
)
ON CONFLICT (id) DO NOTHING;
