// services/conflictResolver.ts

import { 
  EnhancedConflict, 
  ResolutionSuggestion, 
  ResolutionAction,
  ResolutionResult,
  Constraint
} from '@/types/conflicts';
import { 
  TimeSlot, 
  Course, 
  Faculty, 
  Room, 
  Student,
  Conflict,
  ConflictType,
  ConflictSeverity 
} from '@/types/database';
import { ConstraintManager } from './constraintManager';

export class ConflictResolver {
  private constraintManager: ConstraintManager;
  
  constructor(constraintManager: ConstraintManager) {
    this.constraintManager = constraintManager;
  }
  
  async detectConflicts(
    timeSlots: TimeSlot[],
    courses: Course[],
    faculty: Faculty[],
    rooms: Room[],
    students: Student[]
  ): Promise<EnhancedConflict[]> {
    const conflicts: EnhancedConflict[] = [];
    
    // 1. Check room conflicts
    conflicts.push(...this.checkRoomConflicts(timeSlots, rooms, courses));
    
    // 2. Check faculty conflicts
    conflicts.push(...this.checkFacultyConflicts(timeSlots, faculty, courses));
    
    // 3. Check course conflicts
    conflicts.push(...this.checkCourseConflicts(timeSlots, courses, rooms));
    
    // 4. Check room type conflicts
    conflicts.push(...this.checkRoomTypeConflicts(timeSlots, rooms, courses));
    
    // 5. Check capacity conflicts
    conflicts.push(...this.checkCapacityConflicts(timeSlots, rooms, courses));
    
    // 6. Check schedule conflicts
    conflicts.push(...this.checkScheduleConflicts(timeSlots, faculty, rooms));
    
    // 7. Check student conflicts
    conflicts.push(...this.checkStudentConflicts(timeSlots, students, courses));
    
    // Generate resolution suggestions for each conflict
    for (const conflict of conflicts) {
      conflict.resolutionSuggestions = await this.generateResolutionSuggestions(
        conflict,
        timeSlots,
        rooms,
        faculty
      );
      conflict.autoResolvable = conflict.resolutionSuggestions.length > 0;
    }
    
    return conflicts.sort((a, b) => b.conflictScore - a.conflictScore);
  }
  
  private checkRoomConflicts(
    timeSlots: TimeSlot[], 
    rooms: Room[], 
    courses: Course[]
  ): EnhancedConflict[] {
    const conflicts: EnhancedConflict[] = [];
    
    for (let i = 0; i < timeSlots.length; i++) {
      for (let j = i + 1; j < timeSlots.length; j++) {
        const slot1 = timeSlots[i];
        const slot2 = timeSlots[j];
        
        if (slot1.roomId === slot2.roomId && 
            slot1.dayOfWeek === slot2.dayOfWeek &&
            this.timesOverlap(slot1, slot2)) {
          
          const room = rooms.find(r => r.id === slot1.roomId);
          const course1 = courses.find(c => c.id === slot1.courseId);
          const course2 = courses.find(c => c.id === slot2.courseId);
          
          conflicts.push({
            id: `room-conflict-${slot1.id}-${slot2.id}`,
            type: ConflictType.Room,
            description: 'Room conflict: Multiple classes in same room',
            details: `${room?.name || slot1.roomId} has overlapping classes: ` +
                    `${course1?.name || slot1.courseId} (${slot1.startTime}-${slot1.endTime}) and ` +
                    `${course2?.name || slot2.courseId} (${slot2.startTime}-${slot2.endTime}) on ` +
                    `${this.getDayName(slot1.dayOfWeek)}`,
            severity: ConflictSeverity.High,
            affectedSlots: [slot1.id, slot2.id],
            resolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            constraints: [this.constraintManager.getConstraint('no-room-overlap')!],
            resolutionSuggestions: [],
            conflictScore: 1000,
            autoResolvable: false
          });
        }
      }
    }
    
    return conflicts;
  }
  
  private checkFacultyConflicts(
    timeSlots: TimeSlot[],
    faculty: Faculty[],
    courses: Course[]
  ): EnhancedConflict[] {
    const conflicts: EnhancedConflict[] = [];
    
    for (let i = 0; i < timeSlots.length; i++) {
      for (let j = i + 1; j < timeSlots.length; j++) {
        const slot1 = timeSlots[i];
        const slot2 = timeSlots[j];
        
        if (slot1.facultyId === slot2.facultyId && 
            slot1.dayOfWeek === slot2.dayOfWeek &&
            this.timesOverlap(slot1, slot2)) {
          
          const fac = faculty.find(f => f.id === slot1.facultyId);
          const course1 = courses.find(c => c.id === slot1.courseId);
          const course2 = courses.find(c => c.id === slot2.courseId);
          
          conflicts.push({
            id: `faculty-conflict-${slot1.id}-${slot2.id}`,
            type: ConflictType.Faculty,
            description: 'Faculty conflict: Teacher double-booked',
            details: `${fac ? `${fac.title} ${fac.firstName} ${fac.lastName}` : slot1.facultyId} ` +
                    `is scheduled for ${course1?.name || slot1.courseId} and ` +
                    `${course2?.name || slot2.courseId} at overlapping times on ` +
                    `${this.getDayName(slot1.dayOfWeek)}`,
            severity: ConflictSeverity.High,
            affectedSlots: [slot1.id, slot2.id],
            resolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            constraints: [this.constraintManager.getConstraint('no-faculty-overlap')!],
            resolutionSuggestions: [],
            conflictScore: 1000,
            autoResolvable: false
          });
        }
      }
    }
    
    return conflicts;
  }
  
  private checkRoomTypeConflicts(
    timeSlots: TimeSlot[],
    rooms: Room[],
    courses: Course[]
  ): EnhancedConflict[] {
    const conflicts: EnhancedConflict[] = [];
    
    for (const slot of timeSlots) {
      const room = rooms.find(r => r.id === slot.roomId);
      const course = courses.find(c => c.id === slot.courseId);
      
      if (room && course) {
        const isLabCourse = course.name.toLowerCase().includes('lab') || slot.type === 'Lab';
        const isLabRoom = room.type === 'Lab';
        
        if (isLabCourse && !isLabRoom) {
          conflicts.push({
            id: `room-type-conflict-${slot.id}`,
            type: ConflictType.RoomType,
            description: 'Room type mismatch: Lab in non-lab room',
            details: `${course.name} (Lab) is scheduled in ${room.name} which is a ${room.type} room`,
            severity: ConflictSeverity.Medium,
            affectedSlots: [slot.id],
            resolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            constraints: [this.constraintManager.getConstraint('room-type-match')!],
            resolutionSuggestions: [],
            conflictScore: 500,
            autoResolvable: true
          });
        } else if (!isLabCourse && isLabRoom) {
          conflicts.push({
            id: `room-type-conflict-${slot.id}`,
            type: ConflictType.RoomType,
            description: 'Room type mismatch: Lecture in lab room',
            details: `${course.name} (Lecture) is scheduled in ${room.name} which is a Lab room`,
            severity: ConflictSeverity.Low,
            affectedSlots: [slot.id],
            resolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            constraints: [this.constraintManager.getConstraint('room-type-match')!],
            resolutionSuggestions: [],
            conflictScore: 200,
            autoResolvable: true
          });
        }
      }
    }
    
    return conflicts;
  }
  
  private checkCapacityConflicts(
    timeSlots: TimeSlot[],
    rooms: Room[],
    courses: Course[]
  ): EnhancedConflict[] {
    const conflicts: EnhancedConflict[] = [];
    
    for (const slot of timeSlots) {
      const room = rooms.find(r => r.id === slot.roomId);
      const course = courses.find(c => c.id === slot.courseId);
      
      if (room && course && room.capacity < 30 && slot.type === 'Lecture') {
        conflicts.push({
          id: `capacity-conflict-${slot.id}`,
          type: ConflictType.Capacity,
          description: 'Capacity issue: Room may be too small',
          details: `${room.name} has capacity of ${room.capacity} which may be insufficient for ${course.name}`,
          severity: ConflictSeverity.Medium,
          affectedSlots: [slot.id],
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          constraints: [this.constraintManager.getConstraint('room-capacity')!],
          resolutionSuggestions: [],
          conflictScore: 400,
          autoResolvable: true
        });
      }
    }
    
    return conflicts;
  }
  
  private checkScheduleConflicts(
    timeSlots: TimeSlot[],
    faculty: Faculty[],
    rooms: Room[]
  ): EnhancedConflict[] {
    const conflicts: EnhancedConflict[] = [];
    
    // Group slots by faculty
    const facultySchedule = new Map<string, TimeSlot[]>();
    for (const slot of timeSlots) {
      if (!facultySchedule.has(slot.facultyId)) {
        facultySchedule.set(slot.facultyId, []);
      }
      facultySchedule.get(slot.facultyId)!.push(slot);
    }
    
    // Check each faculty's schedule
    facultySchedule.forEach((slots, facultyId) => {
      const fac = faculty.find(f => f.id === facultyId);
      const sortedSlots = slots.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
      });
      
      for (let i = 0; i < sortedSlots.length - 1; i++) {
        const current = sortedSlots[i];
        const next = sortedSlots[i + 1];
        
        if (current.dayOfWeek === next.dayOfWeek && current.endTime === next.startTime) {
          const currentRoom = rooms.find(r => r.id === current.roomId);
          const nextRoom = rooms.find(r => r.id === next.roomId);
          
          if (currentRoom && nextRoom && currentRoom.building !== nextRoom.building) {
            conflicts.push({
              id: `schedule-conflict-${current.id}-${next.id}`,
              type: ConflictType.Schedule,
              description: 'Tight schedule: Back-to-back in different buildings',
              details: `${fac ? `${fac.title} ${fac.firstName} ${fac.lastName}` : facultyId} has ` +
                      `consecutive classes in different buildings on ${this.getDayName(current.dayOfWeek)}`,
              severity: ConflictSeverity.Low,
              affectedSlots: [current.id, next.id],
              resolved: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              constraints: [this.constraintManager.getConstraint('building-distance')!],
              resolutionSuggestions: [],
              conflictScore: 200,
              autoResolvable: true
            });
          }
        }
      }
    });
    
    return conflicts;
  }
  
  private checkCourseConflicts(
    timeSlots: TimeSlot[],
    courses: Course[],
    rooms: Room[]
  ): EnhancedConflict[] {
    const conflicts: EnhancedConflict[] = [];
    
    for (let i = 0; i < timeSlots.length; i++) {
      for (let j = i + 1; j < timeSlots.length; j++) {
        const slot1 = timeSlots[i];
        const slot2 = timeSlots[j];
        
        if (slot1.courseId === slot2.courseId && 
            slot1.dayOfWeek === slot2.dayOfWeek &&
            this.timesOverlap(slot1, slot2)) {
          
          const course = courses.find(c => c.id === slot1.courseId);
          const room1 = rooms.find(r => r.id === slot1.roomId);
          const room2 = rooms.find(r => r.id === slot2.roomId);
          
          conflicts.push({
            id: `course-conflict-${slot1.id}-${slot2.id}`,
            type: ConflictType.Course,
            description: 'Course conflict: Same course scheduled twice',
            details: `${course?.name || slot1.courseId} is scheduled at overlapping times in ` +
                    `${room1?.name || slot1.roomId} and ${room2?.name || slot2.roomId} on ` +
                    `${this.getDayName(slot1.dayOfWeek)}`,
            severity: ConflictSeverity.High,
            affectedSlots: [slot1.id, slot2.id],
            resolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            constraints: [],
            resolutionSuggestions: [],
            conflictScore: 800,
            autoResolvable: true
          });
        }
      }
    }
    
    return conflicts;
  }
  
  private checkStudentConflicts(
    timeSlots: TimeSlot[],
    students: Student[],
    courses: Course[]
  ): EnhancedConflict[] {
    const conflicts: EnhancedConflict[] = [];
    
    for (const student of students) {
      if (!student.enrolledCourses || student.enrolledCourses.length === 0) continue;
      
      const studentSlots = timeSlots.filter(slot => 
        student.enrolledCourses.includes(slot.courseId)
      );
      
      for (let i = 0; i < studentSlots.length; i++) {
        for (let j = i + 1; j < studentSlots.length; j++) {
          const slot1 = studentSlots[i];
          const slot2 = studentSlots[j];
          
          if (slot1.dayOfWeek === slot2.dayOfWeek && this.timesOverlap(slot1, slot2)) {
            const course1 = courses.find(c => c.id === slot1.courseId);
            const course2 = courses.find(c => c.id === slot2.courseId);
            
            conflicts.push({
              id: `student-conflict-${student.id}-${slot1.id}-${slot2.id}`,
              type: ConflictType.Student,
              description: 'Student schedule conflict',
              details: `${student.firstName} ${student.lastName} is enrolled in overlapping courses: ` +
                      `${course1?.name || slot1.courseId} and ${course2?.name || slot2.courseId} on ` +
                      `${this.getDayName(slot1.dayOfWeek)}`,
              severity: ConflictSeverity.High,
              affectedSlots: [slot1.id, slot2.id],
              resolved: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              constraints: [this.constraintManager.getConstraint('no-student-overlap')!],
              resolutionSuggestions: [],
              conflictScore: 900,
              autoResolvable: true
            });
          }
        }
      }
    }
    
    return conflicts;
  }
  
  private async generateResolutionSuggestions(
    conflict: EnhancedConflict,
    allSlots: TimeSlot[],
    rooms: Room[],
    faculty: Faculty[]
  ): Promise<ResolutionSuggestion[]> {
    const suggestions: ResolutionSuggestion[] = [];
    
    // For each affected slot, generate suggestions based on conflict type
    for (const slotId of conflict.affectedSlots) {
      const slot = allSlots.find(s => s.id === slotId);
      if (!slot) continue;
      
      switch (conflict.type) {
        case 'room':
        case 'faculty':
        case 'course':
        case 'student':
          // Try moving to different time
          suggestions.push(...this.generateTimeMovesuggestions(slot, allSlots, conflict));
          // Try swapping with another slot
          suggestions.push(...this.generateSwapSuggestions(slot, allSlots, conflict));
          break;
          
        case 'room_type':
        case 'capacity':
          // Try finding a different room
          suggestions.push(...this.generateRoomChangeSuggestions(slot, rooms, allSlots));
          break;
          
        case 'schedule':
          // Try adjusting timing or suggest constraint relaxation
          suggestions.push(...this.generateScheduleAdjustmentSuggestions(slot, conflict));
          break;
      }
    }
    
    // Sort by success probability and impact
    return suggestions
      .sort((a, b) => {
        const scoreA = a.successProbability / (a.impactScore + 1);
        const scoreB = b.successProbability / (b.impactScore + 1);
        return scoreB - scoreA;
      })
      .slice(0, 5); // Return top 5 suggestions
  }
  
  private generateTimeMovesuggestions(
    slot: TimeSlot,
    allSlots: TimeSlot[],
    conflict: EnhancedConflict
  ): ResolutionSuggestion[] {
    const suggestions: ResolutionSuggestion[] = [];
    const timeOptions = ['08:00', '10:00', '13:00', '15:00'];
    
    // Try same day, different time
    for (const newTime of timeOptions) {
      if (newTime === slot.startTime) continue;
      
      if (this.isTimeSlotAvailable(slot, slot.dayOfWeek, newTime, allSlots)) {
        suggestions.push({
          id: `move-${slot.id}-time-${newTime}`,
          description: `Move to ${newTime} on ${this.getDayName(slot.dayOfWeek)}`,
          actions: [{
            type: 'move',
            targetSlotId: slot.id,
            newTime: newTime
          }],
          impactScore: Math.abs(parseInt(newTime) - parseInt(slot.startTime)) * 5,
          successProbability: 0.8
        });
      }
    }
    
    // Try different day, same time
    for (let day = 1; day <= 5; day++) {
      if (day === slot.dayOfWeek) continue;
      
      if (this.isTimeSlotAvailable(slot, day, slot.startTime, allSlots)) {
        suggestions.push({
          id: `move-${slot.id}-day-${day}`,
          description: `Move to ${this.getDayName(day)} at ${slot.startTime}`,
          actions: [{
            type: 'move',
            targetSlotId: slot.id,
            newTime: slot.startTime
          }],
          impactScore: 20,
          successProbability: 0.7
        });
      }
    }
    
    return suggestions;
  }
  
  private generateSwapSuggestions(
    slot: TimeSlot,
    allSlots: TimeSlot[],
    conflict: EnhancedConflict
  ): ResolutionSuggestion[] {
    const suggestions: ResolutionSuggestion[] = [];
    
    // Find compatible slots to swap with
    const compatibleSlots = allSlots.filter(s => 
      s.id !== slot.id &&
      s.facultyId !== slot.facultyId && // Different faculty
      s.roomId !== slot.roomId && // Different room
      !conflict.affectedSlots.includes(s.id) // Not involved in this conflict
    );
    
    for (const candidate of compatibleSlots) {
      // Check if swap would resolve the conflict
      if (this.wouldSwapResolveConflict(slot, candidate, allSlots)) {
        suggestions.push({
          id: `swap-${slot.id}-with-${candidate.id}`,
          description: `Swap time slots with another class`,
          actions: [{
            type: 'swap',
            targetSlotId: slot.id,
            swapWithSlotId: candidate.id
          }],
          impactScore: 30,
          successProbability: 0.6
        });
        
        if (suggestions.length >= 2) break; // Limit swap suggestions
      }
    }
    
    return suggestions;
  }
  
  private generateRoomChangeSuggestions(
    slot: TimeSlot,
    rooms: Room[],
    allSlots: TimeSlot[]
  ): ResolutionSuggestion[] {
    const suggestions: ResolutionSuggestion[] = [];
    
    // Find available rooms at the same time
    const occupiedRooms = allSlots
      .filter(s => 
        s.id !== slot.id &&
        s.dayOfWeek === slot.dayOfWeek &&
        this.timesOverlap(slot, s)
      )
      .map(s => s.roomId);
    
    const availableRooms = rooms.filter(r => 
      !occupiedRooms.includes(r.id) &&
      r.available !== false
    );
    
    // Prioritize rooms by type match and capacity
    const isLabCourse = slot.type === 'Lab';
    const sortedRooms = availableRooms.sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      
      // Type match
      if ((isLabCourse && a.type === 'Lab') || (!isLabCourse && a.type === 'Lecture')) scoreA += 50;
      if ((isLabCourse && b.type === 'Lab') || (!isLabCourse && b.type === 'Lecture')) scoreB += 50;
      
      // Capacity
      if (a.capacity >= 30) scoreA += 20;
      if (b.capacity >= 30) scoreB += 20;
      
      return scoreB - scoreA;
    });
    
    for (const room of sortedRooms.slice(0, 3)) {
      suggestions.push({
        id: `change-room-${slot.id}-to-${room.id}`,
        description: `Move to ${room.name} (${room.type}, capacity: ${room.capacity})`,
        actions: [{
          type: 'move',
          targetSlotId: slot.id,
          newRoom: room.id
        }],
        impactScore: 10,
        successProbability: 0.9
      });
    }
    
    return suggestions;
  }
  
  private generateScheduleAdjustmentSuggestions(
    slot: TimeSlot,
    conflict: EnhancedConflict
  ): ResolutionSuggestion[] {
    const suggestions: ResolutionSuggestion[] = [];
    
    // For schedule conflicts (back-to-back), suggest relaxing the constraint
    suggestions.push({
      id: `relax-constraint-${conflict.id}`,
      description: 'Accept back-to-back classes in different buildings',
      actions: [{
        type: 'relax',
        relaxConstraints: conflict.constraints.map(c => c.id)
      }],
      impactScore: 5,
      successProbability: 1.0
    });
    
    return suggestions;
  }
  
  private isTimeSlotAvailable(
    slot: TimeSlot,
    day: number,
    startTime: string,
    allSlots: TimeSlot[]
  ): boolean {
    const endTime = this.addHours(startTime, 2);
    
    return !allSlots.some(s => 
      s.id !== slot.id &&
      s.dayOfWeek === day &&
      (s.facultyId === slot.facultyId || s.roomId === slot.roomId) &&
      this.timesOverlap(
        { startTime, endTime } as any,
        { startTime: s.startTime, endTime: s.endTime } as any
      )
    );
  }
  
  private wouldSwapResolveConflict(
    slot1: TimeSlot,
    slot2: TimeSlot,
    allSlots: TimeSlot[]
  ): boolean {
    // Simulate the swap and check if it resolves conflicts
    const simulatedSlots = allSlots.map(s => {
      if (s.id === slot1.id) {
        return { ...s, dayOfWeek: slot2.dayOfWeek, startTime: slot2.startTime, endTime: slot2.endTime };
      }
      if (s.id === slot2.id) {
        return { ...s, dayOfWeek: slot1.dayOfWeek, startTime: slot1.startTime, endTime: slot1.endTime };
      }
      return s;
    });
    
    // Check if the swap creates new conflicts
    const slot1After = simulatedSlots.find(s => s.id === slot1.id)!;
    const slot2After = simulatedSlots.find(s => s.id === slot2.id)!;
    
    const hasNewConflicts = simulatedSlots.some(s => 
      s.id !== slot1After.id && s.id !== slot2After.id && (
        (s.facultyId === slot1After.facultyId && s.dayOfWeek === slot1After.dayOfWeek && 
         this.timesOverlap(s, slot1After)) ||
        (s.facultyId === slot2After.facultyId && s.dayOfWeek === slot2After.dayOfWeek && 
         this.timesOverlap(s, slot2After)) ||
        (s.roomId === slot1After.roomId && s.dayOfWeek === slot1After.dayOfWeek && 
         this.timesOverlap(s, slot1After)) ||
        (s.roomId === slot2After.roomId && s.dayOfWeek === slot2After.dayOfWeek && 
         this.timesOverlap(s, slot2After))
      )
    );
    
    return !hasNewConflicts;
  }
  
  async autoResolveConflicts(
    conflicts: EnhancedConflict[],
    timeSlots: TimeSlot[],
    options: {
      maxRelaxation?: number;
      preservePreferences?: boolean;
      allowPartialResolution?: boolean;
    } = {}
  ): Promise<ResolutionResult> {
    let workingSlots = [...timeSlots];
    let remainingConflicts = [...conflicts];
    const relaxedConstraints: string[] = [];
    let resolved = 0;
    
    // Sort conflicts by severity and score
    remainingConflicts.sort((a, b) => {
      if (a.severity !== b.severity) {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.conflictScore - a.conflictScore;
    });
    
    // Try to resolve each conflict
    for (const conflict of remainingConflicts) {
      if (!conflict.autoResolvable || conflict.resolved) continue;
      
      // Try each suggestion until one works
      let conflictResolved = false;
      for (const suggestion of conflict.resolutionSuggestions) {
        // Check if we can apply this suggestion
        if (suggestion.actions.some(a => a.type === 'relax')) {
          const constraintsToRelax = suggestion.actions
            .filter(a => a.type === 'relax')
            .flatMap(a => a.relaxConstraints || []);
          
          if (relaxedConstraints.length + constraintsToRelax.length > (options.maxRelaxation || 3)) {
            continue; // Skip if it would exceed relaxation limit
          }
        }
        
        // Apply the suggestion
        const result = this.applySuggestionToSlots(suggestion, workingSlots);
        if (result.success) {
          workingSlots = result.slots;
          resolved++;
          conflictResolved = true;
          
          // Track relaxed constraints
          suggestion.actions
            .filter(a => a.type === 'relax')
            .forEach(a => {
              if (a.relaxConstraints) {
                relaxedConstraints.push(...a.relaxConstraints);
              }
            });
          
          break;
        }
      }
      
      if (!conflictResolved && !options.allowPartialResolution) {
        // If we can't resolve a conflict and partial resolution is not allowed, stop
        break;
      }
    }
    
    return {
      success: resolved === conflicts.length,
      resolvedSlots: workingSlots,
      remainingConflicts: remainingConflicts.filter(c => !c.resolved),
      relaxedConstraints: [...new Set(relaxedConstraints)],
      successRate: resolved / conflicts.length
    };
  }
  
  private applySuggestionToSlots(
    suggestion: ResolutionSuggestion,
    slots: TimeSlot[]
  ): { success: boolean; slots: TimeSlot[] } {
    const updatedSlots = [...slots];
    
    try {
      for (const action of suggestion.actions) {
        switch (action.type) {
          case 'move':
            const moveIndex = updatedSlots.findIndex(s => s.id === action.targetSlotId);
            if (moveIndex !== -1) {
              if (action.newTime) {
                updatedSlots[moveIndex] = {
                  ...updatedSlots[moveIndex],
                  startTime: action.newTime,
                  endTime: this.addHours(action.newTime, 2)
                };
              }
              if (action.newRoom) {
                updatedSlots[moveIndex] = {
                  ...updatedSlots[moveIndex],
                  roomId: action.newRoom
                };
              }
            }
            break;
            
          case 'swap':
            const swap1Index = updatedSlots.findIndex(s => s.id === action.targetSlotId);
            const swap2Index = updatedSlots.findIndex(s => s.id === action.swapWithSlotId);
            
            if (swap1Index !== -1 && swap2Index !== -1) {
              const temp = {
                dayOfWeek: updatedSlots[swap1Index].dayOfWeek,
                startTime: updatedSlots[swap1Index].startTime,
                endTime: updatedSlots[swap1Index].endTime
              };
              
              updatedSlots[swap1Index] = {
                ...updatedSlots[swap1Index],
                dayOfWeek: updatedSlots[swap2Index].dayOfWeek,
                startTime: updatedSlots[swap2Index].startTime,
                endTime: updatedSlots[swap2Index].endTime
              };
              
              updatedSlots[swap2Index] = {
                ...updatedSlots[swap2Index],
                ...temp
              };
            }
            break;
            
          case 'relax':
            // Constraint relaxation is tracked separately
            break;
        }
      }
      
      return { success: true, slots: updatedSlots };
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      return { success: false, slots };
    }
  }
  
  // Helper methods
  private timesOverlap(slot1: { startTime: string; endTime: string }, slot2: { startTime: string; endTime: string }): boolean {
    const start1 = new Date(`2000-01-01T${slot1.startTime}`);
    const end1 = new Date(`2000-01-01T${slot1.endTime}`);
    const start2 = new Date(`2000-01-01T${slot2.startTime}`);
    const end2 = new Date(`2000-01-01T${slot2.endTime}`);
    return start1 < end2 && end1 > start2;
  }
  
  private getDayName(day: number): string {
    const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days[day] || '';
  }
  
  private addHours(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    const newHour = h + hours;
    return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}