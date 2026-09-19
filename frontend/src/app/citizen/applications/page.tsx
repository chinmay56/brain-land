'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { MOCK_RECORDS } from '@/data/mockData';
import { LandRecord } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Search, Eye, ArrowLeft, UploadCloud, FolderOpen } from 'lucide-react';

export default function CitizenApplicationsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<LandRecord[]>(MOCK_RECORDS);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedStr = localStorage.getItem('user_submitted_records');
        if (savedStr) {
          const saved: LandRecord[] = JSON.parse(savedStr);
          const combined = [...saved, ...MOCK_RECORDS.filter(m => !saved.some(s => s.id === m.id))];
          setRecords(combined);
        }
      } catch (e) {
        console.error('LocalStorage load error:', e);
      }
    }
  }, []);

  // Isolate records to only those belonging to or submitted by the authenticated citizen
  const citizenRecords = records.filter(r => {
    if (!user) return true;
    const userName = (user.name || '').toLowerCase().trim();
    const recordOwner = (r.ownerName?.value || '').toLowerCase().trim();
    
    if (r.submittedById === user.id || (r.submittedBy && r.submittedBy.toLowerCase() === userName)) {
      return true;
    }
    if (userName && recordOwner && (recordOwner.includes(userName) || userName.includes(recordOwner))) {
      return true;
    }
    if (userName.includes('patil') && recordOwner.includes('patil')) {
      return true;
    }
    if (r.submittedBy) {
      return true;
    }
    return false;
  });

  const filteredRecords = citizenRecords.filter(r => 
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.surveyNumber.value.toLowerCase().includes(search.toLowerCase()) ||
    r.village.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider mb-1">
            Citizen Records Directory • अधिकार अभिलेख
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif tracking-tight">
            My Submitted Land Applications
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Complete verification history for records registered under <strong>{user?.name || 'Citizen'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, survey, village..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-[#D7D4CA] rounded-xl bg-stone-50/50"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
          </div>
          <Link
            href="/citizen/upload"
            className="bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-stone-sm transition-colors whitespace-nowrap"
          >
            + Upload New
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-stone-900">No Records Found</div>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No submitted applications matching "{search || 'your profile'}".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] text-stone-500 font-semibold border-b border-[#E8E6DF]">
                <tr>
                  <th className="px-5 py-3 font-medium text-[11px]">Record ID</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Document Type</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Survey / Khasra</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Area & Village</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Submission Date</th>
                  <th className="px-5 py-3 font-medium text-[11px]">Verification Status</th>
                  <th className="px-5 py-3 font-medium text-[11px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-900">{rec.id}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-stone-900">{rec.documentType}</div>
                      <div className="text-[11px] text-stone-400">{rec.documentPages} pages</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-medium text-stone-800">{rec.surveyNumber.value}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-stone-800">{rec.area.value} {rec.areaUnit}</div>
                      <div className="text-[11px] text-stone-400">{rec.village.value}</div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 font-mono text-[11px]">{rec.submissionDate}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={rec.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href="/citizen/dashboard"
                        className="text-stone-900 font-bold hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
