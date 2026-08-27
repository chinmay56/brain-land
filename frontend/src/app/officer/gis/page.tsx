'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, Layers, Compass, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { MOCK_RECORDS } from '@/data/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';

export default function OfficerGISPage() {
  const [selectedParcelId, setSelectedParcelId] = useState('124/2');
  const [search, setSearch] = useState('');
  const [activeLayer, setActiveLayer] = useState<'ALL' | 'BOUNDARY' | 'CONFLICTS'>('ALL');

  const parcels = [
    { id: '124/1', area: '1.20 Ha', owner: 'Vikram Joshi', status: 'VERIFIED', x: 12, y: 22, w: 26, h: 28 },
    { id: '124/2', area: '2.45 Ha', owner: 'Chinmay Narendra Ghag', status: 'UNDER_VERIFICATION', x: 40, y: 22, w: 32, h: 28 },
    { id: '124/3', area: '1.10 Ha', owner: 'Ramesh Patil', status: 'VERIFIED', x: 74, y: 22, w: 20, h: 28 },
    { id: '125/4', area: '1.80 Ha', owner: 'Ganesh Shinde', status: 'CONFLICT', x: 12, y: 54, w: 38, h: 36, conflictReason: 'Area sum exceeds mother parcel by +0.32 Ha' },
    { id: '128/1', area: '0.95 Ha', owner: 'Sunita Deshmukh', status: 'VERIFIED', x: 53, y: 54, w: 41, h: 36 },
  ];

  const selectedParcel = parcels.find(p => p.id === selectedParcelId) || parcels[1];
  const matchingRecord = MOCK_RECORDS.find(r => r.surveyNumber.value === selectedParcelId) || MOCK_RECORDS[0];

  const filteredParcels = parcels.filter(p => {
    if (search && !p.id.toLowerCase().includes(search.toLowerCase()) && !p.owner.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (activeLayer === 'CONFLICTS') return p.status === 'CONFLICT';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-terracotta-700" />
            <span>Cadastral GIS Visualizer • भू-नकाशा प्रणाली</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-950 font-serif tracking-tight">
            Village Hadapsar Cadastral Grid (Sheet 14)
          </h1>
          <p className="text-xs text-stone-500">
            Spatial parcel boundaries linked with Department of Land Resources Verified RoR Registry
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search survey number or owner..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#D7D4CA] rounded-xl text-stone-900 placeholder:text-stone-400 bg-[#FAF9F6] focus:bg-white transition-colors"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Map Canvas */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-5 flex flex-col h-[540px]">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-stone-100 text-xs text-stone-600 font-medium gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-stone-900" />
              <span className="font-bold text-stone-900">Cadastral Vector Layer: Pune / Haveli / Hadapsar</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-800 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Verified RoR
              </span>
              <span className="flex items-center gap-1 text-amber-800 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> In Review
              </span>
              <span className="flex items-center gap-1 text-rose-800 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span> Cadastral Conflict
              </span>
            </div>
          </div>

          <div className="flex-1 bg-[#FAF9F6] relative mt-4 rounded-xl border border-[#E8E6DF] overflow-hidden flex items-center justify-center p-6 select-none">
            <div className="absolute top-3 left-3 text-[10px] font-mono text-stone-400 bg-white/90 px-2 py-1 rounded-md border border-[#E8E6DF] shadow-stone-sm">
              LAT: 18.5089° N • LON: 73.9259° E (EPSG:4326 Cadastral WGS84)
            </div>

            <div className="relative w-full h-full max-w-lg max-h-[380px]">
              {filteredParcels.map((p) => {
                const isSelected = selectedParcelId === p.id;
                const bgColor = 
                  p.status === 'VERIFIED' ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 hover:bg-emerald-100/90' :
                  p.status === 'CONFLICT' ? 'bg-rose-50/90 border-rose-400 text-rose-950 hover:bg-rose-100/90' :
                  'bg-amber-50/90 border-amber-400 text-amber-950 hover:bg-amber-100/90';

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedParcelId(p.id)}
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: `${p.w}%`,
                      height: `${p.h}%`,
                    }}
                    className={`absolute rounded-xl border-2 transition-all flex flex-col items-center justify-center p-2 text-center cursor-pointer ${bgColor} ${
                      isSelected 
                        ? 'ring-2 ring-stone-950 scale-105 z-20 shadow-stone-md font-bold' 
                        : 'z-10 shadow-stone-sm'
                    }`}
                  >
                    <span className="font-mono font-bold text-xs">{p.id}</span>
                    <span className="text-[10px] font-medium opacity-90">{p.area}</span>
                    <span className="text-[9px] opacity-75 truncate max-w-full">{p.owner}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Parcel Inspector */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6 space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <span className="text-[10px] font-bold text-terracotta-700 uppercase tracking-wider">Spatial RoR Inspector</span>
            <h3 className="text-lg font-bold text-stone-950 font-serif">
              Survey No. {selectedParcel.id}
            </h3>
            <div className="text-xs text-stone-500 mt-0.5">Hadapsar, Haveli, Pune Division</div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-0.5">
              <span className="text-[10px] text-stone-400 block font-semibold">Registered Land Owner</span>
              <span className="font-bold text-stone-950 text-sm">{selectedParcel.owner}</span>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-0.5">
              <span className="text-[10px] text-stone-400 block font-semibold">Cadastral Boundary Area</span>
              <span className="font-mono font-bold text-stone-950 text-sm">{selectedParcel.area}</span>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-0.5">
              <span className="text-[10px] text-stone-400 block font-semibold">Verification & Legal Status</span>
              <div className="mt-1">
                <StatusBadge status={selectedParcel.status === 'CONFLICT' ? 'FLAGGED' : selectedParcel.status as any} />
              </div>
            </div>

            {selectedParcel.conflictReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Cadastral Boundary Conflict</span>
                </div>
                <p className="text-[11px] leading-relaxed">{selectedParcel.conflictReason}</p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Link
              href={`/officer/verification/${matchingRecord.id}`}
              className="w-full bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-stone-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Open in Verification Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 text-terracotta-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
