'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { MOCK_RECORDS } from '@/data/mockData';
import { LandRecord } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Clock, 
  Search, 
  ArrowRight, 
  CheckCircle,
  Eye,
  SlidersHorizontal
} from 'lucide-react';

export default function OfficerDashboardPage() {
  const { user } = useAuth();
  const [records] = useState<LandRecord[]>(MOCK_RECORDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'LOW_CONFIDENCE' | 'CONFLICTS' | 'VERIFIED'>('ALL');

  const filteredRecords = records.filter(rec => {
    const matchesSearch = 
      rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.ownerName.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.surveyNumber.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.village.value.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'PENDING') return rec.status === 'UNDER_VERIFICATION';
    if (activeFilter === 'LOW_CONFIDENCE') return rec.overallConfidence < 0.75;
    if (activeFilter === 'CONFLICTS') return rec.validationFlags.some(f => f.severity === 'CONFLICT');
    if (activeFilter === 'VERIFIED') return rec.status === 'VERIFIED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Executive Welcome Bar */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-terracotta-700" />
            <span>Revenue Officer Console • राजस्व सत्यापन अधिकारी</span>
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight font-serif">
            {user?.name || 'Shri Vikramaditya Joshi'}
          </h1>
          <p className="text-xs text-stone-500">
            {user?.designation || 'Sub-Divisional Revenue Officer (SDO)'} • {user?.district || 'Pune Division'} • ID: <strong className="font-mono text-stone-800">{user?.employeeId || 'REV-MH-PN-4091'}</strong>
          </p>
        </div>

        <Link
          href="/officer/verification/LR-2026-1021"
          className="inline-flex items-center gap-2 bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-stone-sm transition-all self-start sm:self-auto"
        >
          <span>Open Next in Queue (LR-1021)</span>
          <ArrowRight className="w-4 h-4 text-terracotta-400" />
        </Link>
      </div>

      {/* 4 Clean Metric Blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E8E6DF] shadow-stone-sm space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold text-stone-700">Pending Queue</span>
            <Clock className="w-4 h-4 text-stone-500" />
          </div>
          <div className="text-2xl font-bold text-stone-950 tracking-tight font-mono">128</div>
          <div className="text-[11px] text-amber-800 font-medium">18 received today</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E8E6DF] shadow-stone-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold text-emerald-950">Verified Today</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-950 tracking-tight font-mono">46</div>
          <div className="text-[11px] text-emerald-800 font-medium">Committed to RoR</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E8E6DF] shadow-stone-sm space-y-1">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-semibold text-rose-950">Database Conflicts</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-950 tracking-tight font-mono">12</div>
          <div className="text-[11px] text-rose-800 font-medium">Requires GIS check</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E8E6DF] shadow-stone-sm space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold text-amber-950">Low OCR Match</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-950 tracking-tight font-mono">19</div>
          <div className="text-[11px] text-amber-800 font-medium">Faded ink / stamp seal</div>
        </div>
      </div>

      {/* Verification Queue Data Table */}
      <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-stone-900 tracking-tight">
                Land Records Verification Queue
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Review and certify AI-extracted land deeds before official digital registry commitment
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search record ID, owner..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D7D4CA] rounded-lg bg-stone-50/50"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-[#141416] text-white shadow-stone-sm font-bold'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 font-medium'
              }`}
            >
              All Records ({records.length})
            </button>
            <button
              onClick={() => setActiveFilter('PENDING')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFilter === 'PENDING'
                  ? 'bg-amber-700 text-white shadow-stone-sm font-bold'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-medium'
              }`}
            >
              Pending Review (3)
            </button>
            <button
              onClick={() => setActiveFilter('CONFLICTS')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFilter === 'CONFLICTS'
                  ? 'bg-rose-700 text-white shadow-stone-sm font-bold'
                  : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100 font-medium'
              }`}
            >
              Flagged Conflicts (1)
            </button>
            <button
              onClick={() => setActiveFilter('LOW_CONFIDENCE')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFilter === 'LOW_CONFIDENCE'
                  ? 'bg-terracotta-700 text-white shadow-stone-sm font-bold'
                  : 'bg-terracotta-50 text-terracotta-900 border border-terracotta-200 hover:bg-terracotta-100 font-medium'
              }`}
            >
              Low OCR Confidence (2)
            </button>
            <button
              onClick={() => setActiveFilter('VERIFIED')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFilter === 'VERIFIED'
                  ? 'bg-emerald-800 text-white shadow-stone-sm font-bold'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 font-medium'
              }`}
            >
              Verified (1)
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] text-stone-500 font-semibold border-b border-[#E8E6DF]">
              <tr>
                <th className="px-5 py-3 font-medium text-[11px]">Record ID</th>
                <th className="px-5 py-3 font-medium text-[11px]">Land Owner</th>
                <th className="px-5 py-3 font-medium text-[11px]">Survey / Khasra</th>
                <th className="px-5 py-3 font-medium text-[11px]">Village / Tehsil</th>
                <th className="px-5 py-3 font-medium text-[11px]">OCR Match</th>
                <th className="px-5 py-3 font-medium text-[11px]">Validation Check</th>
                <th className="px-5 py-3 font-medium text-[11px]">Status</th>
                <th className="px-5 py-3 font-medium text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-semibold text-stone-900">
                    {rec.id}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-stone-900">{rec.ownerName.value}</div>
                    <div className="text-[11px] text-stone-400">{rec.documentType}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono">
                    <span className="font-bold text-stone-800">{rec.surveyNumber.value}</span>
                    {rec.khasraNumber && (
                      <span className="text-[11px] text-stone-400 block font-mono">({rec.khasraNumber.value})</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-stone-800">{rec.village.value}</div>
                    <div className="text-[11px] text-stone-400">{rec.tehsil.value}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <ConfidenceBadge confidence={rec.overallConfidence} />
                  </td>
                  <td className="px-5 py-3.5">
                    {rec.validationFlags.length > 0 ? (
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded ${
                        rec.validationFlags.some(f => f.severity === 'CONFLICT')
                          ? 'bg-rose-50 text-rose-800 font-semibold border border-rose-200'
                          : 'bg-amber-50 text-amber-800 font-medium border border-amber-200'
                      }`}>
                        <span>{rec.validationFlags[0].message.slice(0, 32)}...</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                        ✓ All Checks Passed
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/officer/verification/${rec.id}`}
                      className="inline-flex items-center gap-1.5 bg-[#141416] hover:bg-stone-800 text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors shadow-stone-sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-terracotta-400" />
                      <span>Verify</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
