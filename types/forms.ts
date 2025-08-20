import { LessonType, GroupType, StudentType, StudentStatus, ProgramMode, ProgramLevel } from './database';

// Base form data interfaces
export interface BaseFormData {
  id?: string;
}

// Department Form Data
export interface DepartmentFormData extends BaseFormData {
  name: string;
  code: string;
  head: string;
  description?: string;
  location?: string;
  establishedYear?: number;
  phone?: string;
  email?: string;
  website?: string;
}

// Program Form Data
export interface ProgramFormData extends BaseFormData {
  name: string;
  code: string;
  departmentId: string;
  description?: string;
  totalCredits: number;
  maxEnrollment?: number;
  coordinator: string;
  accreditation?: string;
  mode: ProgramMode;
  level: ProgramLevel;
  duration: number;
  degreeType?: string;
}

// Course Form Data
export interface CourseFormData extends BaseFormData {
  code: string;
  name: string;
  isCore: boolean;
  programId: string;
  departmentId: string;
  credits: number;
  semester: 1 | 2;
  yearLevel: number;
  description?: string;
  prerequisites?: string[];
  color?: string;
}

// Faculty Form Data
export interface FacultyFormData extends BaseFormData {
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
}

// Room Form Data
export interface RoomFormData extends BaseFormData {
  code: string;
  name: string;
  departmentId?: string;
  building: string;
  floor?: number;
  capacity: number;
  type: string;
  equipment?: string[];
  available: boolean;
  features?: string[];
}

// Student Form Data
export interface StudentFormData extends BaseFormData {
  studentId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  programId: string;
  studentType?: StudentType;
  currentYear: number;
  currentSemester: number;
  enrolledCourses: string[];
  completedCourses?: string[];
  gpa?: number;
  notes?: string;
  enrollmentDate?: Date;
  status?: StudentStatus;
}

// TimeSlot Form Data
export interface TimeSlotFormData extends BaseFormData {
  departmentId: string;
  courseId: string;
  facultyId: string;
  roomId: string;
  yearLevel: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: LessonType;
  groupId?: string;
  groupType?: GroupType;
  jointWith?: string[];
  groupName?: string;
  maxStudents?: number;
  academicYear: string;
  semester: number;
  isActive: boolean;
}

// Split Class Group Data
export interface SplitClassGroup {
  name: string;
  roomId: string;
  facultyId: string;
  maxStudents: number;
  overrideTime?: boolean;
  startTime?: string;
  endTime?: string;
}

// Split Class Form Data
export interface SplitClassFormData extends BaseFormData {
  courseId: string;
  facultyId: string;
  departmentId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: LessonType;
  yearLevel: number;
  academicYear: string;
  semester: number;
  groupId?: string;
  groups: SplitClassGroup[];
  originalTimeSlot?: {
    id: string;
  };
}

// Joint Session Form Data
export interface JointSessionFormData extends BaseFormData {
  courseIds: string[];
  facultyId: string;
  roomId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: LessonType;
  academicYear: string;
  semester: number;
  name?: string;
  description?: string;
}

// Substitution Form Data
export interface SubstitutionFormData extends BaseFormData {
  originalTimeSlotId: string;
  substituteFacultyId: string;
  substituteRoomId?: string;
  date: string;
  reason: string;
  notes?: string;
  isApproved?: boolean;
}
