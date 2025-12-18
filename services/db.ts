import Dexie, { Table } from 'dexie';
import { UserProfile, Student, AttendanceRecord, SubscriptionRequest, ReceiptLog } from '../types';

// Use class for typing the DB instance
export class SuperManagementDB extends Dexie {
  users!: Table<UserProfile>;
  students!: Table<Student>;
  attendance!: Table<AttendanceRecord>;
  subscriptionRequests!: Table<SubscriptionRequest>;
  receiptLogs!: Table<ReceiptLog>;

  constructor() {
    super('SuperManagementDB');
    
    // Version 1
    (this as any).version(1).stores({
      users: 'id, mobile, role, teacherCode', // Added teacherCode index
      students: 'id, ownerMobile, classGrade',
      attendance: '++id, ownerMobile, date, classGrade',
      subscriptionRequests: '++id, ownerMobile, status',
      receiptLogs: '++id, ownerMobile, date, studentId'
    });

    // Version 2: Add linkedOwnerMobile index to users table
    (this as any).version(2).stores({
      users: 'id, mobile, role, teacherCode, linkedOwnerMobile'
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
    // This ensures Total Institutes and Students start at 0 as requested.
    const demoUser = await db.users.get('9999999999');
    if (demoUser && demoUser.instituteName === 'Demo Academy') {
        await db.users.delete('9999999999');
        // Delete associated students
        await db.students.where('ownerMobile').equals('9999999999').delete();
        console.log("Cleaned up default demo data.");
    }

    // No new seeding logic here.
    
  } catch (err) {
    console.error("Error handling database:", err);
    // Don't rethrow to allow app to continue
  }
};