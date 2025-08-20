import { Constraint, ResolutionSuggestion } from "./conflicts";

// Enums for better type safety
export enum ProgramMode {
  FullTime = 'full-time',
  PartTime = 'part-time'
}

export enum ProgramLevel {
  Undergraduate = 'undergraduate',
  Postgraduate = 'postgraduate'
}

export enum LessonType {
  Lecture = 'Lecture',
  Tutorial = 'Tutorial',
  Lab = 'Lab',
  Workshop = 'Workshop',
  Exam = 'Exam',
  Seminar = 'Seminar',
  Meeting = 'Meeting',
  Other = 'Other'
}

export enum RoomType {
  Lecture = 'Lecture',
  Tutorial = 'Tutorial',
  Lab = 'Lab',
  Computer = 'Computer',
  Workshop = 'Workshop'
}

export enum StudentType {
  Regular = 'regular',
  Irregular = 'irregular'
}

export enum StudentStatus {
  Active = 'active',
  Inactive = 'inactive',
  Graduated = 'graduated',
  Suspended = 'suspended'
}

export enum AttendanceStatus {
  Present = 'present',
  Absent = 'absent',
  Late = 'late',
  Excused = 'excused'
}

export enum SubstitutionStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected'
}

export enum ConflictType {
  Room = 'room',
  Faculty = 'faculty',
  StudentGroup = 'student_group',
  Time = 'time',
  Course = 'course',
  Capacity = 'capacity',
  RoomType = 'room_type',
  Schedule = 'schedule',
  Student = 'student'
}

export enum ConflictSeverity {
  High = 'high',
  Medium = 'medium',
  Low = 'low'
}

// New enum for group types
export enum GroupType {
  Regular = 'regular',
  Split = 'split',
  Joint = 'joint'
}

// Department Interface
export interface Department {
  id: string;
  name: string;
  code: string;
  head: string;
  description?: string;
  location?: string;
  establishedYear?: number;
  phone?: string;
  email?: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Program Interface - Fixed typo and made fields optional
export interface Program {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  description?: string;
  totalCredits: number;
  maxEnrollment?: number;
  coordinator: string; // Faculty ID - removed duplicate coordinattor
  accreditation?: string;
  mode: ProgramMode;
  prerequisites?: string[]; // Array of course IDs
  level: ProgramLevel;
  duration: number; // in years
  createdAt: Date;
  updatedAt: Date;
}

// Course Interface
export interface Course {
  id: string;
  code: string;
  name: string;
  isCore: boolean;
  programId: string;
  departmentId: string;
  credits: number;
  semester: 1 | 2;
  yearLevel: number; // 1-4 for UG, 1-2 for PG
  description?: string;
  prerequisites?: string[];
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Faculty Interface with preferences
export interface FacultyPreferences {
  noAfternoons?: boolean;
  preferredDays?: number[];
  maxDailyHours?: number;
  noBackToBack?: boolean;
  preferredRooms?: string[];
}

export interface Faculty {
  id: string;
  staffId: string;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId: string;
  specialization?: string;
  officeNumber?: string;
  officeHours?: string;
  qualifications?: string[];
  preferences?: FacultyPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// Room Interface
export interface Room {
  id: string;
  code: string;
  name: string;
  departmentId?: string; // Made optional as rooms can be shared
  building: string;
  floor?: number;
  capacity: number;
  type: RoomType;
  equipment?: string[];
  available: boolean;
  features?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// TimeSlot Interface
export interface TimeSlot {
  id: string;
  departmentId: string;
  courseId: string;
  facultyId: string;
  roomId: string;
  yearLevel: number;
  dayOfWeek: number; // 1-7 (Monday-Sunday)
  startTime: string; // HH:MM format
  endTime: string;
  type: LessonType;
  groupId?: string; // for splitting classes or joining multiple classes
  groupType?: GroupType; // indicates if this is a regular, split, or joint session
  jointWith?: string[]; // IDs of other courses sharing this timeslot (for joint sessions)
  groupName?: string; // Name for the split group (e.g., "Group A", "Group B")
  maxStudents?: number; // Maximum students for this group (relevant for splits)
  academicYear: string;
  semester: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Student Interface
export interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  programId: string;
  studentType?: StudentType;
  currentYear: number; // 1-4 for UG, 1-2 for PG
  currentSemester: number; // 1-2
  enrolledCourses: string[]; // course IDs
  completedCourses?: string[];
  gpa?: number;
  notes?: string;
  enrollmentDate?: Date;
  status?: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Attendance Interface
export interface Attendance {
  id: string;
  studentId: string;
  timeSlotId: string;
  courseId: string;
  date: string; // ISO date string
  status: AttendanceStatus;
  remarks?: string;
  markedBy: string; // Faculty ID or 'qr-scan'
  markedAt: Date;
  qrCodeId?: string; // Reference to AttendanceCode if marked via QR
  createdAt: Date;
  updatedAt: Date;
}

// QR Code related interfaces
export interface QRScanData {
  code: string;
  studentId: string;
  timestamp: Date;
  scannedAt: Date;
  // Optional fields that might be included in QR data
  timeSlotId?: string;
  courseId?: string;
  date?: string;
}

export interface AttendanceCode {
  id: string; // The unique identifier for the attendance code
  code: string; // The actual QR code string
  timeSlotId: string;
  courseId: string;
  date: string; // ISO date string
  startTime: string; // When the class starts
  validUntil: Date; // Expiration time
  usedBy: string[]; // Student IDs who used this code
  createdBy: string; // Faculty ID
  createdAt: Date;
  updatedAt: Date;
}

export interface QRAttendanceStats {
  codeId: string;
  totalScans: number;
  uniqueStudents: number;
  scanTimes: Array<{
    studentId: string;
    timestamp: Date;
  }>;
  averageScanTime: number; // seconds after QR display
  peakScanTime: string; // ISO timestamp
  firstScan?: Date;
  lastScan?: Date;
}

export interface AttendanceStats {
  studentId: string;
  courseId: string;
  semester: 1 | 2;
  academicYear: string;
  totalClasses: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercentage: number;
  lastUpdated: Date;
}

// Substitution Interface
export interface Substitution {
  id: string;
  originalSlotId: string;
  substituteFacultyId?: string; // Fixed typo from substituteFactoryId
  substituteRoomId?: string;
  date: Date;
  reason: string;
  status: SubstitutionStatus;
  approvedBy?: string; // Faculty/Admin ID
  approvedAt?: Date;
  notes?: string;
  notificationSent?: boolean;
  createdBy: string; // Faculty ID who requested
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Conflict Interface
export interface Conflict {
  id: string;
  type: ConflictType;
  description: string;
  severity: ConflictSeverity;
  details: string;
  affectedSlots: string[]; // TimeSlot IDs
  resolved: boolean;
  resolvedBy?: string; // Faculty/Admin ID
  resolvedAt?: Date;
  resolutionNotes?: string;
  // Enhanced conflict resolution fields
  constraints?: Constraint[];
  resolutionSuggestions?: ResolutionSuggestion[];
  conflictScore?: number;
  autoResolvable?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Academic Calendar Interface
export interface AcademicCalendar {
  id: string;
  academicYear: string;
  semester: number;
  startDate: Date;
  endDate: Date;
  breakStart?: Date;
  breakEnd?: Date;
  examStart?: Date;
  examEnd?: Date;
  holidays: Array<{
    date: Date;
    name: string;
    type?: 'public' | 'academic' | 'religious';
  }>;
  importantDates?: Array<{
    date: Date;
    description: string;
    category?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Delete Request Interface (renamed from DeleteTimeSlot for clarity)
export interface DeleteRequest {
  id: string;
  targetType: 'timeslot' | 'course' | 'faculty' | 'room' | 'student';
  targetId: string;
  requestedBy: string; // Faculty/Admin ID
  requestedAt: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string; // Admin ID
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// New interface for joint sessions
export interface JointSession {
  id: string;
  timeSlotIds: string[]; // IDs of all timeslots in the joint session
  courseIds: string[]; // IDs of all courses in the joint session
  facultyId: string; // The shared faculty
  roomId: string; // The shared room
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  academicYear: string;
  semester: number;
  createdAt: Date;
  updatedAt: Date;
}

// New interface for class splits
export interface ClassSplit {
  id: string;
  parentCourseId: string;
  timeSlotIds: string[]; // IDs of all split timeslots
  groupNames: string[]; // Names of each split group
  facultyIds: string[]; // Faculty for each group (can be the same or different)
  academicYear: string;
  semester: number;
  createdAt: Date;
  updatedAt: Date;
}

// Modal Types
export type ModalType = 
  | 'department' 
  | 'program' 
  | 'course' 
  | 'faculty' 
  | 'room' 
  | 'student' 
  | 'timeslot' 
  | 'substitution' 
  | 'conflict' 
  | 'academicCalendar' 
  | 'attendance' 
  | 'report' 
  | 'alert'
  | 'deleteRequest'
  | 'qrGenerator'
  | 'bulkImport'
  | 'jointSession'  // Add new modal type for joint sessions
  | 'classSplit';    // Add new modal type for class splits

// Alert State
export interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // milliseconds
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Additional utility types for better type safety
export type ID = string;
export type ISODateString = string; // Format: YYYY-MM-DD
export type TimeString = string; // Format: HH:MM

// Validation helpers
export const isValidTimeFormat = (time: string): boolean => {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

export const isValidDateFormat = (date: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
};

// Type guards
export const isStudent = (obj: any): obj is Student => {
  return obj && typeof obj.studentId === 'string' && typeof obj.currentYear === 'number';
};

export const isFaculty = (obj: any): obj is Faculty => {
  return obj && typeof obj.staffId === 'string' && typeof obj.departmentId === 'string';
};

export const isTimeSlot = (obj: any): obj is TimeSlot => {
  return obj && typeof obj.courseId === 'string' && typeof obj.dayOfWeek === 'number';
};

// No changes needed to the Attendance interface.
// When using Omit<Attendance, "id" | "createdAt" | "updatedAt">, do not include createdAt or updatedAt in your object literal.