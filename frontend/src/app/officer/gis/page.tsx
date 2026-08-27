'use client';

import React, { useState } from 'react';
import { MapPin, Search, Layers, Compass } from 'lucide-react';
import { MOCK_RECORDS } from '@/data/mockData';

export default function OfficerGISPage() {
  const [selectedParcel, setSelectedParcel] = useState(MOCK_RECORDS[0]);
  const [search, setSearch] = useState('');

  const parcels = [
    { id: '124/1', area: '1.20 Ha', owner: 'Vikram Joshi', status: 'VERIFIED', x: 20, y: 30, w: 25, h: 25 },
    { id: '124/2', area: '2.45 Ha', owner: 'Ramesh Patil', status: 'UNDER_VERIFICATION', x: 48, y: 30, w: 35, h: 25, active: true },
    { id: '125/4', area: '1.80 Ha', owner: 'Suresh Kumar', status: 'CONFLICT', x: 20, y: 58, w: 30, h: 30 },
    { id: '128/1', area: '0.95 Ha', owner: 'Amit Sharma', status: 'VERIFIED', x: 53, y: 58, w: 30, h: 30 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-indigo-600" />
            <span>Cadastral GIS Visualizer • भू-नकाशा प्रणाली</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Village Hadapsar Cadastral Grid (Sheet 14)
          </h1>
          <p className="text-xs text-slate-500">
            Spatial parcel boundaries linked with Department of Land Resources Verified RoR Registry
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search survey no..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0F294A] bg-slate-50/50"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Map Canvas */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-4 flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F294A]" />
              <span>Cadastral Layer: Haveli / Hadapsar / 124</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Verified</span>
              <span className="flex items-center gap-1.5 text-amber-700"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Review</span>
              <span className="flex items-center gap-1.5 text-rose-700"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Conflict</span>
            </div>
          </div>

          <div className="flex-1 bg-[#EEF2F6] relative mt-3 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-6 select-none">
            <div className="absolute top-2.5 left-3 text-[9px] font-mono text-slate-400">
              LAT: 18.5089° N | LON: 73.9259° E (EPSG:4326)
            </div>

            <div className="relative w-full h-full max-w-lg max-h-96">
              {parcels.map((p) => {
                const isSelected = selectedParcel.surveyNumber.value === p.id;
                const bgColor = 
                  p.status === 'VERIFIED' ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 hover:bg-emerald-100/90' :
                  p.status === 'CONFLICT' ? 'bg-rose-50/90 border-rose-400 text-rose-950 hover:bg-rose-100/90' :
                  'bg-amber-50/90 border-amber-400 text-amber-950 hover:bg-amber-100/90';

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      const found = MOCK_RECORDS.find(r => r.surveyNumber.value === p.id);
                      if (found) setSelectedParcel(found);
                    }}
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: `${p.w}%`,
                      height: `${p.h}%`,
                    }}
                    className={`absolute rounded-xl border transition-all flex flex-col items-center justify-center p-2 text-center shadow-subtle cursor-pointer ${bgColor} ${
                      isSelected ? 'ring-2 ring-[#0F294A] z-20 scale-105 shadow-md' : 'z-10'
                    }`}
                  >
                    <span className="font-mono font-bold text-xs">{p.id}</span>
                    <span className="text-[10px] font-medium opacity-80">{p.area}</span>
                    <span className="text-[9px] opacity-70 truncate max-w-full">{p.owner}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Parcel Inspector */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spatial Inspector</span>
            <h3 className="text-base font-bold text-[#0F294A]">
              Survey No. {selectedParcel.surveyNumber.value}
            </h3>
            <div className="text-xs text-slate-400 mt-0.5">{selectedParcel.village.value}, {selectedParcel.tehsil.value}</div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/60">
              <span className="text-[10px] text-slate-400 block">Registered Owner</span>
              <span className="font-semibold text-slate-900">{selectedParcel.ownerName.value}</span>
            </div>

            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/60">
              <span className="text-[10px] text-slate-400 block">Cadastral Area</span>
              <span className="font-mono font-semibold text-slate-900">{selectedParcel.area.value} {selectedParcel.areaUnit}</span>
            </div>

            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/60">
              <span className="text-[10px] text-slate-400 block">Classification</span>
              <span className="font-medium text-slate-800">{selectedParcel.landClassification?.value || 'Jirayat (Agricultural)'}</span>
            </div>

            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/60">
              <span className="text-[10px] text-slate-400 block">Verification Status</span>
              <span className="font-semibold text-emerald-800">{selectedParcel.status}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
