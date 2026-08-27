import { LandRecord, UserProfile } from '@/types';

export const MOCK_CITIZEN_USER: UserProfile = {
  id: 'usr_cit_001',
  name: 'Ramesh Baliram Patil',
  role: 'CITIZEN',
  phone: '+91 98234 56789',
  email: 'ramesh.patil@example.in',
  aadhaarLast4: '8842',
  district: 'Pune',
  state: 'Maharashtra',
};

export const MOCK_OFFICER_USER: UserProfile = {
  id: 'off_rev_409',
  name: 'Shri Vikramaditya Joshi',
  role: 'OFFICER',
  email: 'v.joshi@dolr.gov.in',
  employeeId: 'REV-MH-PN-4091',
  designation: 'Sub-Divisional Revenue Officer (SDO)',
  district: 'Pune Division',
  state: 'Maharashtra',
};

export const MOCK_RECORDS: LandRecord[] = [
  {
    id: 'LR-2026-1021',
    applicationNo: 'APP-MH-2026-00481',
    documentType: '7/12 Extract (Record of Rights)',
    ownerName: { value: 'Ramesh Baliram Patil', confidence: 0.97 },
    surveyNumber: { value: '124/2', confidence: 0.99 },
    khasraNumber: { value: 'K-4821', confidence: 0.92 },
    khataNumber: { value: 'KH-1024', confidence: 0.89 },
    area: { value: '2.45', confidence: 0.91 },
    areaUnit: 'Hectares',
    village: { value: 'Hadapsar', confidence: 0.98 },
    tehsil: { value: 'Haveli', confidence: 0.96 },
    district: { value: 'Pune', confidence: 0.99 },
    state: 'Maharashtra',
    landClassification: { value: 'Jirayat (Agricultural Dry)', confidence: 0.94 },
    mutationNumber: { value: '58?1', confidence: 0.58, isFlagged: true },
    overallConfidence: 0.71,
    status: 'UNDER_VERIFICATION',
    submissionDate: '2026-08-25',
    validationFlags: [
      {
        id: 'VF-01',
        field: 'mutationNumber',
        severity: 'WARNING',
        message: 'Mutation number extraction confidence is low (58%). Possible blurred numeral in source document.',
        suggestedAction: 'Verify against original mutation seal on Page 2.'
      },
      {
        id: 'VF-02',
        field: 'surveyNumber',
        severity: 'INFO',
        message: 'Survey number format 124/2 adheres to Maharashtra RoR standard.',
      }
    ],
    documentPages: 4,
    documentUrl: '/sample-712-extract.pdf'
  },
  {
    id: 'LR-2026-1022',
    applicationNo: 'APP-MH-2026-00482',
    documentType: 'Sale Deed & Mutation Register',
    ownerName: { value: 'Suresh Chandra Kumar', confidence: 0.95 },
    surveyNumber: { value: '125/4', confidence: 0.88, isFlagged: true },
    khasraNumber: { value: 'K-7819', confidence: 0.85 },
    khataNumber: { value: 'KH-2091', confidence: 0.90 },
    area: { value: '1.80', confidence: 0.92 },
    areaUnit: 'Hectares',
    village: { value: 'Manjri', confidence: 0.94 },
    tehsil: { value: 'Haveli', confidence: 0.96 },
    district: { value: 'Pune', confidence: 0.99 },
    state: 'Maharashtra',
    landClassification: { value: 'Bagayat (Irrigated)', confidence: 0.88 },
    mutationNumber: { value: '9420', confidence: 0.91 },
    overallConfidence: 0.58,
    status: 'UNDER_VERIFICATION',
    submissionDate: '2026-08-26',
    validationFlags: [
      {
        id: 'VF-03',
        field: 'surveyNumber',
        severity: 'CONFLICT',
        message: 'Survey number 125/4 shows discrepancy with Department Reference Database (listed as 125/7 in 2024 resurvey).',
        suggestedAction: 'Check cadastral boundary map and previous mutation history.'
      }
    ],
    documentPages: 8,
  },
  {
    id: 'LR-2026-1023',
    applicationNo: 'APP-MH-2026-00479',
    documentType: 'Khatoni & Khasra Extract',
    ownerName: { value: 'Amit Sharma', confidence: 0.98 },
    surveyNumber: { value: '128/1', confidence: 0.96 },
    khasraNumber: { value: 'K-1102', confidence: 0.95 },
    khataNumber: { value: 'KH-0492', confidence: 0.94 },
    area: { value: '0.95', confidence: 0.97 },
    areaUnit: 'Hectares',
    village: { value: 'Wagholi', confidence: 0.99 },
    tehsil: { value: 'Haveli', confidence: 0.99 },
    district: { value: 'Pune', confidence: 0.99 },
    state: 'Maharashtra',
    landClassification: { value: 'Non-Agricultural (Commercial Permit)', confidence: 0.92 },
    mutationNumber: { value: '1042', confidence: 0.97 },
    overallConfidence: 0.96,
    status: 'UNDER_VERIFICATION',
    submissionDate: '2026-08-26',
    validationFlags: [
      {
        id: 'VF-04',
        field: 'all',
        severity: 'INFO',
        message: 'All fields passed automated consistency checks with 96% high confidence.'
      }
    ],
    documentPages: 2,
  },
  {
    id: 'LR-2026-1019',
    applicationNo: 'APP-MH-2026-00465',
    documentType: 'Partition Deed (Hissa Register)',
    ownerName: { value: 'Sunita Devi Deshmukh', confidence: 0.99 },
    surveyNumber: { value: '131/2', confidence: 0.99 },
    khasraNumber: { value: 'K-9012', confidence: 0.98 },
    khataNumber: { value: 'KH-3140', confidence: 0.99 },
    area: { value: '3.12', confidence: 0.96 },
    areaUnit: 'Hectares',
    village: { value: 'Kharadi', confidence: 0.99 },
    tehsil: { value: 'Haveli', confidence: 0.99 },
    district: { value: 'Pune', confidence: 0.99 },
    state: 'Maharashtra',
    overallConfidence: 0.98,
    status: 'VERIFIED',
    submissionDate: '2026-08-22',
    verifiedDate: '2026-08-24',
    assignedOfficer: 'Shri Vikramaditya Joshi (SDO)',
    officerRemarks: 'Verified against Cadastral Map & Register of Mutations Volume 14.',
    validationFlags: [],
    documentPages: 6,
  },
  {
    id: 'LR-2026-1018',
    applicationNo: 'APP-MH-2026-00452',
    documentType: 'Legacy Handwritten Patta',
    ownerName: { value: 'Ganpat Rao Shinde', confidence: 0.45, isFlagged: true },
    surveyNumber: { value: '98/B(?)', confidence: 0.40, isFlagged: true },
    area: { value: '4.50', confidence: 0.60 },
    areaUnit: 'Acres',
    village: { value: 'Uruli Kanchan', confidence: 0.82 },
    tehsil: { value: 'Haveli', confidence: 0.91 },
    district: { value: 'Pune', confidence: 0.99 },
    state: 'Maharashtra',
    overallConfidence: 0.42,
    status: 'REJECTED',
    submissionDate: '2026-08-20',
    assignedOfficer: 'Shri Vikramaditya Joshi (SDO)',
    officerRemarks: 'Document quality is too faded for legal verification. Please upload a high-resolution color scan or certified Tehsil copy of Page 2 & 3.',
    validationFlags: [
      {
        id: 'VF-05',
        field: 'ownerName',
        severity: 'CRITICAL',
        message: 'Owner name has ink bleeds and missing characters.'
      },
      {
        id: 'VF-06',
        field: 'surveyNumber',
        severity: 'CRITICAL',
        message: 'Survey sub-division index illegible.'
      }
    ],
    documentPages: 3,
  }
];
