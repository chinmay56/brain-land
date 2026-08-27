'use client';

import React from 'react';
import { HelpCircle, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function CitizenHelpPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Land Owner Guidelines & Helpdesk
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          How to digitize, review, and verify historical Indian land records
        </p>
      </div>

      <div className="space-y-4 text-xs text-slate-700">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <h2 className="text-sm font-bold text-[#0F3662]">1. What documents can I upload?</h2>
          <p>You can upload scans or photographs of 7/12 extracts (Saat Baara), 8-A registers, Khasra/Khatauni documents, Sale deeds, and Mutation entries (Ferfar).</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <h2 className="text-sm font-bold text-[#0F3662]">2. Can I edit values before submitting?</h2>
          <p>Yes. If the AI vision model misreads a faint handwriting or number, you can propose the correction. The Sub-Divisional Officer will verify your proposed value against the source paper.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <h2 className="text-sm font-bold text-[#0F3662]">3. How long does verification take?</h2>
          <p>Standard officer verification takes 24 to 48 hours. You can track real-time status under "My Applications".</p>
        </div>
      </div>
    </div>
  );
}
