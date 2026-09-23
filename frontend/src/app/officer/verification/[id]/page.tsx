'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { writeAuditLog } from '@/lib/auditLog';

const PdfDocumentViewer = dynamic(
  () => import('@/components/common/PdfDocumentViewer').then((mod) => mod.PdfDocumentViewer),
  { ssr: false }
);

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
function guessContentType(filename: string | null): string | undefined {
  if (!filename) return undefined;
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext)) ? 'image/*' : 'application/pdf';
}
import { 
  ArrowLeft, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  XCircle,
  ShieldCheck,
  Sparkles,
  Info,
  Check,
  ExternalLink,
  RotateCcw,
  RotateCw,
  History
} from 'lucide-react';

export default function OfficerVerificationWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const recordId = (params?.id as string) || 'LR-2026-6164';

  const { user } = useAuth();
  const [dbRecord, setDbRecord] = useState<any>(null);
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [docContentType, setDocContentType] = useState<string | undefined>(undefined);

  const [fields, setFields] = useState<Record<string, { ai: string; officer: string; confidence: number }>>({
    ownerName: { ai: 'श्री. चंदन रामचंद्र वाणी', officer: 'श्री. चंदन रामचंद्र वाणी', confidence: 0.98 },
    coOwners: { ai: 'None (Single Owner)', officer: 'None (Single Owner)', confidence: 0.95 },
    surveyNumber: { ai: '486/1', officer: '486/1', confidence: 0.98 },
    khasraNumber: { ai: 'प्लॉट नं. २४', officer: 'प्लॉट नं. २४', confidence: 0.95 },
    khataNumber: { ai: 'Jallan 9 - 3594/2015', officer: 'Jallan 9 - 3594/2015', confidence: 0.95 },
    area: { ai: '829.25 चौरस मीटर', officer: '829.25 चौरस मीटर', confidence: 0.95 },
    landClassification: { ai: 'जिरायत (Agricultural Dry)', officer: 'जिरायत (Agricultural Dry)', confidence: 0.95 },
    village: { ai: 'मेहरूण', officer: 'मेहरूण', confidence: 0.98 },
    tehsil: { ai: 'जळगाव', officer: 'जळगाव', confidence: 0.98 },
    districtState: { ai: 'जळगाव, Maharashtra', officer: 'जळगाव, Maharashtra', confidence: 0.98 },
    mutationNumber: { ai: '3594', officer: '3594', confidence: 0.95 },
    registrationInfo: { ai: 'Registered Kharedikhat / Sale Deed', officer: 'Registered Kharedikhat / Sale Deed', confidence: 0.95 },
  });

  const [officerRemarks, setOfficerRemarks] = useState('Verified against physical register and submitted deed document.');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Insufficient document quality');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [actionSuccess, setActionSuccess] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const record = {
    id: dbRecord?.id || recordId,
    status: dbRecord?.status || 'UNDER_VERIFICATION',
    documentType: dbRecord?.document_type || '7/12 Extract (Record of Rights)',
    ownerName: { value: fields.ownerName?.officer || 'Land Owner' },
    submissionDate: dbRecord?.created_at ? new Date(dbRecord.created_at).toISOString().split('T')[0] : '2026-09-20',
    overallConfidence: dbRecord?.overall_confidence || 0.95,
    validationFlags: dbRecord?.validation_flags || [],
    documentPages: dbRecord?.document_pages || 1,
    documentUrl: dbRecord?.document_url
  };

  const [docUrl, setDocUrl] = useState<string | null>(null);
  const totalPages = pdfPageCount ?? record.documentPages ?? 4;
  const currentRotation = pageRotations[currentPage] ?? 0;

  useEffect(() => {
    async function loadRecordFromDb() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('land_records')
          .select('*')
          .eq('id', recordId)
          .single();

        if (data) {
          setDbRecord(data);
          
          let pdfUrl = data.document_url || null;
          let docFileName: string | null = pdfUrl;
          if (!pdfUrl && (data.application_no || data.id)) {
            try {
              const safeDist = (typeof data.district === 'object' ? data.district?.value : data.district) || 'Pune';
              const safeTeh = (typeof data.tehsil === 'object' ? data.tehsil?.value : data.tehsil) || 'Haveli';
              const cleanDist = String(safeDist).replace(/[^\w\.-]/g, '_');
              const cleanTeh = String(safeTeh).replace(/[^\w\.-]/g, '_');
              const appNo = data.application_no || data.id;
              const folderPath = `${data.created_by || 'citizen'}/${cleanDist}/${cleanTeh}/${appNo}`;

              const { data: listData } = await supabase.storage.from('land-record-documents').list(folderPath);
              if (listData && listData.length > 0) {
                const { data: pData } = supabase.storage.from('land-record-documents').getPublicUrl(`${folderPath}/${listData[0].name}`);
                pdfUrl = pData.publicUrl;
                docFileName = listData[0].name;
              }
            } catch (err) {
              console.error('Storage PDF lookup error:', err);
            }
          }
          setDocUrl(pdfUrl);
          setDocContentType(guessContentType(docFileName));
          setPageRotations({});
          setPdfPageCount(null);

          const owner = typeof data.owner_name === 'object' && data.owner_name !== null ? data.owner_name.value : (data.owner_name || 'Land Owner');
          const coOwnersVal = Array.isArray(data.co_owners) && data.co_owners.length > 0 ? data.co_owners.join(', ') : 'None (Single Owner)';
          const survey = typeof data.survey_number === 'object' && data.survey_number !== null ? data.survey_number.value : (data.survey_number || 'N/A');
          const khasra = typeof data.khasra_number === 'object' && data.khasra_number !== null ? data.khasra_number.value : (data.khasra_number || 'N/A');
          const khata = typeof data.khata_number === 'object' && data.khata_number !== null ? data.khata_number.value : (data.khata_number || 'N/A');
          const areaVal = typeof data.area === 'object' && data.area !== null ? data.area.value : String(data.area || 'N/A');
          const areaUnit = data.area_unit || 'Hectares';
          const fullArea = `${areaVal} ${areaUnit}`.trim();
          const landClass = typeof data.land_classification === 'object' && data.land_classification !== null ? data.land_classification.value : (data.land_classification || 'जिरायत (Agricultural Dry)');
          const vil = typeof data.village === 'object' && data.village !== null ? data.village.value : (data.village || 'N/A');
          const teh = typeof data.tehsil === 'object' && data.tehsil !== null ? data.tehsil.value : (data.tehsil || 'N/A');
          const dist = typeof data.district === 'object' && data.district !== null ? data.district.value : (data.district || 'N/A');
          const stateVal = data.state || 'Maharashtra';
          const mutation = typeof data.mutation_number === 'object' && data.mutation_number !== null 
            ? data.mutation_number.value 
            : (data.mutation_number || (data.khata_number?.match(/(\d{4})/)?.[1]) || '3594');
          const regInfo = typeof data.registration_info === 'object' && data.registration_info !== null 
            ? (data.registration_info.value || (Object.keys(data.registration_info).length > 0 ? JSON.stringify(data.registration_info) : 'N/A'))
            : (String(data.registration_info || 'N/A'));

          // Per-field confidence from the extractor. Older records were saved
          // before this column was populated, so anything missing falls back to
          // the record-level number and renders exactly as it did before.
          const ocr = (data.ocr_extracted_data || {}) as Record<string, { confidence?: number }>;
          const confOf = (key: string, fallback: number) => {
            const scored = ocr[key]?.confidence;
            return typeof scored === 'number' ? scored : (data.overall_confidence || fallback);
          };

          setFields({
            ownerName: { ai: owner, officer: owner, confidence: confOf('owner_name', 0.98) },
            coOwners: { ai: coOwnersVal, officer: coOwnersVal, confidence: confOf('co_owners', 0.95) },
            surveyNumber: { ai: survey, officer: survey, confidence: confOf('survey_number', 0.98) },
            khasraNumber: { ai: khasra, officer: khasra, confidence: confOf('khasra_number', 0.95) },
            khataNumber: { ai: khata, officer: khata, confidence: confOf('khata_number', 0.95) },
            area: { ai: fullArea, officer: fullArea, confidence: confOf('area', 0.95) },
            landClassification: { ai: landClass, officer: landClass, confidence: confOf('land_classification', 0.95) },
            village: { ai: vil, officer: vil, confidence: confOf('village', 0.98) },
            tehsil: { ai: teh, officer: teh, confidence: confOf('tehsil', 0.98) },
            districtState: { ai: `${dist}, ${stateVal}`, officer: `${dist}, ${stateVal}`, confidence: confOf('district', 0.98) },
            mutationNumber: { ai: mutation, officer: mutation, confidence: confOf('mutation_number', 0.95) },
            registrationInfo: { ai: regInfo, officer: regInfo, confidence: confOf('registration_info', 0.95) },
          });
        }
      } catch (err) {
        console.error('Error fetching verification record from DB:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRecordFromDb();

    async function loadAuditTrail() {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('record_id', recordId)
          .order('created_at', { ascending: false });
        if (error) console.warn('Audit trail fetch notice:', error);
        else setAuditRows(data || []);
      } catch (err) {
        console.warn('Audit trail fetch notice:', err);
      }
    }
    loadAuditTrail();
  }, [recordId]);

  const handleFieldChange = (fieldKey: keyof typeof fields, newValue: string) => {
    setFields(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        officer: newValue,
      }
    }));
  };

  const officerName = user?.name || user?.employeeId || 'Officer';

  // The workspace keys its fields camelCase; the audit trail is keyed the way
  // the database and the citizen rows are, so both sides of a correction line
  // up under one field name.
  const AUDIT_FIELD_NAMES: Record<string, string> = {
    ownerName: 'owner_name',
    coOwners: 'co_owners',
    surveyNumber: 'survey_number',
    khasraNumber: 'khasra_number',
    khataNumber: 'khata_number',
    area: 'area',
    landClassification: 'land_classification',
    village: 'village',
    tehsil: 'tehsil',
    districtState: 'district',
    mutationNumber: 'mutation_number',
    registrationInfo: 'registration_info',
  };

  /** Every field the officer typed over, with what the AI had read there. */
  const officerEdits = () => {
    const changes: Record<string, { ai: string; officer: string }> = {};
    Object.entries(fields).forEach(([key, f]) => {
      if (f.ai !== f.officer) {
        changes[AUDIT_FIELD_NAMES[key] || key] = { ai: f.ai, officer: f.officer };
      }
    });
    return changes;
  };

  const handleApprove = async () => {
    try {
      const { error } = await supabase
        .from('land_records')
        .update({
          status: 'VERIFIED',
          officer_remarks: officerRemarks,
          owner_name: fields.ownerName.officer,
          survey_number: fields.surveyNumber.officer,
          village: fields.village.officer,
          tehsil: fields.tehsil.officer,
          district: fields.districtState?.officer ? fields.districtState.officer.split(',')[0].trim() : 'जळगाव',
          registration_info: { value: fields.registrationInfo?.officer, confidence: fields.registrationInfo?.confidence || 0.95 },
        })
        .eq('id', recordId);

      if (error) {
        console.warn('DB update warning:', error);
      } else {
        // Only after the record itself is certified — an audit row for a
        // certification that never landed would be a lie.
        await writeAuditLog({
          recordId,
          action: 'CERTIFIED_APPROVED',
          role: 'OFFICER',
          performedBy: officerName,
          details: officerRemarks,
          changes: officerEdits(),
        });
      }
    } catch (e) {
      console.warn('DB update warning:', e);
    }

    setActionSuccess('APPROVED');
    setTimeout(() => {
      setShowApproveModal(false);
      router.push('/officer/dashboard');
    }, 1200);
  };

  const handleReject = async () => {
    try {
      const { error } = await supabase
        .from('land_records')
        .update({
          status: 'REJECTED',
          officer_remarks: `${rejectReason}: ${rejectRemarks}`,
        })
        .eq('id', recordId);

      if (error) {
        console.warn('DB update warning:', error);
      } else {
        await writeAuditLog({
          recordId,
          action: 'REJECTED',
          role: 'OFFICER',
          performedBy: officerName,
          details: `${rejectReason}: ${rejectRemarks}`,
          changes: officerEdits(),
        });
      }
    } catch (e) {
      console.warn('DB update warning:', e);
    }

    setActionSuccess('REJECTED');
    setTimeout(() => {
      setShowRejectModal(false);
      router.push('/officer/dashboard');
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* Top Workspace Header */}
      <div className="bg-white p-4 rounded-xl border border-[#E8E6DF] shadow-stone-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/officer/dashboard"
            className="p-2 rounded-lg border border-[#D7D4CA] hover:bg-stone-50 text-stone-700 transition-colors shadow-stone-sm"
            title="Back to Verification Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-stone-900 tracking-tight">
                Verification Workspace: <span className="font-mono text-terracotta-800">{record.id}</span>
              </h1>
              <StatusBadge status={record.status} />
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              {record.documentType} • Submitted by <span className="font-semibold text-stone-800">{record.ownerName.value}</span> ({record.submissionDate})
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {record.status === 'VERIFIED' ? (
            <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Record Certified & Verified</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                className="bg-white hover:bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-stone-sm"
              >
                Reject Record
              </button>
              <button
                onClick={() => setShowApproveModal(true)}
                className="bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-stone-sm transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Approve & Certify RoR</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Split-Screen Workspace */}
      <div className="grid lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT PANEL: Document Parchment Viewer */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#E8E6DF] shadow-stone-sm flex flex-col h-full min-h-[740px] overflow-hidden">
          {/* Document Viewer Toolbar */}
          <div className="px-4 py-3 bg-[#FAF9F6] border-b border-[#E8E6DF] flex items-center justify-between text-xs text-stone-700">
            <div className="flex items-center gap-2 font-medium">
              <FileText className="w-4 h-4 text-terracotta-700" />
              <span className="font-bold text-stone-900">Original Document Canvas</span>
              <span className="text-[10px] text-stone-400 font-mono">({totalPages} Pages)</span>
            </div>

            {/* Viewer Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-[#D7D4CA] rounded-lg bg-white shadow-stone-sm">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(75, prev - 15))}
                  className="p-1.5 hover:bg-stone-50 text-stone-600"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[10px] text-stone-700 font-bold">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
                  className="p-1.5 hover:bg-stone-50 text-stone-600"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {docUrl && (
                <div className="flex items-center border border-[#D7D4CA] rounded-lg bg-white shadow-stone-sm">
                  <button
                    onClick={() => setPageRotations(prev => ({ ...prev, [currentPage]: ((prev[currentPage] ?? 0) - 90 + 360) % 360 }))}
                    className="p-1.5 hover:bg-stone-50 text-stone-600"
                    title="Rotate page left"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1 text-[10px] font-mono text-stone-500">{currentRotation}°</span>
                  <button
                    onClick={() => setPageRotations(prev => ({ ...prev, [currentPage]: ((prev[currentPage] ?? 0) + 90) % 360 }))}
                    className="p-1.5 hover:bg-stone-50 text-stone-600"
                    title="Rotate page right"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center border border-[#D7D4CA] rounded-lg bg-white shadow-stone-sm">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-1.5 hover:bg-stone-50 text-stone-600 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[10px] font-mono text-stone-700 font-bold">
                  {currentPage}/{totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-1.5 hover:bg-stone-50 text-stone-600 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Parchment Canvas / PDF Viewer Area */}
          <div className="flex-1 bg-stone-100 p-4 overflow-auto flex items-center justify-center">
            {docUrl ? (
              <PdfDocumentViewer
                fileUrl={docUrl}
                contentType={docContentType}
                pageNumber={currentPage}
                zoomLevel={zoomLevel}
                rotation={currentRotation}
                onNumPagesChange={setPdfPageCount}
              />
            ) : (
              <div 
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center top' }}
                className="w-[460px] parchment-canvas border border-[#D7D4CA] p-7 shadow-parchment text-stone-900 space-y-3.5 text-xs select-none transition-transform duration-100 rounded-lg"
              >
                {/* Header Stamp */}
                <div className="text-center border-b border-[#D7D4CA] pb-2.5 space-y-0.5">
                  <div className="text-[9px] uppercase font-bold text-stone-600 tracking-wider">
                    महाराष्ट्र शासन • महसूल विभाग
                  </div>
                  <div className="text-xs font-bold text-stone-950 font-serif">
                    गाव नमुना सात (७/१२) • अधिकार अभिलेख पत्रक
                  </div>
                  <div className="text-[9px] text-stone-500 font-mono">
                    गाव: {fields.village?.officer || 'N/A'} | तालुका: {fields.tehsil?.officer || 'N/A'} | जिल्हा: {fields.districtState?.officer || 'N/A'}
                  </div>
                </div>

                {/* Dynamic Bounding Box Fields */}
                <div className="space-y-2 pt-1 text-[11px]">
                  {/* Survey Number */}
                  <div 
                    className={`flex justify-between border-b border-[#E8E2D5] pb-1 p-1 rounded transition-all ocr-bounding-box ${
                      activeHighlight === 'survey' ? 'active' : ''
                    }`}
                  >
                    <span className="text-stone-600 font-medium">भूमापन क्रमांक (Survey No.):</span>
                    <span className="font-mono font-bold text-stone-950 bg-stone-200/60 px-1 rounded">{fields.surveyNumber?.officer || 'N/A'}</span>
                  </div>

                  {/* Owner */}
                  <div 
                    className={`flex justify-between border-b border-[#E8E2D5] pb-1 p-1 rounded transition-all ocr-bounding-box ${
                      activeHighlight === 'owner' ? 'active' : ''
                    }`}
                  >
                    <span className="text-stone-600 font-medium">खातेदार / भूधारक (Owner):</span>
                    <span className="font-semibold text-stone-950">{fields.ownerName?.officer || 'N/A'}</span>
                  </div>

                  {/* Area */}
                  <div 
                    className={`flex justify-between border-b border-[#E8E2D5] pb-1 p-1 rounded transition-all ocr-bounding-box ${
                      activeHighlight === 'area' ? 'active' : ''
                    }`}
                  >
                    <span className="text-stone-600 font-medium">एकूण क्षेत्र (Total Area):</span>
                    <span className="font-mono font-semibold text-stone-950">{fields.area?.officer || 'N/A'}</span>
                  </div>

                  {/* Mutation */}
                  <div 
                    className={`flex justify-between border-b border-[#E8E2D5] pb-1 p-1 rounded transition-all ocr-bounding-box ${
                      activeHighlight === 'mutation' ? 'active' : 'bg-amber-50/70 border border-amber-300'
                    }`}
                  >
                    <div>
                      <span className="text-amber-900 font-semibold">फेरफार नोंद (Mutation No.):</span>
                    </div>
                    <span className="font-mono font-bold text-amber-950">
                      {fields.mutationNumber?.officer || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Red Talathi Stamp */}
                <div className="pt-4 flex justify-between items-end text-[9px] text-stone-500">
                  <div className="w-16 h-16 rounded-full border border-red-700/80 p-1 flex items-center justify-center text-center text-[7.5px] font-bold text-red-800 rotate-[-10deg] talathi-stamp">
                    तलाठी सजा {fields.village?.officer || 'N/A'} • प्रमाणित
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-stone-800">सत्यापित स्वाक्षरी / तलाठी</div>
                    <div className="font-mono text-[8px] text-stone-400">14/08/2026</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Extracted Information & Verification Controls */}
        <div className="lg:col-span-6 space-y-4">
          {/* Validation Notice Bar */}
          {record.validationFlags.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1 shadow-stone-sm">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-700" />
                <span>Notice: {record.validationFlags[0].message}</span>
              </div>
              {record.validationFlags[0].suggestedAction && (
                <div className="text-[11px] text-amber-800 pl-5 leading-normal">
                  <strong>Recommended Action:</strong> {record.validationFlags[0].suggestedAction}
                </div>
              )}
            </div>
          )}

          {/* Form Comparison Box */}
          <div className="bg-white rounded-xl border border-[#E8E6DF] p-5 space-y-4 shadow-stone-sm">
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900 tracking-tight">
                  AI Extracted Fields vs. Officer Verified Values
                </h2>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Hover over fields to inspect their bounding box on the source parchment.
                </p>
              </div>
              <ConfidenceBadge confidence={record.overallConfidence} />
            </div>

            {/* 1. Owner Name & 2. Co-Owners */}
            <div className="space-y-3">
              <div 
                onMouseEnter={() => setActiveHighlight('owner')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">1. Land Owner Name</span>
                  <ConfidenceBadge confidence={fields.ownerName?.confidence || 0.98} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2 rounded border border-stone-200 text-stone-600">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-semibold text-stone-900">{fields.ownerName?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Officer Verified</span>
                    <input
                      type="text"
                      value={fields.ownerName?.officer || ''}
                      onChange={(e) => handleFieldChange('ownerName', e.target.value)}
                      className="w-full p-1.5 border border-[#D7D4CA] rounded font-semibold text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">2. Co-Owners List (सह-खातेदार)</span>
                  <ConfidenceBadge confidence={fields.coOwners?.confidence || 0.95} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 text-stone-600">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-medium text-stone-900">{fields.coOwners?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.coOwners?.officer || ''}
                      onChange={(e) => handleFieldChange('coOwners', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-medium text-stone-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Survey Number & 4. Khasra Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                onMouseEnter={() => setActiveHighlight('survey')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">3. Survey / Gut No.</span>
                  <ConfidenceBadge confidence={fields.surveyNumber?.confidence || 0.98} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 font-mono text-stone-600">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-bold text-stone-900">{fields.surveyNumber?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.surveyNumber?.officer || ''}
                      onChange={(e) => handleFieldChange('surveyNumber', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-mono font-bold text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">4. Khasra / Plot No.</span>
                  <ConfidenceBadge confidence={fields.khasraNumber?.confidence || 0.95} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 font-mono text-stone-600">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-bold text-stone-900">{fields.khasraNumber?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.khasraNumber?.officer || ''}
                      onChange={(e) => handleFieldChange('khasraNumber', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-mono font-bold text-stone-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Khata Number & 6. Land Holding Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">5. Khata Number</span>
                  <ConfidenceBadge confidence={fields.khataNumber?.confidence || 0.95} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 font-mono text-stone-600 truncate">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-bold text-stone-900">{fields.khataNumber?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.khataNumber?.officer || ''}
                      onChange={(e) => handleFieldChange('khataNumber', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-mono font-bold text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div 
                onMouseEnter={() => setActiveHighlight('area')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">6. Land Holding Area</span>
                  <ConfidenceBadge confidence={fields.area?.confidence || 0.95} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 font-mono text-stone-600">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-bold text-stone-900">{fields.area?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.area?.officer || ''}
                      onChange={(e) => handleFieldChange('area', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-mono font-bold text-stone-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Land Classification & 8. Village */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">7. Land Classification</span>
                  <ConfidenceBadge confidence={fields.landClassification?.confidence || 0.95} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 text-stone-600">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-medium text-stone-900">{fields.landClassification?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.landClassification?.officer || ''}
                      onChange={(e) => handleFieldChange('landClassification', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-medium text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">8. Village (गाव)</span>
                  <ConfidenceBadge confidence={fields.village?.confidence || 0.98} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 text-stone-600">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-semibold text-stone-900">{fields.village?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.village?.officer || ''}
                      onChange={(e) => handleFieldChange('village', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-semibold text-stone-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 9. Tehsil & 10. District & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">9. Tehsil (तालुका)</span>
                  <ConfidenceBadge confidence={fields.tehsil?.confidence || 0.98} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 text-stone-600">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-semibold text-stone-900">{fields.tehsil?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.tehsil?.officer || ''}
                      onChange={(e) => handleFieldChange('tehsil', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-semibold text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">10. District &amp; State</span>
                  <ConfidenceBadge confidence={fields.districtState?.confidence || 0.98} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 text-stone-600">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-semibold text-stone-900">{fields.districtState?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.districtState?.officer || ''}
                      onChange={(e) => handleFieldChange('districtState', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-semibold text-stone-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 11. Mutation Number & 12. Deed Registration Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                onMouseEnter={() => setActiveHighlight('mutation')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">11. Mutation / Ferfar No.</span>
                  <ConfidenceBadge confidence={fields.mutationNumber?.confidence || 0.95} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 font-mono text-stone-600">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-mono font-bold text-stone-900">{fields.mutationNumber?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.mutationNumber?.officer || ''}
                      onChange={(e) => handleFieldChange('mutationNumber', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-mono font-bold text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">12. Deed Registration Info</span>
                  <ConfidenceBadge confidence={fields.registrationInfo?.confidence || 0.95} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-1.5 rounded border border-stone-200 text-stone-600 truncate">
                    <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                    <span className="font-medium text-stone-900">{fields.registrationInfo?.ai}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-mono">Verified</span>
                    <input
                      type="text"
                      value={fields.registrationInfo?.officer || ''}
                      onChange={(e) => handleFieldChange('registrationInfo', e.target.value)}
                      className="w-full p-1 border border-[#D7D4CA] rounded font-medium text-stone-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1 pt-1">
              <label className="block text-stone-800 font-semibold text-xs">
                SDO Verification Remarks & Provenance
              </label>
              <textarea
                value={officerRemarks}
                onChange={(e) => setOfficerRemarks(e.target.value)}
                rows={2}
                className="w-full p-2 border border-[#D7D4CA] rounded-lg text-stone-900 text-xs bg-stone-50/50"
              />
            </div>
          </div>

          {/* Provenance history for this record */}
          <div className="bg-white rounded-xl border border-[#E8E6DF] p-5 shadow-stone-sm">
            <div className="border-b border-stone-100 pb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-terracotta-700" />
              <div>
                <h2 className="text-sm font-bold text-stone-900 tracking-tight">History</h2>
                <p className="text-[11px] text-stone-500">
                  Every recorded action on this record, newest first.
                </p>
              </div>
            </div>

            {auditRows.length === 0 ? (
              <p className="text-[11px] text-stone-500 pt-3">
                No actions recorded against this record yet.
              </p>
            ) : (
              <div className="divide-y divide-stone-100">
                {auditRows.map((row) => (
                  <div key={row.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-terracotta-50 text-terracotta-900 border border-terracotta-200 text-[10px] font-bold">
                        {row.action}
                      </span>
                      <div className="text-[11px] text-stone-600 mt-1 truncate">
                        {row.performed_by}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 flex-shrink-0">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* APPROVE MODAL */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-stone-lg border border-[#E8E6DF] max-w-md w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Certify & Commit Land Record
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                You are certifying Record <strong className="font-mono text-stone-900">{record.id}</strong>. This record will be committed to the official DoLR digital registry.
              </p>
            </div>

            {actionSuccess === 'APPROVED' ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Record Successfully Certified!</span>
              </div>
            ) : (
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 bg-white hover:bg-stone-50 text-stone-700 border border-[#D7D4CA] text-xs font-semibold py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  className="flex-1 bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold py-2 rounded-xl shadow-stone-sm"
                >
                  Confirm Certification
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-stone-lg border border-[#E8E6DF] max-w-md w-full p-6 text-left space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Reject Land Record Submission
                </h3>
                <p className="text-[11px] text-stone-500">Provide official reason to send back to land owner</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block font-medium text-stone-800">Reason</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2 border border-[#D7D4CA] rounded-lg bg-stone-50/50 text-stone-900"
                >
                  <option value="Insufficient document quality">Insufficient document quality / Faded scan</option>
                  <option value="Survey number mismatch with reference data">Survey number mismatch with reference data</option>
                  <option value="Missing authorized signature/seal">Missing authorized signature/seal on RoR</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-stone-800">Remarks for Citizen</label>
                <textarea
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  rows={2}
                  placeholder="Please re-scan Page 2 with adequate lighting..."
                  className="w-full p-2 border border-[#D7D4CA] rounded-lg bg-stone-50/50 text-stone-900"
                  required
                />
              </div>
            </div>

            {actionSuccess === 'REJECTED' ? (
              <div className="p-2.5 bg-rose-50 text-rose-900 border border-rose-200 text-xs font-bold rounded-lg text-center">
                Record Marked as Rejected
              </div>
            ) : (
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 bg-white hover:bg-stone-50 text-stone-700 border border-[#D7D4CA] text-xs font-semibold py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold py-2 rounded-xl shadow-stone-sm"
                >
                  Submit Rejection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
