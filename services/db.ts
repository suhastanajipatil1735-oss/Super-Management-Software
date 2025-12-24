
import Dexie, { Table } from 'dexie';
import { UserProfile, Student, AttendanceRecord, SubscriptionRequest, ReceiptLog, Expense, TeacherProfile } from '../types';

// Use class for typing the DB instance
export class SuperManagementDB extends Dexie {
  users!: Table<UserProfile>;
  students!: Table<Student>;
  attendance!: Table<AttendanceRecord>;
  subscriptionRequests!: Table<SubscriptionRequest>;
  receiptLogs!: Table<ReceiptLog>;
  expenses!: Table<Expense>;
  teacherProfiles!: Table<TeacherProfile>;

  constructor() {
    super('SuperManagementDB');
    
    // Version 1-2 handled previously
    // Version 3: Added Expense and Teacher Tracking
    (this as any).version(3).stores({
      users: 'id, mobile, role, teacherCode, linkedOwnerMobile',
      students: 'id, ownerMobile, classGrade',
      attendance: '++id, ownerMobile, date, classGrade',
      subscriptionRequests: '++id, ownerMobile, status',
      receiptLogs: '++id, ownerMobile, date, studentId',
      expenses: '++id, ownerMobile, date, category',
      teacherProfiles: '++id, ownerMobile, name'
    });
  }
}

export const db = new SuperManagementDB();

// Seed function for demo
export const seedDatabase = async () => {
  try {
    // Ensure table exists before accessing
    if (!db.users) {
        console.warn("DB users table not ready yet");
        return;
    }

    // CLEANUP: Automatically remove the 'Demo Academy' data if it exists
    const demoUser = await db.users.get('9999999999');
    if (demoUser && demoUser.instituteName === 'Demo Academy') {
        await db.users.delete('9999999999');
        await db.students.where('ownerMobile').equals('9999999999').delete();
        console.log("Cleaned up default demo data.");
    }
  } catch (err) {
    console.error("Error handling database:", err);
  }
};
