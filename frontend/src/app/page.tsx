'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  const { switchRole } = useAuth();
  const [selectedDocType, setSelectedDocType] = useState<'712' | 'khasra' | 'mutation'>('712');
  const [activeHighlight, setActiveHighlight] = useState<string | null>('survey');
  const [viewMode, setViewMode] = useState<'annotated' | 'raw'>('annotated');

  const sampleDocs = {
    '712': {
      title: 'गाव नमुना सात (७/१२) • अधिकार अभिलेख पत्रक',
      location: 'गाव: हडपसर | तालुका: हवेली | जिल्हा: पुणे (Maharashtra)',
      survey: '124 / 2',
      owner: 'रमेश बळीराम पाटील (Ramesh Baliram Patil)',
      area: '२.४५ हेक्टर (2.45 Ha)',
      mutation: '58?1',
      mutationStatus: 'Low OCR Confidence (58%) - Faint ink mark',
      classification: 'जिरायत (Agricultural Dry)',
      stamp: 'तलाठी सजा हडपसर • प्रमाणित',
      date: '14/08/2026'
    },
    'khasra': {
      title: 'खसरा-खतौनी नकल • भू-अभिलेख प्रपत्र',
      location: 'ग्राम: रायपुर | परगना: सदर | जनपद: वाराणसी (Uttar Pradesh)',
      survey: 'K-482 / 1',
      owner: 'सुरेश कुमार यादव (Suresh Kumar Yadav)',
      area: '१.८० हेक्टेयर (1.80 Ha)',
      mutation: 'MUT-9012',
      mutationStatus: 'Verified against Tahsil RoR (99%)',
      classification: 'एक फसली सिंचित (Irrigated Single Crop)',
      stamp: 'राजस्व निरीक्षक वृत्त • सत्यापित',
      date: '19/08/2026'
    },
    'mutation': {
      title: 'फेरफार नोंद पत्रक • नाम हस्तांतरण वारस नोंद',
      location: 'गाव: बाणेर | तालुका: हवेली | जिल्हा: पुणे (Maharashtra)',
      survey: '128 / 1-A',
      owner: 'अमित किशोर शर्मा (Amit Kishore Sharma)',
      area: '०.९५ हेक्टर (0.95 Ha)',
      mutation: '6042',
      mutationStatus: 'Inheritance Succession Deed (96%)',
      classification: 'बागायत (Horticultural)',
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-[#E8E6DF] text-xs font-semibold text-stone-800 shadow-stone-sm">
              <span className="w-2 h-2 rounded-full bg-terracotta-600 animate-pulse"></span>
              <span>National Land Records Modernization Programme (NLRMP)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.9rem] font-bold text-stone-950 tracking-tight leading-[1.12]">
              Digitizing India’s Historical{' '}
              <span className="font-serif italic font-normal text-terracotta-800">Land Records</span>{' '}
              with Verifiable Certainty.
            </h1>

            <p className="text-sm sm:text-base lg:text-[1.0625rem] text-stone-600 leading-relaxed max-w-2xl">
              An intelligent, human-in-the-loop governance system transforming legacy 7/12 extracts, Khasra registers, and mutation records into spatial-ready digital assets for the Department of Land Resources.
            </p>


          </div>

          {/* Right Column: Interactive Live Inspection Widget */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8E6DF] p-5 sm:p-6 shadow-parchment relative overflow-hidden">
            {/* Widget Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-terracotta-700" />
                <span className="text-xs font-bold text-stone-900">Interactive Document Canvas</span>
              </div>

              {/* Sample Document Type Switcher */}
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-[10.5px] font-semibold text-stone-600">
                <button
                  onClick={() => setSelectedDocType('712')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    selectedDocType === '712' ? 'bg-white text-stone-900 shadow-stone-sm' : 'hover:text-stone-900'
                  }`}
                >
                  7/12 Extract
                </button>
                <button
                  onClick={() => setSelectedDocType('khasra')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    selectedDocType === 'khasra' ? 'bg-white text-stone-900 shadow-stone-sm' : 'hover:text-stone-900'
                  }`}
                >
                  Khasra
                </button>
                <button
                  onClick={() => setSelectedDocType('mutation')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    selectedDocType === 'mutation' ? 'bg-white text-stone-900 shadow-stone-sm' : 'hover:text-stone-900'
                  }`}
                >
                  Mutation
                </button>
              </div>
            </div>

            {/* Document Parchment Canvas */}
            <div className="mt-3.5 p-4 sm:p-5 rounded-xl parchment-canvas border border-[#E8E2D5] space-y-3.5 relative text-xs shadow-inner">
              <div className="text-center pb-2.5 border-b border-[#E8E2D5] space-y-0.5">
                <div className="text-[9px] uppercase font-bold text-stone-500 tracking-wider">
                  राजस्व विभाग • अधिकार अभिलेख
                </div>
                <div className="text-xs font-bold text-stone-950 font-serif">
                  {currentDoc.title}
                </div>
                <div className="text-[9.5px] text-stone-500 font-mono">
                  {currentDoc.location}
                </div>
              </div>

              {/* Interactive Bounding Box Rows */}
              <div className="space-y-1.5 text-[11.5px]">
                <div 
                  onMouseEnter={() => setActiveHighlight('survey')}
                  className={`p-2 rounded-lg transition-all cursor-pointer flex justify-between items-center ${
                    activeHighlight === 'survey' ? 'bg-terracotta-100/90 border border-terracotta-500 shadow-stone-sm' : 'bg-white/60 border border-stone-200/80 hover:bg-stone-200/50'
                  }`}
                >
                  <span className="text-stone-600 font-medium">भूमापन क्रमांक (Survey / Khasra No.):</span>
                  <span className="font-mono font-bold text-stone-950 bg-white px-2 py-0.5 rounded border border-stone-200 shadow-2xs">
                    {currentDoc.survey}
                  </span>
                </div>

                <div 
                  onMouseEnter={() => setActiveHighlight('owner')}
                  className={`p-2 rounded-lg transition-all cursor-pointer flex justify-between items-center ${
                    activeHighlight === 'owner' ? 'bg-terracotta-100/90 border border-terracotta-500 shadow-stone-sm' : 'bg-white/60 border border-stone-200/80 hover:bg-stone-200/50'
                  }`}
                >
                  <span className="text-stone-600 font-medium">खातेदार / भूधारक (Owner):</span>
                  <span className="font-semibold text-stone-950">{currentDoc.owner}</span>
                </div>

                <div 
                  onMouseEnter={() => setActiveHighlight('area')}
                  className={`p-2 rounded-lg transition-all cursor-pointer flex justify-between items-center ${
                    activeHighlight === 'area' ? 'bg-terracotta-100/90 border border-terracotta-500 shadow-stone-sm' : 'bg-white/60 border border-stone-200/80 hover:bg-stone-200/50'
                  }`}
                >
                  <span className="text-stone-600 font-medium">एकूण क्षेत्र (Total Area):</span>
                  <span className="font-mono font-semibold text-stone-950">{currentDoc.area}</span>
                </div>

                <div 
                  onMouseEnter={() => setActiveHighlight('mutation')}
                  className={`p-2 rounded-lg transition-all cursor-pointer flex justify-between items-center ${
                    selectedDocType === '712' ? 'bg-rose-100/90 border border-rose-500 shadow-stone-sm' : 'bg-white/60 border border-stone-200/80'
                  }`}
                >
                  <div>
                    <span className="text-stone-700 font-medium">नोंद / फेरफार (Mutation Entry):</span>
                  </div>
                  <span className="font-mono font-bold text-stone-950">
                    {currentDoc.mutation}{' '}
                    {selectedDocType === '712' && <span className="text-[9px] font-sans font-semibold text-rose-700">(Flagged ⚠)</span>}
                  </span>
                </div>
              </div>

              {/* Red Talathi Stamp */}
              <div className="pt-2 flex justify-between items-end text-[9px] text-stone-500">
                <div className="w-14 h-14 rounded-full border border-red-700/80 p-1 flex items-center justify-center text-center text-[7px] font-bold text-red-800 rotate-[-12deg] talathi-stamp">
                  {currentDoc.stamp}
                </div>
                <div className="text-right">
                  <div className="font-semibold text-stone-700">सत्यापित स्वाक्षरी / तलाठी</div>
                  <div className="font-mono text-[8px] text-stone-400">{currentDoc.date}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-stone-500 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-terracotta-600" />
              <span>Hover over fields to test dynamic OCR bounding box tracking</span>
            </div>
          </div>
        </div>

        {/* Dual Gateway Portals Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-6">
          {/* Portal 1: Citizen / Land Owner */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] p-7 sm:p-8 shadow-stone-sm flex flex-col justify-between hover:border-terracotta-500/80 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-stone-100 border border-[#E8E6DF] flex items-center justify-center text-stone-900">
                  <User className="w-5 h-5 text-terracotta-700" />
                </div>
                <span className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-0.5 rounded-full border border-stone-200">
                  Citizen Services
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-950 tracking-tight">
                  Land Owner Portal
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
              <Link
                href="/citizen/dashboard"
                onClick={() => switchRole('CITIZEN')}
                className="w-full text-center block text-xs text-terracotta-700 font-semibold hover:underline"
              >
                Explore Citizen Dashboard Demo →
              </Link>
            </div>
          </div>

          {/* Portal 2: Revenue Officer */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] p-7 sm:p-8 shadow-stone-sm flex flex-col justify-between hover:border-stone-800 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-stone-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-terracotta-400" />
                </div>
                <span className="text-xs font-bold text-stone-900 bg-stone-100 px-3 py-0.5 rounded-full border border-stone-200">
                  Revenue Administration
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-950 tracking-tight">
                  Revenue Officer Console
                </h2>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                  Dedicated side-by-side workstation for Sub-Divisional Officers (SDO) and Tehsildars to inspect source document evidence, verify low-confidence OCR fields, and certify records.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-stone-100 text-xs text-stone-700">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-stone-900 flex-shrink-0" />
                  <span>Side-by-side parchment scan viewer with zoom & page controls</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-stone-900 flex-shrink-0" />
                  <span>Automated cadastral discrepancy checks & OCR certainty scores</span>
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
                <span>Officer Secure Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/officer/dashboard"
                onClick={() => switchRole('OFFICER')}
                className="w-full text-center block text-xs text-stone-800 font-semibold hover:underline"
              >
                Explore Officer Verification Workspace Demo →
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-[#E8E6DF] bg-white py-6 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-1">
          <p className="font-medium text-stone-800">
            Department of Land Resources (DoLR), Ministry of Rural Development, Government of India
          </p>
          <p className="text-[11px] text-stone-400 font-mono">
            Smart India Hackathon 2026 • Problem Statement ID: 26018
          </p>
        </div>
      </footer>
    </div>
  );
}
