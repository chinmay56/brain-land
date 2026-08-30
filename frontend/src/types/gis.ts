// Types for the document-derived cadastral GIS.
// Mirrors backend/app/api/gis.py.

export type AccuracyClass =
  | 'surveyed'
  | 'reconstructed_anchored'
  | 'reconstructed_floating'
  | 'inferred'
  | 'none';

export type GeometryMethod = 'coordinates' | 'traverse' | 'chain_offset' | 'none';
export type FlagSeverity = 'INFO' | 'WARNING' | 'CONFLICT' | 'CRITICAL';
export type FitQuality = 'good' | 'fair' | 'poor';

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface ParcelProperties {
  survey_no: string;
  owner_name: string | null;
  khasra_no: string | null;
  khata_no: string | null;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  lgd_village_code: string;
  document_id: string;
  document_type: string;

  method: GeometryMethod;
  accuracy_class: AccuracyClass;
  accuracy_note: string;

  declared_area_m2: number | null;
  computed_area_m2: number | null;
  declared_area_ha: number | null;
  computed_area_ha: number | null;
  area_delta_pct: number | null;
  area_within_tolerance: boolean | null;

  closure_precision: string | null;
  closure_grade: string | null;
  position_uncertainty_m: number | null;
  fit_quality: FitQuality | null;

  boundaries: Record<string, string>;
  provenance: Record<string, unknown>;
  flag_count: number;
  worst_severity: FlagSeverity;
}

export interface ParcelFeature {
  type: 'Feature';
  geometry: GeoJSONPolygon;
  properties: ParcelProperties;
}

export interface ParcelCollection {
  type: 'FeatureCollection';
  name: string;
  features: ParcelFeature[];
}

export interface GeometryFlag {
  code: string;
  severity: FlagSeverity;
  message: string;
  action?: string;
  survey_no?: string;
  related_survey_no?: string;
}

export interface UnplacedParcel {
  survey_no: string;
  method: GeometryMethod;
  accuracy_class: AccuracyClass;
  computed_area_m2: number | null;
  reason: string;
  flags: GeometryFlag[];
}

export interface AssemblyStats {
  parcels: number;
  placed: number;
  anchored: number;
  inferred: number;
  unplaceable: number;
  placed_pct: number;
  mosaic_area_ha: number;
  metric_crs: string;
  max_position_uncertainty_m: number;
  mean_position_uncertainty_m: number;
}

export interface AssemblyInfo {
  anchored: string[];
  inferred: string[];
  unplaceable: string[];
  passes: number;
  graph: {
    edges: Record<string, Record<string, string>>;
    non_parcel_boundaries: Record<string, Record<string, string>>;
    parcel_count: number;
    edge_count: number;
  };
  stats: AssemblyStats;
}

export interface PlotResponse {
  village: string;
  documents_received: number;
  parcels: ParcelCollection;
  unplaced: UnplacedParcel[];
  assembly: AssemblyInfo | null;
  flags: GeometryFlag[];
  summary: {
    plotted: number;
    unplaced: number;
    by_accuracy: Record<string, number>;
    by_method: Record<string, number>;
    critical_flags: number;
    conflict_flags: number;
  };
  source_file?: string;
}

export interface RequirementField {
  field: string;
  note?: string;
}

export interface GeometrySourceSpec {
  tier: string;
  id: string;
  accuracy: string;
  found_in: string[];
  fields: RequirementField[];
  produces: string;
}

export interface RequirementsResponse {
  always_required: { purpose: string; fields: RequirementField[] };
  geometry_sources: GeometrySourceSpec[];
  optional_but_valuable: RequirementField[];
  accuracy_classes: { class: string; meaning: string }[];
  supported_area_units: string[];
  supported_linear_units: string[];
  regional_area_units: Record<
    string,
    Record<string, { m2: number; basis: string; confidence: string }>
  >;
}
