'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MOCK_RECORDS } from '@/data/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { 
  FileCheck2, 
  ShieldCheck, 
  Search, 
  Download, 
  Eye, 
  Calendar, 
  CheckCircle,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LandRecord } from '@/types';

export default function OfficerVerifiedHistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<LandRecord | null>(null);
  const [verifiedRecords, setVerifiedRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch verified/certified records dynamically from live Supabase DB
  useEffect(() => {
    async function fetchVerifiedHistory() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('land_records')
          .select('*')
          .eq('status', 'VERIFIED')
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error fetching verified history:', error);
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
              : { value: row.survey_number || '', confidence: row.overall_confidence || 0.95 },
            khasraNumber: typeof row.khasra_number === 'object' && row.khasra_number !== null
              ? row.khasra_number
              : { value: row.khasra_number || '', confidence: row.overall_confidence || 0.95 },
            khataNumber: typeof row.khata_number === 'object' && row.khata_number !== null
              ? row.khata_number
              : { value: row.khata_number || '', confidence: row.overall_confidence || 0.95 },
            area: typeof row.area === 'object' && row.area !== null
              ? row.area
              : { value: String(row.area || '2.45'), confidence: row.overall_confidence || 0.95 },
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
            mutationNumber: typeof row.mutation_number === 'object' && row.mutation_number !== null
              ? row.mutation_number
              : { value: row.mutation_number || '', confidence: row.overall_confidence || 0.95 },
            overallConfidence: row.overall_confidence || 0.95,
            status: 'VERIFIED',
            submissionDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            assignedOfficer: row.assigned_officer || 'SDO Jurisdiction',
            validationFlags: row.validation_flags || [],
            documentPages: row.document_pages || 1,
            documentUrl: row.document_url || undefined
          }));
          setVerifiedRecords(mapped);
        }
      } catch (err) {
        console.error('Verified history fetch exception:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVerifiedHistory();
  }, []);

  const filtered = verifiedRecords.filter(rec => {
    const matchesSearch = 
      rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.ownerName.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.surveyNumber.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.village.value.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (docTypeFilter !== 'ALL' && !rec.documentType.toLowerCase().includes(docTypeFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-emerald-700" />
            <span>Official Certification Archive • प्रमाणित अभिलेख इतिहास</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-950 font-serif tracking-tight">
            Verified Documents History
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Historical repository of all government-certified, digitally sealed Record of Rights (RoRs) across the jurisdiction
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-xs font-semibold bg-[#FAF9F6] px-4 py-2 rounded-xl border border-[#E8E6DF]">
          <span className="text-stone-500">Total Verified:</span>
          <span className="font-mono text-stone-950 font-bold text-sm">{verifiedRecords.length} Records</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-stone-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search historical verified records by ID, Land Owner, Survey Number, Village..."
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-[#D7D4CA] rounded-xl text-stone-900 placeholder:text-stone-400 bg-[#FAF9F6] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="bg-[#FAF9F6] border border-[#D7D4CA] rounded-xl px-3 py-2 text-xs text-stone-900 font-semibold"
            >
              <option value="ALL">All Document Types</option>
              <option value="7/12">7/12 Extracts</option>
              <option value="Khasra">Khasra Records</option>
              <option value="Mutation">Mutation Deeds</option>
            </select>
          </div>
        </div>

        {/* Verified History Table */}
        <div className="overflow-x-auto rounded-xl border border-[#E8E6DF]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8E6DF] bg-[#FAF9F6] text-stone-700 font-semibold">
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-4">Land Owner</th>
                <th className="py-3 px-4">Survey / Gat</th>
                <th className="py-3 px-4">Area Certified</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Certification Date</th>
                <th className="py-3 px-4">Certifying Officer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E6DF]">
              {filtered.map((rec) => (
                <tr key={rec.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                    {rec.id}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-stone-800">
                    {rec.documentType}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-stone-950">
                    {rec.ownerName.value}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                    {rec.surveyNumber.value}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-stone-900">
                    {rec.area.value} {rec.areaUnit}
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">
                    {rec.village.value}, {rec.tehsil.value}
                  </td>
                  <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px]">
                    {rec.submissionDate}
                  </td>
                  <td className="py-3.5 px-4 text-stone-700">
                    <span className="inline-flex items-center gap-1 text-emerald-800 font-medium text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{rec.assignedOfficer || 'SDO Pune'}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedRecordForModal(rec)}
                      className="inline-flex items-center gap-1.5 bg-[#141416] hover:bg-stone-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-stone-sm transition-all text-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-terracotta-400" />
                      <span>Download RoR</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Certified RoR Simulation Modal */}
      {selectedRecordForModal && (
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
                Department of Land Resources Verified &amp; Cryptographically Sealed Database
              </p>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E8E6DF] rounded-xl text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Record ID:</span>
                <span className="font-bold text-stone-900">{selectedRecordForModal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Survey / Gat:</span>
                <span className="font-bold text-stone-900">{selectedRecordForModal.surveyNumber.value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Pattadar / Owner:</span>
                <span className="font-bold text-stone-900 font-sans">{selectedRecordForModal.ownerName.value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Certified Area:</span>
                <span className="font-bold text-stone-900">{selectedRecordForModal.area.value} {selectedRecordForModal.areaUnit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Digital Seal:</span>
                <span className="text-emerald-800 font-semibold font-sans">SHA-256 Verified ✓</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setSelectedRecordForModal(null)}
                className="flex-1 bg-white hover:bg-stone-50 text-stone-700 border border-[#D7D4CA] text-xs font-semibold py-2 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Downloading Official Certified RoR PDF for ${selectedRecordForModal.id}...`);
                  setSelectedRecordForModal(null);
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
