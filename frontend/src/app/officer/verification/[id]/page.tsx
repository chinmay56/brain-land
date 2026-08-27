'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MOCK_RECORDS } from '@/data/mockData';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
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
  Check
} from 'lucide-react';

export default function OfficerVerificationWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const recordId = (params?.id as string) || 'LR-2026-1021';
  const record = MOCK_RECORDS.find(r => r.id === recordId) || MOCK_RECORDS[0];

  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  const [fields, setFields] = useState({
    ownerName: { ai: record.ownerName.value, officer: record.ownerName.value, confidence: record.ownerName.confidence },
    surveyNumber: { ai: record.surveyNumber.value, officer: record.surveyNumber.value, confidence: record.surveyNumber.confidence },
    khasraNumber: { ai: record.khasraNumber?.value || 'K-4821', officer: record.khasraNumber?.value || 'K-4821', confidence: record.khasraNumber?.confidence || 0.92 },
    area: { ai: record.area.value, officer: record.area.value, confidence: record.area.confidence },
    mutationNumber: { ai: record.mutationNumber?.value || '58?1', officer: '5821', confidence: record.mutationNumber?.confidence || 0.58 },
    village: { ai: record.village.value, officer: record.village.value, confidence: record.village.confidence },
    tehsil: { ai: record.tehsil.value, officer: record.tehsil.value, confidence: record.tehsil.confidence },
    district: { ai: record.district.value, officer: record.district.value, confidence: record.district.confidence },
  });

  const [officerRemarks, setOfficerRemarks] = useState('Verified against physical register Volume 14 and Mutation Entry 5821.');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Insufficient document quality');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [actionSuccess, setActionSuccess] = useState<'APPROVED' | 'REJECTED' | null>(null);

  const handleFieldChange = (fieldKey: keyof typeof fields, newValue: string) => {
    setFields(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        officer: newValue,
      }
    }));
  };

  const handleApprove = () => {
    setActionSuccess('APPROVED');
    setTimeout(() => {
      setShowApproveModal(false);
      router.push('/officer/dashboard');
    }, 1200);
  };

  const handleReject = () => {
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
        </div>
      </div>

      {/* Split-Screen Workspace */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: Document Parchment Viewer */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#E8E6DF] shadow-stone-sm flex flex-col h-[740px] overflow-hidden">
          {/* Document Viewer Toolbar */}
          <div className="px-4 py-3 bg-[#FAF9F6] border-b border-[#E8E6DF] flex items-center justify-between text-xs text-stone-700">
            <div className="flex items-center gap-2 font-medium">
              <FileText className="w-4 h-4 text-terracotta-700" />
              <span className="font-bold text-stone-900">Original Document Canvas</span>
              <span className="text-[10px] text-stone-400 font-mono">({record.documentPages || 4} Pages)</span>
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

              <div className="flex items-center border border-[#D7D4CA] rounded-lg bg-white shadow-stone-sm">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-1.5 hover:bg-stone-50 text-stone-600 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[10px] font-mono text-stone-700 font-bold">
                  {currentPage}/{record.documentPages || 4}
                </span>
                <button
                  disabled={currentPage >= (record.documentPages || 4)}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-1.5 hover:bg-stone-50 text-stone-600 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Parchment Canvas Area */}
          <div className="flex-1 bg-stone-100 p-6 overflow-auto flex items-center justify-center">
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
                  गाव: हडपसर | तालुका: हवेली | जिल्हा: पुणे
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
                  <span className="font-mono font-bold text-stone-950 bg-stone-200/60 px-1 rounded">124 / 2</span>
                </div>

                {/* Owner */}
                <div 
                  className={`flex justify-between border-b border-[#E8E2D5] pb-1 p-1 rounded transition-all ocr-bounding-box ${
                    activeHighlight === 'owner' ? 'active' : ''
                  }`}
                >
                  <span className="text-stone-600 font-medium">खातेदार / भूधारक (Owner):</span>
                  <span className="font-semibold text-stone-950">रमेश बळीराम पाटील</span>
                </div>

                {/* Area */}
                <div 
                  className={`flex justify-between border-b border-[#E8E2D5] pb-1 p-1 rounded transition-all ocr-bounding-box ${
                    activeHighlight === 'area' ? 'active' : ''
                  }`}
                >
                  <span className="text-stone-600 font-medium">एकूण क्षेत्र (Total Area):</span>
                  <span className="font-mono font-semibold text-stone-950">२.४५ हेक्टर (2.45 Ha)</span>
                </div>

                {/* Mutation (Flagged) */}
                <div 
                  className={`flex justify-between border-b border-[#E8E2D5] pb-1 p-1 rounded transition-all ocr-bounding-box ${
                    activeHighlight === 'mutation' ? 'active' : 'bg-amber-50/70 border border-amber-300'
                  }`}
                >
                  <div>
                    <span className="text-amber-900 font-semibold">फेरफार नोंद (Mutation No.):</span>
                    <div className="text-[9px] text-amber-700">Faint ink mark on page margin</div>
                  </div>
                  <span className="font-mono font-bold text-amber-950 line-through decoration-rose-500">
                    58?1
                  </span>
                </div>

                {/* Classification */}
                <div className="flex justify-between border-b border-[#E8E2D5] pb-1 p-1">
                  <span className="text-stone-600">जमिनीचे वर्गीकरण (Type):</span>
                  <span className="font-medium text-stone-800">जिरायत (Agricultural Dry)</span>
                </div>
              </div>

              {/* Red Talathi Stamp */}
              <div className="pt-4 flex justify-between items-end text-[9px] text-stone-500">
                <div className="w-16 h-16 rounded-full border border-red-700/80 p-1 flex items-center justify-center text-center text-[7.5px] font-bold text-red-800 rotate-[-10deg] talathi-stamp">
                  तलाठी सजा हडपसर • प्रमाणित
                </div>
                <div className="text-right">
                  <div className="font-semibold text-stone-800">सत्यापित स्वाक्षरी / तलाठी</div>
                  <div className="font-mono text-[8px] text-stone-400">14/08/2026</div>
                </div>
              </div>
            </div>
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

            {/* Owner Name */}
            <div 
              onMouseEnter={() => setActiveHighlight('owner')}
              onMouseLeave={() => setActiveHighlight(null)}
              className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-800">Land Owner Name</span>
                <ConfidenceBadge confidence={fields.ownerName.confidence} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded border border-stone-200 text-stone-600">
                  <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                  <span className="font-medium text-stone-900">{fields.ownerName.ai}</span>
                </div>
                <div>
                  <span className="text-[9px] text-stone-400 block font-mono">Officer Verified</span>
                  <input
                    type="text"
                    value={fields.ownerName.officer}
                    onChange={(e) => handleFieldChange('ownerName', e.target.value)}
                    className="w-full p-1.5 border border-[#D7D4CA] rounded font-medium text-stone-900"
                  />
                </div>
              </div>
            </div>

            {/* Survey Number */}
            <div 
              onMouseEnter={() => setActiveHighlight('survey')}
              onMouseLeave={() => setActiveHighlight(null)}
              className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-800">Survey / Sub-Division No.</span>
                <ConfidenceBadge confidence={fields.surveyNumber.confidence} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded border border-stone-200 font-mono text-stone-600">
                  <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                  <span className="font-bold text-stone-900">{fields.surveyNumber.ai}</span>
                </div>
                <div>
                  <span className="text-[9px] text-stone-400 block font-mono">Officer Verified</span>
                  <input
                    type="text"
                    value={fields.surveyNumber.officer}
                    onChange={(e) => handleFieldChange('surveyNumber', e.target.value)}
                    className="w-full p-1.5 border border-[#D7D4CA] rounded font-mono font-bold text-stone-900"
                  />
                </div>
              </div>
            </div>

            {/* Area */}
            <div 
              onMouseEnter={() => setActiveHighlight('area')}
              onMouseLeave={() => setActiveHighlight(null)}
              className="p-3 rounded-lg border border-stone-200 hover:border-terracotta-500 bg-stone-50/40 transition-colors space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-800">Land Holding Area</span>
                <ConfidenceBadge confidence={fields.area.confidence} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded border border-stone-200 font-mono text-stone-600">
                  <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                  <span className="font-semibold text-stone-900">{fields.area.ai} Ha</span>
                </div>
                <div>
                  <span className="text-[9px] text-stone-400 block font-mono">Officer Verified</span>
                  <input
                    type="text"
                    value={fields.area.officer}
                    onChange={(e) => handleFieldChange('area', e.target.value)}
                    className="w-full p-1.5 border border-[#D7D4CA] rounded font-mono font-semibold text-stone-900"
                  />
                </div>
              </div>
            </div>

            {/* Mutation Number (Corrected) */}
            <div 
              onMouseEnter={() => setActiveHighlight('mutation')}
              onMouseLeave={() => setActiveHighlight(null)}
              className="p-3 rounded-lg border border-amber-300 bg-amber-50/40 transition-colors space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>Mutation / Ferfar Number</span>
                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                    Officer Corrected
                  </span>
                </span>
                <ConfidenceBadge confidence={fields.mutationNumber.confidence} isFlagged />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded border border-amber-200 font-mono text-stone-400 line-through">
                  <span className="text-[9px] text-stone-400 block font-mono">Raw AI OCR</span>
                  {fields.mutationNumber.ai}
                </div>
                <div>
                  <span className="text-[9px] text-emerald-800 block font-mono font-bold">SDO Corrected Value</span>
                  <input
                    type="text"
                    value={fields.mutationNumber.officer}
                    onChange={(e) => handleFieldChange('mutationNumber', e.target.value)}
                    className="w-full p-1.5 border-2 border-emerald-600 rounded font-mono font-bold text-emerald-950 bg-emerald-50/60"
                  />
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
