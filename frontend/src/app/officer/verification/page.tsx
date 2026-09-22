'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LandRecord } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { supabase } from '@/lib/supabaseClient';
import { 
  FileText, 
  Search, 
  Eye, 
  MapPin, 
  RefreshCw,
  Clock,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function OfficerVerificationQueuePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Geographic Jurisdiction tied to logged-in officer
  const officerDistrict = user?.assignedDistrict || user?.district || 'जळगाव';
  const officerTehsil = user?.assignedTehsil || user?.tehsil || 'जळगाव';

  const [searchQuery, setSearchQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'LOW_CONFIDENCE'>('ALL');

  const fetchOfficerQueueFromDb = async () => {
    setLoading(true);
    try {
      // Fetch records where status is NOT VERIFIED (queued pending records)
      const { data, error } = await supabase
        .from('land_records')
        .select('*')
        .neq('status', 'VERIFIED')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active verification queue from DB:', error);
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
        }));
        setRecords(mapped);
      }
    } catch (e) {
      console.error('Active verification queue fetch exception:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficerQueueFromDb();

    // Supabase Realtime Listener for Live Applications
    const channel = supabase
      .channel('officer-verification-queue-realtime')
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

  const filteredQueueRecords = useMemo(() => {
    return records.filter(rec => {
      // Exclude verified records strictly
      if (rec.status === 'VERIFIED') return false;

      const matchesSearch = 
        rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.ownerName.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.surveyNumber.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.village.value.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (queueFilter === 'LOW_CONFIDENCE') return rec.overallConfidence < 0.75;
      return true;
    });
  }, [records, searchQuery, queueFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Dedicated Verification Queue Card */}
      <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm overflow-hidden p-6 space-y-4">
        {/* Header Title & Jurisdiction */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-stone-900 font-serif flex items-center gap-2">
              <Clock className="w-5 h-5 text-terracotta-700" />
              <span>Active Verification Queue</span>
              <span className="text-xs font-mono font-bold bg-amber-50 text-amber-900 px-2.5 py-0.5 rounded-md border border-amber-200">
                {filteredQueueRecords.length} Pending Cases
              </span>
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Active land records awaiting Revenue Officer inspection and SDO certification in <strong>{officerDistrict} District ({officerTehsil} Tehsil)</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-100 border border-[#D7D4CA] px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-800">
              <MapPin className="w-3.5 h-3.5 text-terracotta-700" />
              <span>Assigned Jurisdiction: <strong>{officerDistrict} ({officerTehsil})</strong></span>
            </div>

            <button
              onClick={fetchOfficerQueueFromDb}
              disabled={loading}
              className="p-1.5 hover:bg-stone-100 text-stone-600 rounded-lg transition-colors border border-[#D7D4CA] bg-[#FAF9F6] shadow-stone-sm"
              title="Refresh DB Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-terracotta-700' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-[#E8E6DF]">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search queue by Record ID, Land Owner, Survey Number, or Village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#D7D4CA] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all text-stone-900 placeholder:text-stone-400"
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
            <button
              onClick={() => setQueueFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                queueFilter === 'ALL'
                  ? 'bg-stone-900 text-white shadow-stone-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              All Pending ({records.length})
            </button>

            <button
              onClick={() => setQueueFilter('LOW_CONFIDENCE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                queueFilter === 'LOW_CONFIDENCE'
                  ? 'bg-stone-900 text-white shadow-stone-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Low OCR Confidence
            </button>
          </div>
        </div>

        {/* Queued Pending Records Table */}
        <div className="border border-[#E8E6DF] rounded-xl overflow-hidden bg-white">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-stone-400" />
              <div>Fetching active queued verification records from Supabase...</div>
            </div>
          ) : filteredQueueRecords.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
              <div className="font-bold text-stone-800 text-sm">No Pending Verification Cases</div>
              <p className="text-stone-500 max-w-sm mx-auto text-xs">
                All assigned land record applications for <strong>{officerTehsil} Tehsil</strong> have been verified and sealed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700 border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E8E6DF] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
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
                  {filteredQueueRecords.map((rec) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
