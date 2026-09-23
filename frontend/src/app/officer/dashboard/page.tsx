'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LandRecord } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { supabase } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/apiFetch';
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
  FileSpreadsheet,
  RefreshCw
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

export default function OfficerDashboardPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Geographic Selectors - initialized to logged-in officer's assigned jurisdiction
  const officerDistrict = user?.assignedDistrict || user?.district || 'जळगांव';
  const officerTehsil = user?.assignedTehsil || user?.tehsil || 'जळगांव';

  const [selectedState, setSelectedState] = useState<string>('Maharashtra');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(officerDistrict);
  const [selectedTehsilFilter, setSelectedTehsilFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'URGENT' | 'LOW_CONFIDENCE' | 'CONFLICTS' | 'DUPLICATES' | 'VERIFIED'>('ALL');
  const [activeTab, setActiveTab] = useState<'queue' | 'geo' | 'analytics'>('queue');
  const [learningStats, setLearningStats] = useState<any>(null);

  const fetchOfficerQueueFromDb = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('land_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching officer queue from DB:', error);
      } else if (data) {
        const mapped: LandRecord[] = data.map((row: any) => ({
          id: row.id,
          applicationNo: row.application_no || row.id,
          documentType: row.document_type || '7/12 Extract (Record of Rights)',
          ownerName: typeof row.owner_name === 'object' && row.owner_name !== null
            ? row.owner_name
            : { value: row.owner_name || 'Land Owner', confidence: row.overall_confidence || 0.95 },
          coOwners: Array.isArray(row.co_owners) ? row.co_owners : [],
          surveyNumber: typeof row.survey_number === 'object' && row.survey_number !== null
            ? row.survey_number
            : { value: row.survey_number || 'N/A', confidence: row.overall_confidence || 0.95 },
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
          documentUrl: row.document_url || undefined,
          lgdDistrictCode: row.lgd_district_code || undefined,
          lgdTehsilCode: row.lgd_tehsil_code || undefined,
          ocrExtractedData:
            row.ocr_extracted_data && Object.keys(row.ocr_extracted_data).length > 0
              ? row.ocr_extracted_data
              : undefined,
        }));
        setRecords(mapped);
      }
    } catch (e) {
      console.error('Officer queue fetch exception:', e);
    } finally {
      setLoading(false);
    }
  };

  // Correction statistics, loaded when a tab that shows them is opened rather
  // than on every dashboard mount. The geo tab needs them too: the accuracy
  // metric there switches to officer-verified numbers once any exist.
  useEffect(() => {
    if (activeTab !== 'analytics' && activeTab !== 'geo') return;
    let cancelled = false;
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    apiFetch(`${api}/api/extraction/correction-stats`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setLearningStats(j); })
      .catch((e) => console.warn('Correction stats unavailable:', e));
    return () => { cancelled = true; };
  }, [activeTab]);

  useEffect(() => {
    fetchOfficerQueueFromDb();

    // Supabase Realtime Listener for Live Applications
    const channel = supabase
      .channel('officer-queue-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'land_records',
        },
        () => {
          fetchOfficerQueueFromDb();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isSameJurisdiction = (val1: string, val2: string) => {
    const v1 = val1.trim().toLowerCase();
    const v2 = val2.trim().toLowerCase();
    if (v1 === v2) return true;
    if ((v1.includes('jalgaon') || v1.includes('जळगाव') || v1.includes('जळगांव')) && (v2.includes('jalgaon') || v2.includes('जळगाव') || v2.includes('जळगांव'))) return true;
    if ((v1.includes('pune') || v1.includes('पुणे')) && (v2.includes('pune') || v2.includes('पुणे'))) return true;
    if ((v1.includes('nashik') || v1.includes('नाशिक')) && (v2.includes('nashik') || v2.includes('नाशिक'))) return true;
    return false;
  };

  // Dynamic District Progress Data calculated directly from Live DB Records
  const dynamicDistrictProgressData = useMemo(() => {
    const defaultDistricts = [
      { name: 'जळगाव', state: 'Maharashtra' },
      { name: 'Pune', state: 'Maharashtra' },
      { name: 'Nashik', state: 'Maharashtra' },
      { name: 'Satara', state: 'Maharashtra' }
    ];

    const districtsMap: Record<string, {
      district: string;
      state: string;
      totalParcels: number;
      digitizedParcels: number;
      accuracySum: number;
      pendingCount: number;
      tehsilsMap: Record<string, { count: number; verifiedCount: number }>;
    }> = {};

    defaultDistricts.forEach(d => {
      districtsMap[d.name] = {
        district: d.name,
        state: d.state,
        totalParcels: 0,
        digitizedParcels: 0,
        accuracySum: 0,
        pendingCount: 0,
        tehsilsMap: {}
      };
    });

    records.forEach(rec => {
      const distName = rec.district?.value || rec.assignedDistrict || 'जळगाव';
      const tehName = rec.tehsil?.value || rec.assignedTehsil || 'जळगाव';
      const key = Object.keys(districtsMap).find(d => isSameJurisdiction(d, distName)) || distName;

      if (!districtsMap[key]) {
        districtsMap[key] = {
          district: distName,
          state: rec.state || 'Maharashtra',
          totalParcels: 0,
          digitizedParcels: 0,
          accuracySum: 0,
          pendingCount: 0,
          tehsilsMap: {}
        };
      }

      const dObj = districtsMap[key];
      dObj.totalParcels += 1;
      dObj.accuracySum += (rec.overallConfidence || 0.95);
      if (rec.status === 'VERIFIED') {
        dObj.digitizedParcels += 1;
      } else {
        dObj.pendingCount += 1;
      }

      if (!dObj.tehsilsMap[tehName]) {
        dObj.tehsilsMap[tehName] = { count: 0, verifiedCount: 0 };
      }
      dObj.tehsilsMap[tehName].count += 1;
      if (rec.status === 'VERIFIED') {
        dObj.tehsilsMap[tehName].verifiedCount += 1;
      }
    });

    return Object.values(districtsMap).map(d => {
      const accuracy = d.totalParcels > 0 
        ? Number(((d.accuracySum / d.totalParcels) * 100).toFixed(1)) 
        : 98.5;

      const tehsilsList = Object.entries(d.tehsilsMap).map(([tName, tData]) => ({
        name: tName,
        percentage: tData.count > 0 ? Number(((tData.verifiedCount / tData.count) * 100).toFixed(1)) : 0,
        count: tData.count
      }));

      if (tehsilsList.length === 0) {
        tehsilsList.push({ name: d.district, percentage: 0, count: 0 });
      }

      return {
        district: d.district,
        state: d.state,
        totalParcels: d.totalParcels,
        digitizedParcels: d.digitizedParcels,
        accuracy,
        pendingCount: d.pendingCount,
        tehsils: tehsilsList
      };
    });
  }, [records]);

  const currentDistrictData = useMemo(() => {
    return dynamicDistrictProgressData.find(
      d => isSameJurisdiction(d.district, selectedDistrict) && (selectedState === 'ALL' || d.state === selectedState)
    ) || dynamicDistrictProgressData[0];
  }, [selectedDistrict, selectedState, dynamicDistrictProgressData]);

  const availableDistricts = useMemo(() => {
    if (selectedState === 'ALL') return dynamicDistrictProgressData;
    return dynamicDistrictProgressData.filter(d => d.state === selectedState);
  }, [selectedState, dynamicDistrictProgressData]);

  // Dynamic Tab 3 Analytics calculated directly from DB records
  const analyticsData = useMemo(() => {
    const total = records.length;
    const verified = records.filter(r => r.status === 'VERIFIED').length;
    const underVerification = records.filter(r => r.status === 'UNDER_VERIFICATION' || !r.status).length;
    const flagged = records.filter(r => r.overallConfidence < 0.75 || (r.validationFlags && r.validationFlags.length > 0)).length;
    const rejected = records.filter(r => r.status === 'REJECTED').length;

    const pct = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;

    const faintInk = records.filter(r => r.overallConfidence < 0.80).length;
    const areaMismatch = records.filter(r => r.validationFlags?.some(f => f.field?.toLowerCase().includes('area') || f.message?.toLowerCase().includes('area'))).length;
    const mutationAmbiguity = records.filter(r => r.validationFlags?.some(f => f.field?.toLowerCase().includes('mutation') || f.message?.toLowerCase().includes('mutation'))).length;
    const modiScript = records.filter(r => r.validationFlags?.some(f => f.field?.toLowerCase().includes('script') || f.message?.toLowerCase().includes('script'))).length;

    return {
      total,
      verified: { count: verified, pct: pct(verified) },
      underVerification: { count: underVerification, pct: pct(underVerification) },
      flagged: { count: flagged, pct: pct(flagged) },
      rejected: { count: rejected, pct: pct(rejected) },
      telemetry: [
        { name: 'Faint Ink / Low Optical Confidence', count: faintInk, pct: pct(faintInk), detail: `${faintInk} cases • SDO inspection suggested` },
        { name: 'Parent Parcel Area Mismatch', count: areaMismatch, pct: pct(areaMismatch), detail: `${areaMismatch} cases • Sum of sub-parcels review` },
        { name: 'Mutation Number Numeral Ambiguity', count: mutationAmbiguity, pct: pct(mutationAmbiguity), detail: `${mutationAmbiguity} cases • Overlapping stamps / faint digits` },
        { name: 'Modi Script Dialect Variant', count: modiScript, pct: pct(modiScript), detail: `${modiScript} cases • Archaic land tenure terms` },
      ]
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const list = records.filter(rec => {
      const recDistrict = (rec.assignedDistrict || rec.district.value || '').trim().toLowerCase();
      const recTehsil = (rec.assignedTehsil || rec.tehsil.value || '').trim().toLowerCase();

      if (selectedDistrict !== 'ALL' && !isSameJurisdiction(recDistrict, selectedDistrict) && rec.lgdDistrictCode !== '496') {
        return false;
      }
      if (selectedTehsilFilter !== 'ALL' && !isSameJurisdiction(recTehsil, selectedTehsilFilter) && rec.lgdTehsilCode !== '4172') {
        return false;
      }

      const matchesSearch = 
        rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.ownerName.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.surveyNumber.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.village.value.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (queueFilter === 'URGENT') return rec.overallConfidence < 0.75 || rec.validationFlags.some(f => f.severity === 'CONFLICT');
      // A record can average well and still hide one badly-read field, which is
      // exactly the record an officer needs to see. Judge on the worst field
      // when per-field scores exist; older rows only have the average.
      if (queueFilter === 'LOW_CONFIDENCE') {
        if (rec.ocrExtractedData) {
          return Object.values(rec.ocrExtractedData).some(f => f.confidence < 0.70);
        }
        return rec.overallConfidence < 0.75;
      }
      if (queueFilter === 'CONFLICTS') return rec.validationFlags.some(f => f.severity === 'CONFLICT');
      if (queueFilter === 'DUPLICATES') return rec.validationFlags.some(f => f.id === 'DUPLICATE_RECORD');
      if (queueFilter === 'VERIFIED') return rec.status === 'VERIFIED';
      return true;
    });

    return list.sort((a, b) => {
      const aVerified = a.status === 'VERIFIED';
      const bVerified = b.status === 'VERIFIED';
      if (aVerified === bVerified) return 0;
      return aVerified ? 1 : -1;
    });
  }, [records, selectedDistrict, selectedTehsilFilter, searchQuery, queueFilter]);

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
      </div>

      {/* 2. Top Metric Cards (Calculated from Live DB Records) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Number of documents processed */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-1.5">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold text-stone-700">Number of documents processed</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-950 font-mono tracking-tight">{records.length}</div>
          <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+{records.length} in DB</span>
          </div>
        </div>

        {/* Metric 2: Pending verification cases */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-1.5">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold text-stone-700">Pending verification cases</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-950 font-mono tracking-tight">
            {filteredRecords.filter(r => r.status !== 'VERIFIED').length}
          </div>
          <div className="text-[11px] font-bold text-amber-800">In Active Queue</div>
        </div>

        {/* Metric 3: Validation status */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-1.5">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold text-stone-700">Validation status</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-950 font-mono tracking-tight">
            {records.length > 0 
              ? `${Math.round((records.filter(r => r.status === 'VERIFIED').length / records.length) * 100)}% Verified` 
              : '0% Verified'}
          </div>
          <div className="text-[11px] font-semibold text-emerald-800">
            {records.filter(r => r.status === 'VERIFIED').length} Sealed Records
          </div>
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
          <span>Verification Records Queue ({filteredRecords.length})</span>
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
          <span>Tehsil Digitization Progress</span>
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
      {/* TAB 1: Verification Records Queue & Master Register                       */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
                <span>Verification Records Register</span>
                <span className="text-xs font-mono font-normal bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md border border-stone-200">
                  {filteredRecords.length} Records in DB
                </span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Assigned Jurisdiction: <strong>{officerDistrict} District</strong> • <strong>{officerTehsil} Tehsil</strong>
              </p>
            </div>

            {/* Fixed Officer Jurisdiction Badge & Refresh Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-100 border border-[#D7D4CA] px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-800">
                <MapPin className="w-3.5 h-3.5 text-terracotta-700" />
                <span>Assigned Jurisdiction: <strong>{officerDistrict} District ({officerTehsil} Tehsil)</strong></span>
              </div>

              <button
                onClick={fetchOfficerQueueFromDb}
                className="p-2 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl border border-[#D7D4CA] transition-colors"
                title="Refresh Queue from DB"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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

          {/* Queue filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              ['ALL', 'All'],
              ['URGENT', 'Urgent'],
              ['LOW_CONFIDENCE', 'Low Confidence'],
              ['CONFLICTS', 'Conflicts'],
              ['DUPLICATES', 'Duplicates'],
              ['VERIFIED', 'Verified'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setQueueFilter(key)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                  queueFilter === key
                    ? 'bg-[#141416] text-white border-[#141416]'
                    : 'bg-white text-stone-600 border-[#E8E6DF] hover:bg-[#FAF9F6]'
                }`}
              >
                {label}
              </button>
            ))}
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
                      {rec.status === 'VERIFIED' ? (
                        <span
                          className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-3 py-1.5 rounded-lg text-xs cursor-default select-none shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <Link
                          href={`/officer/verification/${rec.id}`}
                          className="inline-flex items-center gap-1.5 bg-[#141416] hover:bg-stone-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-stone-sm transition-all text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-terracotta-400" />
                          <span>Verify</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: District and Tehsil digitization progress                          */}
      {/* ========================================================================= */}
      {activeTab === 'geo' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-base font-bold text-stone-900 font-serif">
                District &amp; Tehsil Digitization Progress
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Real-time land parcel conversion progress across tehsils (DILRMP)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#FAF9F6] border border-[#D7D4CA] rounded-xl px-3 py-1.5 text-xs text-stone-900 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-terracotta-700" />
                <span>{officerDistrict} District</span>
              </div>
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
              {/* Once officers have verified records, accuracy can be measured
                  against what they actually corrected rather than the model's
                  own confidence in itself. */}
              {learningStats?.overall?.records_verified > 0
                && learningStats?.overall?.field_accuracy != null ? (
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                    Field-level accuracy (officer-verified)
                  </span>
                  <span className="font-mono font-bold text-stone-900 text-base">
                    {Math.round(learningStats.overall.field_accuracy * 100)}%
                    {learningStats?.trend?.delta != null && (
                      <span className={`ml-1.5 text-[11px] font-sans font-semibold ${
                        learningStats.trend.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {learningStats.trend.delta >= 0 ? '▲' : '▼'}
                        {Math.abs(Math.round(learningStats.trend.delta * 100))}% 7d
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                    Mean extraction confidence (no verified records yet)
                  </span>
                  <span className="font-mono font-bold text-stone-900 text-base">{currentDistrictData.accuracy}%</span>
                </div>
              )}
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
        <div className="space-y-6">
        {/* What officers keep correcting, and what the extractor has been told
            about it. Sourced from certified corrections, not self-assessment. */}
        <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6 space-y-4">
          <div>
            <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
              Feedback Loop
            </div>
            <h2 className="text-base font-bold text-stone-900 font-serif mt-0.5">
              Extraction learning
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Correction rates come from fields officers and citizens actually changed.
            </p>
          </div>

          {(() => {
            const fields = learningStats?.fields || {};
            const rows = Object.entries(fields)
              .filter(([, f]: [string, any]) => (f?.extracted || 0) > 0)
              .sort((a: any, b: any) => (b[1].correction_rate || 0) - (a[1].correction_rate || 0));

            if (rows.length === 0) {
              return (
                <p className="text-xs text-stone-500">
                  No extractions recorded yet. Submit a record to start the loop.
                </p>
              );
            }

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E6DF] bg-[#FAF9F6] text-stone-600 font-semibold">
                      <th className="py-2 px-3">Field</th>
                      <th className="py-2 px-3">Extracted</th>
                      <th className="py-2 px-3">Corrected</th>
                      <th className="py-2 px-3">Correction rate</th>
                      <th className="py-2 px-3">Last correction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([name, f]: [string, any]) => {
                      const last = (f.recent_pairs || [])[0];
                      const rate = Math.round((f.correction_rate || 0) * 100);
                      return (
                        <tr key={name} className="border-b border-stone-50">
                          <td className="py-2 px-3 font-mono text-stone-900">{name}</td>
                          <td className="py-2 px-3 font-mono text-stone-600">{f.extracted}</td>
                          <td className="py-2 px-3 font-mono text-stone-600">{f.corrected}</td>
                          <td className={`py-2 px-3 font-mono font-bold ${
                            rate >= 20 ? 'text-rose-700' : rate > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}>
                            {rate}%
                          </td>
                          <td className="py-2 px-3 text-stone-600">
                            {last ? (
                              <span className="font-mono text-[11px]">
                                <span className="text-stone-400 line-through">{last.ai}</span>
                                <span className="mx-1 text-stone-400">→</span>
                                <span className="text-stone-900 font-semibold">{last.corrected}</span>
                              </span>
                            ) : <span className="text-stone-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          <div className="text-xs pt-1 border-t border-stone-100">
            {Object.keys(learningStats?.hints_active || {}).length > 0 ? (
              <span className="text-stone-700">
                Hints currently injected into the extractor:{' '}
                <strong className="font-mono text-stone-900">
                  {Object.keys(learningStats.hints_active).join(', ')}
                </strong>
              </span>
            ) : (
              <span className="text-stone-500">
                None yet, needs 3+ corrections on a field.
              </span>
            )}
          </div>
        </div>

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
                  <span className="font-mono text-stone-900">{analyticsData.verified.pct}% ({analyticsData.verified.count})</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${analyticsData.verified.pct}%` }} />
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-stone-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Under SDO Verification
                  </span>
                  <span className="font-mono text-stone-900">{analyticsData.underVerification.pct}% ({analyticsData.underVerification.count})</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div className="bg-stone-800 h-2 rounded-full" style={{ width: `${analyticsData.underVerification.pct}%` }} />
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Flagged for Review
                  </span>
                  <span className="font-mono text-stone-900">{analyticsData.flagged.pct}% ({analyticsData.flagged.count})</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${analyticsData.flagged.pct}%` }} />
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-rose-800 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    Rejected / Resubmit Required
                  </span>
                  <span className="font-mono text-stone-900">{analyticsData.rejected.pct}% ({analyticsData.rejected.count})</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${analyticsData.rejected.pct}%` }} />
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
              {analyticsData.telemetry.map((item, idx) => (
                <div key={idx} className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-stone-900">{item.name}</span>
                    <span className="font-mono font-bold text-stone-900">{item.pct}%</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${idx === 0 ? 'bg-terracotta-600' : idx === 1 ? 'bg-amber-600' : 'bg-stone-700'}`} 
                      style={{ width: `${item.pct}%` }} 
                    />
                  </div>
                  <div className="text-[10px] text-stone-500">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
