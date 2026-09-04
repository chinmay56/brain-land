'use client';

import React, { useState, useMemo } from 'react';
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
  Eye, 
  Layers, 
  Cpu, 
  FileCheck2, 
  TrendingUp, 
  MapPin, 
  CheckCircle2, 
  FileText,
  Activity,
  Sparkles,
  ChevronRight,
  Shield,
  Compass,
  FileSpreadsheet
} from 'lucide-react';

interface DistrictProgress {
  district: string;
  state: string;
  totalParcels: number;
  digitizedParcels: number;
  accuracy: number;
  pendingCount: number;
  tehsils: { name: string; percentage: number; count: number }[];
}

const DISTRICT_PROGRESS_DATA: DistrictProgress[] = [
  {
    district: 'Pune',
    state: 'Maharashtra',
    totalParcels: 455000,
    digitizedParcels: 420420,
    accuracy: 97.4,
    pendingCount: 128,
    tehsils: [
      { name: 'Haveli', percentage: 95.8, count: 112000 },
      { name: 'Baramati', percentage: 92.4, count: 88400 },
      { name: 'Khed (Rajgurunagar)', percentage: 89.1, count: 74200 },
      { name: 'Shirur', percentage: 86.5, count: 68100 },
      { name: 'Maval', percentage: 83.2, count: 42100 },
    ]
  },
  {
    district: 'Nashik',
    state: 'Maharashtra',
    totalParcels: 380000,
    digitizedParcels: 319200,
    accuracy: 96.1,
    pendingCount: 210,
    tehsils: [
      { name: 'Nashik City', percentage: 94.2, count: 95000 },
      { name: 'Niphad', percentage: 88.6, count: 78000 },
      { name: 'Malegaon', percentage: 81.4, count: 82000 },
      { name: 'Sinnar', percentage: 76.8, count: 64200 },
    ]
  },
  {
    district: 'Satara',
    state: 'Maharashtra',
    totalParcels: 290000,
    digitizedParcels: 229100,
    accuracy: 95.8,
    pendingCount: 145,
    tehsils: [
      { name: 'Satara Sadar', percentage: 88.2, count: 72000 },
      { name: 'Karad', percentage: 84.1, count: 81000 },
      { name: 'Wai', percentage: 74.5, count: 41000 },
      { name: 'Phaltan', percentage: 69.2, count: 35100 },
    ]
  },
  {
    district: 'Solapur',
    state: 'Maharashtra',
    totalParcels: 340000,
    digitizedParcels: 248200,
    accuracy: 94.9,
    pendingCount: 184,
    tehsils: [
      { name: 'Solapur North', percentage: 82.5, count: 89000 },
      { name: 'Pandharpur', percentage: 76.2, count: 74000 },
      { name: 'Barshi', percentage: 69.4, count: 52000 },
    ]
  },
  {
    district: 'Nagpur',
    state: 'Maharashtra',
    totalParcels: 310000,
    digitizedParcels: 210800,
    accuracy: 96.5,
    pendingCount: 162,
    tehsils: [
      { name: 'Nagpur Rural', percentage: 78.4, count: 86000 },
      { name: 'Kamptee', percentage: 72.1, count: 61000 },
      { name: 'Hingna', percentage: 64.8, count: 48000 },
    ]
  },
  {
    district: 'Indore',
    state: 'Madhya Pradesh',
    totalParcels: 410000,
    digitizedParcels: 364900,
    accuracy: 97.1,
    pendingCount: 96,
    tehsils: [
      { name: 'Indore Sadar', percentage: 96.1, count: 142000 },
      { name: 'Sanwer', percentage: 88.4, count: 92000 },
      { name: 'Mhow', percentage: 82.3, count: 78000 },
    ]
  }
];

export default function OfficerDashboardPage() {
  const { user } = useAuth();
  const [records] = useState<LandRecord[]>(MOCK_RECORDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'URGENT' | 'LOW_CONFIDENCE' | 'CONFLICTS' | 'VERIFIED'>('ALL');

  // Executive Dashboard Tab: 'queue' (Default) | 'geo' | 'analytics'
  const [activeTab, setActiveTab] = useState<'queue' | 'geo' | 'analytics'>('queue');

  // Geographic Selectors - initialized to logged-in officer's assigned jurisdiction
  const officerDistrict = user?.assignedDistrict || user?.district || 'Pune';
  const officerTehsil = user?.assignedTehsil || user?.tehsil || 'Haveli';

  const [selectedState, setSelectedState] = useState<string>('Maharashtra');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(officerDistrict);
  const [selectedTehsilFilter, setSelectedTehsilFilter] = useState<string>(officerTehsil);

  const currentDistrictData = useMemo(() => {
    return DISTRICT_PROGRESS_DATA.find(
      d => d.district === selectedDistrict && (selectedState === 'ALL' || d.state === selectedState)
    ) || DISTRICT_PROGRESS_DATA[0];
  }, [selectedDistrict, selectedState]);

  const availableDistricts = useMemo(() => {
    if (selectedState === 'ALL') return DISTRICT_PROGRESS_DATA;
    return DISTRICT_PROGRESS_DATA.filter(d => d.state === selectedState);
  }, [selectedState]);

  const filteredRecords = records.filter(rec => {
    // Jurisdiction Filter: match District and optionally Tehsil
    const recDistrict = rec.assignedDistrict || rec.district.value;
    const recTehsil = rec.assignedTehsil || rec.tehsil.value;

    if (selectedDistrict !== 'ALL' && recDistrict.toLowerCase() !== selectedDistrict.toLowerCase()) {
      return false;
    }
    if (selectedTehsilFilter !== 'ALL' && recTehsil.toLowerCase() !== selectedTehsilFilter.toLowerCase()) {
      return false;
    }

    const matchesSearch = 
      rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.ownerName.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.surveyNumber.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.village.value.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (queueFilter === 'URGENT') return rec.overallConfidence < 0.75 || rec.validationFlags.some(f => f.severity === 'CONFLICT');
    if (queueFilter === 'LOW_CONFIDENCE') return rec.overallConfidence < 0.75;
    if (queueFilter === 'CONFLICTS') return rec.validationFlags.some(f => f.severity === 'CONFLICT');
    if (queueFilter === 'VERIFIED') return rec.status === 'VERIFIED';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Refined Executive Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-terracotta-700" />
            <span>Revenue Officer Console • {officerDistrict} Division • {officerTehsil} Tehsil</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-950 font-serif tracking-tight">
            {user?.name || 'Shri Vikramaditya Joshi'}
          </h1>
          <p className="text-xs text-stone-500 flex flex-wrap items-center gap-2">
            <span>{user?.designation || 'Sub-Divisional Revenue Officer (SDO)'}</span>
            <span>•</span>
            <span className="font-semibold text-stone-800">{officerDistrict} District ({officerTehsil} Sub-Division)</span>
            <span>•</span>
            <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-800 border border-stone-200 font-semibold">
              {user?.employeeId || 'REV-MH-PN-4091'}
            </span>
          </p>
        </div>

        <Link
          href={`/officer/verification/${filteredRecords[0]?.id || 'LR-2026-1021'}`}
          className="inline-flex items-center gap-2 bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-stone-sm transition-all self-start sm:self-auto"
        >
          <span>Open Next in {officerTehsil} Queue</span>
          <ArrowRight className="w-4 h-4 text-terracotta-400" />
        </Link>
      </div>

      {/* 2. Top Metric Cards (Verbatim SIH PS Labels) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Number of documents processed */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-1.5">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold text-stone-700">Number of documents processed</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-950 font-mono tracking-tight">148,920</div>
          <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+1,420 digitized today</span>
          </div>
        </div>

        {/* Metric 2: Extraction accuracy */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-1.5">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold text-stone-700">Extraction accuracy</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 text-terracotta-700 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-950 font-mono tracking-tight">97.4%</div>
          <div className="text-[11px] font-medium text-stone-500">Sarvam Devanagari Vision</div>
        </div>

        {/* Metric 3: Pending verification cases */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-1.5">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold text-stone-700">Pending verification cases</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-950 font-mono tracking-tight">128</div>
          <div className="text-[11px] font-bold text-amber-800">14 Urgent (&lt;24h)</div>
        </div>

        {/* Metric 4: Validation status */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-1.5">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold text-stone-700">Validation status</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-950 font-mono tracking-tight">68% Verified</div>
          <div className="text-[11px] font-semibold text-emerald-800">101,265 SHA-256 Sealed</div>
        </div>
      </div>

      {/* 3. Clean Tab Navigation with PS Requirements */}
      <div className="flex items-center border-b border-[#E8E6DF] gap-4">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'queue'
              ? 'text-stone-950'
              : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Pending Verification Cases ({filteredRecords.length})</span>
          {activeTab === 'queue' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-950 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('geo')}
          className={`flex items-center gap-2 pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'geo'
              ? 'text-stone-950'
              : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>State-wise and district-wise digitization progress</span>
          {activeTab === 'geo' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-950 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'analytics'
              ? 'text-stone-950'
              : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Validation status &amp; Error statistics</span>
          {activeTab === 'analytics' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-950 rounded-full" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Pending verification cases (Workload & Queue)                      */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 font-serif">
                Pending verification cases
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Submissions awaiting SDO human inspection and cryptographic RoR certification
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setQueueFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  queueFilter === 'ALL' ? 'bg-white text-stone-900 shadow-stone-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All (128)
              </button>
              <button
                onClick={() => setQueueFilter('URGENT')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  queueFilter === 'URGENT' ? 'bg-white text-amber-800 shadow-stone-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Urgent &lt;24h (14)
              </button>
              <button
                onClick={() => setQueueFilter('LOW_CONFIDENCE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  queueFilter === 'LOW_CONFIDENCE' ? 'bg-white text-rose-800 shadow-stone-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Low OCR &lt;75% (24)
              </button>
              <button
                onClick={() => setQueueFilter('CONFLICTS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  queueFilter === 'CONFLICTS' ? 'bg-white text-rose-800 shadow-stone-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Conflicts (12)
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search queue by Record ID, Land Owner, Survey Number, or Village..."
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-[#D7D4CA] rounded-xl text-stone-900 placeholder:text-stone-400 bg-[#FAF9F6] focus:bg-white transition-colors"
            />
          </div>

          {/* Clean Queue Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E8E6DF] bg-[#FAF9F6] text-stone-600 font-semibold">
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Land Owner</th>
                  <th className="py-3 px-4">Survey / Gat</th>
                  <th className="py-3 px-4">Village &amp; Tehsil</th>
                  <th className="py-3 px-4">Extraction Accuracy</th>
                  <th className="py-3 px-4">Validation status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6DF]">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                      {rec.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-stone-800">
                      {rec.documentType}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-stone-950">
                      {rec.ownerName.value}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                      {rec.surveyNumber.value}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      {rec.village.value}, {rec.tehsil.value}
                    </td>
                    <td className="py-3.5 px-4">
                      <ConfidenceBadge confidence={rec.overallConfidence} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/officer/verification/${rec.id}`}
                        className="inline-flex items-center gap-1.5 bg-[#141416] hover:bg-stone-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-stone-sm transition-all text-xs"
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: State-wise and district-wise digitization progress                 */}
      {/* ========================================================================= */}
      {activeTab === 'geo' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-base font-bold text-stone-900 font-serif">
                State-wise and district-wise digitization progress
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Real-time land parcel conversion progress across administrative divisions (DILRMP)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  const firstDist = DISTRICT_PROGRESS_DATA.find(d => e.target.value === 'ALL' || d.state === e.target.value);
                  if (firstDist) setSelectedDistrict(firstDist.district);
                }}
                className="bg-[#FAF9F6] border border-[#D7D4CA] rounded-xl px-3 py-2 text-xs text-stone-900 font-semibold"
              >
                <option value="Maharashtra">Maharashtra State</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Gujarat">Gujarat</option>
                <option value="ALL">All States (National)</option>
              </select>

              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-[#FAF9F6] border border-[#D7D4CA] rounded-xl px-3 py-2 text-xs text-stone-900 font-semibold"
              >
                {availableDistricts.map(d => (
                  <option key={d.district} value={d.district}>{d.district} District</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected District Spotlight Banner */}
          <div className="bg-[#FAF9F6] p-5 rounded-xl border border-[#E8E6DF] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-terracotta-700" />
                <span className="text-base font-bold text-stone-950 font-serif">
                  {currentDistrictData.district} District ({currentDistrictData.state})
                </span>
                <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {Math.round((currentDistrictData.digitizedParcels / currentDistrictData.totalParcels) * 100)}% Digitized
                </span>
              </div>
              <p className="text-xs text-stone-500">
                <strong>{currentDistrictData.digitizedParcels.toLocaleString()}</strong> of {currentDistrictData.totalParcels.toLocaleString()} land parcels digitized &amp; certified
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Extraction accuracy</span>
                <span className="font-mono font-bold text-stone-900 text-base">{currentDistrictData.accuracy}%</span>
              </div>
              <div className="pl-5 border-l border-stone-200">
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Pending verification cases</span>
                <span className="font-mono font-bold text-amber-800 text-base">{currentDistrictData.pendingCount}</span>
              </div>
            </div>
          </div>

          {/* Tehsil Progress Grid */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-stone-900">
              Tehsil-Wise Completion ({currentDistrictData.district})
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {currentDistrictData.tehsils.map((t) => (
                <div key={t.name} className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-900">{t.name} Tehsil</span>
                    <span className="font-mono font-bold text-stone-900">{t.percentage}% ({t.count.toLocaleString()} parcels)</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        t.percentage >= 90 ? 'bg-emerald-600' : 'bg-stone-800'
                      }`}
                      style={{ width: `${t.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Validation status & Error statistics                              */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Validation status Breakdown */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6 space-y-5">
            <div>
              <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                Registry Pipeline Health
              </div>
              <h2 className="text-base font-bold text-stone-900 font-serif mt-0.5">
                Validation status
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Certified RoRs (Verified)
                  </span>
                  <span className="font-mono text-stone-900">68% (101,265)</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-stone-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Under SDO Verification
                  </span>
                  <span className="font-mono text-stone-900">22% (32,762)</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div className="bg-stone-800 h-2 rounded-full" style={{ width: '22%' }} />
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Flagged for Review
                  </span>
                  <span className="font-mono text-stone-900">7% (10,424)</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '7%' }} />
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-rose-800 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    Rejected / Resubmit Required
                  </span>
                  <span className="font-mono text-stone-900">3% (4,469)</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: '3%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Error statistics */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6 space-y-5">
            <div>
              <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                Root Cause Telemetry
              </div>
              <h2 className="text-base font-bold text-stone-900 font-serif mt-0.5">
                Error statistics
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-900">Faint Ink / Creases on Physical Parchment</span>
                  <span className="font-mono font-bold text-stone-900">42%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5">
                  <div className="bg-terracotta-600 h-1.5 rounded-full" style={{ width: '42%' }} />
                </div>
                <div className="text-[10px] text-stone-500">6,210 cases • Visual SDO inspection required</div>
              </div>

              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-900">Parent Parcel Area Mismatch</span>
                  <span className="font-mono font-bold text-stone-900">28%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5">
                  <div className="bg-amber-600 h-1.5 rounded-full" style={{ width: '28%' }} />
                </div>
                <div className="text-[10px] text-stone-500">4,140 cases • Sum of sub-parcels exceeds mother parcel</div>
              </div>

              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-900">Mutation Number Numeral Ambiguity</span>
                  <span className="font-mono font-bold text-stone-900">18%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5">
                  <div className="bg-stone-700 h-1.5 rounded-full" style={{ width: '18%' }} />
                </div>
                <div className="text-[10px] text-stone-500">2,660 cases • Overlapping stamps / faint digits</div>
              </div>

              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-900">Modi Script Dialect Variant</span>
                  <span className="font-mono font-bold text-stone-900">12%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5">
                  <div className="bg-stone-500 h-1.5 rounded-full" style={{ width: '12%' }} />
                </div>
                <div className="text-[10px] text-stone-500">1,770 cases • Archaic land tenure terms</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
