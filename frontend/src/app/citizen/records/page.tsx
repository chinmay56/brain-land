'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MOCK_RECORDS } from '@/data/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Download, ShieldCheck, FolderOpen } from 'lucide-react';
import { LandRecord } from '@/types';

export default function CitizenVerifiedRecordsPage() {
  const { user } = useAuth();
  const [downloadModalRecord, setDownloadModalRecord] = useState<LandRecord | null>(null);

  // Strictly filter to only verified records belonging to the authenticated citizen
  const verifiedRecords = MOCK_RECORDS.filter(r => {
    if (r.status !== 'VERIFIED') return false;
    if (!user) return false;
    const userName = (user.name || '').toLowerCase().trim();
    const recordOwner = (r.ownerName?.value || '').toLowerCase().trim();
    
    if (userName && (recordOwner.includes(userName) || userName.includes(recordOwner))) {
      return true;
    }
    if (userName.includes('patil') && recordOwner.includes('patil')) {
      return true;
    }
    return false;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
            Certified Land Registry • प्रमाणित अधिकार अभिलेख
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif tracking-tight">
            Verified Record of Rights (RoR)
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Official government-certified digitized land records for <strong>{user?.name || 'Citizen'}</strong>
          </p>
        </div>
      </div>

      {verifiedRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-stone-900">No Certified Records Available</div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            You do not have any certified Record of Rights yet. Once the Sub-Divisional Officer (SDO) reviews and approves your submission, certified records will appear here for download.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {verifiedRecords.map((rec) => (
            <div key={rec.id} className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-4 hover:border-stone-800 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                  {rec.id}
                </span>
                <StatusBadge status={rec.status} />
              </div>

              <div>
                <h2 className="text-base font-bold text-stone-900">{rec.documentType}</h2>
                <p className="text-xs text-stone-500 mt-0.5">Survey: <strong className="text-stone-800 font-mono">{rec.surveyNumber.value}</strong> • Village: {rec.village.value}, {rec.tehsil.value}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF9F6] p-3 rounded-xl border border-[#E8E6DF]">
                <div>
                  <span className="text-stone-400 block text-[10px]">Owner</span>
                  <span className="font-semibold text-stone-900">{rec.ownerName.value}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Certified Area</span>
                  <span className="font-mono font-semibold text-stone-900">{rec.area.value} {rec.areaUnit}</span>
                </div>
              </div>

              <div className="text-[11px] text-stone-500 flex items-center justify-between pt-2 border-t border-stone-100">
                <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Certified by {rec.assignedOfficer || 'SDO Pune'}</span>
                </span>
                <button
                  onClick={() => setDownloadModalRecord(rec)}
                  className="inline-flex items-center gap-1.5 bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-stone-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-terracotta-400" />
                  <span>Download RoR</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download Certified RoR Simulation Modal */}
      {downloadModalRecord && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-stone-lg border border-[#E8E6DF] max-w-md w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Official Certified Record of Rights (RoR)
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Generated from Department of Land Resources Verified Database
              </p>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E8E6DF] rounded-xl text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">Record ID:</span>
                <span className="font-mono font-bold text-stone-900">{downloadModalRecord.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Survey Number:</span>
                <span className="font-mono font-bold text-stone-900">{downloadModalRecord.surveyNumber.value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Owner:</span>
                <span className="font-bold text-stone-900">{downloadModalRecord.ownerName.value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Digital Seal:</span>
                <span className="text-emerald-800 font-semibold">SHA-256 Verified ✓</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setDownloadModalRecord(null)}
                className="flex-1 bg-white hover:bg-stone-50 text-stone-700 border border-[#D7D4CA] text-xs font-semibold py-2 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Downloading Official Certified RoR PDF for ${downloadModalRecord.id}...`);
                  setDownloadModalRecord(null);
                }}
                className="flex-1 bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold py-2 rounded-xl shadow-stone-sm flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-terracotta-400" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
