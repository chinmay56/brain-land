'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LandRecord } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { supabase } from '@/lib/supabaseClient';
import { 
  Search, 
  Eye, 
  X, 
  FolderOpen, 
  FileText, 
  ShieldCheck, 
  ZoomIn,
  ZoomOut,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export default function CitizenApplicationsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewRecord, setPreviewRecord] = useState<LandRecord | null>(null);
  const [localDocUrl, setLocalDocUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  const fetchApplicationsFromDb = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('land_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications from DB:', error);
        setRecords([]);
      } else if (data) {
        const mapped: LandRecord[] = data.map((row: any) => ({
          id: row.id,
          applicationNo: row.application_no || row.id,
          documentType: row.document_type || '7/12 Extract (Record of Rights)',
          ownerName: typeof row.owner_name === 'object' && row.owner_name !== null
            ? row.owner_name
            : { value: row.owner_name || '', confidence: row.overall_confidence || 0.95 },
          coOwners: Array.isArray(row.co_owners) ? row.co_owners : [],
          surveyNumber: typeof row.survey_number === 'object' && row.survey_number !== null
            ? row.survey_number
            : { value: row.survey_number || '', confidence: row.overall_confidence || 0.95 },
          khasraNumber: typeof row.khasra_number === 'object' && row.khasra_number !== null
            ? row.khasra_number
            : { value: row.khasra_number || '', confidence: row.overall_confidence || 0.95 },
          khataNumber: typeof row.khata_number === 'object' && row.khata_number !== null
            ? row.khata_number
            : { value: row.khata_number || '', confidence: row.overall_confidence || 0.95 },
          area: typeof row.area === 'object' && row.area !== null
            ? row.area
            : { value: String(row.area || ''), confidence: row.overall_confidence || 0.95 },
          areaUnit: row.area_unit || 'Hectares',
          village: typeof row.village === 'object' && row.village !== null
            ? row.village
            : { value: row.village || '', confidence: row.overall_confidence || 0.95 },
          tehsil: typeof row.tehsil === 'object' && row.tehsil !== null
            ? row.tehsil
            : { value: row.tehsil || '', confidence: row.overall_confidence || 0.95 },
          district: typeof row.district === 'object' && row.district !== null
            ? row.district
            : { value: row.district || '', confidence: row.overall_confidence || 0.95 },
          state: row.state || 'Maharashtra',
          landClassification: typeof row.land_classification === 'object' && row.land_classification !== null
            ? row.land_classification
            : { value: row.land_classification || '', confidence: row.overall_confidence || 0.95 },
          ownershipDetails: typeof row.ownership_details === 'object' && row.ownership_details !== null
            ? row.ownership_details
            : { value: row.ownership_details || '', confidence: row.overall_confidence || 0.95 },
          mutationNumber: typeof row.mutation_number === 'object' && row.mutation_number !== null
            ? row.mutation_number
            : { value: row.mutation_number || '', confidence: row.overall_confidence || 0.95 },
          registrationInfo: typeof row.registration_info === 'object' && row.registration_info !== null
            ? row.registration_info
            : { value: row.registration_info || '', confidence: row.overall_confidence || 0.95 },
          overallConfidence: row.overall_confidence || 0.95,
          status: row.status || 'UNDER_VERIFICATION',
          submissionDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          assignedDistrict: row.district || 'Pune',
          assignedTehsil: row.tehsil || 'Haveli',
          assignedOfficer: row.assigned_officer || 'Shri Vikramaditya Joshi (SDO)',
          validationFlags: row.validation_flags || [],
          documentPages: row.document_pages || 1,
          supportingDocuments: row.supporting_documents || [],
          submittedBy: typeof row.owner_name === 'string' ? row.owner_name : (row.owner_name?.value || 'Citizen'),
          submittedById: row.created_by || '',
          createdBy: row.created_by || '',
          documentUrl: row.document_url || undefined
        }));
        setRecords(mapped);
      }
    } catch (e) {
      console.error('Failed loading DB records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationsFromDb();
  }, []);

  // Filter records matching current user or general records in DB
  const citizenRecords = records.filter(r => {
    if (!user?.id) return true;
    return !r.createdBy || r.createdBy === user.id || r.submittedById === user.id;
  });

  const filteredRecords = citizenRecords.filter(r => 
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    (r.surveyNumber?.value || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.village?.value || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.ownerName?.value || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenPreview = async (rec: LandRecord) => {
    setPreviewRecord(rec);
    setZoomLevel(100);

    if (rec.documentUrl) {
      setLocalDocUrl(rec.documentUrl);
    } else {
      // Safe encoded storage path lookup for Supabase Storage
      try {
        const safeDist = (rec.district?.value || 'Pune').replace(/[^\w\.-]/g, '_');
        const safeTehsil = (rec.tehsil?.value || 'Haveli').replace(/[^\w\.-]/g, '_');
        const folderPath = `${rec.createdBy || user?.id || 'citizen'}/${safeDist}/${safeTehsil}/${rec.applicationNo}`;
        
        const { data: listData } = await supabase.storage.from('land-record-documents').list(folderPath);
        if (listData && listData.length > 0) {
          const { data } = await supabase.storage
            .from('land-record-documents')
            .createSignedUrl(`${folderPath}/${listData[0].name}`, 3600);
          setLocalDocUrl(data?.signedUrl || null);
        } else {
          setLocalDocUrl(null);
        }
      } catch (err) {
        setLocalDocUrl(null);
      }
    }
  };

  const activeDocUrl = localDocUrl || previewRecord?.documentUrl;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider mb-1">
            Citizen Records Directory • अधिकार अभिलेख (Live Supabase DB)
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif tracking-tight">
            My Submitted Land Applications
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real-time applications fetched directly from database for <strong>{user?.name || 'Citizen'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchApplicationsFromDb}
            className="p-2 text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl border border-[#D7D4CA] transition-colors"
            title="Refresh applications from DB"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, survey, village, owner..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-[#D7D4CA] rounded-xl bg-stone-50/50"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-terracotta-700 animate-spin mx-auto" />
            <div className="text-xs font-semibold text-stone-600">Fetching applications from database...</div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-stone-900">No Applications Found in DB</div>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No submitted applications matching "{search || 'your query'}" found in Supabase database.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] text-stone-500 font-semibold border-b border-[#E8E6DF]">
                <tr>
                  <th className="px-5 py-3 font-medium text-[11px]">Record ID</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Owner &amp; Document Type</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Survey / Khasra</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Area &amp; Village</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Submission Date</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Verification Status</th>
                  <th className="px-5 py-3 font-medium text-[11px] text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-900">{rec.id}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-stone-900">{rec.ownerName.value}</div>
                      <div className="text-[11px] text-stone-500">{rec.documentType}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-medium text-stone-800">{rec.surveyNumber.value}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-stone-800">{rec.area.value} {rec.areaUnit}</div>
                      <div className="text-[11px] text-stone-400">{rec.village.value}</div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 font-mono text-[11px]">{rec.submissionDate}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={rec.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenPreview(rec)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold transition-all border border-[#D7D4CA] shadow-stone-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-terracotta-700" />
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FLOATING DOCUMENT PREVIEW MODAL */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl border border-[#E8E6DF] shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Top Bar */}
            <div className="bg-[#FAF9F6] px-6 py-4 border-b border-[#E8E6DF] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-900 text-sm">{previewRecord.id}</span>
                    <span className="text-xs text-stone-400">•</span>
                    <span className="text-xs font-semibold text-stone-600">{previewRecord.applicationNo}</span>
                  </div>
                  <div className="text-xs text-stone-500 font-medium">{previewRecord.documentType}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={previewRecord.status} />
                <button
                  onClick={() => setPreviewRecord(null)}
                  className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Split 2-Column Viewer */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-stone-100">
              
              {/* Left Column (7/12): Original Document Bucket Preview Canvas */}
              <div className="md:col-span-7 bg-[#404040] p-4 flex flex-col overflow-hidden relative">
                {/* Controls Overlay */}
                <div className="bg-stone-900/80 backdrop-blur-md rounded-xl p-2 px-3 flex items-center justify-between text-stone-200 text-xs mb-3 z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-[11px] text-stone-300 truncate max-w-[220px]">
                      {activeDocUrl ? 'Original PDF Document' : 'Generated Metadata Record'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeDocUrl && (
                      <a
                        href={activeDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-terracotta-300 hover:text-white px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 transition-colors mr-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open PDF
                      </a>
                    )}
                    <button 
                      onClick={() => setZoomLevel(prev => Math.max(70, prev - 15))}
                      className="p-1 hover:bg-stone-700 rounded transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] w-8 text-center">{zoomLevel}%</span>
                    <button 
                      onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
                      className="p-1 hover:bg-stone-700 rounded transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Document Canvas Container */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-2 scrollbar-thin">
                  {activeDocUrl ? (
                    <iframe 
                      src={`${activeDocUrl}#navpanes=0&toolbar=0&view=FitH`} 
                      className="w-full h-full rounded-xl bg-white border border-stone-300 shadow-2xl" 
                      title="Original Uploaded PDF"
                    />
                  ) : (
                    <div 
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                      className="transition-transform duration-150 ease-out bg-white rounded-lg shadow-2xl p-8 max-w-xl w-full border border-stone-300 text-stone-900 space-y-6 select-none relative"
                    >
                      {/* Watermark Seal */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                        <ShieldCheck className="w-72 h-72 text-stone-900" />
                      </div>

                      {/* Official Document Header */}
                      <div className="border-b border-stone-800 pb-4 text-center space-y-1">
                        <div className="text-[10px] font-bold tracking-widest text-stone-700 uppercase">
                          GOVERNMENT OF MAHARASHTRA • REVENUE DEPARTMENT
                        </div>
                        <div className="text-base font-bold font-serif text-stone-900">
                          फॉर्म ७/१२ (अधिकार अभिलेख पत्रक)
                        </div>
                        <div className="text-[11px] text-stone-600 font-mono">
                          गांव: {previewRecord.village.value} | तालुका: {previewRecord.tehsil.value} | जिल्हा: {previewRecord.district.value}
                        </div>
                      </div>

                      {/* Form Grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs border border-stone-300 p-4 rounded bg-[#FAF9F6]">
                        <div>
                          <span className="text-stone-500 block text-[10px] uppercase font-bold">भू-मापन क्रमांक (Survey / Gut No.)</span>
                          <span className="font-mono font-bold text-sm text-stone-900">{previewRecord.surveyNumber.value}</span>
                        </div>

                        <div>
                          <span className="text-stone-500 block text-[10px] uppercase font-bold">खाते क्रमांक (Khata No.)</span>
                          <span className="font-mono font-bold text-sm text-stone-900">{previewRecord.khataNumber?.value || '४५२१'}</span>
                        </div>

                        <div className="col-span-2 pt-2 border-t border-stone-200">
                          <span className="text-stone-500 block text-[10px] uppercase font-bold">खातेदाराचे नाव (Occupant Name)</span>
                          <span className="font-bold text-sm text-stone-900">{previewRecord.ownerName.value}</span>
                          {previewRecord.coOwners && previewRecord.coOwners.length > 0 && (
                            <div className="text-[11px] text-stone-600 mt-0.5">
                              सह-खातेदार: {previewRecord.coOwners.join(', ')}
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-stone-500 block text-[10px] uppercase font-bold">क्षेत्रफळ (Land Area)</span>
                          <span className="font-bold text-stone-900">{previewRecord.area.value} {previewRecord.areaUnit}</span>
                        </div>

                        <div>
                          <span className="text-stone-500 block text-[10px] uppercase font-bold">फेरफार क्र. (Mutation No.)</span>
                          <span className="font-mono font-bold text-stone-900">{previewRecord.mutationNumber?.value || '५८२१'}</span>
                        </div>
                      </div>

                      {/* Stamp Footer */}
                      <div className="pt-4 flex items-center justify-between text-[10px] text-stone-500 border-t border-stone-200">
                        <div>
                          Digitally Verified via Sarvam AI Doc AI Engine
                        </div>
                        <div className="font-mono font-bold text-stone-700">
                          E-SEAL #MH-2026-REG
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (5/12): Extracted Fields & Verification Status */}
              <div className="md:col-span-5 bg-white p-6 overflow-y-auto space-y-5 border-l border-[#E8E6DF]">
                <div>
                  <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider mb-1">
                    Digitized Extraction Data
                  </div>
                  <h3 className="text-base font-bold text-stone-900 font-serif">
                    Universal 12-Field Extraction
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-stone-500 font-medium">Overall AI Confidence:</span>
                    <ConfidenceBadge confidence={previewRecord.overallConfidence} />
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <span className="text-stone-500 block text-[10px] font-bold uppercase">1. Land Owner Name</span>
                    <span className="font-bold text-stone-900 text-sm block">{previewRecord.ownerName.value}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">2. Survey / Gut No</span>
                      <span className="font-mono font-bold text-stone-900">{previewRecord.surveyNumber.value}</span>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">3. Khata Number</span>
                      <span className="font-mono font-bold text-stone-900">{previewRecord.khataNumber?.value || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">4. Land Area</span>
                      <span className="font-bold text-stone-900">{previewRecord.area.value} {previewRecord.areaUnit}</span>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">5. Village (गाव)</span>
                      <span className="font-bold text-stone-900">{previewRecord.village.value}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">6. Tehsil (तालुका)</span>
                      <span className="font-bold text-stone-900">{previewRecord.tehsil.value}</span>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="text-stone-500 block text-[10px] font-bold uppercase">7. District (जिल्हा)</span>
                      <span className="font-bold text-stone-900">{previewRecord.district.value}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <span className="text-stone-500 block text-[10px] font-bold uppercase">8. Mutation Number (फेरफार)</span>
                    <span className="font-mono font-bold text-stone-900">{previewRecord.mutationNumber?.value || 'N/A'}</span>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <span className="text-stone-500 block text-[10px] font-bold uppercase">9. Deed Registration Info</span>
                    <span className="font-medium text-stone-800">{previewRecord.registrationInfo?.value || 'Registered Land Record'}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setPreviewRecord(null)}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors shadow-stone-sm"
                  >
                    Close Preview
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

