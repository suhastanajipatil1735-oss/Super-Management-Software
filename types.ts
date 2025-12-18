export type Role = 'owner' | 'teacher' | 'admin';
export type PlanType = 'free' | 'subscribed';

export interface Subscription {
  active: boolean;
  startDate?: string;
  endDate?: string;
  planType: '1_month' | '6_months' | '12_months' | 'lifetime' | null;
}

export interface UserProfile {
  id: string; // mobile number as ID for simplicity
  instituteName: string;
  mobile: string;
  role: Role;
  plan: PlanType;
  subscription: Subscription;
  studentLimit: number;
  createdAt: string;
  teacherCode?: string; // Code set by owner
  linkedOwnerMobile?: string; // For teachers, points to the owner
  email?: string;
  address?: string;
}

export interface Student {
  id: string;
  ownerMobile: string; // Link to owner
  name: string;
  rollNo: string;
  classGrade: string; // 1-12
  mobile: string;
  address: string;
  feesTotal: number;
  feesPaid: number;
  lastReminderAt?: number;
}

export interface AttendanceRecord {
  id?: number;
  ownerMobile: string;
  date: string; // ISO Date string YYYY-MM-DD
  classGrade: string;
  presentStudentIds: string[];
  absentStudentIds: string[];
  submittedBy: string; // Teacher or Owner mobile/name
}

export interface SubscriptionRequest {
  id: number;
  ownerMobile: string;
  instituteName: string;
  monthsRequested: number; // We will use 999 for Lifetime
  status: 'pending' | 'accepted' | 'declined';
  requestDate: string;
}

export interface ReceiptLog {
  id?: number;
  ownerMobile: string;
  studentId: string;
  studentName: string;
  amount: number;
  date: string;
  receiptNo: string;
  paymentMode: 'Cash' | 'Online';
}

export interface AdminCredentials {
  name: string;
  mobile: string;
}

// For UI State
export type ViewState = 
  | 'SPLASH' 
  | 'LOGIN' 
  | 'OTP' 
  | 'DASHBOARD_OWNER' 
  | 'DASHBOARD_TEACHER' 
  | 'ADMIN_PANEL'
  | 'STUDENTS_VIEW'
  | 'ATTENDANCE_VIEW'
  | 'FEES_VIEW'
  | 'EXAMS_VIEW'
  | 'SETTINGS_VIEW';