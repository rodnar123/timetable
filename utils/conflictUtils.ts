// utils/conflictUtils.ts
import { TimeSlot, GroupType, Faculty, Room, Course } from '@/types/database';
import { UniversalConflictDetector, convertToUniversalData } from '@/services/conflictDetection';

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ConflictDetail[];
  canProceed: boolean;
  suggestions?: string[];
}

export interface ConflictDetail {
  type: 'time' | 'faculty' | 'room' | 'course';
  severity: 'error' | 'warning';
  message: string;
  conflictingSlot?: TimeSlot;
}

// Main conflict checking function - now uses the universal detector
export const checkTimeSlotConflicts = (
  newSlot: Partial<TimeSlot>,
  existingSlots: TimeSlot[],
  excludeSlotId?: string, // For updates, exclude the slot being edited
  faculty: Faculty[] = [],
  rooms: Room[] = [],
  courses: Course[] = []
): ConflictCheckResult => {
  // Use the new universal conflict detector
  const detector = new UniversalConflictDetector(existingSlots, faculty, rooms, courses);
  
  // Convert the old format to the new universal format
  const universalData = convertToUniversalData.fromRegularTimeSlot({
    ...newSlot,
    id: excludeSlotId
  });
  
  return detector.detectConflicts(universalData);
};

// Specialized function for joint sessions
export const checkJointSessionConflicts = (
  formData: any,
  existingSlots: TimeSlot[],
  faculty: Faculty[] = [],
  rooms: Room[] = [],
  courses: Course[] = []
): ConflictCheckResult => {
  const detector = new UniversalConflictDetector(existingSlots, faculty, rooms, courses);
  const universalData = convertToUniversalData.fromJointSession(formData);
  return detector.detectConflicts(universalData);
};

// Specialized function for split classes
export const checkSplitClassConflicts = (
  formData: any,
  existingSlots: TimeSlot[],
  faculty: Faculty[] = [],
  rooms: Room[] = [],
  courses: Course[] = []
): ConflictCheckResult => {
  const detector = new UniversalConflictDetector(existingSlots, faculty, rooms, courses);
  const universalData = convertToUniversalData.fromSplitClass(formData);
  return detector.detectConflicts(universalData);
};

// Legacy function for backward compatibility - keeping the old logic for now
export const checkTimeSlotConflictsLegacy = (
  newSlot: Partial<TimeSlot>,
  existingSlots: TimeSlot[],
  excludeSlotId?: string // For updates, exclude the slot being edited
): ConflictCheckResult => {
  const conflicts: ConflictDetail[] = [];
  const suggestions: string[] = [];

  // Validate required fields
  if (!newSlot.dayOfWeek || !newSlot.startTime || !newSlot.endTime || 
      !newSlot.academicYear || !newSlot.semester || !newSlot.yearLevel) {
    return {
      hasConflicts: false,
      conflicts: [],
      canProceed: false,
      suggestions: ['Please fill in all required fields including year level']
    };
  }

  // Validate time format and logic
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(newSlot.startTime) || !timeRegex.test(newSlot.endTime)) {
    conflicts.push({
      type: 'time',
      severity: 'error',
      message: 'Invalid time format. Use HH:MM format (e.g., 09:00)'
    });
    return { hasConflicts: true, conflicts, canProceed: false };
  }

  // Check if end time is after start time
  const start = new Date(`1970/01/01 ${newSlot.startTime}`).getTime();
  const end = new Date(`1970/01/01 ${newSlot.endTime}`).getTime();
  
  if (start >= end) {
    conflicts.push({
      type: 'time',
      severity: 'error',
      message: 'End time must be after start time'
    });
    return { hasConflicts: true, conflicts, canProceed: false };
  }

  // Filter slots for the same day, year, and semester
  const sameDaySlots = existingSlots.filter(slot => 
    slot.id !== excludeSlotId &&
    slot.dayOfWeek === newSlot.dayOfWeek &&
    slot.academicYear === newSlot.academicYear &&
    slot.semester === newSlot.semester
  );

  // Check each existing slot for conflicts
  sameDaySlots.forEach(existingSlot => {
    const existingStart = new Date(`1970/01/01 ${existingSlot.startTime}`).getTime();
    const existingEnd = new Date(`1970/01/01 ${existingSlot.endTime}`).getTime();
    
    // Check for time overlap
    const hasTimeOverlap = start < existingEnd && end > existingStart;
    
    if (hasTimeOverlap) {
      // SPECIAL HANDLING FOR GROUP SCENARIOS
      
      // Skip conflicts if both slots are part of the same joint session
      if (newSlot.groupId && existingSlot.groupId && 
          newSlot.groupId === existingSlot.groupId && 
          newSlot.groupType === GroupType.Joint && existingSlot.groupType === GroupType.Joint) {
        return; // No conflict - intentional sharing for joint session
      }
      
      // Skip conflicts if both slots are part of the same split class
      if (newSlot.groupId && existingSlot.groupId && 
          newSlot.groupId === existingSlot.groupId && 
          newSlot.groupType === GroupType.Split && existingSlot.groupType === GroupType.Split) {
        return; // No conflict - split classes can have different rooms/times
      }
      
      // Faculty conflict - faculty can't teach two classes at once regardless of year level
      // EXCEPTION: Joint sessions with same faculty are allowed
      if (newSlot.facultyId && newSlot.facultyId === existingSlot.facultyId) {
        // Allow if this is a joint session scenario
        if (newSlot.groupType === GroupType.Joint && existingSlot.groupType === GroupType.Joint && 
            newSlot.groupId !== existingSlot.groupId) {
          // Different joint sessions - still a conflict
          conflicts.push({
            type: 'faculty',
            severity: 'error',
            message: `Faculty member is already scheduled for another joint session from ${existingSlot.startTime} to ${existingSlot.endTime}`,
            conflictingSlot: existingSlot
          });
        } else if (newSlot.groupType !== GroupType.Joint && existingSlot.groupType !== GroupType.Joint) {
          // Regular conflict between non-joint sessions
          conflicts.push({
            type: 'faculty',
            severity: 'error',
            message: `Faculty member is already scheduled from ${existingSlot.startTime} to ${existingSlot.endTime}`,
            conflictingSlot: existingSlot
          });
        } else if ((newSlot.groupType === GroupType.Joint) !== (existingSlot.groupType === GroupType.Joint)) {
          // One is joint, one is not - potential conflict
          conflicts.push({
            type: 'faculty',
            severity: 'warning',
            message: `Faculty member has overlapping schedule with ${existingSlot.groupType === GroupType.Joint ? 'joint session' : 'regular class'} from ${existingSlot.startTime} to ${existingSlot.endTime}`,
            conflictingSlot: existingSlot
          });
        }
        
        suggestions.push(`Try scheduling after ${existingSlot.endTime}`);
      }
      
      // Room conflict - room can't be used twice regardless of year level
      // EXCEPTION: Joint sessions sharing the same room are allowed
      if (newSlot.roomId && newSlot.roomId === existingSlot.roomId) {
        // Allow if both are joint sessions with same room (they're supposed to share)
        if (newSlot.groupType === GroupType.Joint && existingSlot.groupType === GroupType.Joint && 
            newSlot.groupId !== existingSlot.groupId) {
          // Different joint sessions trying to use same room - conflict
          conflicts.push({
            type: 'room',
            severity: 'error',
            message: `Room is already booked for another joint session from ${existingSlot.startTime} to ${existingSlot.endTime}`,
            conflictingSlot: existingSlot
          });
        } else if (newSlot.groupType !== GroupType.Joint && existingSlot.groupType !== GroupType.Joint) {
          // Regular room conflict
          conflicts.push({
            type: 'room',
            severity: 'error',
            message: `Room is already booked from ${existingSlot.startTime} to ${existingSlot.endTime}`,
            conflictingSlot: existingSlot
          });
        } else if ((newSlot.groupType === GroupType.Joint) !== (existingSlot.groupType === GroupType.Joint)) {
          // Mixed scenario - one joint, one regular
          conflicts.push({
            type: 'room',
            severity: 'warning',
            message: `Room conflict with ${existingSlot.groupType === GroupType.Joint ? 'joint session' : 'regular class'} from ${existingSlot.startTime} to ${existingSlot.endTime}`,
            conflictingSlot: existingSlot
          });
        }
        
        suggestions.push(`Consider using a different room or time slot`);
      }
      
      // Course conflict - NOW INCLUDES YEAR LEVEL CHECK AND GROUP LOGIC
      if (newSlot.courseId && newSlot.courseId === existingSlot.courseId) {
        // Only conflict if it's the same year level
        if (newSlot.yearLevel === existingSlot.yearLevel) {
          // Check if this is a valid split class scenario
          if (newSlot.groupType === GroupType.Split && existingSlot.groupType === GroupType.Split && 
              newSlot.groupId === existingSlot.groupId) {
            // Same split class - this is allowed
            return;
          } else {
            conflicts.push({
              type: 'course',
              severity: 'error',
              message: `Year ${newSlot.yearLevel} students already have this course scheduled from ${existingSlot.startTime} to ${existingSlot.endTime}`,
              conflictingSlot: existingSlot
            });
            
            suggestions.push(`Year ${newSlot.yearLevel} students cannot attend two classes at the same time`);
          }
        }
        // Different year levels can have the same course at the same time - no conflict
      }
      
      // Additional check: Same year level students shouldn't have different courses at same time
      // EXCEPTION: Split classes and joint sessions have special handling
      if (newSlot.yearLevel === existingSlot.yearLevel && 
          newSlot.courseId !== existingSlot.courseId &&
          newSlot.departmentId === existingSlot.departmentId) {
        
        // Skip if either is part of a split class (students are divided)
        if (newSlot.groupType === GroupType.Split || existingSlot.groupType === GroupType.Split) {
          // Split classes divide students, so no conflict
          return;
        }
        
        // Skip if both are part of joint sessions (intentional scheduling together)
        if (newSlot.groupType === GroupType.Joint && existingSlot.groupType === GroupType.Joint) {
          return;
        }
        
        // Check if these are mandatory courses for the same program
        conflicts.push({
          type: 'course',
          severity: 'error',
          message: `Year ${newSlot.yearLevel} students in this department may have a scheduling conflict with another course at this time`,
          conflictingSlot: existingSlot
        });
      }
    }
    
    // Check for exact duplicate (including year level)
    if (existingSlot.startTime === newSlot.startTime && 
        existingSlot.endTime === newSlot.endTime) {
      
      if (existingSlot.facultyId === newSlot.facultyId &&
          existingSlot.roomId === newSlot.roomId &&
          existingSlot.courseId === newSlot.courseId &&
          existingSlot.yearLevel === newSlot.yearLevel) {
        conflicts.push({
          type: 'time',
          severity: 'error',
          message: `This exact time slot already exists for Year ${newSlot.yearLevel} with the same faculty, room, and course`,
          conflictingSlot: existingSlot
        });
      }
    }
  });

  // Additional validation: Check for reasonable class duration
  const durationMinutes = (end - start) / (1000 * 60);
  if (durationMinutes < 30) {
    conflicts.push({
      type: 'time',
      severity: 'warning',
      message: 'Class duration is less than 30 minutes. Is this intentional?'
    });
  } else if (durationMinutes > 240) { // 4 hours
    conflicts.push({
      type: 'time',
      severity: 'warning',
      message: 'Class duration is more than 4 hours. Consider splitting into multiple sessions.'
    });
  }

  // Determine if user can proceed
  const hasErrors = conflicts.some(c => c.severity === 'error');
  const canProceed = !hasErrors;

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    canProceed,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
};

// Helper function to add minutes to a time string
export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

// Helper to calculate minutes between two time strings
export const getMinutesBetween = (start: string, end: string): number => {
  const startTime = new Date(`1970/01/01 ${start}`).getTime();
  const endTime = new Date(`1970/01/01 ${end}`).getTime();
  return (endTime - startTime) / (1000 * 60);
};

// Function to find available time slots for a given day and year level
export const findAvailableSlots = (
  dayOfWeek: number,
  existingSlots: TimeSlot[],
  academicYear: string,
  semester: string | number,
  yearLevel?: string, // Optional parameter for filtering by year level
  minDuration: number = 60, // minimum duration in minutes
  workingHours: { start: string; end: string } = { start: '08:00', end: '18:00' }
): Array<{ start: string; end: string }> => {
  const availableSlots: Array<{ start: string; end: string }> = [];
  
  // Convert semester to number if it's a string
  const semesterNum = typeof semester === 'string' ? parseInt(semester) : semester;
  
  // Filter slots for the specific day, year, semester, and optionally year level
  // When checking for available slots, we need to consider ALL conflicts (faculty, rooms)
  // not just year-level specific ones
  const daySlots = existingSlots
    .filter(slot => 
      slot.dayOfWeek === dayOfWeek && 
      slot.academicYear === academicYear && 
      slot.semester === semesterNum
    )
    .sort((a, b) => {
      const timeA = new Date(`1970/01/01 ${a.startTime}`).getTime();
      const timeB = new Date(`1970/01/01 ${b.startTime}`).getTime();
      return timeA - timeB;
    });

  // If no slots exist, the entire day is available
  if (daySlots.length === 0) {
    availableSlots.push({ start: workingHours.start, end: workingHours.end });
    return availableSlots;
  }

  // Check for gap before first slot
  if (daySlots[0].startTime > workingHours.start) {
    const gap = getMinutesBetween(workingHours.start, daySlots[0].startTime);
    if (gap >= minDuration) {
      availableSlots.push({ start: workingHours.start, end: daySlots[0].startTime });
    }
  }

  // Check gaps between slots
  for (let i = 0; i < daySlots.length - 1; i++) {
    const currentEnd = daySlots[i].endTime;
    const nextStart = daySlots[i + 1].startTime;
    const gap = getMinutesBetween(currentEnd, nextStart);
    
    if (gap >= minDuration) {
      availableSlots.push({ start: currentEnd, end: nextStart });
    }
  }

  // Check for gap after last slot
  const lastSlot = daySlots[daySlots.length - 1];
  if (lastSlot.endTime < workingHours.end) {
    const gap = getMinutesBetween(lastSlot.endTime, workingHours.end);
    if (gap >= minDuration) {
      availableSlots.push({ start: lastSlot.endTime, end: workingHours.end });
    }
  }

  return availableSlots;
};