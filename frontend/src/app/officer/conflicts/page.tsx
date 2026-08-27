'use client';

import React from 'react';
import Link from 'next/link';
import { MOCK_RECORDS } from '@/data/mockData';
import { AlertOctagon, ArrowRight, Eye, ShieldAlert } from 'lucide-react';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';

export default function OfficerConflictsPage() {
  const conflictRecords = MOCK_RECORDS.filter(r => r.validationFlags.some(f => f.severity === 'CONFLICT' || f.severity === 'CRITICAL'));

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-stone-sm">
        <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <AlertOctagon className="w-4 h-4 text-rose-600" />
          <span>High Priority Flagged Records • विसंगती निवारण</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif tracking-tight">
          Cadastral & Reference Database Conflicts
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Records where AI extraction contradicts existing survey boundary registers or previous mutation entries
        </p>
      </div>

      <div className="grid gap-4">
        {conflictRecords.map(rec => (
          <div key={rec.id} className="bg-white border border-rose-300 rounded-2xl p-5 shadow-stone-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-rose-400 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-sm text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">{rec.id}</span>
                <span className="text-xs text-stone-500">• {rec.documentType}</span>
                <ConfidenceBadge confidence={rec.overallConfidence} />
              </div>
              <div className="text-xs text-stone-700">
                Land Owner: <strong className="text-stone-900">{rec.ownerName.value}</strong> | Survey: <strong className="font-mono text-stone-900">{rec.surveyNumber.value}</strong> | Village: {rec.village.value}
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 font-medium leading-normal">
                {rec.validationFlags[0]?.message}
              </div>
            </div>

            <Link
              href={`/officer/verification/${rec.id}`}
              className="inline-flex items-center justify-center gap-1.5 bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-stone-sm whitespace-nowrap self-start md:self-auto transition-colors"
            >
              <span>Review in Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
