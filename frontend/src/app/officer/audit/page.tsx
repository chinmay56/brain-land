'use client';

import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, FileText, UserCheck, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function OfficerAuditPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditLogs() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Audit log fetch notice:', error);
          setAuditLogs([]);
        } else if (data) {
          setAuditLogs(data.map((r: any) => ({
            id: r.id || `AUD-${Date.now()}`,
            recordId: r.record_id || r.land_record_id || 'N/A',
            action: r.action || 'ACTION_LOGGED',
            officer: r.officer_name || r.performed_by || 'Officer',
            role: r.role || 'OFFICER',
            changes: r.changes && typeof r.changes === 'object' ? r.changes : {},
            timestamp: r.created_at ? new Date(r.created_at).toLocaleString() : 'Recent',
            details: r.details || r.remarks || 'Administrative action logged in system.'
          })));
        }
      } catch (err) {
        console.warn('Audit log exception:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAuditLogs();
  }, []);

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
          Append-only logged administrative modifications, officer remarks, and certification timestamps
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

              {/* What the AI read, against what a human put in its place. The
                  PRD's rule that an extracted value is never silently replaced
                  only means anything if the original stays visible. */}
              {Object.keys(log.changes).length > 0 && (
                <div className="pt-2 overflow-x-auto">
                  <table className="w-full text-[11px] border border-stone-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-left">
                        <th className="px-2 py-1.5 font-semibold">Field</th>
                        <th className="px-2 py-1.5 font-semibold">AI value</th>
                        <th className="px-2 py-1.5 font-semibold">Corrected value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {Object.entries(log.changes).map(([field, entry]: [string, any]) => {
                        const aiValue = entry?.ai ?? entry?.value ?? '—';
                        const corrected = entry?.officer ?? entry?.citizen;
                        const wasCorrected = corrected !== undefined && corrected !== null;
                        return (
                          <tr key={field} className="align-top">
                            <td className="px-2 py-1.5 font-mono text-stone-700 whitespace-nowrap">{field}</td>
                            {/* Struck through only where it was actually replaced —
                                an untouched reading is still the record's value. */}
                            <td className={`px-2 py-1.5 ${wasCorrected
                              ? 'text-stone-500 line-through decoration-stone-300'
                              : 'text-stone-700'}`}>
                              {String(aiValue)}
                            </td>
                            <td className="px-2 py-1.5 font-semibold text-stone-900">
                              {wasCorrected
                                ? String(corrected)
                                : <span className="text-stone-300 font-normal">Not corrected</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {log.role === 'CITIZEN' ? 'Submitted by' : 'Authorized Officer'}:{' '}
                  <strong className="text-stone-800">{log.officer}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
