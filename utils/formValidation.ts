import { CourseFormData, DepartmentFormData, FacultyFormData } from '@/types/forms';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Course Form Validation
export const validateCourseForm = (formData: CourseFormData): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!formData.code?.trim()) {
    errors.push({ field: 'code', message: 'Course code is required' });
  } else if (formData.code.length < 2 || formData.code.length > 10) {
    errors.push({ field: 'code', message: 'Course code must be between 2-10 characters' });
  }

  if (!formData.name?.trim()) {
    errors.push({ field: 'name', message: 'Course name is required' });
  } else if (formData.name.length < 3) {
    errors.push({ field: 'name', message: 'Course name must be at least 3 characters' });
  }

  if (!formData.departmentId) {
    errors.push({ field: 'departmentId', message: 'Department is required' });
  }

  if (!formData.programId) {
    errors.push({ field: 'programId', message: 'Program is required' });
  }

  if (!formData.credits || formData.credits < 1 || formData.credits > 6) {
    errors.push({ field: 'credits', message: 'Credits must be between 1-6' });
  }

  if (!formData.yearLevel || formData.yearLevel < 1 || formData.yearLevel > 4) {
    errors.push({ field: 'yearLevel', message: 'Year level is required (1-4)' });
  }

  if (!formData.semester || (formData.semester !== 1 && formData.semester !== 2)) {
    errors.push({ field: 'semester', message: 'Semester is required (1 or 2)' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Department Form Validation
export const validateDepartmentForm = (formData: DepartmentFormData): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!formData.code?.trim()) {
    errors.push({ field: 'code', message: 'Department code is required' });
  } else if (formData.code.length < 2 || formData.code.length > 5) {
    errors.push({ field: 'code', message: 'Department code must be between 2-5 characters' });
  }

  if (!formData.name?.trim()) {
    errors.push({ field: 'name', message: 'Department name is required' });
  } else if (formData.name.length < 3) {
    errors.push({ field: 'name', message: 'Department name must be at least 3 characters' });
  }

  if (!formData.head?.trim()) {
    errors.push({ field: 'head', message: 'Department head is required' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Faculty Form Validation
export const validateFacultyForm = (formData: FacultyFormData): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!formData.firstName?.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }

  if (!formData.lastName?.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  }

  if (!formData.staffId?.trim()) {
    errors.push({ field: 'staffId', message: 'Staff ID is required' });
  }

  if (!formData.departmentId) {
    errors.push({ field: 'departmentId', message: 'Department is required' });
  }

  if (formData.email && !isValidEmail(formData.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Room Form Validation
export const validateRoomForm = (formData: any): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!formData.code?.trim()) {
    errors.push({ field: 'code', message: 'Room code is required' });
  }

  if (!formData.name?.trim()) {
    errors.push({ field: 'name', message: 'Room name is required' });
  }

  if (!formData.building?.trim()) {
    errors.push({ field: 'building', message: 'Building is required' });
  }

  if (!formData.capacity || formData.capacity < 1) {
    errors.push({ field: 'capacity', message: 'Capacity must be at least 1' });
  }

  if (!formData.type) {
    errors.push({ field: 'type', message: 'Room type is required' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Student Form Validation
export const validateStudentForm = (formData: any): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!formData.firstName?.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }

  if (!formData.lastName?.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  }

  if (!formData.studentId?.trim()) {
    errors.push({ field: 'studentId', message: 'Student ID is required' });
  }

  if (!formData.programId) {
    errors.push({ field: 'programId', message: 'Program is required' });
  }

  if (!formData.currentYear || formData.currentYear < 1 || formData.currentYear > 4) {
    errors.push({ field: 'currentYear', message: 'Current year is required (1-4)' });
  }

  if (!formData.currentSemester || (formData.currentSemester !== 1 && formData.currentSemester !== 2)) {
    errors.push({ field: 'currentSemester', message: 'Current semester is required (1 or 2)' });
  }

  if (formData.email && !isValidEmail(formData.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Program Form Validation
export const validateProgramForm = (formData: any): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!formData.code?.trim()) {
    errors.push({ field: 'code', message: 'Program code is required' });
  } else if (formData.code.length < 3 || formData.code.length > 10) {
    errors.push({ field: 'code', message: 'Program code must be between 3-10 characters' });
  }

  if (!formData.name?.trim()) {
    errors.push({ field: 'name', message: 'Program name is required' });
  } else if (formData.name.length < 5) {
    errors.push({ field: 'name', message: 'Program name must be at least 5 characters' });
  }

  if (!formData.departmentId) {
    errors.push({ field: 'departmentId', message: 'Department is required' });
  }

  if (!formData.level) {
    errors.push({ field: 'level', message: 'Program level is required' });
  }

  if (!formData.degreeType) {
    errors.push({ field: 'degreeType', message: 'Degree type is required' });
  }

  if (!formData.duration || formData.duration < 0.5 || formData.duration > 8) {
    errors.push({ field: 'duration', message: 'Duration must be between 0.5-8 years' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// TimeSlot Form Validation
export const validateTimeSlotForm = (formData: any): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!formData.departmentId) {
    errors.push({ field: 'departmentId', message: 'Department is required' });
  }

  if (!formData.courseId) {
    errors.push({ field: 'courseId', message: 'Course is required' });
  }

  if (!formData.facultyId) {
    errors.push({ field: 'facultyId', message: 'Faculty is required' });
  }

  if (!formData.roomId) {
    errors.push({ field: 'roomId', message: 'Room is required' });
  }

  if (!formData.day) {
    errors.push({ field: 'day', message: 'Day is required' });
  }

  if (!formData.startTime) {
    errors.push({ field: 'startTime', message: 'Start time is required' });
  }

  if (!formData.endTime) {
    errors.push({ field: 'endTime', message: 'End time is required' });
  }

  if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
    errors.push({ field: 'endTime', message: 'End time must be after start time' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Split Class Form Validation
export const validateSplitClassForm = (formData: any): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!formData.courseId) {
    errors.push({ field: 'courseId', message: 'Course is required' });
  }

  if (!formData.facultyId) {
    errors.push({ field: 'facultyId', message: 'Faculty is required' });
  }

  if (!formData.roomId) {
    errors.push({ field: 'roomId', message: 'Room is required' });
  }

  if (!formData.dayOfWeek || formData.dayOfWeek < 1 || formData.dayOfWeek > 7) {
    errors.push({ field: 'dayOfWeek', message: 'Day of week is required' });
  }

  if (!formData.startTime) {
    errors.push({ field: 'startTime', message: 'Start time is required' });
  }

  if (!formData.endTime) {
    errors.push({ field: 'endTime', message: 'End time is required' });
  }

  if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
    errors.push({ field: 'endTime', message: 'End time must be after start time' });
  }

  if (!formData.groups || !Array.isArray(formData.groups) || formData.groups.length === 0) {
    errors.push({ field: 'groups', message: 'At least one group is required' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Joint Session Form Validation
export const validateJointSessionForm = (formData: any): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!formData.courses || !Array.isArray(formData.courses) || formData.courses.length < 2) {
    errors.push({ field: 'courses', message: 'At least two courses are required for a joint session' });
  }

  if (!formData.facultyId) {
    errors.push({ field: 'facultyId', message: 'Faculty is required' });
  }

  if (!formData.roomId) {
    errors.push({ field: 'roomId', message: 'Room is required' });
  }

  if (!formData.dayOfWeek || formData.dayOfWeek < 1 || formData.dayOfWeek > 7) {
    errors.push({ field: 'dayOfWeek', message: 'Day of week is required' });
  }

  if (!formData.startTime) {
    errors.push({ field: 'startTime', message: 'Start time is required' });
  }

  if (!formData.endTime) {
    errors.push({ field: 'endTime', message: 'End time is required' });
  }

  if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
    errors.push({ field: 'endTime', message: 'End time must be after start time' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get field error message
export const getFieldError = (errors: ValidationError[], fieldName: string): string | undefined => {
  const error = errors.find(e => e.field === fieldName);
  return error?.message;
};

// Check if field has error
export const hasFieldError = (errors: ValidationError[], fieldName: string): boolean => {
  return errors.some(e => e.field === fieldName);
};
