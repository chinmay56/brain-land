'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GovernmentHeader } from '@/components/common/GovernmentHeader';
import { useAuth } from '@/context/AuthContext';
import { 
  User, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  ScanLine, 
  FileText, 
  Eye, 
  Layers, 
  Shield, 
  MapPin, 
  FileSpreadsheet,
  Check,
  Cpu
} from 'lucide-react';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';

export default function LandingPage() {
  const router = useRouter();
  const { loginCitizen, loginOfficer, switchRole } = useAuth();
  const [selectedDocType, setSelectedDocType] = useState<'712' | 'khasra' | 'mutation'>('712');

  // Automatic Smooth Carousel Auto-play Interval (3.5s)
  useEffect(() => {
    const timer = setInterval(() => {
      setSelectedDocType((prev) => {
        if (prev === '712') return 'khasra';
        if (prev === 'khasra') return 'mutation';
        return '712';
      });
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  const sampleDocs = {
    '712': {
      title: 'गाव नमुना सात (७/१२) • अधिकार अभिलेख पत्रक',
      location: 'गाव: हडपसर | तालुका: हवेली | जिल्हा: पुणे (Maharashtra)',
      fields: [
        { label: 'भूमापन क्रमांक (Survey / Gat No.)', value: '124 / 2' },
        { label: 'खातेदार / भूधारक (Owner)', value: 'रमेश बळीराम पाटील (Ramesh Patil)' },
        { label: 'एकूण क्षेत्र (Total Area)', value: '२.४५ हेक्टर (2.45 Ha)' },
        { label: 'नोंद / फेरफार (Mutation Entry)', value: '5821 (Verified)' }
      ],
      stamp: 'तलाठी सजा हडपसर • प्रमाणित',
      date: '14/08/2026'
    },
    'khasra': {
      title: 'खसरा-खतौनी नकल • भू-अभिलेख प्रपत्र',
      location: 'ग्राम: रायपुर | परगना: सदर | जनपद: वाराणसी (Uttar Pradesh)',
      fields: [
        { label: 'खसरा संख्या (Khasra No.)', value: 'K-482 / 1' },
        { label: 'खातेदार का नाम (Owner)', value: 'सुरेश कुमार यादव (Suresh Yadav)' },
        { label: 'कुल क्षेत्रफल (Total Area)', value: '१.८० हेक्टेयर (1.80 Ha)' },
        { label: 'नामांतरण संख्या (Mutation Entry)', value: 'MUT-9012 (RoR Verified)' }
      ],
      stamp: 'राजस्व निरीक्षक वृत्त • सत्यापित',
      date: '19/08/2026'
    },
    'mutation': {
      title: 'फेरफार नोंद पत्रक • नाम हस्तांतरण वारस नोंद',
      location: 'गाव: बाणेर | तालुका: हवेली | जिल्हा: पुणे (Maharashtra)',
      fields: [
        { label: 'हक्क नोंद क्रमांक (Mutation No.)', value: '6042' },
        { label: 'फेरफार प्रकार (Mutation Type)', value: 'वारस नोंद (Inheritance Title)' },
        { label: 'खातेदार (New Owner)', value: 'अमित किशोर शर्मा (Amit Sharma)' },
        { label: 'क्षेत्रफळ (Sub-parcel Area)', value: '०.९५ हेक्टर (0.95 Ha)' }
      ],
      stamp: 'नायब तहसीलदार हवेली • मंजूर',
      date: '22/08/2026'
    }
  };

  const currentDoc = sampleDocs[selectedDocType];

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA]">
      <GovernmentHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Top Hero Section */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center mb-14">
          {/* Left Column: Heading & Information */}
          <div className="lg:col-span-7 space-y-5">

            <h1 className="text-3xl sm:text-4xl lg:text-[2.9rem] font-bold text-stone-950 tracking-tight leading-[1.12]">
              Digitizing India’s Historical{' '}
              <span className="font-serif italic font-normal text-terracotta-800">Land Records</span>{' '}
              with Verifiable Certainty.
            </h1>

            <p className="text-sm sm:text-base lg:text-[1.0625rem] text-stone-600 leading-relaxed max-w-2xl">
              An intelligent, human-in-the-loop governance system transforming legacy 7/12 extracts, Khasra registers, and mutation records into spatial-ready digital assets for the Department of Land Resources.
            </p>
          </div>

          {/* Right Column: Automated Sliding Document Carousel Showcase Widget */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8E6DF] p-5 sm:p-6 shadow-parchment relative overflow-hidden flex flex-col justify-between">
            {/* Carousel Header Pills (No Heading Text) */}
            <div className="flex items-center justify-end pb-3 border-b border-stone-100">
              {/* Document Type Switcher Pills */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-[10.5px] font-semibold text-stone-600">
                <button
                  type="button"
                  onClick={() => setSelectedDocType('712')}
                  className={`px-3 py-1 rounded-lg transition-all duration-300 ${
                    selectedDocType === '712' ? 'bg-white text-stone-950 shadow-stone-sm font-bold scale-105' : 'hover:text-stone-900 text-stone-500'
                  }`}
                >
                  7/12 Extract
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocType('khasra')}
                  className={`px-3 py-1 rounded-lg transition-all duration-300 ${
                    selectedDocType === 'khasra' ? 'bg-white text-stone-950 shadow-stone-sm font-bold scale-105' : 'hover:text-stone-900 text-stone-500'
                  }`}
                >
                  Khasra
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocType('mutation')}
                  className={`px-3 py-1 rounded-lg transition-all duration-300 ${
                    selectedDocType === 'mutation' ? 'bg-white text-stone-950 shadow-stone-sm font-bold scale-105' : 'hover:text-stone-900 text-stone-500'
                  }`}
                >
                  Mutation
                </button>
              </div>
            </div>

            {/* Overflow-Hidden Sliding Carousel Track */}
            <div className="mt-3.5 overflow-hidden rounded-xl border border-[#E8E2D5] shadow-inner">
              <div 
                className="flex transition-transform duration-700 ease-in-out w-full"
                style={{
                  transform: selectedDocType === '712' ? 'translateX(0%)' : selectedDocType === 'khasra' ? 'translateX(-100%)' : 'translateX(-200%)'
                }}
              >
                {/* Slide 1: 7/12 Extract */}
                <div className="w-full shrink-0 p-4 sm:p-5 parchment-canvas space-y-3.5 text-xs">
                  <div className="text-center pb-2.5 border-b border-[#E8E2D5] space-y-0.5">
                    <div className="text-[9px] uppercase font-bold text-stone-500 tracking-wider">
                      राजस्व विभाग • अधिकार अभिलेख
                    </div>
                    <div className="text-xs font-bold text-stone-950 font-serif">
                      {sampleDocs['712'].title}
                    </div>
                    <div className="text-[9.5px] text-stone-500 font-mono">
                      {sampleDocs['712'].location}
                    </div>
                  </div>

                  <div className="space-y-2 text-[11.5px]">
                    {sampleDocs['712'].fields.map((f, idx) => (
                      <div 
                        key={idx}
                        className="group p-2.5 rounded-lg bg-white/80 hover:bg-white border border-stone-200/90 hover:border-stone-400 shadow-2xs hover:shadow-stone-sm transition-all flex justify-between items-center cursor-pointer"
                      >
                        <span className="text-stone-600 font-medium group-hover:text-stone-900 transition-colors">
                          {f.label}:
                        </span>
                        
                        <div className="relative font-mono text-stone-950 font-semibold text-right">
                          <span className="group-hover:hidden font-mono tracking-widest text-stone-400 select-none">
                            ••••••••••••
                          </span>
                          <span className="hidden group-hover:inline-block font-mono font-bold text-stone-950 bg-stone-100 px-2 py-0.5 rounded border border-stone-300 shadow-2xs">
                            {f.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-between items-end text-[9px] text-stone-500">
                    <div className="w-14 h-14 rounded-full border border-red-700/80 p-1 flex items-center justify-center text-center text-[7px] font-bold text-red-800 rotate-[-12deg] talathi-stamp">
                      {sampleDocs['712'].stamp}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-stone-700">सत्यापित स्वाक्षरी / अधिकारी</div>
                      <div className="font-mono text-[8px] text-stone-400">{sampleDocs['712'].date}</div>
                    </div>
                  </div>
                </div>

                {/* Slide 2: Khasra */}
                <div className="w-full shrink-0 p-4 sm:p-5 parchment-canvas space-y-3.5 text-xs">
                  <div className="text-center pb-2.5 border-b border-[#E8E2D5] space-y-0.5">
                    <div className="text-[9px] uppercase font-bold text-stone-500 tracking-wider">
                      राजस्व विभाग • अधिकार अभिलेख
                    </div>
                    <div className="text-xs font-bold text-stone-950 font-serif">
                      {sampleDocs['khasra'].title}
                    </div>
                    <div className="text-[9.5px] text-stone-500 font-mono">
                      {sampleDocs['khasra'].location}
                    </div>
                  </div>

                  <div className="space-y-2 text-[11.5px]">
                    {sampleDocs['khasra'].fields.map((f, idx) => (
                      <div 
                        key={idx}
                        className="group p-2.5 rounded-lg bg-white/80 hover:bg-white border border-stone-200/90 hover:border-stone-400 shadow-2xs hover:shadow-stone-sm transition-all flex justify-between items-center cursor-pointer"
                      >
                        <span className="text-stone-600 font-medium group-hover:text-stone-900 transition-colors">
                          {f.label}:
                        </span>
                        
                        <div className="relative font-mono text-stone-950 font-semibold text-right">
                          <span className="group-hover:hidden font-mono tracking-widest text-stone-400 select-none">
                            ••••••••••••
                          </span>
                          <span className="hidden group-hover:inline-block font-mono font-bold text-stone-950 bg-stone-100 px-2 py-0.5 rounded border border-stone-300 shadow-2xs">
                            {f.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-between items-end text-[9px] text-stone-500">
                    <div className="w-14 h-14 rounded-full border border-red-700/80 p-1 flex items-center justify-center text-center text-[7px] font-bold text-red-800 rotate-[-12deg] talathi-stamp">
                      {sampleDocs['khasra'].stamp}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-stone-700">सत्यापित स्वाक्षरी / अधिकारी</div>
                      <div className="font-mono text-[8px] text-stone-400">{sampleDocs['khasra'].date}</div>
                    </div>
                  </div>
                </div>

                {/* Slide 3: Mutation */}
                <div className="w-full shrink-0 p-4 sm:p-5 parchment-canvas space-y-3.5 text-xs">
                  <div className="text-center pb-2.5 border-b border-[#E8E2D5] space-y-0.5">
                    <div className="text-[9px] uppercase font-bold text-stone-500 tracking-wider">
                      राजस्व विभाग • अधिकार अभिलेख
                    </div>
                    <div className="text-xs font-bold text-stone-950 font-serif">
                      {sampleDocs['mutation'].title}
                    </div>
                    <div className="text-[9.5px] text-stone-500 font-mono">
                      {sampleDocs['mutation'].location}
                    </div>
                  </div>

                  <div className="space-y-2 text-[11.5px]">
                    {sampleDocs['mutation'].fields.map((f, idx) => (
                      <div 
                        key={idx}
                        className="group p-2.5 rounded-lg bg-white/80 hover:bg-white border border-stone-200/90 hover:border-stone-400 shadow-2xs hover:shadow-stone-sm transition-all flex justify-between items-center cursor-pointer"
                      >
                        <span className="text-stone-600 font-medium group-hover:text-stone-900 transition-colors">
                          {f.label}:
                        </span>
                        
                        <div className="relative font-mono text-stone-950 font-semibold text-right">
                          <span className="group-hover:hidden font-mono tracking-widest text-stone-400 select-none">
                            ••••••••••••
                          </span>
                          <span className="hidden group-hover:inline-block font-mono font-bold text-stone-950 bg-stone-100 px-2 py-0.5 rounded border border-stone-300 shadow-2xs">
                            {f.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-between items-end text-[9px] text-stone-500">
                    <div className="w-14 h-14 rounded-full border border-red-700/80 p-1 flex items-center justify-center text-center text-[7px] font-bold text-red-800 rotate-[-12deg] talathi-stamp">
                      {sampleDocs['mutation'].stamp}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-stone-700">सत्यापित स्वाक्षरी / अधिकारी</div>
                      <div className="font-mono text-[8px] text-stone-400">{sampleDocs['mutation'].date}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Gateway Portals Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-6">
          {/* Portal 1: Citizen / Land Owner */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] p-7 sm:p-8 shadow-stone-sm flex flex-col justify-between hover:border-terracotta-500/80 transition-all">
            <div className="space-y-4">
              <div>
                <div className="w-11 h-11 rounded-xl bg-stone-100 border border-[#E8E6DF] flex items-center justify-center text-stone-900 mb-3">
                  <User className="w-5 h-5 text-terracotta-700" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-950 tracking-tight">
                  Land Owner
                </h2>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                  Submit your legacy 7/12 extract or mutation deed, review AI-extracted land holding data, propose field corrections, and track the verification lifecycle.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-stone-100 text-xs text-stone-700">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Upload PDFs and high-resolution camera scans of land records</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Interactive extracted data review with field-level correction</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Live milestone tracking and certified digital RoR download</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/login"
                  onClick={() => switchRole('CITIZEN')}
                  className="w-full text-center bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-stone-sm"
                >
                  <span>Citizen Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/register"
                  onClick={() => switchRole('CITIZEN')}
                  className="w-full text-center bg-white hover:bg-stone-50 text-stone-900 border border-[#D7D4CA] text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors shadow-stone-sm"
                >
                  Register
                </Link>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await loginCitizen('ramesh.patil@gmail.com', 'password123');
                  router.push('/citizen/dashboard');
                }}
                className="w-full text-center block text-xs text-terracotta-700 font-semibold hover:underline cursor-pointer"
              >
                Explore Citizen Dashboard Demo →
              </button>
            </div>
          </div>

          {/* Portal 2: Revenue Officer */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] p-7 sm:p-8 shadow-stone-sm flex flex-col justify-between hover:border-stone-800 transition-all">
            <div className="space-y-4">
              <div>
                <div className="w-11 h-11 rounded-xl bg-stone-900 text-white flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5 text-terracotta-400" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-950 tracking-tight">
                  Revenue Officer
                </h2>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                  Dedicated side-by-side workstation for Sub-Divisional Officers (SDO) and Tehsildars to inspect source document evidence, verify low-confidence OCR fields, and certify records.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-stone-100 text-xs text-stone-700">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-stone-900 flex-shrink-0" />
                  <span>Side-by-side parchment scan viewer with zoom &amp; page controls</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-stone-900 flex-shrink-0" />
                  <span>Automated cadastral discrepancy checks &amp; OCR certainty scores</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-stone-900 flex-shrink-0" />
                  <span>Immutable audit logging for all manual officer corrections</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <Link
                href="/officer-login"
                onClick={() => switchRole('OFFICER')}
                className="w-full text-center bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-stone-sm transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-terracotta-400" />
                <span>Officer Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await loginOfficer('REV-MH-PN-4091', 'admin@revenue2026', '8912', 'Pune', 'Haveli', 'Sub-Divisional Revenue Officer (SDO)');
                  router.push('/officer/dashboard');
                }}
                className="w-full text-center block text-xs text-stone-800 font-semibold hover:underline cursor-pointer"
              >
                Explore Officer Verification Workspace Demo →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
