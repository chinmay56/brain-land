export type UserRole = 'CITIZEN' | 'OFFICER';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  aadhaarLast4?: string;
  employeeId?: string;
  designation?: string;
  district?: string;
  tehsil?: string;
  village?: string;
  state?: string;
  assignedDistrict?: string;
  assignedTehsil?: string;
  assignedVillages?: string[];
  avatarUrl?: string;
}

export type RecordStatus = 
  | 'DRAFT'
  | 'PROCESSING'
  | 'VALIDATED'
  | 'PENDING_VERIFICATION'
  | 'UNDER_VERIFICATION'
  | 'IN_REVIEW'
  | 'FLAGGED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'CORRECTION_REQUESTED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface FieldConfidence {
  value: string;
  confidence: number; // 0 to 1
  isFlagged?: boolean;
  sourceDoc?: string;
}

export interface ValidationFlag {
  id: string;
  field: string;
  severity: 'INFO' | 'WARNING' | 'CONFLICT' | 'CRITICAL';
  message: string;
  suggestedAction?: string;
}

// Complete 12 SIH Problem Statement Fields
export interface LandRecord {
  id: string;
  applicationNo: string;
  documentType: string;
  ownerName: FieldConfidence;
  coOwners?: string[];
  surveyNumber: FieldConfidence;
  khasraNumber?: FieldConfidence;
  khataNumber?: FieldConfidence;
  area: FieldConfidence;
  areaUnit: string;
  village: FieldConfidence;
  tehsil: FieldConfidence;
  district: FieldConfidence;
  state: string;
  landClassification?: FieldConfidence;
  ownershipDetails?: FieldConfidence;
  mutationNumber?: FieldConfidence;
  registrationInfo?: FieldConfidence;
  overallConfidence: number;
  status: RecordStatus;
  submissionDate: string;
  verifiedDate?: string;
  assignedOfficer?: string;
  assignedDistrict?: string;
  assignedTehsil?: string;
  officerRemarks?: string;
  validationFlags: ValidationFlag[];
  documentUrl?: string;
  documentPages?: number;
  supportingDocuments?: string[];
}
