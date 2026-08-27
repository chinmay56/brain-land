'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
  Check
} from 'lucide-react';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { LandRecord } from '@/types';

export default function CitizenUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'processing' | 'preview'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [extractedData, setExtractedData] = useState({
    ownerName: user?.name || 'Chinmay Narendra Ghag',
    surveyNumber: '124/2',
    khasraNumber: 'K-4821',
    khataNumber: 'KH-1024',
    area: '2.45',
    areaUnit: 'Hectares',
    village: 'Hadapsar',
    tehsil: 'Haveli',
    district: 'Pune',
    state: 'Maharashtra',
    mutationNumber: '58?1',
    landClassification: 'Jirayat (Agricultural Dry)',
  });

  const [proposedData, setProposedData] = useState({ ...extractedData });
  const [isEditing, setIsEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleStartProcessing = () => {
    if (!selectedFile) return;
    setStep('processing');
    setTimeout(() => {
      setStep('preview');
    }, 2000);
  };

  const handleSubmitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const newRecordId = `LR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord: LandRecord = {
      id: newRecordId,
      applicationNo: `APP-MH-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      documentType: '7/12 Extract (Record of Rights)',
      ownerName: { value: proposedData.ownerName || user?.name || 'Citizen', confidence: 0.98 },
      surveyNumber: { value: proposedData.surveyNumber, confidence: 0.96 },
      khasraNumber: { value: proposedData.khasraNumber, confidence: 0.92 },
      khataNumber: { value: proposedData.khataNumber, confidence: 0.89 },
      area: { value: proposedData.area, confidence: 0.99 },
      areaUnit: 'Hectares',
      village: { value: proposedData.village, confidence: 0.98 },
      tehsil: { value: proposedData.tehsil, confidence: 0.96 },
      district: { value: proposedData.district, confidence: 0.99 },
      state: 'Maharashtra',
      landClassification: { value: proposedData.landClassification, confidence: 0.94 },
      mutationNumber: { value: proposedData.mutationNumber, confidence: isEditing ? 0.95 : 0.58, isFlagged: !isEditing },
      overallConfidence: 0.88,
      status: 'UNDER_VERIFICATION',
      submissionDate: new Date().toISOString().split('T')[0],
      assignedOfficer: 'SDO Pune Haveli',
      validationFlags: [
        {
          id: 'VF-NEW',
          field: 'mutationNumber',
          severity: isEditing ? 'INFO' : 'WARNING',
          message: isEditing ? 'Citizen provided physical deed clarification.' : 'Low OCR confidence on mutation numeral.',
        }
      ],
      documentPages: 2,
    };

    // Prepend to active in-memory list
    MOCK_RECORDS.unshift(newRecord);

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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-1">
        <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider">
          Step-by-Step Digitization
        </div>
        <h1 className="text-xl font-bold text-stone-900 tracking-tight font-serif">
          Upload & Digitize Land Record
        </h1>
        <p className="text-xs text-stone-500">
          Convert your scanned land deed into an officer-verified digital land record
        </p>
      </div>

      {/* Stepper Header */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-[#E8E6DF] shadow-stone-sm text-xs font-medium">
        <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-stone-950 font-bold' : 'text-emerald-700'}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
            step === 'upload' ? 'bg-[#141416] text-white' : 'bg-emerald-700 text-white'
          }`}>1</div>
          <span>Select Document</span>
        </div>
        <span className="text-stone-300">———</span>
        <div className={`flex items-center gap-2 ${step === 'processing' ? 'text-stone-950 font-bold' : step === 'preview' ? 'text-emerald-700 font-semibold' : 'text-stone-400'}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
            step === 'processing' ? 'bg-[#141416] text-white' : step === 'preview' ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-500'
          }`}>2</div>
          <span>AI OCR & Extraction</span>
        </div>
        <span className="text-stone-300">———</span>
        <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-stone-950 font-bold' : 'text-stone-400'}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
            step === 'preview' ? 'bg-[#141416] text-white' : 'bg-stone-100 text-stone-500'
          }`}>3</div>
          <span>Review & Submit</span>
        </div>
      </div>

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
                7/12 extracts, Sale Deeds, Khasra registers, and Patta (PDF, JPG, PNG up to 25MB)
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
                      {formatFileSize(selectedFile.size)} • Ready for AI OCR
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
                  <span>Process Document with AI OCR</span>
                  <ArrowRight className="w-3.5 h-3.5 text-terracotta-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: AI Processing */}
      {step === 'processing' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 border border-[#E8E6DF] flex items-center justify-center mx-auto animate-spin">
            <Cpu className="w-6 h-6 text-terracotta-700" />
          </div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight">
            Analyzing Land Record with Sarvam AI Vision...
          </h2>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Extracting Devanagari script, Marathi survey numbers, owner holding details, and calculating field certainty scores.
          </p>
        </div>
      )}

      {/* STEP 3: Preview Extracted Fields */}
      {step === 'preview' && (
        <form onSubmit={handleSubmitVerification} className="space-y-5">
          {/* Validation Notice */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 flex items-start gap-3 shadow-stone-sm">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900">Notice: 1 Field Flagged for Review</div>
              <div className="text-amber-800 text-[11px] mt-0.5">
                Mutation number <strong className="font-mono">58?1</strong> has 58% confidence due to a faint ink mark on Page 2. You can propose the correct value below.
              </div>
            </div>
          </div>

          {/* Form Box */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-stone-900 tracking-tight">
                  Extracted Land Record Details
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Review extracted fields before submitting for SDO officer certification
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1 text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 bg-terracotta-50 px-2.5 py-1 rounded-lg border border-terracotta-200 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Propose Changes'}</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-stone-500 block">Land Owner / Pattadar</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.ownerName}
                  onChange={(e) => setProposedData({ ...proposedData, ownerName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 font-semibold disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-stone-500">Survey / Gat Number</label>
                  <ConfidenceBadge confidence={96} size="sm" />
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.surveyNumber}
                  onChange={(e) => setProposedData({ ...proposedData, surveyNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-mono text-stone-900 font-bold disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 block">Total Area (Hectares)</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.area}
                  onChange={(e) => setProposedData({ ...proposedData, area: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-mono text-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-stone-500">Mutation Register No.</label>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                    58% Flagged
                  </span>
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.mutationNumber}
                  onChange={(e) => setProposedData({ ...proposedData, mutationNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-xl font-mono text-stone-900 ${
                    isEditing ? 'border-amber-400 bg-amber-50/40' : 'border-rose-300 bg-rose-50/40 font-bold text-rose-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 block">Village</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.village}
                  onChange={(e) => setProposedData({ ...proposedData, village: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 block">Tehsil</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={proposedData.tehsil}
                  onChange={(e) => setProposedData({ ...proposedData, tehsil: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 disabled:bg-stone-50"
                />
              </div>
            </div>

            {isEditing && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                <div className="font-semibold">Reason for Proposed Correction:</div>
                <input
                  type="text"
                  placeholder="e.g. Corrected mutation number from 58?1 to 5821 as per original physical deed"
                  className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-stone-900 bg-white"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
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
                    <span>Submitted to Revenue Officer Queue!</span>
                  </>
                ) : (
                  <>
                    <span>Submit to Revenue Officer for Verification</span>
                    <ArrowRight className="w-3.5 h-3.5 text-terracotta-400" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
