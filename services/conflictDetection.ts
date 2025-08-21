// services/conflictDetection.ts

import { TimeSlot, Faculty, Room, Course, GroupType } from '@/types/database';
import { ConflictCheckResult, ConflictDetail } from '@/utils/conflictUtils';

export interface UniversalTimeSlotData {
  // Core scheduling data
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  academicYear: string;
  semester: number | string;
  yearLevel: number;
  
  // Resource allocation
  facultyId?: string;
  roomId?: string;
  courseId?: string;
  departmentId?: string;
  
  // Group handling
  groupType?: GroupType;
  groupId?: string;
  
  // Context for conflict checking
  operation: 'add' | 'joint' | 'split';
  
  // For split classes - array of group-specific overrides
  splitGroups?: Array<{
    name: string;
    facultyId?: string;
    roomId?: string;
    startTime?: string;
    endTime?: string;
    maxStudents?: number;
  }>;
  
  // For joint sessions - array of course IDs
  jointCourses?: string[];
  
  // Metadata
  excludeSlotId?: string; // For updates
}

export class UniversalConflictDetector {
  constructor(
    private existingSlots: TimeSlot[],
    private faculty: Faculty[],
    private rooms: Room[],
    private courses: Course[]
  ) {}
  
  /**
   * Main conflict detection method that handles all three scenarios:
   * 1. Regular Add Time Slot
   * 2. Joint Session
   * 3. Split Class
   */
  detectConflicts(slotData: UniversalTimeSlotData): ConflictCheckResult {
    const conflicts: ConflictDetail[] = [];
    const suggestions: string[] = [];

    // Step 1: Basic validation
    const basicValidation = this.validateBasicRequirements(slotData);
    if (!basicValidation.canProceed) {
      return basicValidation;
    }

    // Step 2: Get relevant existing slots for comparison
    const relevantSlots = this.getRelevantSlots(slotData);

    // Step 3: Check conflicts based on operation type
    switch (slotData.operation) {
      case 'add':
        conflicts.push(...this.checkRegularTimeSlotConflicts(slotData, relevantSlots));
        break;
      case 'joint':
        conflicts.push(...this.checkJointSessionConflicts(slotData, relevantSlots));
        break;
      case 'split':
        conflicts.push(...this.checkSplitClassConflicts(slotData, relevantSlots));
        break;
    }

    // Step 4: Universal conflict checks (apply to all operations)
    conflicts.push(...this.checkUniversalConflicts(slotData, relevantSlots));

    // Step 5: Generate suggestions
    suggestions.push(...this.generateSuggestions(conflicts, slotData, relevantSlots));

    const hasErrors = conflicts.some(c => c.severity === 'error');
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      canProceed: !hasErrors,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  private validateBasicRequirements(slotData: UniversalTimeSlotData): ConflictCheckResult {
    const conflicts: ConflictDetail[] = [];

    // Required fields check
    if (!slotData.dayOfWeek || !slotData.startTime || !slotData.endTime || 
        !slotData.academicYear || !slotData.semester || !slotData.yearLevel) {
      return {
        hasConflicts: false,
        conflicts: [],
        canProceed: false,
        suggestions: ['Please fill in all required fields including year level']
      };
    }

    // Time format validation
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slotData.startTime) || !timeRegex.test(slotData.endTime)) {
      conflicts.push({
        type: 'time',
        severity: 'error',
        message: 'Invalid time format. Use HH:MM format (e.g., 09:00)'
      });
    }

    // Time logic validation
    const start = new Date(`1970/01/01 ${slotData.startTime}`).getTime();
    const end = new Date(`1970/01/01 ${slotData.endTime}`).getTime();
    
    if (start >= end) {
      conflicts.push({
        type: 'time',
        severity: 'error',
        message: 'End time must be after start time'
      });
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      canProceed: conflicts.length === 0
    };
  }

  private getRelevantSlots(slotData: UniversalTimeSlotData): TimeSlot[] {
    const semester = typeof slotData.semester === 'string' ? parseInt(slotData.semester) : slotData.semester;
    
    return this.existingSlots.filter(slot => 
      slot.id !== slotData.excludeSlotId &&
      slot.dayOfWeek === slotData.dayOfWeek &&
      slot.academicYear === slotData.academicYear &&
      slot.semester === semester
    );
  }

  private checkRegularTimeSlotConflicts(
    slotData: UniversalTimeSlotData, 
    relevantSlots: TimeSlot[]
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const start = new Date(`1970/01/01 ${slotData.startTime}`).getTime();
    const end = new Date(`1970/01/01 ${slotData.endTime}`).getTime();

    for (const existingSlot of relevantSlots) {
      const existingStart = new Date(`1970/01/01 ${existingSlot.startTime}`).getTime();
      const existingEnd = new Date(`1970/01/01 ${existingSlot.endTime}`).getTime();
      
      // Check for time overlap
      if (start < existingEnd && end > existingStart) {
        // CRITICAL: Faculty conflict - No faculty can be double-booked
        if (slotData.facultyId && slotData.facultyId === existingSlot.facultyId) {
          const facultyName = this.faculty.find(f => f.id === slotData.facultyId);
          const conflictContext = this.getConflictContext(existingSlot);
          const courseName = this.getCourseName(existingSlot.courseId);
          const facultyDisplayName = facultyName ? `${facultyName.firstName} ${facultyName.lastName}` : 'Faculty member';
          
          conflicts.push({
            type: 'faculty',
            severity: 'error',
            message: `❌ ${facultyDisplayName} is already scheduled for ${conflictContext} - "${courseName}" from ${existingSlot.startTime} to ${existingSlot.endTime}`,
            conflictingSlot: existingSlot
          });
        }

        // CRITICAL: Room conflict - No room can be double-booked  
        if (slotData.roomId && slotData.roomId === existingSlot.roomId) {
          const roomName = this.rooms.find(r => r.id === slotData.roomId);
          const conflictContext = this.getConflictContext(existingSlot);
          const courseName = this.getCourseName(existingSlot.courseId);
          const roomDisplayName = roomName ? roomName.name : 'Room';
          
          conflicts.push({
            type: 'room',
            severity: 'error',
            message: `❌ ${roomDisplayName} is already booked for ${conflictContext} - "${courseName}" from ${existingSlot.startTime} to ${existingSlot.endTime}`,
            conflictingSlot: existingSlot
          });
        }

        // ENHANCED: Student/Course conflict - Check year level and course with context
        if (slotData.courseId === existingSlot.courseId && 
            slotData.yearLevel === existingSlot.yearLevel) {
          
          // If existing is a split class, it might be okay if we're adding another split group
          if (existingSlot.groupType === GroupType.Split) {
            conflicts.push({
              type: 'course',
              severity: 'warning',
              message: `Year ${slotData.yearLevel} students already have "${this.getCourseName(slotData.courseId)}" as a split class. Adding regular class may create conflicts.`,
              conflictingSlot: existingSlot
            });
          } else {
            conflicts.push({
              type: 'course',
              severity: 'error',
              message: `Year ${slotData.yearLevel} students already have "${this.getCourseName(slotData.courseId)}" scheduled from ${existingSlot.startTime} to ${existingSlot.endTime}`,
              conflictingSlot: existingSlot
            });
          }
        }

        // ENHANCED: Student availability conflicts with better context
        if (slotData.yearLevel === existingSlot.yearLevel && 
            slotData.courseId !== existingSlot.courseId &&
            slotData.departmentId === existingSlot.departmentId) {
          
          // Different handling based on existing slot type
          if (existingSlot.groupType === GroupType.Joint) {
            conflicts.push({
              type: 'course',
              severity: 'error',
              message: `Year ${slotData.yearLevel} students are unavailable - they have a joint session for "${this.getCourseName(existingSlot.courseId)}" scheduled`,
              conflictingSlot: existingSlot
            });
          } else if (existingSlot.groupType === GroupType.Split) {
            conflicts.push({
              type: 'course',
              severity: 'warning',
              message: `Some Year ${slotData.yearLevel} students may be unavailable - they have a split class for "${this.getCourseName(existingSlot.courseId)}" scheduled`,
              conflictingSlot: existingSlot
            });
          } else {
            // Regular class
            conflicts.push({
              type: 'course',
              severity: 'error',
              message: `Year ${slotData.yearLevel} students are unavailable - they have "${this.getCourseName(existingSlot.courseId)}" scheduled at this time`,
              conflictingSlot: existingSlot
            });
          }
        }

        // ADDITIONAL: Cross-department conflicts for interdisciplinary programs
        if (slotData.yearLevel === existingSlot.yearLevel && 
            slotData.courseId !== existingSlot.courseId &&
            slotData.departmentId !== existingSlot.departmentId) {
          
          conflicts.push({
            type: 'course',
            severity: 'warning',
            message: `Potential conflict with Year ${slotData.yearLevel} interdisciplinary students who may be enrolled in courses from both departments`,
            conflictingSlot: existingSlot
          });
        }
      }
      
      // ADDITIONAL: Check for exact duplicate slots
      if (existingSlot.startTime === slotData.startTime && 
          existingSlot.endTime === slotData.endTime &&
          existingSlot.facultyId === slotData.facultyId &&
          existingSlot.roomId === slotData.roomId &&
          existingSlot.courseId === slotData.courseId &&
          existingSlot.yearLevel === slotData.yearLevel) {
        conflicts.push({
          type: 'course',
          severity: 'error',
          message: `Duplicate time slot detected - This exact combination already exists for Year ${slotData.yearLevel}`,
          conflictingSlot: existingSlot
        });
      }
    }

    return conflicts;
  }

  private checkJointSessionConflicts(
    slotData: UniversalTimeSlotData, 
    relevantSlots: TimeSlot[]
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const start = new Date(`1970/01/01 ${slotData.startTime}`).getTime();
    const end = new Date(`1970/01/01 ${slotData.endTime}`).getTime();

    for (const existingSlot of relevantSlots) {
      const existingStart = new Date(`1970/01/01 ${existingSlot.startTime}`).getTime();
      const existingEnd = new Date(`1970/01/01 ${existingSlot.endTime}`).getTime();
      
      if (start < existingEnd && end > existingStart) {
        // Skip if this is the same joint session group being edited
        if (slotData.groupId && existingSlot.groupId === slotData.groupId && 
            existingSlot.groupType === GroupType.Joint) {
          continue;
        }

        // CRITICAL: Faculty conflict - Joint sessions must have exclusive faculty time
        if (slotData.facultyId && slotData.facultyId === existingSlot.facultyId) {
          const facultyName = this.faculty.find(f => f.id === slotData.facultyId);
          const conflictContext = this.getConflictContext(existingSlot);
          const facultyDisplayName = facultyName ? `${facultyName.firstName} ${facultyName.lastName}` : 'Faculty member';
          
          conflicts.push({
            type: 'faculty',
            severity: 'error',
            message: `❌ ${facultyDisplayName} is already scheduled for ${conflictContext}. Joint sessions require dedicated faculty time.`,
            conflictingSlot: existingSlot
          });
        }

        // CRITICAL: Room conflict - Joint sessions need exclusive room access
        if (slotData.roomId && slotData.roomId === existingSlot.roomId) {
          const roomName = this.rooms.find(r => r.id === slotData.roomId);
          const conflictContext = this.getConflictContext(existingSlot);
          const roomDisplayName = roomName ? roomName.name : 'Room';
          
          conflicts.push({
            type: 'room',
            severity: 'error',
            message: `❌ ${roomDisplayName} is already booked for ${conflictContext}. Joint sessions require exclusive room access.`,
            conflictingSlot: existingSlot
          });
        }

        // ENHANCED: Student conflicts for each course in the joint session
        if (slotData.jointCourses && slotData.jointCourses.length > 0) {
          for (const courseId of slotData.jointCourses) {
            // Check if any course in joint session conflicts with existing course
            if (courseId === existingSlot.courseId && 
                slotData.yearLevel === existingSlot.yearLevel) {
              conflicts.push({
                type: 'course',
                severity: 'error',
                message: `Year ${slotData.yearLevel} students already have "${this.getCourseName(courseId)}" scheduled. Cannot include in joint session.`,
                conflictingSlot: existingSlot
              });
            }
          }
        }

        // CRITICAL: Student availability conflicts - Must check ALL existing commitments
        // Joint sessions require ALL students to be free
        if (slotData.yearLevel === existingSlot.yearLevel &&
            slotData.departmentId === existingSlot.departmentId) {
          
          // If existing slot is a split class, only half the students are busy
          if (existingSlot.groupType === GroupType.Split) {
            conflicts.push({
              type: 'course',
              severity: 'warning',
              message: `Year ${slotData.yearLevel} students are partially occupied with a split class. Verify student availability for joint session.`,
              conflictingSlot: existingSlot
            });
          } 
          // If existing slot is regular or another joint session, all students are busy
          else if (existingSlot.groupType !== GroupType.Joint || 
                   existingSlot.groupId !== slotData.groupId) {
            conflicts.push({
              type: 'course',
              severity: 'error',
              message: `Year ${slotData.yearLevel} students are not available - they have "${this.getCourseName(existingSlot.courseId)}" scheduled`,
              conflictingSlot: existingSlot
            });
          }
        }

        // ENHANCED: Cross-department joint session conflicts
        if (slotData.yearLevel === existingSlot.yearLevel &&
            slotData.departmentId !== existingSlot.departmentId) {
          // Check if students might be enrolled in both departments (interdisciplinary courses)
          conflicts.push({
            type: 'course',
            severity: 'warning',
            message: `Potential conflict with Year ${slotData.yearLevel} interdisciplinary students who may be enrolled in both departments`,
            conflictingSlot: existingSlot
          });
        }
      }
    }

    // ADDITIONAL: Validate joint session requirements
    if (slotData.jointCourses && slotData.jointCourses.length < 2) {
      conflicts.push({
        type: 'course',
        severity: 'error',
        message: 'Joint sessions require at least 2 courses. Please add more courses.'
      });
    }

    // ADDITIONAL: Check if courses are compatible for joint session
    if (slotData.jointCourses && slotData.jointCourses.length >= 2) {
      const courseDetails = slotData.jointCourses.map(id => this.courses.find(c => c.id === id)).filter(Boolean);
      const yearLevels = new Set(courseDetails.map(c => c!.yearLevel));
      const departments = new Set(courseDetails.map(c => c!.departmentId));
      
      if (yearLevels.size > 1) {
        conflicts.push({
          type: 'course',
          severity: 'error',
          message: 'All courses in joint session must be for the same year level'
        });
      }
      
      if (departments.size > 1) {
        conflicts.push({
          type: 'course',
          severity: 'warning',
          message: 'Joint session includes courses from different departments. Verify compatibility.'
        });
      }
    }

    return conflicts;
  }

  private checkSplitClassConflicts(
    slotData: UniversalTimeSlotData, 
    relevantSlots: TimeSlot[]
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    
    if (!slotData.splitGroups || slotData.splitGroups.length === 0) {
      return [{
        type: 'course',
        severity: 'error',
        message: 'Split class groups not defined. Please add at least 2 groups.'
      }];
    }

    // VALIDATION: Split classes should have at least 2 groups
    if (slotData.splitGroups.length < 2) {
      conflicts.push({
        type: 'course',
        severity: 'error',
        message: 'Split classes require at least 2 groups to divide students effectively.'
      });
    }

    // ENHANCED: Check each split group for comprehensive conflicts
    for (let i = 0; i < slotData.splitGroups.length; i++) {
      const group = slotData.splitGroups[i];
      const groupStartTime = group.startTime || slotData.startTime;
      const groupEndTime = group.endTime || slotData.endTime;
      const groupFacultyId = group.facultyId || slotData.facultyId;
      const groupRoomId = group.roomId || slotData.roomId;
      
      // VALIDATION: Each group must have a room assigned
      if (!groupRoomId) {
        conflicts.push({
          type: 'room',
          severity: 'error',
          message: `${group.name}: Room not assigned. Each split group requires a specific room.`
        });
        continue; // Skip further checks for this group if no room
      }
      
      const start = new Date(`1970/01/01 ${groupStartTime}`).getTime();
      const end = new Date(`1970/01/01 ${groupEndTime}`).getTime();

      // CRITICAL: Check conflicts with all existing time slots
      for (const existingSlot of relevantSlots) {
        const existingStart = new Date(`1970/01/01 ${existingSlot.startTime}`).getTime();
        const existingEnd = new Date(`1970/01/01 ${existingSlot.endTime}`).getTime();
        
        if (start < existingEnd && end > existingStart) {
          // Skip if this is the same split class group being edited
          if (slotData.groupId && existingSlot.groupId === slotData.groupId && 
              existingSlot.groupType === GroupType.Split) {
            continue;
          }

          // CRITICAL: Faculty conflict - Each split group faculty must be available
          if (groupFacultyId && groupFacultyId === existingSlot.facultyId) {
            const facultyName = this.faculty.find(f => f.id === groupFacultyId);
            const conflictContext = this.getConflictContext(existingSlot);
            const facultyDisplayName = facultyName ? `${facultyName.firstName} ${facultyName.lastName}` : 'Faculty member';
            
            conflicts.push({
              type: 'faculty',
              severity: 'error',
              message: `❌ ${group.name}: ${facultyDisplayName} is already scheduled for ${conflictContext} - "${this.getCourseName(existingSlot.courseId)}"`,
              conflictingSlot: existingSlot
            });
          }

          // CRITICAL: Room conflict - Each split group room must be available  
          if (groupRoomId && groupRoomId === existingSlot.roomId) {
            const roomName = this.rooms.find(r => r.id === groupRoomId);
            const conflictContext = this.getConflictContext(existingSlot);
            const roomDisplayName = roomName ? roomName.name : 'Room';
            
            conflicts.push({
              type: 'room',
              severity: 'error',
              message: `❌ ${group.name}: ${roomDisplayName} is already booked for ${conflictContext} - "${this.getCourseName(existingSlot.courseId)}"`,
              conflictingSlot: existingSlot
            });
          }

          // ENHANCED: Course conflict detection for split classes
          if (slotData.courseId === existingSlot.courseId && 
              slotData.yearLevel === existingSlot.yearLevel) {
            
            // If existing is also a split class of the same course, it's okay (same split session)
            if (existingSlot.groupType === GroupType.Split && 
                existingSlot.groupId === slotData.groupId) {
              continue;
            }
            // If existing is regular class of same course, it conflicts
            else if (existingSlot.groupType !== GroupType.Split) {
              conflicts.push({
                type: 'course',
                severity: 'error',
                message: `${group.name}: Cannot split "${this.getCourseName(slotData.courseId)}" - Year ${slotData.yearLevel} students already have this course as a regular class`,
                conflictingSlot: existingSlot
              });
            }
            // If existing is different split class of same course, warn about confusion
            else {
              conflicts.push({
                type: 'course',
                severity: 'warning',
                message: `${group.name}: Another split class session exists for the same course. Verify this is intentional.`,
                conflictingSlot: existingSlot
              });
            }
          }

          // ENHANCED: Student availability for split classes
          // Split classes divide students, so check for other commitments more carefully
          if (slotData.yearLevel === existingSlot.yearLevel &&
              slotData.departmentId === existingSlot.departmentId &&
              slotData.courseId !== existingSlot.courseId) {
            
            // If existing is joint session, all students are occupied
            if (existingSlot.groupType === GroupType.Joint) {
              conflicts.push({
                type: 'course',
                severity: 'error',
                message: `${group.name}: Year ${slotData.yearLevel} students are unavailable - they have a joint session scheduled`,
                conflictingSlot: existingSlot
              });
            }
            // If existing is regular class, all students are occupied
            else if (existingSlot.groupType !== GroupType.Split) {
              conflicts.push({
                type: 'course',
                severity: 'error',
                message: `${group.name}: Year ${slotData.yearLevel} students are unavailable - they have "${this.getCourseName(existingSlot.courseId)}" scheduled`,
                conflictingSlot: existingSlot
              });
            }
            // If existing is another split class, warn about potential overlap
            else {
              conflicts.push({
                type: 'course',
                severity: 'warning',
                message: `${group.name}: Some Year ${slotData.yearLevel} students may be occupied with another split class. Verify student group assignments don't overlap.`,
                conflictingSlot: existingSlot
              });
            }
          }
        }
      }
    }

    // ENHANCED: Check for conflicts between split groups within the same split class
    for (let i = 0; i < slotData.splitGroups.length; i++) {
      for (let j = i + 1; j < slotData.splitGroups.length; j++) {
        const group1 = slotData.splitGroups[i];
        const group2 = slotData.splitGroups[j];
        
        const start1 = new Date(`1970/01/01 ${group1.startTime || slotData.startTime}`).getTime();
        const end1 = new Date(`1970/01/01 ${group1.endTime || slotData.endTime}`).getTime();
        const start2 = new Date(`1970/01/01 ${group2.startTime || slotData.startTime}`).getTime();
        const end2 = new Date(`1970/01/01 ${group2.endTime || slotData.endTime}`).getTime();
        
        // Check if times overlap
        if (start1 < end2 && end1 > start2) {
          // CRITICAL: Faculty conflict between groups in same split class
          const faculty1 = group1.facultyId || slotData.facultyId;
          const faculty2 = group2.facultyId || slotData.facultyId;
          
          if (faculty1 && faculty2 && faculty1 === faculty2) {
            conflicts.push({
              type: 'faculty',
              severity: 'error',
              message: `Faculty member cannot teach both ${group1.name} and ${group2.name} at overlapping times within the same split class`
            });
          }
          
          // CRITICAL: Room conflict between groups in same split class
          const room1 = group1.roomId || slotData.roomId;
          const room2 = group2.roomId || slotData.roomId;
          
          if (room1 && room2 && room1 === room2) {
            conflicts.push({
              type: 'room',
              severity: 'error',
              message: `Room cannot be used by both ${group1.name} and ${group2.name} at overlapping times`
            });
          }
        }
      }
    }

    // ADDITIONAL: Validate split group configurations
    const roomIds = new Set();
    const facultyIds = new Set();
    
    for (const group of slotData.splitGroups) {
      const roomId = group.roomId || slotData.roomId;
      const facultyId = group.facultyId || slotData.facultyId;
      
      // Check for duplicate room assignments at the same time
      if (roomId) {
        if (roomIds.has(roomId)) {
          // Only error if groups have overlapping times
          const hasOverlappingTimes = slotData.splitGroups.some((otherGroup, idx) => {
            if (otherGroup === group) return false;
            const groupTime = group.startTime || slotData.startTime;
            const otherTime = otherGroup.startTime || slotData.startTime;
            return groupTime === otherTime; // Simple same-time check
          });
          
          if (hasOverlappingTimes) {
            conflicts.push({
              type: 'room',
              severity: 'warning',
              message: `Multiple groups are assigned to the same room at the same time. This is only valid if they have different time slots.`
            });
          }
        }
        roomIds.add(roomId);
      }
      
      // Track faculty assignments for optimization suggestions
      if (facultyId) {
        facultyIds.add(facultyId);
      }
    }

    return conflicts;
  }

  private checkUniversalConflicts(
    slotData: UniversalTimeSlotData, 
    relevantSlots: TimeSlot[]
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    
    // Check for reasonable class duration
    const start = new Date(`1970/01/01 ${slotData.startTime}`).getTime();
    const end = new Date(`1970/01/01 ${slotData.endTime}`).getTime();
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

    return conflicts;
  }

  private getConflictContext(slot: TimeSlot): string {
    if (slot.groupType === GroupType.Joint) {
      return 'a joint session';
    } else if (slot.groupType === GroupType.Split) {
      return 'a split class';
    }
    return 'a regular class';
  }

  private getCourseName(courseId: string): string {
    const course = this.courses.find(c => c.id === courseId);
    return course ? course.name : courseId;
  }

  private generateSuggestions(
    conflicts: ConflictDetail[], 
    slotData: UniversalTimeSlotData, 
    relevantSlots: TimeSlot[]
  ): string[] {
    const suggestions: string[] = [];
    
    // Time-based suggestions
    const hasTimeConflict = conflicts.some(c => c.type === 'faculty' || c.type === 'room');
    if (hasTimeConflict) {
      const latestEndTime = Math.max(
        ...relevantSlots
          .filter(slot => {
            const start = new Date(`1970/01/01 ${slotData.startTime}`).getTime();
            const end = new Date(`1970/01/01 ${slotData.endTime}`).getTime();
            const existingStart = new Date(`1970/01/01 ${slot.startTime}`).getTime();
            const existingEnd = new Date(`1970/01/01 ${slot.endTime}`).getTime();
            
            return start < existingEnd && end > existingStart;
          })
          .map(slot => new Date(`1970/01/01 ${slot.endTime}`).getTime())
      );
      
      if (latestEndTime && !isNaN(latestEndTime)) {
        const suggestedTime = new Date(latestEndTime);
        const hours = suggestedTime.getHours().toString().padStart(2, '0');
        const minutes = suggestedTime.getMinutes().toString().padStart(2, '0');
        suggestions.push(`Try scheduling after ${hours}:${minutes}`);
      }
    }

    // Resource-based suggestions
    if (conflicts.some(c => c.type === 'room')) {
      suggestions.push('Consider using a different room');
    }

    if (conflicts.some(c => c.type === 'faculty')) {
      suggestions.push('Consider assigning a different faculty member or scheduling at a different time');
    }

    // Operation-specific suggestions
    if (slotData.operation === 'joint' && conflicts.some(c => c.type === 'course')) {
      suggestions.push('Ensure all courses in the joint session have available students');
    }

    if (slotData.operation === 'split') {
      suggestions.push('Verify that each split group has unique resources or non-overlapping times');
    }

    return suggestions;
  }
}

// Utility function to convert different form data types to UniversalTimeSlotData
export const convertToUniversalData = {
  // For regular time slot forms
  fromRegularTimeSlot: (formData: any): UniversalTimeSlotData => ({
    dayOfWeek: formData.dayOfWeek,
    startTime: formData.startTime,
    endTime: formData.endTime,
    academicYear: formData.academicYear,
    semester: formData.semester,
    yearLevel: typeof formData.yearLevel === 'string' ? parseInt(formData.yearLevel) : formData.yearLevel,
    facultyId: formData.facultyId,
    roomId: formData.roomId,
    courseId: formData.courseId,
    departmentId: formData.departmentId,
    operation: 'add' as const,
    excludeSlotId: formData.id
  }),

  // For joint session forms
  fromJointSession: (formData: any): UniversalTimeSlotData => ({
    dayOfWeek: formData.dayOfWeek,
    startTime: formData.startTime,
    endTime: formData.endTime,
    academicYear: formData.academicYear,
    semester: formData.semester,
    yearLevel: typeof formData.yearLevel === 'string' ? parseInt(formData.yearLevel) : formData.yearLevel,
    facultyId: formData.facultyId,
    roomId: formData.roomId,
    departmentId: formData.departmentId,
    groupType: GroupType.Joint,
    groupId: formData.groupId,
    operation: 'joint' as const,
    jointCourses: formData.courses || [],
    excludeSlotId: formData.id
  }),

  // For split class forms
  fromSplitClass: (formData: any): UniversalTimeSlotData => ({
    dayOfWeek: formData.dayOfWeek,
    startTime: formData.startTime,
    endTime: formData.endTime,
    academicYear: formData.academicYear,
    semester: formData.semester,
    yearLevel: typeof formData.yearLevel === 'string' ? parseInt(formData.yearLevel) : formData.yearLevel,
    courseId: formData.courseId,
    departmentId: formData.departmentId,
    groupType: GroupType.Split,
    groupId: formData.groupId,
    operation: 'split' as const,
    splitGroups: formData.groups || [],
    excludeSlotId: formData.id
  })
};
