'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LandRecord } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { supabase } from '@/lib/supabaseClient';
import { 
  UploadCloud, 
  X, 
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck2,
  Eye,
  ShieldCheck,
  FolderOpen,
  RefreshCw
} from 'lucide-react';

export default function CitizenDashboardPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);

  const fetchUserDashboardFromDb = async () => {
    if (!user?.id) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('land_records')
        .select('*')
        .or(`created_by.eq.${user.id},created_by.is.null`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching citizen dashboard DB records:', error);
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
          assignedOfficer: row.assigned_officer || 'Unassigned Tehsil Pool',
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
      console.error('Citizen dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDashboardFromDb();
  }, [user?.id]);

  const citizenRecords = records;
  const totalSubmitted = citizenRecords.length;
  const inVerification = citizenRecords.filter(r => r.status === 'PENDING_VERIFICATION' || r.status === 'IN_REVIEW' || r.status === 'UNDER_VERIFICATION').length;
  const verifiedCount = citizenRecords.filter(r => r.status === 'VERIFIED').length;
  const flaggedCount = citizenRecords.filter(r => r.status === 'FLAGGED' || (r.validationFlags && r.validationFlags.length > 0 && r.status !== 'VERIFIED')).length;

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider">
            Citizen Workspace • नागरिक पोर्टल (Live Supabase DB)
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight font-serif">
            Welcome, {user?.name || 'Citizen'}
          </h1>
          <div className="text-xs text-stone-500 flex items-center gap-2 pt-0.5">
            <span>District: <strong className="text-stone-700 font-semibold">{user?.district || 'Pune'}</strong></span>
            <span>•</span>
            <span>Aadhaar: <strong className="text-stone-700 font-mono font-semibold">•••• {user?.aadhaarLast4 || '8842'}</strong></span>
          </div>
        </div>

        <button
          onClick={fetchUserDashboardFromDb}
          className="p-2 text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl border border-[#D7D4CA] transition-colors"
          title="Refresh Dashboard from DB"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E8E6DF] shadow-stone-sm space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold text-stone-600">My Submissions</span>
            <FileSpreadsheet className="w-4 h-4 text-stone-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900 tracking-tight font-mono">{totalSubmitted}</div>
          <div className="text-[11px] text-stone-400">Under Your Name</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E8E6DF] shadow-stone-sm space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold text-amber-900">In Verification</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 tracking-tight font-mono">{inVerification}</div>
          <div className="text-[11px] text-amber-700 font-medium">Pending SDO Review</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E8E6DF] shadow-stone-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold text-emerald-900">Verified Records</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 tracking-tight font-mono">{verifiedCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium">Digitized & Certified</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E8E6DF] shadow-stone-sm space-y-1">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-semibold text-rose-900">Action Required</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-900 tracking-tight font-mono">{flaggedCount}</div>
          <div className="text-[11px] text-rose-700 font-medium">Low OCR / Remarks</div>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900 tracking-tight">
              My Digitization & Verification Requests
            </h2>
          </div>
          {citizenRecords.length > 0 && (
            <Link
              href="/citizen/applications"
              className="text-xs font-semibold text-terracotta-700 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-terracotta-700 animate-spin mx-auto" />
            <div className="text-xs font-semibold text-stone-600">Loading your applications from database...</div>
          </div>
        ) : citizenRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-stone-900">No Land Records Submitted Yet</div>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              You haven’t submitted any 7/12 extracts or mutation deeds under your account. Click the button below to upload your first document.
            </p>
            <Link
              href="/citizen/upload"
              className="inline-flex items-center gap-2 bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-stone-sm transition-all mt-2"
            >
              <UploadCloud className="w-4 h-4 text-terracotta-400" />
              <span>Submit Land Record</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] text-stone-500 font-semibold border-b border-[#E8E6DF]">
                <tr>
                  <th className="px-5 py-3 font-medium text-[11px]">Record ID</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Document</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Survey / Khasra</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Area & Village</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Date</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Status</th>
                  <th className="px-5 py-3 font-medium text-[11px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {citizenRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-stone-900">
                      {rec.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-stone-900">{rec.documentType}</div>
                      <div className="text-[11px] text-stone-400">{rec.documentPages} pages</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-semibold text-stone-800">{rec.surveyNumber.value}</div>
                      {rec.khasraNumber && (
                        <div className="text-[11px] text-stone-400 font-mono">Khasra: {rec.khasraNumber.value}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-stone-800">{rec.area.value} {rec.areaUnit}</div>
                      <div className="text-[11px] text-stone-400">{rec.village.value}</div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 font-mono text-[11px]">
                      {rec.submissionDate}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className="inline-flex items-center gap-1 bg-stone-50 hover:bg-stone-100 text-stone-900 px-2.5 py-1.5 rounded-lg font-medium text-xs border border-[#D7D4CA] transition-all shadow-stone-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-terracotta-700" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-stone-lg border border-[#E8E6DF] max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">Application Summary</span>
                <h3 className="text-base font-bold text-stone-900">
                  {selectedRecord.id} — {selectedRecord.documentType}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Timeline */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E8E6DF]">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2.5">
                Lifecycle Progression
              </div>
              <div className="flex items-center justify-between text-center">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span className="text-[10px] font-semibold text-stone-800 mt-1">Submitted</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span className="text-[10px] font-semibold text-stone-800 mt-1">OCR Extracted</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span className="text-[10px] font-semibold text-stone-800 mt-1">Rules Validated</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    selectedRecord.status === 'VERIFIED' ? 'bg-emerald-700 text-white' : 'bg-amber-600 text-white animate-pulse'
                  }`}>
                    {selectedRecord.status === 'VERIFIED' ? '✓' : '●'}
                  </div>
                  <span className="text-[10px] font-semibold text-stone-800 mt-1">SDO Review</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    selectedRecord.status === 'VERIFIED' ? 'bg-emerald-700 text-white' : 'bg-stone-200 text-stone-400'
                  }`}>
                    {selectedRecord.status === 'VERIFIED' ? '✓' : '○'}
                  </div>
                  <span className="text-[10px] font-semibold text-stone-800 mt-1">Certified</span>
                </div>
              </div>
            </div>

            {/* Extracted Details Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-400 block text-[10px]">Land Owner:</span>
                <span className="font-semibold text-stone-900">{selectedRecord.ownerName.value}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-400 block text-[10px]">Survey Number:</span>
                <span className="font-mono font-bold text-stone-900">{selectedRecord.surveyNumber.value}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-400 block text-[10px]">Land Area:</span>
                <span className="font-semibold text-stone-900">{selectedRecord.area.value} {selectedRecord.areaUnit}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-400 block text-[10px]">Location:</span>
                <span className="font-semibold text-stone-900">{selectedRecord.village.value}, {selectedRecord.tehsil.value}</span>
              </div>
            </div>

            {/* Officer Remarks */}
            {selectedRecord.officerRemarks && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-terracotta-700" />
                  <span>Officer Remark ({selectedRecord.assignedOfficer}):</span>
                </div>
                <div className="text-stone-600 mt-1 italic text-[11px]">
                  "{selectedRecord.officerRemarks}"
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedRecord(null)}
                className="bg-[#141416] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-stone-800 transition-colors"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
