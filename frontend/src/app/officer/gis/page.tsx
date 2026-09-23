'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  UploadCloud, Compass, Search, RefreshCw, ServerCrash, Ruler, Fingerprint,
  AlertOctagon, AlertTriangle, CheckCircle2, Info, FileJson, Network, Target,
  ScanLine, MousePointerClick, Undo2, X, ShieldCheck, ShieldAlert, MapPin,
} from 'lucide-react';

import type {
  AccuracyClass, ParcelFeature, PlotResponse, GeometryFlag,
} from '@/types/gis';
import { ACCURACY_STYLE } from '@/components/gis/CadastralMap';
import type { LonLat } from '@/components/gis/CadastralMap';

const CadastralMap = dynamic(() => import('@/components/gis/CadastralMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-xs text-stone-400">
      Loading map…
    </div>
  ),
});

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const SEVERITY_META: Record<string, { chip: string; Icon: React.ElementType }> = {
  CRITICAL: { chip: 'bg-rose-100 border-rose-300 text-rose-900', Icon: AlertOctagon },
  CONFLICT: { chip: 'bg-orange-50 border-orange-200 text-orange-900', Icon: AlertTriangle },
  WARNING:  { chip: 'bg-amber-50 border-amber-200 text-amber-900', Icon: AlertTriangle },
  INFO:     { chip: 'bg-stone-50 border-stone-200 text-stone-700', Icon: Info },
};

const METHOD_LABEL: Record<string, string> = {
  coordinates: 'Coordinates (officer trace or resurvey)',
  traverse: 'Traverse (bearings & distances)',
  chain_offset: 'Tippan ladder (chain & offset)',
  none: 'No geometry source',
};

/** Extra fields returned by /plot-document that PlotResponse doesn't declare. */
type DocResponse = PlotResponse & {
  data_source?: string;
  data_source_note?: string;
  needs_position?: boolean;
  next_step?: string | null;
  has_reconstructed_shape?: boolean;
  officer_pin?: { lon: number; lat: number };
  adapter_notes?: { code: string; severity: string; message: string }[];
  extraction?: {
    fields: Record<string, { value: string | null; confidence: number | null }>;
    co_owners: string[];
    boundaries: Record<string, string>;
    geometry_source?: { kind: string; label: string; detail: string } | null;
    overall_confidence: number | null;
    pages: number | null;
  };
};

export default function OfficerGISPage() {
  const [data, setData] = useState<DocResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | AccuracyClass>('ALL');
  const [showUncertainty, setShowUncertainty] = useState(true);

  // the scanned document currently being worked on
  const [docFile, setDocFile] = useState<File | null>(null);
  const [traceMode, setTraceMode] = useState(false);
  const [tracePoints, setTracePoints] = useState<LonLat[]>([]);
  const [pinMode, setPinMode] = useState(false);
  const [pinPoint, setPinPoint] = useState<LonLat | null>(null);
  const [suggested, setSuggested] =
    useState<{ lon: number; lat: number; label: string } | null>(null);

  const pdfRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (fn: () => Promise<Response>) => {
    setLoading(true); setError(null);
    try {
      const res = await fn();
      const body = await res.json();
      if (!res.ok) {
        throw new Error(typeof body.detail === 'string'
          ? body.detail : JSON.stringify(body.detail).slice(0, 400));
      }
      setData(body as DocResponse);
      setSelected(body.parcels?.features?.[0]?.properties?.survey_no ?? null);
      return body as DocResponse;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Upload a scanned land record → real OCR → adapter → geometry. */
  const processDocument = useCallback(async (file: File, trace?: LonLat[], pin?: LonLat) => {
    const form = new FormData();
    form.append('file', file);
    if (trace && trace.length >= 3) form.append('trace', JSON.stringify(trace));
    else if (pin) form.append('pin', JSON.stringify(pin));
    const result = await run(() =>
      fetch(`${API}/api/gis/plot-document?state=Maharashtra`, { method: 'POST', body: form }));
    if (result && result.summary.plotted > 0) {
      setTraceMode(false);
      setPinMode(false);
    }
    if (result?.officer_pin) {
      setPinPoint([result.officer_pin.lon, result.officer_pin.lat]);
    }

    // Nothing plotted means the officer is about to hunt for this village on a
    // map of the whole country. Ask the geocoder where to start looking. It is
    // only ever a hint, so a failure here is silent and changes nothing.
    if (result && result.summary.plotted === 0) {
      const f = result.extraction?.fields;
      const village = f?.village?.value;
      if (village) {
        try {
          const q = new URLSearchParams({
            village,
            tehsil: f?.tehsil?.value ?? '',
            district: f?.district?.value ?? '',
            state: f?.state?.value || 'Maharashtra',
          });
          const hit = await fetch(`${API}/api/gis/suggest-location?${q}`).then((r) => r.json());
          if (hit?.found) {
            setSuggested({ lon: hit.lon, lat: hit.lat, label: hit.display_name });
          }
        } catch {
          /* a missing hint is not a problem worth showing anyone */
        }
      }
    }
    return result;
  }, [run]);

  const loadSample = (village: 'grid' | 'irregular') => {
    setDocFile(null); setTracePoints([]); setTraceMode(false);
    setPinMode(false); setPinPoint(null); setSuggested(null);
    return run(async () => {
      const s = await fetch(`${API}/api/gis/sample?village=${village}`, { method: 'POST' });
      const { documents } = await s.json();
      return fetch(`${API}/api/gis/plot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, assemble: true }),
      });
    });
  };

  // The deployed demo is opened to be looked at, not uploaded into, so the map
  // must not be blank on arrival. Load the assembled sample village once on
  // mount; any upload or trace replaces it. The ref guard stops React 18
  // StrictMode's double-mount from firing two requests in development.
  const didAutoLoad = useRef(false);
  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;
    void loadSample('grid');
    // loadSample is re-created every render and must not re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadJson = (file: File) => {
    setDocFile(null); setTracePoints([]); setTraceMode(false);
    setPinMode(false); setPinPoint(null); setSuggested(null);
    return run(() => {
      const form = new FormData();
      form.append('file', file);
      return fetch(`${API}/api/gis/upload?assemble=true`, { method: 'POST', body: form });
    });
  };

  const parcels = data?.parcels ?? null;
  const extraction = data?.extraction;
  const isFixture = data?.data_source === 'DEMO_FALLBACK';
  const isLive = data?.data_source === 'SARVAM_LIVE';

  const selectedFeature = useMemo<ParcelFeature | null>(
    () => parcels?.features.find((f) => f.properties.survey_no === selected) ?? null,
    [parcels, selected],
  );

  const selectedFlags = useMemo<GeometryFlag[]>(
    () => (data?.flags ?? []).filter((f) => f.survey_no === selected),
    [data, selected],
  );

  const listed = useMemo(() => {
    if (!parcels) return [];
    const q = search.trim().toLowerCase();
    const rank: Record<string, number> = {
      surveyed: 0, reconstructed_anchored: 1, inferred: 2,
      reconstructed_floating: 3, none: 4,
    };
    return parcels.features
      .filter((f) => {
        const p = f.properties;
        if (filter !== 'ALL' && p.accuracy_class !== filter) return false;
        if (!q) return true;
        return p.survey_no.toLowerCase().includes(q)
          || (p.owner_name ?? '').toLowerCase().includes(q);
      })
      .sort((a, b) => rank[a.properties.accuracy_class] - rank[b.properties.accuracy_class]);
  }, [parcels, search, filter]);

  const stats = data?.assembly?.stats;

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------- header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] shadow-stone-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>Cadastral GIS — parcels derived from land documents</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-950 font-serif tracking-tight">
              {data?.village ? `Village ${data.village}` : 'Plot parcels from land records'}
            </h1>
            <p className="text-xs text-stone-500 max-w-3xl leading-relaxed">
              Upload a scanned land record. It is read by the extraction stage, mapped
              onto the geometry contract, and plotted from whatever the document
              supports. A 7/12 or sale deed carries no coordinates — for those, trace
              the parcel on imagery and the declared area will cross-check your trace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input ref={pdfRef} type="file" accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setDocFile(f); setTracePoints([]); setPinMode(false); setPinPoint(null);
                  setSuggested(null);
                  void processDocument(f);
                }
                e.target.value = '';
              }} />
            <input ref={jsonRef} type="file" accept="application/json,.json" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadJson(f);
                e.target.value = '';
              }} />

            <button onClick={() => pdfRef.current?.click()}
              className="bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-stone-sm flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-terracotta-400" />
              Upload scanned document
            </button>
            <button onClick={() => jsonRef.current?.click()}
              className="text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#D7D4CA] hover:bg-[#FAF9F6] flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5 text-stone-500" /> Extraction JSON
            </button>
            <button onClick={() => void loadSample('grid')}
              className="text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#D7D4CA] hover:bg-[#FAF9F6] flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-stone-500" /> Example village
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-4 text-xs text-stone-500 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            {docFile ? 'Running extraction and building geometry…' : 'Building geometry…'}
          </div>
        )}

        {/* the honesty badge — never let fixture data look live */}
        {data?.data_source && (
          <div className={`mt-4 p-3 rounded-xl border flex items-start gap-2 ${
            isLive ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                   : 'bg-rose-50 border-rose-300 text-rose-900'}`}>
            {isLive ? <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    : <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <div>
              <div className="text-xs font-bold">
                {isLive ? 'LIVE EXTRACTION' : 'FIXTURE DATA — NOT FROM YOUR DOCUMENT'}
              </div>
              <p className="text-[11px] leading-relaxed mt-0.5">{data.data_source_note}</p>
              {isFixture && (
                <p className="text-[11px] mt-1 font-mono">
                  Fix: create <b>backend/.env</b> with a real SARVAM_API_KEY, then restart uvicorn.
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900">
            <div className="flex items-start gap-2">
              <ServerCrash className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 min-w-0">
                <p className="text-xs font-semibold">Could not process</p>
                <p className="text-[11px] font-mono break-words">{error}</p>
                <p className="text-[11px]">
                  Backend must be running at <code className="bg-white px-1 rounded">{API}</code> —{' '}
                  <code className="bg-white px-1 rounded">uvicorn app.main:app --reload --port 8000</code>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!data && !loading && !error && <EmptyState />}

      {/* ------------------------------------------------- trace instruction */}
      {data?.needs_position && docFile && (
        <div className="bg-white p-5 rounded-2xl border-2 border-terracotta-400 shadow-stone-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-terracotta-700 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-stone-950">
                  {data.has_reconstructed_shape
                    ? 'Exact boundary recovered — it just needs placing'
                    : 'This document has no coordinates — that is normal'}
                </h3>
                {extraction?.geometry_source && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg
                                  bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900">
                    <Ruler className="w-3.5 h-3.5" />
                    <b>{extraction.geometry_source.label}</b>
                    <span className="text-emerald-700">{extraction.geometry_source.detail}</span>
                  </div>
                )}
                <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  {data.next_step}{' '}
                  {extraction?.fields?.village?.value && (
                    <>Zoom the map to <b>{extraction.fields.village.value}</b>
                      {extraction.fields.district?.value && <>, {extraction.fields.district.value}</>},
                      switch to Satellite, and{' '}
                      {data.has_reconstructed_shape
                        ? 'drop one pin where the parcel sits.'
                        : 'either click each corner of the parcel, or drop a single pin if you only know roughly where it is.'}</>
                  )}
                </p>
                {suggested && !pinPoint && (
                  <p className="text-[11px] text-stone-500 mt-2 leading-relaxed flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                    <span>
                      Map moved to a suggested starting point:{' '}
                      <b className="text-stone-700">{suggested.label}</b>.{' '}
                      <span className="text-amber-700">
                        Unconfirmed — from OpenStreetMap, not a cadastral record.
                      </span>{' '}
                      Nudge the pin or trace the parcel to set the real position.
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!traceMode && !pinMode && !pinPoint ? (
                // With a recovered shape the pin is the whole job, so it leads.
                // Tracing corners by hand would only throw that shape away.
                data.has_reconstructed_shape ? (
                  <>
                    <button onClick={() => { setPinMode(true); setPinPoint(null); }}
                      className="bg-terracotta-700 hover:bg-terracotta-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Drop a pin to place it
                    </button>
                    <button onClick={() => { setTraceMode(true); setTracePoints([]); setPinPoint(null); }}
                      className="text-xs font-semibold py-2.5 px-4 rounded-xl border border-[#D7D4CA] text-stone-600 hover:bg-[#FAF9F6] flex items-center gap-2">
                      <MousePointerClick className="w-4 h-4" /> Trace corners instead
                    </button>
                  </>
                ) : (
                <>
                  <button onClick={() => { setTraceMode(true); setTracePoints([]); setPinPoint(null); }}
                    className="bg-terracotta-700 hover:bg-terracotta-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2">
                    <MousePointerClick className="w-4 h-4" /> Trace parcel on map
                  </button>
                  <button onClick={() => { setPinMode(true); setPinPoint(null); }}
                    className="text-xs font-semibold py-2.5 px-4 rounded-xl border border-terracotta-300 text-terracotta-800 hover:bg-terracotta-50 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Drop a pin instead
                  </button>
                </>
                )
              ) : traceMode ? (
                <>
                  <span className="text-xs font-mono text-stone-500">
                    {tracePoints.length} corner{tracePoints.length === 1 ? '' : 's'}
                  </span>
                  <button onClick={() => setTracePoints((p) => p.slice(0, -1))}
                    disabled={!tracePoints.length}
                    className="text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#D7D4CA] hover:bg-[#FAF9F6] disabled:opacity-40 flex items-center gap-1.5">
                    <Undo2 className="w-3.5 h-3.5" /> Undo
                  </button>
                  <button onClick={() => { setTraceMode(false); setTracePoints([]); }}
                    className="text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#D7D4CA] hover:bg-[#FAF9F6] flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button
                    onClick={() => docFile && void processDocument(docFile, tracePoints)}
                    disabled={tracePoints.length < 3}
                    className="bg-[#141416] hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2">
                    <Target className="w-4 h-4 text-terracotta-400" />
                    Plot with these {tracePoints.length} corners
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs font-mono text-stone-500">
                    {pinPoint ? 'Pin placed' : 'Click the map once'}
                  </span>
                  {pinPoint && (
                    <button onClick={() => setPinPoint(null)}
                      className="text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#D7D4CA] hover:bg-[#FAF9F6] flex items-center gap-1.5">
                      <Undo2 className="w-3.5 h-3.5" /> Redo
                    </button>
                  )}
                  <button onClick={() => { setPinMode(false); setPinPoint(null); }}
                    className="text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#D7D4CA] hover:bg-[#FAF9F6] flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button
                    onClick={() => docFile && pinPoint && void processDocument(docFile, undefined, pinPoint)}
                    disabled={!pinPoint}
                    className="bg-[#141416] hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2">
                    <Target className="w-4 h-4 text-terracotta-400" />
                    Plot with this pin
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Documents plotted"
                value={`${data!.summary.plotted}/${data!.documents_received}`}
                sub={`${data!.summary.unplaced} unplaced`} accent="text-stone-950" />
          <Stat label="Anchored" value={String(stats.anchored)}
                sub="carried coordinates" accent="text-emerald-700" />
          <Stat label="Inferred" value={String(stats.inferred)}
                sub={`${data!.assembly!.passes} passes`} accent="text-amber-700" />
          <Stat label="Uncertainty" value={`±${stats.mean_position_uncertainty_m} m`}
                sub={`worst ±${stats.max_position_uncertainty_m} m`} accent="text-stone-950" />
          <Stat label="Mosaic area" value={`${stats.mosaic_area_ha} ha`}
                sub={stats.metric_crs} accent="text-stone-950" />
        </div>
      )}

      {data && (
        <div className="grid xl:grid-cols-12 gap-6">
          {/* ------------------------------------------------------- map */}
          <div className="xl:col-span-8 bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-5 flex flex-col h-[620px]">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-stone-100 gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'surveyed', 'reconstructed_anchored', 'inferred'] as const).map((k) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                      filter === k ? 'bg-[#141416] text-white border-[#141416]'
                                   : 'bg-white text-stone-600 border-[#E8E6DF] hover:bg-[#FAF9F6]'}`}>
                    {k === 'ALL' ? 'All' : ACCURACY_STYLE[k].label.split(' (')[0]}
                  </button>
                ))}
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 cursor-pointer ml-1">
                  <input type="checkbox" checked={showUncertainty}
                    onChange={(e) => setShowUncertainty(e.target.checked)}
                    className="accent-amber-600" />
                  Uncertainty
                </label>
              </div>
              {traceMode && (
                <span className="text-[11px] font-bold text-terracotta-700 flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Click each corner of the parcel
                </span>
              )}
              {pinMode && (
                <span className="text-[11px] font-bold text-terracotta-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Click once to drop the pin
                </span>
              )}
              <div className="relative w-full sm:w-52">
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Survey no. or owner…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D7D4CA] rounded-xl bg-[#FAF9F6] focus:bg-white" />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
              </div>
            </div>

            <div className="flex-1 mt-4 rounded-xl border border-[#E8E6DF] overflow-hidden">
              <CadastralMap
                parcels={parcels}
                selectedSurveyNo={selected}
                onSelect={setSelected}
                showUncertainty={showUncertainty}
                accuracyFilter={filter}
                traceMode={traceMode}
                tracePoints={tracePoints}
                onTraceAdd={(p) => setTracePoints((prev) => [...prev, p])}
                pinMode={pinMode}
                pinPoint={pinPoint}
                onPinSet={(p) => { setPinPoint(p); setPinMode(false); }}
                suggested={suggested}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-[11px] text-stone-600">
              {(['surveyed', 'reconstructed_anchored', 'inferred'] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ACCURACY_STYLE[k].fill }} />
                  {ACCURACY_STYLE[k].label}
                </span>
              ))}
              <span className="text-stone-400">
                Dashed = inferred · red outline = area disagrees with the register
              </span>
            </div>
          </div>

          {/* ------------------------------------------------- right column */}
          <div className="xl:col-span-4 space-y-6">
            {extraction && <ExtractionPanel extraction={extraction} notes={data.adapter_notes ?? []} />}

            <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6">
              <div className="border-b border-stone-100 pb-3">
                <span className="text-[10px] font-bold text-terracotta-700 uppercase tracking-wider">
                  Parcel provenance
                </span>
                <h3 className="text-lg font-bold text-stone-950 font-serif">
                  {selectedFeature ? `Survey No. ${selectedFeature.properties.survey_no}` : 'No parcel plotted'}
                </h3>
              </div>
              {selectedFeature
                ? <Inspector feature={selectedFeature} flags={selectedFlags} />
                : <p className="text-xs text-stone-500 pt-3">
                    Nothing plotted yet. Trace the parcel on the map to give it a position.
                  </p>}
            </div>

            {listed.length > 1 && (
              <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-5">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <span className="text-xs font-bold text-stone-900">Parcels</span>
                  <span className="text-[10px] font-mono text-stone-400">{listed.length}</span>
                </div>
                <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {listed.map((f) => {
                    const p = f.properties;
                    const on = p.survey_no === selected;
                    return (
                      <button key={p.survey_no} onClick={() => setSelected(p.survey_no)}
                        className={`w-full text-left px-3 py-2 rounded-xl border transition-all ${
                          on ? 'bg-[#141416] border-[#141416] text-white'
                             : 'bg-white border-[#E8E6DF] hover:bg-[#FAF9F6]'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold">{p.survey_no}</span>
                          <span className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: ACCURACY_STYLE[p.accuracy_class].fill }} />
                        </div>
                        <div className={`text-[11px] truncate ${on ? 'text-stone-300' : 'text-stone-500'}`}>
                          {p.owner_name ?? '—'}
                        </div>
                        <div className="text-[10px] font-mono text-stone-400">
                          {p.computed_area_ha} ha · {p.method.replace('_', ' ')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {data && data.flags.length > 0 && <Findings flags={data.flags} onPick={setSelected} />}
      {data?.assembly && <AdjacencyPanel assembly={data.assembly} />}
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function ExtractionPanel({
  extraction, notes,
}: {
  extraction: NonNullable<DocResponse['extraction']>;
  notes: { code: string; severity: string; message: string }[];
}) {
  const show: [string, string][] = [
    ['owner_name', 'Owner'], ['survey_number', 'Survey / Gut no.'],
    ['khasra_number', 'Khasra'], ['khata_number', 'Khata'],
    ['area', 'Area'], ['area_unit', 'Unit'],
    ['village', 'Village'], ['tehsil', 'Tehsil'],
    ['district', 'District'], ['state', 'State'],
  ];
  const bounds = extraction.boundaries ?? {};

  return (
    <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6">
      <div className="border-b border-stone-100 pb-3">
        <span className="text-[10px] font-bold text-terracotta-700 uppercase tracking-wider">
          Extracted from the document
        </span>
        <h3 className="text-lg font-bold text-stone-950 font-serif">
          {extraction.overall_confidence != null
            ? `${Math.round(extraction.overall_confidence * 100)}% overall confidence`
            : 'Extraction'}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {show.map(([key, label]) => {
          const f = extraction.fields[key];
          if (!f?.value) return null;
          const conf = f.confidence;
          return (
            <div key={key} className="p-2.5 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400 font-semibold">{label}</span>
                {conf != null && conf > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 rounded ${
                    conf >= 0.9 ? 'bg-emerald-100 text-emerald-800'
                    : conf >= 0.7 ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'}`}>
                    {Math.round(conf * 100)}%
                  </span>
                )}
              </div>
              <div className="text-xs font-semibold text-stone-950 mt-0.5 break-words">{f.value}</div>
            </div>
          );
        })}
      </div>

      {Object.keys(bounds).length > 0 && (
        <div className="mt-3 p-2.5 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF]">
          <span className="text-[10px] text-stone-400 font-semibold">
            FOUR BOUNDARIES (चतुःसीमा)
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
            {(['north', 'east', 'south', 'west'] as const).map((d) => (
              <div key={d} className="text-[11px]">
                <span className="text-stone-400 capitalize">{d}: </span>
                <span className="text-stone-900">{bounds[d] ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {notes.map((n, i) => {
            const m = SEVERITY_META[n.severity] ?? SEVERITY_META.INFO;
            return (
              <div key={i} className={`p-2 rounded-lg border text-[11px] ${m.chip}`}>
                <span className="font-mono font-bold text-[9px]">{n.code}</span>
                <p className="leading-relaxed mt-0.5">{n.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-8">
      <h2 className="text-base font-bold text-stone-950 font-serif">
        Upload a scanned land record
      </h2>
      <p className="text-xs text-stone-500 mt-1 max-w-3xl leading-relaxed">
        The document is read by the extraction stage, its fields are mapped onto the
        geometry contract, and it is plotted from whatever geometry it carries. Most
        Indian records — 7/12, jamabandi, khatauni, sale deeds — carry none, which is
        why the second step exists.
      </p>
      <div className="grid md:grid-cols-3 gap-3 mt-5">
        {[
          { n: '1', t: 'Extract', d: 'Owner, survey number, area, village and the four boundaries are read off the scan.' },
          { n: '2', t: 'Position', d: 'If the document has no coordinates, trace the parcel corners on satellite imagery.' },
          { n: '3', t: 'Validate', d: 'The area declared on the document cross-checks your trace. Disagreement is a finding.' },
        ].map((s) => (
          <div key={s.n} className="p-4 rounded-xl border border-[#E8E6DF] bg-[#FAF9F6]">
            <span className="w-6 h-6 rounded-lg bg-[#141416] text-white text-[11px] font-bold inline-flex items-center justify-center">
              {s.n}
            </span>
            <div className="text-sm font-bold text-stone-950 mt-2">{s.t}</div>
            <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-[#E8E6DF] shadow-stone-sm">
      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold font-serif mt-1 ${accent}`}>{value}</div>
      <div className="text-[10px] text-stone-500 mt-0.5 leading-snug">{sub}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF]">
      <span className="text-[10px] text-stone-400 block font-semibold">{label}</span>
      {children}
    </div>
  );
}

function Inspector({ feature, flags }: { feature: ParcelFeature; flags: GeometryFlag[] }) {
  const p = feature.properties;
  const palette = ACCURACY_STYLE[p.accuracy_class];
  const prov = p.provenance as Record<string, unknown>;

  return (
    <div className="space-y-3 text-xs pt-3">
      <div className="px-3 py-2 rounded-xl border font-semibold flex items-start gap-2"
        style={{ background: `${palette.fill}18`, borderColor: `${palette.fill}55`, color: palette.color }}>
        <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <div>
          <div>{palette.label}</div>
          <div className="font-normal text-[11px] opacity-90 mt-0.5">{p.accuracy_note}</div>
        </div>
      </div>

      <Field label="How this geometry was obtained">
        <span className="font-bold text-stone-950">{METHOD_LABEL[p.method] ?? p.method}</span>
        {p.closure_precision && (
          <span className="text-[11px] text-stone-500 block mt-0.5">
            Traverse closed to {p.closure_precision} — {p.closure_grade}
          </span>
        )}
      </Field>

      <Field label="Registered land owner">
        <span className="font-bold text-stone-950 text-sm">{p.owner_name ?? '—'}</span>
      </Field>

      <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6DF] space-y-2">
        <div className="text-[10px] text-stone-400 font-semibold flex items-center gap-1.5">
          <Ruler className="w-3 h-3" /> AREA RECONCILIATION
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-stone-400">Document declares</div>
            <div className="font-mono font-bold text-stone-950">{p.declared_area_ha ?? '—'} ha</div>
          </div>
          <div>
            <div className="text-[10px] text-stone-400">Geometry measures</div>
            <div className="font-mono font-bold text-stone-950">{p.computed_area_ha ?? '—'} ha</div>
          </div>
        </div>
        {p.area_within_tolerance !== null && (
          <div className={`text-[11px] font-semibold px-2 py-1.5 rounded-lg border flex items-center gap-1.5 ${
            p.area_within_tolerance ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
            {p.area_within_tolerance
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Agrees to {p.area_delta_pct}% — the document validates the geometry</>
              : <><AlertOctagon className="w-3.5 h-3.5" /> Differs by {p.area_delta_pct}%</>}
          </div>
        )}
      </div>

      {p.position_uncertainty_m != null && p.position_uncertainty_m > 0 && (
        <Field label="Positional uncertainty">
          <span className="font-mono font-bold text-stone-950 text-sm flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-stone-400" />±{p.position_uncertainty_m} m
          </span>
        </Field>
      )}

      {Object.keys(p.boundaries).length > 0 && (
        <Field label="Four boundaries (as recorded)">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
            {(['north', 'east', 'south', 'west'] as const).map((d) => (
              <div key={d} className="text-[11px]">
                <span className="text-stone-400 capitalize">{d}: </span>
                <span className="text-stone-900">{p.boundaries[d] ?? '—'}</span>
              </div>
            ))}
          </div>
        </Field>
      )}

      {flags.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[10px] text-stone-400 font-semibold">FINDINGS ({flags.length})</div>
          {flags.map((f, i) => {
            const m = SEVERITY_META[f.severity] ?? SEVERITY_META.INFO;
            return (
              <div key={`${f.code}-${i}`} className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${m.chip}`}>
                <div className="font-bold font-mono text-[10px]">{f.code} · {f.severity}</div>
                <p className="leading-relaxed">{f.message}</p>
                {f.action && <p className="italic opacity-80">→ {f.action}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Findings({ flags, onPick }: { flags: GeometryFlag[]; onPick: (s: string) => void }) {
  const notable = flags.filter((f) => f.severity !== 'INFO');
  if (!notable.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6 space-y-3">
      <div>
        <span className="text-[10px] font-bold text-terracotta-700 uppercase tracking-wider">Findings</span>
        <h3 className="text-lg font-bold text-stone-950 font-serif">{notable.length} things to look at</h3>
      </div>
      <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
        {notable.map((f, i) => {
          const m = SEVERITY_META[f.severity] ?? SEVERITY_META.INFO;
          const { Icon } = m;
          return (
            <button key={`${f.code}-${i}`} onClick={() => f.survey_no && onPick(f.survey_no)}
              className={`w-full text-left p-3 rounded-xl border ${m.chip} hover:brightness-[0.985]`}>
              <div className="flex items-start gap-2">
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {f.survey_no && <span className="text-[10px] font-mono font-bold">{f.survey_no}</span>}
                    <span className="text-[10px] font-mono opacity-70">{f.code}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{f.severity}</span>
                  </div>
                  <p className="text-xs leading-relaxed">{f.message}</p>
                  {f.action && <p className="text-[11px] opacity-80 italic">→ {f.action}</p>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AdjacencyPanel({ assembly }: { assembly: NonNullable<PlotResponse['assembly']> }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Network className="w-4 h-4 text-stone-900" />
        <div>
          <h3 className="text-base font-bold text-stone-950 font-serif">The adjacency network</h3>
          <p className="text-xs text-stone-500">
            {assembly.graph.edge_count} edges across {assembly.graph.parcel_count} parcels, read
            from the four-boundaries column. {assembly.anchored.length} anchor
            {assembly.anchored.length === 1 ? '' : 's'} positioned {assembly.inferred.length} others
            in {assembly.passes} passes.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-stone-400 text-left border-b border-stone-100">
              <th className="py-1.5 pr-3 font-semibold">Parcel</th>
              {(['North', 'East', 'South', 'West'] as const).map((d) => (
                <th key={d} className="py-1.5 pr-3 font-semibold">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {Object.entries(assembly.graph.edges).map(([sn, dirs]) => (
              <tr key={sn} className="border-b border-stone-50">
                <td className="py-1.5 pr-3 font-bold text-stone-900">{sn}</td>
                {(['north', 'east', 'south', 'west'] as const).map((d) => (
                  <td key={d} className="py-1.5 pr-3 text-stone-600">
                    {dirs[d] ?? <span className="text-stone-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
