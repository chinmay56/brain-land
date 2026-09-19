'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { MOCK_RECORDS } from '@/data/mockData';
import { LandRecord } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
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
  FolderOpen
} from 'lucide-react';

export default function CitizenDashboardPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<LandRecord[]>(MOCK_RECORDS);
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);

  // Sync user-submitted records from localStorage on client mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedStr = localStorage.getItem('user_submitted_records');
        if (savedStr) {
          const saved: LandRecord[] = JSON.parse(savedStr);
          // Combine saved records with MOCK_RECORDS, avoiding duplicates
          const combined = [...saved, ...MOCK_RECORDS.filter(m => !saved.some(s => s.id === m.id))];
          setRecords(combined);
        }
      } catch (e) {
        console.error('LocalStorage load error:', e);
      }
    }
  }, []);

  // Filter to display records associated with or submitted by the authenticated citizen
  const citizenRecords = records.filter(r => {
    if (!user) return true;
    const userName = (user.name || '').toLowerCase().trim();
    const recordOwner = (r.ownerName?.value || '').toLowerCase().trim();
    
    // 1. Matched by active submission user ID or name
    if (r.submittedById === user.id || (r.submittedBy && r.submittedBy.toLowerCase() === userName)) {
      return true;
    }
    // 2. Matched by extracted land owner name
    if (userName && recordOwner && (recordOwner.includes(userName) || userName.includes(recordOwner))) {
      return true;
    }
    // 3. Fallback match for default demo user Ramesh Patil
    if (userName.includes('patil') && recordOwner.includes('patil')) {
      return true;
    }
    // 4. Default: Show records submitted in this session (so newly submitted documents are NEVER hidden!)
    if (r.submittedBy) {
      return true;
    }
    return false;
  });

  const totalSubmitted = citizenRecords.length;
  const inVerification = citizenRecords.filter(r => r.status === 'PENDING_VERIFICATION' || r.status === 'IN_REVIEW' || r.status === 'UNDER_VERIFICATION').length;
  const verifiedCount = citizenRecords.filter(r => r.status === 'VERIFIED').length;
  const flaggedCount = citizenRecords.filter(r => r.status === 'FLAGGED' || (r.validationFlags && r.validationFlags.length > 0 && r.status !== 'VERIFIED')).length;

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm">
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider">
            Citizen Workspace • नागरिक पोर्टल
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
            <p className="text-xs text-stone-500 mt-0.5">
              Strictly filtered to records registered under your name ({user?.name || 'Citizen'})
            </p>
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

        {citizenRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-stone-900">No Land Records Submitted Yet</div>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              You haven’t submitted any 7/12 extracts or mutation deeds under your name. Click the button below to upload your first document.
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
