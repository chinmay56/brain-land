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
    id: 'LR-2026-6164',
    applicationNo: 'APP-MH-2026-66736',
    documentType: '7/12 Extract (Record of Rights)',
    ownerName: { value: 'श्री. चंदन रामचंद्र वाणी', confidence: 0.95, sourceDoc: '7/12 Extract' },
    coOwners: [],
    surveyNumber: { value: '४७७ / ९', confidence: 0.96, sourceDoc: '7/12 Extract' },
    khasraNumber: { value: 'प्लॉट नं. २४', confidence: 0.94, sourceDoc: '7/12 Extract' },
    khataNumber: { value: 'Jallan 9 - 3594/2015', confidence: 0.92, sourceDoc: '7/12 Extract' },
    area: { value: '८२९.२५', confidence: 0.95, sourceDoc: '7/12 Extract' },
    areaUnit: 'चौरस मीटर',
    village: { value: 'मेहरूण', confidence: 0.98, sourceDoc: '7/12 Extract' },
    tehsil: { value: 'जळगाव', confidence: 0.97, sourceDoc: '7/12 Extract' },
    district: { value: 'जळगाव', confidence: 0.99, sourceDoc: '7/12 Extract' },
    state: 'Maharashtra',
    landClassification: { value: 'बांधीव फ्लॅट', confidence: 0.92, sourceDoc: '7/12 Extract' },
    ownershipDetails: { value: 'Occupant Class 1', confidence: 0.95, sourceDoc: '7/12 Extract' },
    mutationNumber: { value: '3594', confidence: 0.95, sourceDoc: '7/12 Extract' },
    registrationInfo: { value: 'दस्त क्रमांक ३५९४/२०१५, कार्यालय जलन-१, दिनांक १६/०९/२०१५', confidence: 0.96, sourceDoc: '7/12 Extract' },
    overallConfidence: 0.95,
    status: 'UNDER_VERIFICATION',
    submissionDate: '2026-09-20',
    validationFlags: [],
    documentPages: 2,
    supportingDocuments: ['7/12 Extract (Record of Rights).pdf'],
    submittedBy: 'Ramesh Baliram Patil',
    submittedById: 'usr_cit_001'
  }
];
