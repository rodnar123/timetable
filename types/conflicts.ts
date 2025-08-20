// types/conflicts.ts

import { Conflict, TimeSlot, GroupType } from "./database";

export interface Constraint {
  id: string;
  type: 'hard' | 'soft';
  category: 'room' | 'faculty' | 'course' | 'student' | 'preference' | 'resource';
  description: string;
  importance: number; // 1-1000, higher = more important
  canRelax: boolean;
  relaxationPenalty: number;
}

export interface ResolutionSuggestion {
  id: string;
  description: string;
  actions: ResolutionAction[];
  impactScore: number;
  successProbability: number;
}

export interface ResolutionAction {
  type: 'move' | 'swap' | 'split' | 'merge' | 'relax' | 'cancel';
  targetSlotId?: string;
  swapWithSlotId?: string;
  newTime?: string;
  newRoom?: string;
  newFaculty?: string;
  relaxConstraints?: string[];
}

export interface EnhancedConflict extends Conflict {
  constraints: Constraint[];
  resolutionSuggestions: ResolutionSuggestion[];
  conflictScore: number;
  autoResolvable: boolean;
}

export interface ResolutionResult {
  success: boolean;
  resolvedSlots: TimeSlot[];
  remainingConflicts: EnhancedConflict[];
  relaxedConstraints: string[];
  successRate: number;
}

// Add function to check if slots are part of a joint session
export const areInJointSession = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  // If they have the same groupId and groupType is Joint, they're part of a joint session
  return slot1.groupType === GroupType.Joint &&
         slot2.groupType === GroupType.Joint &&
         slot1.groupId !== undefined &&
         slot1.groupId === slot2.groupId;
};

// Add function to check if slots are part of a split class
export const areInSplitGroup = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  // If they have the same groupId and groupType is Split, they're part of a split class
  return slot1.groupType === GroupType.Split &&
         slot2.groupType === GroupType.Split &&
         slot1.groupId !== undefined &&
         slot1.groupId === slot2.groupId;
};

// Add to existing conflict detection logic
export const shouldIgnoreConflict = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  // Ignore conflicts between slots that are part of the same joint session
  if (areInJointSession(slot1, slot2)) {
    return true;
  }
  
  // Always check for conflicts between split groups of the same class
  // (they should be able to occur at the same time in different rooms)
  if (areInSplitGroup(slot1, slot2)) {
    return true;
  }
  
  return false;
};