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
    ownerName: { value: 'Ramesh Baliram Patil', confidence: 0.97, sourceDoc: '7/12 Extract' },
    coOwners: ['Suresh Baliram Patil'],
    surveyNumber: { value: '124/2', confidence: 0.99, sourceDoc: '7/12 Extract' },
    khasraNumber: { value: 'K-4821', confidence: 0.92, sourceDoc: '7/12 Extract' },
    khataNumber: { value: 'KH-1024', confidence: 0.89, sourceDoc: '7/12 Extract' },
    area: { value: '2.45', confidence: 0.91, sourceDoc: '7/12 Extract' },
    areaUnit: 'Hectares',
    village: { value: 'Hadapsar', confidence: 0.98, sourceDoc: '7/12 Extract' },
    tehsil: { value: 'Haveli', confidence: 0.96, sourceDoc: '7/12 Extract' },
    district: { value: 'Pune', confidence: 0.99, sourceDoc: '7/12 Extract' },
    state: 'Maharashtra',
    landClassification: { value: 'Jirayat (Agricultural Dry)', confidence: 0.94, sourceDoc: '7/12 Extract' },
    ownershipDetails: { value: 'Occupant Class 1 (भोगवटादार वर्ग-१ - Freehold)', confidence: 0.95, sourceDoc: '7/12 Extract' },
    mutationNumber: { value: '58?1', confidence: 0.58, isFlagged: true, sourceDoc: '7/12 Extract' },
    registrationInfo: { value: '', confidence: 0.0 },
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
    documentUrl: '/sample-712-extract.pdf',
    supportingDocuments: ['7/12 Extract (Record of Rights).pdf']
  },
  {
    id: 'LR-2026-1022',
    applicationNo: 'APP-MH-2026-00482',
    documentType: 'Sale Deed & Mutation Register',
    ownerName: { value: 'Suresh Chandra Kumar', confidence: 0.95, sourceDoc: 'Sale Deed' },
    coOwners: [],
    surveyNumber: { value: '125/4', confidence: 0.88, isFlagged: true, sourceDoc: 'Sale Deed' },
    khasraNumber: { value: 'K-7819', confidence: 0.85, sourceDoc: 'Sale Deed' },
    khataNumber: { value: 'KH-2091', confidence: 0.90, sourceDoc: 'Sale Deed' },
    area: { value: '1.80', confidence: 0.92, sourceDoc: 'Sale Deed' },
    areaUnit: 'Hectares',
    village: { value: 'Manjri', confidence: 0.94, sourceDoc: 'Sale Deed' },
    tehsil: { value: 'Haveli', confidence: 0.96, sourceDoc: 'Sale Deed' },
    district: { value: 'Pune', confidence: 0.99, sourceDoc: 'Sale Deed' },
    state: 'Maharashtra',
    landClassification: { value: 'Bagayat (Irrigated)', confidence: 0.88, sourceDoc: 'Sale Deed' },
    ownershipDetails: { value: 'Occupant Class 1 (Absolute Title Purchase)', confidence: 0.96, sourceDoc: 'Sale Deed' },
    mutationNumber: { value: '9420', confidence: 0.91, sourceDoc: 'Sale Deed' },
    registrationInfo: { value: 'Reg No: 4892/2024, SRO Haveli Pune, Vol: 14', confidence: 0.96, sourceDoc: 'Sale Deed' },
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
    supportingDocuments: ['Sale Deed (Kharidi Khat).pdf', 'Ferfar Register Form 6.pdf']
  },
  {
    id: 'LR-2026-1023',
    applicationNo: 'APP-MH-2026-00479',
    documentType: 'Khatoni & Khasra Extract',
    ownerName: { value: 'Amit Sharma', confidence: 0.98, sourceDoc: 'Khasra-Khatauni' },
    coOwners: ['Rajesh Sharma', 'Priya Sharma'],
    surveyNumber: { value: '128/1', confidence: 0.96, sourceDoc: 'Khasra-Khatauni' },
    khasraNumber: { value: 'K-1102', confidence: 0.95, sourceDoc: 'Khasra-Khatauni' },
    khataNumber: { value: 'KH-0492', confidence: 0.94, sourceDoc: 'Khasra-Khatauni' },
    area: { value: '0.95', confidence: 0.97, sourceDoc: 'Khasra-Khatauni' },
    areaUnit: 'Hectares',
    village: { value: 'Wagholi', confidence: 0.99, sourceDoc: 'Khasra-Khatauni' },
    tehsil: { value: 'Haveli', confidence: 0.99, sourceDoc: 'Khasra-Khatauni' },
    district: { value: 'Pune', confidence: 0.99, sourceDoc: 'Khasra-Khatauni' },
    state: 'Maharashtra',
    landClassification: { value: 'Non-Agricultural (Commercial Permit)', confidence: 0.92, sourceDoc: 'Khasra-Khatauni' },
    ownershipDetails: { value: 'Occupant Class 1 (Commercial NA Tenure)', confidence: 0.96, sourceDoc: 'Khasra-Khatauni' },
    mutationNumber: { value: '1042', confidence: 0.97, sourceDoc: 'Khasra-Khatauni' },
    registrationInfo: { value: '', confidence: 0.0 },
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
    supportingDocuments: ['Khasra-Khatauni Register.pdf']
  },
  {
    id: 'LR-2026-1019',
    applicationNo: 'APP-MH-2026-00465',
    documentType: 'Partition Deed (Hissa Register)',
    ownerName: { value: 'Sunita Devi Deshmukh', confidence: 0.99, sourceDoc: 'Partition Deed' },
    coOwners: [],
    surveyNumber: { value: '131/2', confidence: 0.99, sourceDoc: 'Partition Deed' },
    khasraNumber: { value: 'K-9012', confidence: 0.98, sourceDoc: 'Partition Deed' },
    khataNumber: { value: 'KH-3140', confidence: 0.99, sourceDoc: 'Partition Deed' },
    area: { value: '3.12', confidence: 0.96, sourceDoc: 'Partition Deed' },
    areaUnit: 'Hectares',
    village: { value: 'Kharadi', confidence: 0.99, sourceDoc: 'Partition Deed' },
    tehsil: { value: 'Haveli', confidence: 0.99, sourceDoc: 'Partition Deed' },
    district: { value: 'Pune', confidence: 0.99, sourceDoc: 'Partition Deed' },
    state: 'Maharashtra',
    landClassification: { value: 'Bagayat (Irrigated Garden)', confidence: 0.98, sourceDoc: 'Partition Deed' },
    ownershipDetails: { value: 'Occupant Class 1 (Partition Title Decree)', confidence: 0.99, sourceDoc: 'Partition Deed' },
    mutationNumber: { value: '5902', confidence: 0.98, sourceDoc: 'Partition Deed' },
    registrationInfo: { value: 'Reg No: 1102/2023, SRO Haveli Pune', confidence: 0.99, sourceDoc: 'Partition Deed' },
    overallConfidence: 0.98,
    status: 'VERIFIED',
    submissionDate: '2026-08-22',
    verifiedDate: '2026-08-24',
    assignedOfficer: 'Shri Vikramaditya Joshi (SDO)',
    officerRemarks: 'Verified against Cadastral Map & Register of Mutations Volume 14.',
    validationFlags: [],
    documentPages: 6,
    supportingDocuments: ['Partition Deed.pdf', 'Cadastral Map Tippan.pdf']
  }
];
