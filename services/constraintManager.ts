// services/constraintManager.ts

import { Constraint } from '@/types/conflicts';
import { TimeSlot, Faculty, Room, Course } from '@/types/database';

export class ConstraintManager {
  private constraints: Map<string, Constraint> = new Map();
  private dynamicConstraints: Set<string> = new Set();
  
  constructor() {
    this.initializeDefaultConstraints();
  }
  
  private initializeDefaultConstraints() {
    // Hard constraints (cannot be violated)
    this.addConstraint({
      id: 'no-room-overlap',
      type: 'hard',
      category: 'room',
      description: 'No two classes in same room at same time',
      importance: 1000,
      canRelax: false,
      relaxationPenalty: Infinity
    });
    
    this.addConstraint({
      id: 'no-faculty-overlap',
      type: 'hard',
      category: 'faculty',
      description: 'Faculty cannot teach two classes simultaneously',
      importance: 1000,
      canRelax: false,
      relaxationPenalty: Infinity
    });
    
    this.addConstraint({
      id: 'no-student-overlap',
      type: 'hard',
      category: 'student',
      description: 'Students cannot attend two classes simultaneously',
      importance: 1000,
      canRelax: false,
      relaxationPenalty: Infinity
    });
    
    // Soft constraints (can be relaxed with penalty)
    this.addConstraint({
      id: 'room-type-match',
      type: 'soft',
      category: 'resource',
      description: 'Room type should match course type',
      importance: 500,
      canRelax: true,
      relaxationPenalty: 200
    });
    
    this.addConstraint({
      id: 'room-capacity',
      type: 'soft',
      category: 'resource',
      description: 'Room capacity should be adequate',
      importance: 400,
      canRelax: true,
      relaxationPenalty: 150
    });
    
    this.addConstraint({
      id: 'building-distance',
      type: 'soft',
      category: 'faculty',
      description: 'Minimize travel between buildings',
      importance: 200,
      canRelax: true,
      relaxationPenalty: 50
    });
    
    this.addConstraint({
      id: 'faculty-workload',
      type: 'soft',
      category: 'faculty',
      description: 'Balance faculty workload',
      importance: 300,
      canRelax: true,
      relaxationPenalty: 100
    });
  }
  
  addConstraint(constraint: Constraint) {
    this.constraints.set(constraint.id, constraint);
    if (constraint.id.startsWith('pref-') || constraint.id.startsWith('dynamic-')) {
      this.dynamicConstraints.add(constraint.id);
    }
  }
  
  removeConstraint(id: string) {
    this.constraints.delete(id);
    this.dynamicConstraints.delete(id);
  }
  
  getConstraint(id: string): Constraint | undefined {
    return this.constraints.get(id);
  }
  
  getAllConstraints(): Constraint[] {
    return Array.from(this.constraints.values());
  }
  
  clearDynamicConstraints() {
    this.dynamicConstraints.forEach(id => {
      this.constraints.delete(id);
    });
    this.dynamicConstraints.clear();
  }
  
  evaluateConstraint(
    constraintId: string,
    context: {
      slot?: TimeSlot;
      faculty?: Faculty;
      room?: Room;
      course?: Course;
      allSlots?: TimeSlot[];
    }
  ): {
    satisfied: boolean;
    penalty: number;
    details?: string;
  } {
    const constraint = this.constraints.get(constraintId);
    if (!constraint) {
      return { satisfied: true, penalty: 0 };
    }
    
    // Implement specific constraint evaluation logic
    switch (constraintId) {
      case 'no-room-overlap':
        if (context.slot && context.allSlots) {
          const hasOverlap = context.allSlots.some(s => 
            s.id !== context.slot!.id &&
            s.roomId === context.slot!.roomId &&
            s.dayOfWeek === context.slot!.dayOfWeek &&
            this.timesOverlap(
              context.slot!.startTime,
              context.slot!.endTime,
              s.startTime,
              s.endTime
            )
          );
          return {
            satisfied: !hasOverlap,
            penalty: hasOverlap ? Infinity : 0,
            details: hasOverlap ? 'Room is already occupied at this time' : undefined
          };
        }
        break;
        
      case 'room-type-match':
        if (context.slot && context.room && context.course) {
          const isLab = context.course.name.toLowerCase().includes('lab');
          const isMatch = (isLab && context.room.type === 'Lab') || 
                         (!isLab && context.room.type === 'Lecture');
          return {
            satisfied: isMatch,
            penalty: isMatch ? 0 : constraint.relaxationPenalty,
            details: !isMatch ? `${context.course.name} requires ${isLab ? 'Lab' : 'Lecture'} room` : undefined
          };
        }
        break;
        
      // Add more constraint evaluations as needed
    }
    
    return { satisfied: true, penalty: 0 };
  }
  
  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const s1 = new Date(`2000-01-01T${start1}`);
    const e1 = new Date(`2000-01-01T${end1}`);
    const s2 = new Date(`2000-01-01T${start2}`);
    const e2 = new Date(`2000-01-01T${end2}`);
    return s1 < e2 && e1 > s2;
  }
  
  // Calculate total constraint violation score for a timetable
  calculateTotalViolationScore(
    timeSlots: TimeSlot[],
    faculty: Faculty[],
    rooms: Room[],
    courses: Course[]
  ): number {
    let totalScore = 0;
    
    for (const slot of timeSlots) {
      const slotFaculty = faculty.find(f => f.id === slot.facultyId);
      const slotRoom = rooms.find(r => r.id === slot.roomId);
      const slotCourse = courses.find(c => c.id === slot.courseId);
      
      for (const constraint of this.constraints.values()) {
        const result = this.evaluateConstraint(constraint.id, {
          slot,
          faculty: slotFaculty,
          room: slotRoom,
          course: slotCourse,
          allSlots: timeSlots
        });
        
        if (!result.satisfied) {
          totalScore += result.penalty;
        }
      }
    }
    
    return totalScore;
  }
}