'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { writeAuditLog } from '@/lib/auditLog';
import { apiFetch } from '@/lib/apiFetch';
import { MOCK_RECORDS } from '@/data/mockData';
import { 
  UploadCloud, 
  FileText, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Edit3, 
  Sparkles,
  X,
  FileCheck,
  Check,
  PlusCircle,
  ShieldCheck,
  Layers,
  MapPin,
  FileBadge
} from 'lucide-react';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { LandRecord, FieldConfidence } from '@/types';

// Base URL of the FastAPI backend. Set NEXT_PUBLIC_API_URL in Vercel to the
// deployed Render URL; the localhost fallback keeps `npm run dev` working.
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// Mirrors _build_ocr_extracted_data in backend/app/api/land_records.py. Both
// write the same row: the browser upsert is what actually lands when the
// backend is offline, so it has to carry the per-field confidence too or the
// officer sees one score repeated on every field.
const CONFIDENCE_FIELDS = [
  'owner_name', 'survey_number', 'khasra_number', 'khata_number', 'area',
  'village', 'tehsil', 'district', 'land_classification',
  'ownership_details', 'mutation_number', 'registration_info',
] as const;

const LOW_CONFIDENCE_THRESHOLD = 0.70;

type OcrField = { value: string; confidence: number; is_flagged: boolean };

/**
 * A confidence score describes how well the AI read something. When the
 * citizen typed the value in themselves there is nothing to be confident
 * about, and showing "0%" in red would read as a bad extraction rather than
 * an absent one.
 */
function FieldBadge({ confidence, manual }: { confidence: number; manual: boolean }) {
  if (manual) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-300">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
        Manually entered, not AI-extracted
      </span>
    );
  }
  return <ConfidenceBadge confidence={Math.round((confidence || 0) * 100)} size="sm" />;
}

function buildOcrExtractedData(data: any): Record<string, OcrField> {
  const out: Record<string, OcrField> = {};

  for (const name of CONFIDENCE_FIELDS) {
    const field = data?.[name];
    if (!field || typeof field !== 'object') continue;

    // A field the document never carried is left out rather than stored at
    // 0.0, which would show the officer a red 0% badge on an absent field.
    const value = field.value;
    if (value === null || value === undefined || !String(value).trim()) continue;

    const confidence = Number(field.confidence);
    if (!Number.isFinite(confidence)) continue;

    // The API serialises FieldConfidence with a camelCase alias; accept either.
    const flagged = field.is_flagged ?? field.isFlagged;
    out[name] = {
      value: String(value),
      confidence,
      is_flagged: typeof flagged === 'boolean' ? flagged : confidence < LOW_CONFIDENCE_THRESHOLD,
    };
  }

  // co_owners is a plain list with no score of its own, so it inherits the
  // record-level one to keep the map a single shape.
  const coOwners = data?.co_owners;
  if (Array.isArray(coOwners) && coOwners.length > 0) {
    const overall = Number(data?.overall_confidence);
    const confidence = Number.isFinite(overall) ? overall : 0;
    out.co_owners = {
      value: coOwners.map((c: any) => String(c)).join(', '),
      confidence,
      is_flagged: confidence < LOW_CONFIDENCE_THRESHOLD,
    };
  }

  return out;
}

export default function CitizenUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportingFileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'failed'>('upload');
  const [extractionError, setExtractionError] =
    useState<{ reason: string; retryable: boolean; http_status: number | null } | null>(null);
  // null = not yet known. Drives the readiness pill near the upload box.
  const [sarvamReady, setSarvamReady] = useState<boolean | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Submitting document to Sarvam Vision-Language Model...');
  const [isEditing, setIsEditing] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Extracted 12 SIH Fields
  const [extractedData, setExtractedData] = useState<{
    owner_name: FieldConfidence;
    co_owners: string[];
    survey_number: FieldConfidence;
    khasra_number: FieldConfidence;
    khata_number: FieldConfidence;
    area: FieldConfidence;
    area_unit: string;
    village: FieldConfidence;
    tehsil: FieldConfidence;
    district: FieldConfidence;
    state: string;
    land_classification: FieldConfidence;
    ownership_details: FieldConfidence;
    mutation_number: FieldConfidence;
    registration_info: FieldConfidence;
    overall_confidence: number;
    validation_flags: any[];
    supporting_documents: string[];
    /** SARVAM_LIVE or DEMO_FALLBACK — recorded on the audit row at submit. */
    data_source: string;
    /** Fields whose schema description carried a learned hint this run. */
    learning_hints?: string[];
  }>({
    owner_name: { value: '', confidence: 0.0 },
    co_owners: [],
    survey_number: { value: '', confidence: 0.0 },
    khasra_number: { value: '', confidence: 0.0 },
    khata_number: { value: '', confidence: 0.0 },
    area: { value: '', confidence: 0.0 },
    area_unit: 'Hectares',
    village: { value: '', confidence: 0.0 },
    tehsil: { value: '', confidence: 0.0 },
    district: { value: '', confidence: 0.0 },
    state: 'Maharashtra',
    land_classification: { value: '', confidence: 0.0 },
    ownership_details: { value: '', confidence: 0.0 },
    mutation_number: { value: '', confidence: 0.0 },
    registration_info: { value: '', confidence: 0.0 },
    overall_confidence: 0.0,
    validation_flags: [],
    supporting_documents: [],
    data_source: 'UNKNOWN'
  });

  const [proposedData, setProposedData] = useState({ ...extractedData });

  const isManual = proposedData.data_source === 'MANUAL';
  const isDemoData = proposedData.data_source === 'DEMO_FALLBACK';

  // Whether this server can extract at all. Worth knowing before uploading,
  // not after — an unconfigured instance silently serves fixture data.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setSarvamReady(Boolean(j?.sarvam_configured)); })
      .catch(() => { if (!cancelled) setSarvamReady(false); });
    return () => { cancelled = true; };
  }, []);

  // Restore state from sessionStorage on page refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('active_extraction_preview');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.step === 'preview' && parsed.proposedData) {
            setExtractedData(parsed.extractedData || parsed.proposedData);
            setProposedData(parsed.proposedData);
            if (parsed.filePreviewUrl) setFilePreviewUrl(parsed.filePreviewUrl);
            setStep('preview');
          }
        }
      } catch (err) {
        console.error('Failed to restore preview state:', err);
      }
    }
  }, []);

  // Sync state changes to sessionStorage when in preview step
  useEffect(() => {
    if (step === 'preview' && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('active_extraction_preview', JSON.stringify({
          step: 'preview',
          extractedData,
          proposedData,
          filePreviewUrl
        }));
      } catch (err) {
        console.error('Failed to persist preview state:', err);
      }
    }
  }, [step, extractedData, proposedData, filePreviewUrl]);

  const processFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Real AI Extraction API Call
  const handleStartProcessing = async () => {
    if (!selectedFile) return;
    setStep('processing');
    setExtractionError(null);
    setProcessingStatus('Connecting to Sarvam AI Document Intelligence API (/job/extract)...');

    let failed = false;
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setProcessingStatus('Passing Universal 12-Field Schema with strict disambiguation rules...');
      
      const res = await apiFetch(`${API}/api/extraction/process`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.extracted_data;
        const flags = json.validation_flags || [];

        const populated = {
          owner_name: data.owner_name || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          co_owners: data.co_owners || [],
          survey_number: data.survey_number || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          khasra_number: data.khasra_number || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          khata_number: data.khata_number || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          area: data.area || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          area_unit: data.area_unit || 'Hectares',
          village: data.village || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          tehsil: data.tehsil || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          district: data.district || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          state: data.state || 'Maharashtra',
          land_classification: data.land_classification || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          ownership_details: data.ownership_details || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          mutation_number: data.mutation_number || { value: '', confidence: 0.0, sourceDoc: selectedFile.name },
          registration_info: data.registration_info || { value: '', confidence: 0.0, sourceDoc: '' },
          overall_confidence: data.overall_confidence || 0.94,
          validation_flags: flags,
          supporting_documents: [selectedFile.name],
          data_source: data.data_source || json.data_source || 'UNKNOWN',
          // Which learned hints were in the prompt for this extraction, so the
          // audit row records what the extractor was told, not just what it read.
          learning_hints: (data.learning?.hints_applied || []) as string[]
        };

        setExtractedData(populated);
        setProposedData(populated);

        // Save preview state to sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('active_extraction_preview', JSON.stringify({
            step: 'preview',
            extractedData: populated,
            proposedData: populated
          }));
        }
        setExtractionError(null);
      } else {
        // The backend read nothing. Showing the preview anyway would present
        // stale or blank fields as though they came off the document.
        const body = await res.json().catch(() => ({} as any));
        console.error('Backend extraction error:', body || res.statusText);
        failed = true;
        setExtractionError({
          reason: body?.reason || `The extraction service returned HTTP ${res.status}.`,
          retryable: body?.retryable ?? true,
          http_status: body?.http_status ?? res.status,
        });
      }
    } catch (err) {
      console.error('API connection error:', err);
      failed = true;
      setExtractionError({
        reason: 'Could not reach the extraction service. It may be offline.',
        retryable: true,
        http_status: null,
      });
    } finally {
      setTimeout(() => {
        setStep(failed ? 'failed' : 'preview');
      }, 1000);
    }
  };

  /** Start over with blank fields the citizen fills in themselves. */
  const startManualEntry = () => {
    const blank: any = { ...extractedData };
    CONFIDENCE_FIELDS.forEach((name) => {
      blank[name] = { value: '', confidence: 0 };
    });
    blank.co_owners = [];
    blank.overall_confidence = 0;
    blank.validation_flags = [];
    blank.supporting_documents = selectedFile ? [selectedFile.name] : [];
    blank.data_source = 'MANUAL';
    setExtractedData(blank);
    setProposedData(blank);
    setExtractionError(null);
    setIsEditing(true);
    setStep('preview');
  };

  // Upload Supporting Document to Merge Missing Fields
  const handleSupportingFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const supportingFile = e.target.files[0];
      setStep('processing');
      setProcessingStatus(`Extracting supporting document (${supportingFile.name}) to merge missing fields...`);

      try {
        const formData = new FormData();
        formData.append('file', supportingFile);

        const res = await apiFetch(`${API}/api/extraction/process`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          const suppData = json.extracted_data;

          // Merge non-null fields
          setProposedData(prev => ({
            ...prev,
            registration_info: suppData.registration_info?.value 
              ? suppData.registration_info 
              : prev.registration_info,
            supporting_documents: [...prev.supporting_documents, supportingFile.name]
          }));
        }
      } catch (err) {
        console.error('Supporting upload error:', err);
      } finally {
        setTimeout(() => {
          setStep('preview');
        }, 1000);
      }
    }
  };

  // Calculate completeness
  const calculateCompleteness = () => {
    const fields = [
      proposedData.owner_name?.value,
      proposedData.survey_number?.value,
      proposedData.khasra_number?.value,
      proposedData.khata_number?.value,
      proposedData.area?.value,
      proposedData.village?.value,
      proposedData.tehsil?.value,
      proposedData.district?.value,
      proposedData.land_classification?.value,
      proposedData.ownership_details?.value,
      proposedData.mutation_number?.value,
      proposedData.registration_info?.value,
    ];
    const filled = fields.filter(f => f && f.trim() !== '').length;
    return { filled, total: 12, percentage: Math.round((filled / 12) * 100) };
  };

  const completeness = calculateCompleteness();

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const newRecordId = `LR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord: LandRecord = {
      id: newRecordId,
      applicationNo: `APP-MH-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      documentType: selectedFile?.name.includes('Deed') ? 'Sale Deed & Mutation Register' : '7/12 Extract (Record of Rights)',
      ownerName: proposedData.owner_name,
      coOwners: proposedData.co_owners,
      surveyNumber: proposedData.survey_number,
      khasraNumber: proposedData.khasra_number,
      khataNumber: proposedData.khata_number,
      area: proposedData.area,
      areaUnit: proposedData.area_unit || 'Hectares',
      village: proposedData.village,
      tehsil: proposedData.tehsil,
      district: proposedData.district,
      state: proposedData.state || 'Maharashtra',
      landClassification: proposedData.land_classification,
      ownershipDetails: proposedData.ownership_details,
      mutationNumber: proposedData.mutation_number,
      registrationInfo: proposedData.registration_info,
      overallConfidence: proposedData.overall_confidence || 0.94,
      status: 'UNDER_VERIFICATION',
      submissionDate: new Date().toISOString().split('T')[0],
      assignedDistrict: proposedData.district?.value || 'Pune',
      assignedTehsil: proposedData.tehsil?.value || 'Haveli',
      assignedOfficer: `Shri Vikramaditya Joshi (SDO ${proposedData.tehsil?.value || 'Haveli'})`,
      validationFlags: proposedData.validation_flags || [],
      documentPages: 2,
      supportingDocuments: proposedData.supporting_documents,
      submittedBy: user?.name || 'Citizen',
      submittedById: user?.id || '',
      documentUrl: filePreviewUrl || undefined,
      data_source: proposedData.data_source || 'UNKNOWN'
    } as any;

    // Save to active in-memory list
    MOCK_RECORDS.unshift(newRecord);

    // Persist to localStorage for client-side navigation
    if (typeof window !== 'undefined') {
      try {
        const savedStr = localStorage.getItem('user_submitted_records');
        const existing = savedStr ? JSON.parse(savedStr) : [];
        existing.unshift(newRecord);
        localStorage.setItem('user_submitted_records', JSON.stringify(existing));
      } catch (e) {
        console.error('LocalStorage save error:', e);
      }
    }

    // Direct Supabase Storage & DB Insert (Triggers WebSocket Realtime Event to Officers!)
    try {
      const docDistrict = (proposedData.district?.value || 'Pune').trim();
      const docTehsil = (proposedData.tehsil?.value || 'Haveli').trim();
      
      const safeDistrict = docDistrict.replace(/[^\w\.-]/g, '_');
      const safeTehsil = docTehsil.replace(/[^\w\.-]/g, '_');
      const safeFileName = selectedFile ? selectedFile.name.replace(/[^\w\.-]/g, '_') : 'document.pdf';

      let finalDocUrl: string | null = null;

      if (selectedFile) {
        try {
          // Folder named for the uploader: the storage policy checks exactly
          // this, so a fallback id would put the file where nobody can read it.
          const storagePath = `${user?.id}/${safeDistrict}/${safeTehsil}/${newRecord.applicationNo}/${safeFileName}`;
          const { data: uploadData } = await supabase.storage.from('land-record-documents').upload(storagePath, selectedFile, {
            cacheControl: '3600',
            upsert: true
          });
          if (uploadData) {
            // Store the path. The bucket is private, so a URL would expire and
            // a permanent one would defeat the point of making it private.
            finalDocUrl = storagePath;
            newRecord.documentUrl = storagePath;
            (newRecord as any).document_url = storagePath;
          }
        } catch (stErr) {
          console.warn('Supabase storage upload notice:', stErr);
        }
      }

      const { data: dbData, error: dbErr } = await supabase.from('land_records').upsert({
        id: newRecordId,
        application_no: newRecord.applicationNo,
        document_type: newRecord.documentType,
        state: newRecord.state,
        district: docDistrict,
        tehsil: docTehsil,
        village: proposedData.village?.value || 'Hadapsar',
        survey_number: proposedData.survey_number?.value || '124/2',
        khasra_number: proposedData.khasra_number?.value || null,
        khata_number: proposedData.khata_number?.value || null,
        owner_name: proposedData.owner_name?.value || 'Land Owner',
        co_owners: proposedData.co_owners || [],
        area: parseFloat(proposedData.area?.value || '2.45'),
        mutation_number: proposedData.mutation_number?.value || null,
        land_classification: proposedData.land_classification?.value || null,
        registration_info: proposedData.registration_info || {},
        status: 'UNDER_VERIFICATION',
        overall_confidence: proposedData.overall_confidence || 0.94,
        ocr_extracted_data: buildOcrExtractedData(proposedData),
        validation_flags: proposedData.validation_flags || [],
        data_source: proposedData.data_source || 'UNKNOWN',
        created_by: user?.id || null,
        document_url: finalDocUrl || null
      }).select();

      if (dbErr) {
        console.error('Supabase DB upsert error:', dbErr);
      } else {
        console.log('Successfully upserted record to Supabase DB:', dbData);

        // Provenance, written only once the record itself exists — audit_logs
        // has a foreign key onto land_records.
        const citizenName = user?.name || 'Citizen';
        await writeAuditLog({
          recordId: newRecordId,
          action: 'OCR_EXTRACTED',
          role: 'CITIZEN',
          performedBy: citizenName,
          details: `Extracted via ${proposedData.data_source || 'UNKNOWN'}`
            + (((proposedData as any).learning_hints || []).length
              ? `; learning hints applied: ${(proposedData as any).learning_hints.join(', ')}`
              : ''),
          changes: buildOcrExtractedData(proposedData),
        });

        // What the citizen typed over before submitting, against what the AI read.
        const citizenEdits: Record<string, { ai: string; citizen: string }> = {};
        CONFIDENCE_FIELDS.forEach((name) => {
          const ai = (extractedData as any)?.[name]?.value;
          const citizen = (proposedData as any)?.[name]?.value;
          if (ai !== undefined && citizen !== undefined && String(ai) !== String(citizen)) {
            citizenEdits[name] = { ai: String(ai), citizen: String(citizen) };
          }
        });
        const aiCoOwners = (extractedData.co_owners || []).join(', ');
        const citizenCoOwners = (proposedData.co_owners || []).join(', ');
        if (aiCoOwners !== citizenCoOwners) {
          citizenEdits.co_owners = { ai: aiCoOwners, citizen: citizenCoOwners };
        }

        if (Object.keys(citizenEdits).length > 0) {
          await writeAuditLog({
            recordId: newRecordId,
            action: 'CITIZEN_CORRECTION',
            role: 'CITIZEN',
            performedBy: citizenName,
            details: `${Object.keys(citizenEdits).length} field(s) corrected before submission`,
            changes: citizenEdits,
          });
        }
      }
    } catch (dbErr) {
      console.warn('Direct Supabase DB insert notice:', dbErr);
    }

    // Sync to FastAPI backend if available
    try {
      await apiFetch(`${API}/api/land-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });
    } catch (err) {
      console.warn('Backend sync warning:', err);
    }

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('active_extraction_preview');
    }

    setTimeout(() => {
      router.push('/citizen/dashboard');
    }, 1500);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-1">
        <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider">
          Department of Land Resources
        </div>
        <h1 className="text-xl font-bold text-stone-900 tracking-tight font-serif">
          Land Record Digitization &amp; Extraction
        </h1>
        <p className="text-xs text-stone-500">
          Upload 7/12 Extracts, Sale Deeds, or Mutation registers to extract land record fields.
        </p>
      </div>



      {/* Whether this server can actually read a document, said before upload
          rather than after. */}
      {step === 'upload' && sarvamReady !== null && (
        <div className="flex justify-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
            sarvamReady
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sarvamReady ? 'bg-emerald-600' : 'bg-amber-500'}`} />
            {sarvamReady
              ? 'Live extraction: ready'
              : 'Live extraction: not configured, demo data will be used'}
          </span>
        </div>
      )}

      {/* STEP 1: Upload Dropzone */}
      {step === 'upload' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-8 text-center space-y-6">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden" 
          />

          {!selectedFile ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-2xl p-10 transition-all cursor-pointer ${
                isDragging 
                  ? 'border-terracotta-600 bg-terracotta-50/50' 
                  : 'border-[#D7D4CA] hover:border-stone-700 bg-[#FAF9F6] hover:bg-stone-50'
              }`}
            >
              <UploadCloud className="w-10 h-10 text-terracotta-700 mx-auto mb-3" />
              <div className="text-sm font-bold text-stone-900 mb-1">
                Click to browse or drop your land record here
              </div>
              <div className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
                7/12 Extract, Sale Deed, Mutation Register (Form 6), Khasra-Khatauni, or Cadastral Map (PDF, JPG, PNG up to 25MB)
              </div>
              <button
                type="button"
                className="bg-white hover:bg-stone-100 text-stone-900 border border-[#D7D4CA] text-xs font-semibold px-4 py-2 rounded-xl shadow-stone-sm transition-colors"
              >
                Browse Files from Device
              </button>
            </div>
          ) : (
            <div className="border border-[#E8E6DF] rounded-2xl p-6 bg-[#FAF9F6] text-left space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900">{selectedFile.name}</div>
                    <div className="text-xs text-stone-500 font-mono mt-0.5">
                      {formatFileSize(selectedFile.size)} • Ready for Extraction
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-200 text-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-stone-600 hover:text-stone-900 font-semibold underline"
                >
                  Choose a different file
                </button>
                <button
                  type="button"
                  onClick={handleStartProcessing}
                  className="bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-stone-sm transition-all flex items-center gap-2"
                >
                  <span>Process Document</span>
                  <ArrowRight className="w-3.5 h-3.5 text-terracotta-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Processing Screen */}
      {step === 'processing' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 border border-[#E8E6DF] flex items-center justify-center mx-auto animate-spin">
            <Cpu className="w-6 h-6 text-terracotta-700" />
          </div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight font-serif">
            Extraction in Progress...
          </h2>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Please wait while land record data is being extracted.
          </p>
        </div>
      )}

      {/* Extraction failed. No fields are shown, because none were read. */}
      {step === 'failed' && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-700 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-rose-950">Extraction failed.</h2>
              <p className="text-sm text-rose-900 mt-1 leading-relaxed">
                {extractionError?.reason}
              </p>
              <p className="text-sm font-semibold text-rose-950 mt-2">
                Nothing was read from your document.
              </p>
              {extractionError?.http_status && (
                <p className="text-[11px] font-mono text-rose-700 mt-1">
                  HTTP {extractionError.http_status}
                  {extractionError.retryable ? ' · retrying may help' : ' · retrying will not help'}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pl-9">
            <button
              type="button"
              onClick={handleStartProcessing}
              className="bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-stone-sm"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={startManualEntry}
              className="bg-white hover:bg-stone-50 text-stone-800 border border-[#D7D4CA] text-xs font-semibold px-4 py-2.5 rounded-xl"
            >
              Enter details manually
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview the 12 SIH Fields */}
      {step === 'preview' && (
        <form onSubmit={handleSubmitVerification} className="space-y-5">
          {/* Fixture data must never be mistaken for a reading of the upload. */}
          {isDemoData && (
            <div className="w-full bg-rose-600 text-white rounded-2xl px-6 py-4 shadow-stone-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-base font-bold tracking-tight">DEMO DATA</div>
                  <p className="text-sm mt-0.5 leading-relaxed">
                    No API key is configured on the server. These values were{' '}
                    <strong>NOT</strong> read from your document.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isManual && (
            <div className="w-full bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl px-5 py-3 text-xs font-semibold flex items-center gap-2">
              <Edit3 className="w-4 h-4 flex-shrink-0" />
              Manual entry — fill in the fields yourself. No AI extraction was performed.
            </div>
          )}

          {/* Form Header */}
          <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-[#E8E6DF] shadow-stone-sm">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                Extracted Land Record Fields Preview
              </h2>
              <p className="text-[11px] text-stone-500">
                Extracted and verified against Department of Land Resources (DoLR) business rules
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 bg-terracotta-50 px-3 py-1.5 rounded-lg border border-terracotta-200 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Editing Enabled' : 'Edit Fields'}</span>
            </button>
          </div>

          {/* Card 1: Land Ownership & Co-Owners */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-terracotta-700" />
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                1. Landowner Details & Co-Owners
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-stone-500 font-medium">1. Primary Landowner Name</label>
                  {(isManual || proposedData.owner_name?.confidence > 0) && (
                    <FieldBadge confidence={proposedData.owner_name.confidence} manual={isManual} />
                  )}
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.owner_name?.value || ''}
                  placeholder="e.g. Ramesh Baliram Patil"
                  onChange={(e) => setProposedData({ ...proposedData, owner_name: { ...proposedData.owner_name, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-semibold text-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-medium block">2. Co-Owners / Co-Sharers (सह-खातेदार)</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={Array.isArray(proposedData.co_owners) ? proposedData.co_owners.join(', ') : ''}
                  placeholder="e.g. Sau. Mina Satish Pawar, Shri Dilip Shaligram Aagiwal"
                  onChange={(e) => setProposedData({ ...proposedData, co_owners: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 disabled:bg-stone-50"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Cadastral & Spatial Identifiers */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <Layers className="w-4 h-4 text-terracotta-700" />
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                2. Cadastral &amp; Spatial Identifiers
              </h3>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-stone-500 font-medium">3. Survey / Gut Number</label>
                  {(isManual || proposedData.survey_number?.confidence > 0) && (
                    <FieldBadge confidence={proposedData.survey_number.confidence} manual={isManual} />
                  )}
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.survey_number?.value || ''}
                  placeholder="e.g. 124/2"
                  onChange={(e) => setProposedData({ ...proposedData, survey_number: { ...proposedData.survey_number, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-mono font-bold text-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-stone-500 font-medium">4. Khasra Number</label>
                  {(isManual || proposedData.khasra_number?.confidence > 0) && (
                    <FieldBadge confidence={proposedData.khasra_number.confidence} manual={isManual} />
                  )}
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.khasra_number?.value || ''}
                  placeholder="e.g. K-4821"
                  onChange={(e) => setProposedData({ ...proposedData, khasra_number: { ...proposedData.khasra_number, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-mono text-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-stone-500 font-medium">5. Khata Number</label>
                  {(isManual || proposedData.khata_number?.confidence > 0) && (
                    <FieldBadge confidence={proposedData.khata_number.confidence} manual={isManual} />
                  )}
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.khata_number?.value || ''}
                  placeholder="e.g. KH-1024"
                  onChange={(e) => setProposedData({ ...proposedData, khata_number: { ...proposedData.khata_number, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-mono text-stone-900 disabled:bg-stone-50"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Administrative Jurisdiction */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <MapPin className="w-4 h-4 text-terracotta-700" />
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                3. Administrative Location (Hierarchy)
              </h3>
            </div>

            <div className="grid sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-500 font-medium block">6. Village / Mouje</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.village?.value || ''}
                  placeholder="e.g. Hadapsar"
                  onChange={(e) => setProposedData({ ...proposedData, village: { ...proposedData.village, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-semibold text-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-medium block">7. Tehsil / Taluka</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.tehsil?.value || ''}
                  placeholder="e.g. Haveli"
                  onChange={(e) => setProposedData({ ...proposedData, tehsil: { ...proposedData.tehsil, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-medium block">8. District</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.district?.value || ''}
                  placeholder="e.g. Pune"
                  onChange={(e) => setProposedData({ ...proposedData, district: { ...proposedData.district, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-medium block">State</label>
                <input
                  type="text"
                  disabled
                  value={proposedData.state || 'Maharashtra'}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 bg-stone-50 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Land Classification & Plot Area */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <FileBadge className="w-4 h-4 text-terracotta-700" />
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                4. Land Characteristics & Area Measurement
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-stone-500 font-medium">9. Plot Area ({proposedData.area_unit || 'Hectares'})</label>
                  {(isManual || proposedData.area?.confidence > 0) && (
                    <FieldBadge confidence={proposedData.area.confidence} manual={isManual} />
                  )}
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.area?.value || ''}
                  placeholder="e.g. 2.45"
                  onChange={(e) => setProposedData({ ...proposedData, area: { ...proposedData.area, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-mono text-stone-900 font-bold disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-stone-500 font-medium">10. Land Classification</label>
                  {(isManual || proposedData.land_classification?.confidence > 0) && (
                    <FieldBadge confidence={proposedData.land_classification.confidence} manual={isManual} />
                  )}
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.land_classification?.value || ''}
                  placeholder="e.g. Jirayat (Agricultural Dry)"
                  onChange={(e) => setProposedData({ ...proposedData, land_classification: { ...proposedData.land_classification, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 disabled:bg-stone-50"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Ownership Details, Mutation & Registration */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <FileText className="w-4 h-4 text-terracotta-700" />
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                5. Legal Rights, Mutation & Registration Information
              </h3>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-stone-500 font-medium block">11. Ownership Details / Tenure</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.ownership_details?.value || ''}
                  placeholder="e.g. Occupant Class 1 (भोगवटादार वर्ग-१)"
                  onChange={(e) => setProposedData({ ...proposedData, ownership_details: { ...proposedData.ownership_details, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-stone-500 font-medium">12. Mutation / Ferfar No.</label>
                  {(isManual || proposedData.mutation_number?.confidence > 0) && (
                    <FieldBadge confidence={proposedData.mutation_number.confidence} manual={isManual} />
                  )}
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.mutation_number?.value || ''}
                  placeholder="e.g. 5821"
                  onChange={(e) => setProposedData({ ...proposedData, mutation_number: { ...proposedData.mutation_number, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-mono text-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-medium block">Registration Information</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.registration_info?.value || ''}
                  placeholder="e.g. Deed Reg No: 3594/2015, SRO Jalgaon-1"
                  onChange={(e) => setProposedData({ ...proposedData, registration_info: { ...proposedData.registration_info, value: e.target.value } })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-mono text-stone-900 disabled:bg-stone-50 text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Submission Bar */}
          <div className="flex items-center justify-between pt-4 bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900"
            >
              ← Back to Upload
            </button>

            <button
              type="submit"
              disabled={submitted}
              className="bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-stone-sm transition-all flex items-center gap-2 disabled:bg-emerald-700"
            >
              {submitted ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Submitted to SDO Revenue Officer Queue!</span>
                </>
              ) : (
                <>
                  <span>Submit to Revenue Officer for Verification</span>
                  <ArrowRight className="w-3.5 h-3.5 text-terracotta-400" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
