/**
 * SEG Academy CRM - Centralized Students & KYC E2E Mock Data
 */

export const MOCK_STUDENT = {
  id: 'stu-e2e-001',
  studentCode: 'SEG-2026-0042',
  fullName: 'Arjun Sharma',
  email: 'arjun.sharma@test.segacademy.internal',
  phoneNumber: '+91 98765 43210',
  addressLine1: 'B-402 Silicon Heights',
  city: 'Mumbai',
  state: 'Maharashtra',
  address: 'B-402 Silicon Heights, Mumbai, Maharashtra',
};

export const MOCK_DASHBOARD_STUDENTS = {
  data: [
    {
      id: 'stu-e2e-reg-001',
      studentCode: 'SEG-2026-0001',
      fullName: 'Aarav Patel',
      email: 'aarav.patel@test.segacademy.internal',
      phoneNumber: '+91 98765 43201',
      city: 'Mumbai',
      createdAt: '2026-11-20T10:00:00.000Z',
    },
    {
      id: 'stu-e2e-reg-002',
      studentCode: 'SEG-2026-0002',
      fullName: 'Pooja Verma',
      email: 'pooja.verma@test.segacademy.internal',
      phoneNumber: '+91 98765 43202',
      city: 'Pune',
      createdAt: '2026-11-21T10:00:00.000Z',
    },
  ],
  pagination: {
    total: 42,
    page: 1,
    limit: 10,
    totalPages: 5,
  },
};

export const MOCK_DOCUMENTS = [
  {
    id: 'doc-e2e-001',
    studentId: 'stu-e2e-reg-001',
    studentName: 'Aarav Patel',
    studentCode: 'SEG-2026-0001',
    student: {
      fullName: 'Aarav Patel',
      studentCode: 'SEG-2026-0001',
    },
    documentType: 'GOVERNMENT_ID',
    rawDocumentType: 'GOVERNMENT_ID',
    title: 'aadhaar_card_aarav.pdf',
    fileName: 'aadhaar_card_aarav.pdf',
    documentName: 'aadhaar_card_aarav.pdf',
    fileSizeBytes: 1048576, // 1 MB
    mimeType: 'application/pdf',
    status: 'PENDING',
    uploadedAt: '2026-11-26T10:00:00.000Z',
  },
  {
    id: 'doc-e2e-002',
    studentId: 'stu-e2e-reg-001',
    studentName: 'Aarav Patel',
    studentCode: 'SEG-2026-0001',
    student: {
      fullName: 'Aarav Patel',
      studentCode: 'SEG-2026-0001',
    },
    documentType: 'ACADEMIC_TRANSCRIPT',
    rawDocumentType: 'ACADEMIC_TRANSCRIPT',
    title: 'btech_degree_certificate.pdf',
    fileName: 'btech_degree_certificate.pdf',
    documentName: 'btech_degree_certificate.pdf',
    fileSizeBytes: 2097152, // 2 MB
    mimeType: 'application/pdf',
    status: 'VERIFIED',
    uploadedAt: '2026-11-25T11:00:00.000Z',
  },
];
