/**
 * Shared vocabulary for the parcel map: the accuracy palette and the coordinate
 * tuple order.
 *
 * These live here, apart from CadastralMap, for a build reason rather than a
 * tidiness one. CadastralMap imports Leaflet, and Leaflet reads `window` the
 * moment its module is evaluated. The map is loaded with next/dynamic and
 * { ssr: false } so that never happens on the server — but a plain
 * `import { ACCURACY_STYLE } from './CadastralMap'` anywhere else drags the
 * whole module, Leaflet included, back into the server bundle and the page
 * dies at prerender with "ReferenceError: window is not defined". A value
 * shared between the map and the pages around it therefore cannot sit in a
 * module that touches Leaflet.
 *
 * Nothing in this file may import leaflet, react-leaflet, or CadastralMap.
 */

import type { AccuracyClass } from '@/types/gis';

/**
 * Colour by how the geometry was obtained, never by record status: a parcel
 * positioned by solving the adjacency network must not look like one measured
 * with GPS.
 */
export const ACCURACY_STYLE: Record<AccuracyClass, { color: string; fill: string; label: string }> = {
  surveyed:               { color: '#047857', fill: '#10b981', label: 'Surveyed (coordinates in the document)' },
  reconstructed_anchored: { color: '#1d4ed8', fill: '#3b82f6', label: 'Reconstructed and anchored' },
  reconstructed_floating: { color: '#7c3aed', fill: '#a78bfa', label: 'Reconstructed, not yet placed' },
  inferred:               { color: '#b45309', fill: '#f59e0b', label: 'Inferred from adjoining parcels' },
  none:                   { color: '#6b7280', fill: '#9ca3af', label: 'No geometry' },
};

/** [lon, lat] — GeoJSON order, which is what the API expects. */
export type LonLat = [number, number];
