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
  Check,
  PlusCircle,
  ShieldCheck,
  Layers,
  MapPin,
  FileBadge
} from 'lucide-react';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { LandRecord, FieldConfidence } from '@/types';

export default function CitizenUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportingFileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'processing' | 'preview'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    supporting_documents: []
  });

  const [proposedData, setProposedData] = useState({ ...extractedData });

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

  // Real AI Extraction API Call
  const handleStartProcessing = async () => {
    if (!selectedFile) return;
    setStep('processing');
    setProcessingStatus('Connecting to Sarvam AI Document Intelligence API (/job/extract)...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setProcessingStatus('Passing Universal 12-Field Schema with strict disambiguation rules...');
      
      const res = await fetch('http://localhost:8000/api/extraction/process', {
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
          supporting_documents: [selectedFile.name]
        };

        setExtractedData(populated);
        setProposedData(populated);
      } else {
        console.error('Backend extraction error:', res.statusText);
      }
    } catch (err) {
      console.error('API connection error:', err);
    } finally {
      setTimeout(() => {
        setStep('preview');
      }, 1000);
    }
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

        const res = await fetch('http://localhost:8000/api/extraction/process', {
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
      submittedById: user?.id || 'usr_cit_001'
    };

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

    // Save to FastAPI backend if available
    try {
      await fetch('http://localhost:8000/api/land-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });
    } catch (err) {
      console.warn('Backend sync warning:', err);
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

      {/* STEP 3: Preview the 12 SIH Fields */}
      {step === 'preview' && (
        <form onSubmit={handleSubmitVerification} className="space-y-5">
          {/* Record Completeness Bar */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900">
                  Digitization Completeness: {completeness.percentage}% ({completeness.filled}/{completeness.total} Fields Populated)
                </span>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Source: {proposedData.supporting_documents.join(' + ') || selectedFile?.name}
                </div>
              </div>

              {/* Upload Supporting Document to fill remaining nulls */}
              <div>
                <input 
                  type="file"
                  ref={supportingFileInputRef}
                  onChange={handleSupportingFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => supportingFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-terracotta-50 hover:bg-terracotta-100 text-terracotta-800 border border-terracotta-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors shadow-stone-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Supporting Deed (Sale Deed / 8A)</span>
                </button>
              </div>
            </div>

            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
          </div>

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
                  {proposedData.owner_name?.confidence > 0 && (
                    <ConfidenceBadge confidence={Math.round(proposedData.owner_name.confidence * 100)} size="sm" />
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
                2. Cadastral & Spatial Identifiers (GIS Ready)
              </h3>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-stone-500 font-medium">3. Survey / Gut Number</label>
                  {proposedData.survey_number?.confidence > 0 && (
                    <ConfidenceBadge confidence={Math.round(proposedData.survey_number.confidence * 100)} size="sm" />
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
                  {proposedData.khasra_number?.confidence > 0 && (
                    <ConfidenceBadge confidence={Math.round(proposedData.khasra_number.confidence * 100)} size="sm" />
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
                  {proposedData.khata_number?.confidence > 0 && (
                    <ConfidenceBadge confidence={Math.round(proposedData.khata_number.confidence * 100)} size="sm" />
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
                  {proposedData.area?.confidence > 0 && (
                    <ConfidenceBadge confidence={Math.round(proposedData.area.confidence * 100)} size="sm" />
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
                  {proposedData.land_classification?.confidence > 0 && (
                    <ConfidenceBadge confidence={Math.round(proposedData.land_classification.confidence * 100)} size="sm" />
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
                  {proposedData.mutation_number?.confidence > 0 && (
                    <ConfidenceBadge confidence={Math.round(proposedData.mutation_number.confidence * 100)} size="sm" />
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
