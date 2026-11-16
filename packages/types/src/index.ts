/**
 * @seg/types
 * Core shared TypeScript contracts and enums for SEG Academy CRM
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  COUNSELOR = 'COUNSELOR',
  ACADEMIC_STAFF = 'ACADEMIC_STAFF',
  STUDENT = 'STUDENT',
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  OFFER_EXTENDED = 'OFFER_EXTENDED',
  ENROLLED = 'ENROLLED',
  ARCHIVED = 'ARCHIVED',
}

export enum AdmissionStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp: string;
}

export interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}
