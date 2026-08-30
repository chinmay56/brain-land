'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  UploadCloud, Compass, Search, RefreshCw, ServerCrash, Ruler, Fingerprint,
  AlertOctagon, AlertTriangle, CheckCircle2, Info, FileJson, Network, Target,
} from 'lucide-react';

import type {
  AccuracyClass, ParcelFeature, PlotResponse, GeometryFlag,
} from '@/types/gis';
import { ACCURACY_STYLE } from '@/components/gis/CadastralMap';

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
  coordinates: 'Coordinates in the document',
  traverse: 'Traverse (bearings & distances)',
  chain_offset: 'Tippan ladder (chain & offset)',
  none: 'No geometry source',
};

export default function OfficerGISPage() {
  const [data, setData] = useState<PlotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | AccuracyClass>('ALL');
  const [showUncertainty, setShowUncertainty] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const post = useCallback(async (fn: () => Promise<Response>) => {
    setLoading(true); setError(null);
    try {
      const res = await fn();
      const body = await res.json();
      if (!res.ok) {
        throw new Error(typeof body.detail === 'string'
          ? body.detail : JSON.stringify(body.detail).slice(0, 400));
      }
      setData(body as PlotResponse);
      setSelected(body.parcels?.features?.[0]?.properties?.survey_no ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSample = (village: 'grid' | 'irregular') =>
    post(async () => {
      const s = await fetch(`${API}/api/gis/sample?village=${village}`, { method: 'POST' });
      const { documents } = await s.json();
      return fetch(`${API}/api/gis/plot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, assemble: true }),
      });
    });

  const uploadFile = (file: File) =>
    post(() => {
      const form = new FormData();
      form.append('file', file);
      return fetch(`${API}/api/gis/upload?assemble=true`, { method: 'POST', body: form });
    });

  const parcels = data?.parcels ?? null;

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
      {/* header */}
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
              There is no cadastral layer behind this map. Every polygon is computed
              from measurements written on a document — a traverse of bearings and
              distances, a tippan&apos;s chain-and-offset ladder, or coordinates from a
              resurvey. Parcels with no measurements of their own are positioned by
              solving the four-boundaries network against their neighbours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-stone-sm flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4 text-terracotta-400" />
              Upload extracted documents
            </button>
            <button
              onClick={() => void loadSample('grid')}
              className="text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#D7D4CA] hover:bg-[#FAF9F6] flex items-center gap-1.5"
            >
              <FileJson className="w-3.5 h-3.5 text-stone-500" /> Example: regular grid
            </button>
            <button
              onClick={() => void loadSample('irregular')}
              className="text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#D7D4CA] hover:bg-[#FAF9F6] flex items-center gap-1.5"
            >
              <FileJson className="w-3.5 h-3.5 text-stone-500" /> Example: irregular
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-4 text-xs text-stone-500 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Reconstructing geometry and solving the adjacency network…
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900">
            <div className="flex items-start gap-2">
              <ServerCrash className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 min-w-0">
                <p className="text-xs font-semibold">Could not plot these documents</p>
                <p className="text-[11px] font-mono break-words">{error}</p>
                <p className="text-[11px]">
                  The backend must be running at{' '}
                  <code className="bg-white px-1 rounded">{API}</code>. Start it with{' '}
                  <code className="bg-white px-1 rounded">
                    uvicorn app.main:app --reload --port 8000
                  </code>
                  . For the expected document format, see{' '}
                  <code className="bg-white px-1 rounded">GET /api/gis/requirements</code>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!data && !loading && !error && <EmptyState />}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Documents plotted"
                value={`${data!.summary.plotted}/${data!.documents_received}`}
                sub={`${data!.summary.unplaced} could not be placed`} accent="text-stone-950" />
          <Stat label="Anchored" value={String(stats.anchored)}
                sub="carried coordinates of their own" accent="text-emerald-700" />
          <Stat label="Inferred from neighbours" value={String(stats.inferred)}
                sub={`solved in ${data!.assembly!.passes} passes`} accent="text-amber-700" />
          <Stat label="Position uncertainty" value={`±${stats.mean_position_uncertainty_m} m`}
                sub={`worst ±${stats.max_position_uncertainty_m} m`} accent="text-stone-950" />
          <Stat label="Mosaic area" value={`${stats.mosaic_area_ha} ha`}
                sub={stats.metric_crs} accent="text-stone-950" />
        </div>
      )}

      {data && (
        <div className="grid xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-5 flex flex-col h-[620px]">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-stone-100 gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'surveyed', 'reconstructed_anchored', 'inferred'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                      filter === k
                        ? 'bg-[#141416] text-white border-[#141416]'
                        : 'bg-white text-stone-600 border-[#E8E6DF] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    {k === 'ALL' ? 'All' : ACCURACY_STYLE[k].label.split(' (')[0]}
                  </button>
                ))}
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 cursor-pointer ml-1">
                  <input type="checkbox" checked={showUncertainty}
                         onChange={(e) => setShowUncertainty(e.target.checked)}
                         className="accent-amber-600" />
                  Uncertainty circles
                </label>
              </div>
              <div className="relative w-full sm:w-56">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Survey no. or owner…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D7D4CA] rounded-xl bg-[#FAF9F6] focus:bg-white"
                />
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
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-[11px] text-stone-600">
              {(['surveyed', 'reconstructed_anchored', 'inferred'] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-sm"
                        style={{ background: ACCURACY_STYLE[k].fill }} />
                  {ACCURACY_STYLE[k].label}
                </span>
              ))}
              <span className="text-stone-400">
                Dashed = position inferred · red outline = area disagrees with the register
              </span>
            </div>
          </div>

          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6">
              <div className="border-b border-stone-100 pb-3">
                <span className="text-[10px] font-bold text-terracotta-700 uppercase tracking-wider">
                  Parcel provenance
                </span>
                <h3 className="text-lg font-bold text-stone-950 font-serif">
                  {selectedFeature ? `Survey No. ${selectedFeature.properties.survey_no}` : 'Select a parcel'}
                </h3>
              </div>
              {selectedFeature
                ? <Inspector feature={selectedFeature} flags={selectedFlags} />
                : <p className="text-xs text-stone-500 pt-3">Click a parcel on the map.</p>}
            </div>

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
                        {p.position_uncertainty_m ? ` · ±${p.position_uncertainty_m}m` : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {data.unplaced.length > 0 && (
              <div className="bg-white rounded-2xl border border-rose-200 shadow-stone-sm p-5">
                <span className="text-xs font-bold text-rose-900">
                  Could not be placed ({data.unplaced.length})
                </span>
                <div className="mt-2 space-y-2">
                  {data.unplaced.map((u) => (
                    <div key={u.survey_no} className="text-[11px] p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                      <span className="font-mono font-bold">{u.survey_no}</span> — {u.reason}
                    </div>
                  ))}
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

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-8">
      <h2 className="text-base font-bold text-stone-950 font-serif">
        What has to be on the document for a parcel to be plottable
      </h2>
      <p className="text-xs text-stone-500 mt-1 max-w-3xl leading-relaxed">
        A 7/12 extract, a jamabandi row or a khatauni entry carries no coordinates
        and cannot be plotted on its own. These are the four things an Indian land
        record can carry that geometry can be recovered from, best first.
      </p>
      <div className="grid md:grid-cols-2 gap-3 mt-5">
        {[
          { tier: 'A', name: 'Coordinates', found: 'Resurvey / DGPS records, SVAMITVA cards, modern FMB',
            need: 'boundary points + which CRS', gives: 'Exact position, shape and area.' },
          { tier: 'B', name: 'Traverse', found: 'Field Measurement Book, tippan, deed schedules',
            need: 'a bearing and a distance per boundary leg', gives: 'Exact shape and area, plus a closure check. Needs an anchor for position.' },
          { tier: 'C', name: 'Chain & offset', found: 'The tippan "ladder" — the commonest thing in an old record',
            need: 'base line length, then chainage + offset + side per corner', gives: 'Exact shape and area. Neither position nor orientation.' },
          { tier: 'D', name: 'Four boundaries', found: 'Effectively every Indian land record',
            need: 'north / south / east / west neighbours, and the declared area', gives: 'Nothing alone. Across a village it positions every parcel.' },
        ].map((s) => (
          <div key={s.tier} className="p-4 rounded-xl border border-[#E8E6DF] bg-[#FAF9F6]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#141416] text-white text-[11px] font-bold flex items-center justify-center">
                {s.tier}
              </span>
              <span className="text-sm font-bold text-stone-950">{s.name}</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-2"><strong>Found in:</strong> {s.found}</p>
            <p className="text-[11px] text-stone-700 mt-1"><strong>Extract:</strong> {s.need}</p>
            <p className="text-[11px] text-stone-500 mt-1">{s.gives}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-stone-500 mt-5">
        Load one of the examples above to see it work, or upload your own extraction
        output as JSON. The full field spec is at{' '}
        <code className="bg-[#FAF9F6] px-1 rounded">GET /api/gis/requirements</code>.
      </p>
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
           style={{ background: `${palette.fill}18`, borderColor: `${palette.fill}55`,
                    color: palette.color }}>
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
        {typeof prov.placement === 'string' && (
          <span className="text-[11px] text-stone-500 block mt-0.5">{prov.placement}</span>
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
            <div className="text-[10px] text-stone-400">Register declares</div>
            <div className="font-mono font-bold text-stone-950">{p.declared_area_ha ?? '—'} ha</div>
          </div>
          <div>
            <div className="text-[10px] text-stone-400">Measurements give</div>
            <div className="font-mono font-bold text-stone-950">{p.computed_area_ha ?? '—'} ha</div>
          </div>
        </div>
        {p.area_within_tolerance !== null && (
          <div className={`text-[11px] font-semibold px-2 py-1.5 rounded-lg border flex items-center gap-1.5 ${
            p.area_within_tolerance
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
            {p.area_within_tolerance
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Agrees to {p.area_delta_pct}%</>
              : <><AlertOctagon className="w-3.5 h-3.5" /> Differs by {p.area_delta_pct}%</>}
          </div>
        )}
      </div>

      {p.position_uncertainty_m != null && p.position_uncertainty_m > 0 && (
        <Field label="Positional uncertainty">
          <span className="font-mono font-bold text-stone-950 text-sm flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-stone-400" />
            ±{p.position_uncertainty_m} m
          </span>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            {String(prov.uncertainty_basis ?? 'Estimated from the fit.')} Shape and area
            are exact; only the position carries this error.
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

      {Array.isArray(prov.neighbours_used) && (prov.neighbours_used as string[]).length > 0 && (
        <Field label="Placed against">
          <span className="text-[11px] text-stone-900">
            {(prov.neighbours_used as string[]).join(', ')}
          </span>
        </Field>
      )}

      {flags.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[10px] text-stone-400 font-semibold">
            FINDINGS ON THIS PARCEL ({flags.length})
          </div>
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

function Findings({ flags, onPick }: {
  flags: GeometryFlag[]; onPick: (s: string) => void;
}) {
  const notable = flags.filter((f) => f.severity !== 'INFO');
  if (notable.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-stone-sm p-6 space-y-3">
      <div>
        <span className="text-[10px] font-bold text-terracotta-700 uppercase tracking-wider">
          Findings
        </span>
        <h3 className="text-lg font-bold text-stone-950 font-serif">
          {notable.length} things to look at
        </h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Misclosures, area disagreements and uncertain placements — errors that only
          appear once the measurements are reconstructed and compared.
        </p>
      </div>
      <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
        {notable.map((f, i) => {
          const m = SEVERITY_META[f.severity] ?? SEVERITY_META.INFO;
          const { Icon } = m;
          return (
            <button key={`${f.code}-${i}`}
              onClick={() => f.survey_no && onPick(f.survey_no)}
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
          <h3 className="text-base font-bold text-stone-950 font-serif">
            The adjacency network
          </h3>
          <p className="text-xs text-stone-500">
            {assembly.graph.edge_count} edges across {assembly.graph.parcel_count} parcels,
            read from the four-boundaries column. This is what places parcels that have
            no coordinates of their own — {assembly.anchored.length} anchor
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
              <th className="py-1.5 pr-3 font-semibold">North</th>
              <th className="py-1.5 pr-3 font-semibold">East</th>
              <th className="py-1.5 pr-3 font-semibold">South</th>
              <th className="py-1.5 pr-3 font-semibold">West</th>
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
