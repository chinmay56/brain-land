'use client';

import React from 'react';
import { History, ShieldCheck, FileText, UserCheck, Calendar } from 'lucide-react';

export default function OfficerAuditPage() {
  const auditLogs = [
    {
      id: 'AUD-9941',
      recordId: 'LR-2026-1019',
      action: 'RECORD_CERTIFIED_APPROVED',
      officer: 'Shri Vikramaditya Joshi (SDO Haveli)',
      timestamp: '2026-08-24 14:32 IST',
      details: 'Approved 7/12 extract for Sunita Devi Deshmukh (Survey 131/2) with 98% AI confidence match.'
    },
    {
      id: 'AUD-9940',
      recordId: 'LR-2026-1021',
      action: 'OFFICER_MANUAL_CORRECTION',
      officer: 'Shri Vikramaditya Joshi (SDO Haveli)',
      timestamp: '2026-08-27 02:20 IST',
      details: 'Corrected Mutation Number from AI extracted "58?1" to verified physical register value "5821".'
    },
    {
      id: 'AUD-9938',
      recordId: 'LR-2026-1018',
      action: 'RECORD_REJECTED_FADED_SCAN',
      officer: 'Shri Vikramaditya Joshi (SDO Haveli)',
      timestamp: '2026-08-20 11:15 IST',
      details: 'Rejected submission due to illegible ink bleeds on survey sub-division index. Remarks sent to citizen.'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm">
        <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <History className="w-4 h-4 text-terracotta-700" />
          <span>Immutable Audit Trail • अभिलेख इतिहास</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif tracking-tight">
          Land Records Provenance & Action Log
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Cryptographically logged administrative modifications, officer remarks, and certification timestamps
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm overflow-hidden">
        <div className="divide-y divide-stone-100 text-xs">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-5 hover:bg-stone-50/80 transition-colors space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-stone-900">{log.id}</span>
                  <span className="px-2 py-0.5 rounded bg-stone-100 font-mono text-[11px] font-bold text-stone-800 border border-stone-200">
                    {log.recordId}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-terracotta-50 text-terracotta-900 border border-terracotta-200 text-[10px] font-bold">
                    {log.action}
                  </span>
                </div>
                <span className="text-stone-500 text-[11px] font-mono">{log.timestamp}</span>
              </div>
              <div className="text-stone-900 font-medium">{log.details}</div>
              <div className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Authorized Officer: <strong className="text-stone-800">{log.officer}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
