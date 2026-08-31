'use client';

/**
 * Map of parcels derived from land documents, with an officer trace mode.
 *
 * Nothing drawn here comes from a cadastral shapefile. Every polygon was
 * computed from measurements on a document, so the map colours by how the
 * geometry was obtained rather than by record status — a parcel positioned by
 * solving the adjacency network must never look like one measured with GPS.
 *
 * Trace mode is how a 7/12 or a sale deed gets a position: the officer clicks
 * the parcel corners on imagery, those become a coordinates source, and the
 * area declared on the document then cross-checks the trace.
 *
 * Load with next/dynamic and { ssr: false } — Leaflet touches `window` at import.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer, TileLayer, GeoJSON, Circle, Polygon, CircleMarker,
  LayersControl, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { AccuracyClass, ParcelCollection, ParcelFeature } from '@/types/gis';

export const ACCURACY_STYLE: Record<AccuracyClass, { color: string; fill: string; label: string }> = {
  surveyed:               { color: '#047857', fill: '#10b981', label: 'Surveyed (coordinates in the document)' },
  reconstructed_anchored: { color: '#1d4ed8', fill: '#3b82f6', label: 'Reconstructed and anchored' },
  reconstructed_floating: { color: '#7c3aed', fill: '#a78bfa', label: 'Reconstructed, not yet placed' },
  inferred:               { color: '#b45309', fill: '#f59e0b', label: 'Inferred from adjoining parcels' },
  none:                   { color: '#6b7280', fill: '#9ca3af', label: 'No geometry' },
};

/** [lon, lat] — GeoJSON order, which is what the API expects. */
export type LonLat = [number, number];

interface Props {
  parcels: ParcelCollection | null;
  selectedSurveyNo: string | null;
  onSelect: (surveyNo: string) => void;
  showUncertainty: boolean;
  accuracyFilter: 'ALL' | AccuracyClass;
  traceMode?: boolean;
  tracePoints?: LonLat[];
  onTraceAdd?: (point: LonLat) => void;
}

function FitToParcels({ parcels }: { parcels: ParcelCollection | null }) {
  const map = useMap();
  const signature = useRef('');
  useEffect(() => {
    if (!parcels?.features.length) return;
    const sig = parcels.features.map((f) => f.properties.survey_no).join('|');
    if (sig === signature.current) return;
    const bounds = L.geoJSON(parcels as never).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [34, 34] });
      signature.current = sig;
    }
  }, [parcels, map]);
  return null;
}

function PanToSelected({
  parcels, selectedSurveyNo,
}: { parcels: ParcelCollection | null; selectedSurveyNo: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!parcels || !selectedSurveyNo) return;
    const feature = parcels.features.find((f) => f.properties.survey_no === selectedSurveyNo);
    if (!feature) return;
    const bounds = L.geoJSON(feature as never).getBounds();
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [90, 90], duration: 0.55 });
  }, [selectedSurveyNo, parcels, map]);
  return null;
}

/** Collects officer clicks while trace mode is on. */
function TraceCollector({
  active, onAdd,
}: { active: boolean; onAdd?: (p: LonLat) => void }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      if (!active || !onAdd) return;
      onAdd([+e.latlng.lng.toFixed(8), +e.latlng.lat.toFixed(8)]);
    },
  });

  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = active ? 'crosshair' : '';
    return () => { container.style.cursor = ''; };
  }, [active, map]);

  return null;
}

function ringCentroid(coords: number[][]): [number, number] {
  let x = 0, y = 0;
  for (const [lon, lat] of coords) { x += lon; y += lat; }
  const n = coords.length || 1;
  return [y / n, x / n];
}

export default function CadastralMap({
  parcels, selectedSurveyNo, onSelect, showUncertainty, accuracyFilter,
  traceMode = false, tracePoints = [], onTraceAdd,
}: Props) {
  const visible = useMemo<ParcelCollection | null>(() => {
    if (!parcels) return null;
    if (accuracyFilter === 'ALL') return parcels;
    return {
      ...parcels,
      features: parcels.features.filter((f) => f.properties.accuracy_class === accuracyFilter),
    };
  }, [parcels, accuracyFilter]);

  const style = (feature?: ParcelFeature) => {
    const cls = feature?.properties.accuracy_class ?? 'none';
    const palette = ACCURACY_STYLE[cls];
    const selected = feature?.properties.survey_no === selectedSurveyNo;
    const areaBad = feature?.properties.area_within_tolerance === false;
    return {
      color: selected ? '#141416' : areaBad ? '#e11d48' : palette.color,
      weight: selected ? 3.5 : areaBad ? 2.6 : 1.7,
      fillColor: palette.fill,
      fillOpacity: selected ? 0.55 : 0.32,
      dashArray: cls === 'inferred' ? '7 4' : undefined,
    };
  };

  const onEach = (feature: ParcelFeature, layer: L.Layer) => {
    const p = feature.properties;
    const unc = p.position_uncertainty_m
      ? ` &middot; ±${p.position_uncertainty_m.toFixed(1)} m` : '';
    layer.bindTooltip(
      `<div style="font-family:ui-sans-serif,system-ui;line-height:1.45">
         <strong style="font-size:13px">Survey No. ${p.survey_no}</strong><br/>
         <span style="font-size:11px;color:#57534e">${p.owner_name ?? 'No owner recorded'}</span><br/>
         <span style="font-size:11px;color:#57534e">${p.computed_area_ha ?? '—'} ha
           &middot; ${p.method.replace('_', ' ')}${unc}</span>
       </div>`,
      { sticky: true, direction: 'top', opacity: 0.97 },
    );
    layer.on({
      click: () => { if (!traceMode) onSelect(p.survey_no); },
      mouseover: (e) => (e.target as L.Path).setStyle({ fillOpacity: 0.58 }),
      mouseout: (e) => (e.target as L.Path).setStyle({
        fillOpacity: p.survey_no === selectedSurveyNo ? 0.55 : 0.32,
      }),
    });
  };

  const uncertaintyCircles = useMemo(() => {
    if (!showUncertainty || !visible) return [];
    return visible.features
      .filter((f) => (f.properties.position_uncertainty_m ?? 0) > 0.5)
      .map((f) => ({
        key: f.properties.survey_no,
        centre: ringCentroid(f.geometry.coordinates[0]),
        radius: f.properties.position_uncertainty_m as number,
      }));
  }, [visible, showUncertainty]);

  // Leaflet wants [lat, lng]; our trace points are [lon, lat].
  const traceLatLngs = tracePoints.map(([lon, lat]) => [lat, lon] as [number, number]);

  return (
    <MapContainer
      center={[20.9820, 75.5760]}
      zoom={6}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#FAF9F6' }}
    >
      <LayersControl position="topright">
        {/* Satellite first and checked: an officer tracing a parcel needs to see
            the ground, not a street map. */}
        <LayersControl.BaseLayer checked name="Satellite">
          <TileLayer
            attribution="Imagery &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Street">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {uncertaintyCircles.map((c) => (
        <Circle
          key={`unc-${c.key}`}
          center={c.centre}
          radius={c.radius}
          pathOptions={{ color: '#b45309', weight: 1, dashArray: '3 4',
                         fillColor: '#f59e0b', fillOpacity: 0.07 }}
        />
      ))}

      {visible && visible.features.length > 0 && (
        <GeoJSON
          key={`p-${accuracyFilter}-${selectedSurveyNo ?? 'x'}-${visible.features.length}`}
          data={visible as never}
          style={style as never}
          onEachFeature={onEach as never}
        />
      )}

      {/* The trace in progress */}
      {traceLatLngs.length >= 3 && (
        <Polygon
          positions={traceLatLngs}
          pathOptions={{ color: '#facc15', weight: 3, fillColor: '#fde047', fillOpacity: 0.28 }}
        />
      )}
      {traceLatLngs.map((pos, i) => (
        <CircleMarker
          key={`t-${i}`}
          center={pos}
          radius={5}
          pathOptions={{ color: '#141416', weight: 2, fillColor: '#facc15', fillOpacity: 1 }}
        />
      ))}

      <TraceCollector active={traceMode} onAdd={onTraceAdd} />
      <FitToParcels parcels={visible} />
      <PanToSelected parcels={parcels} selectedSurveyNo={selectedSurveyNo} />
    </MapContainer>
  );
}
