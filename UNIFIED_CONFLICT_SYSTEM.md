# Unified Conflict Detection System

## Overview

This document describes the unified conflict detection system implemented to ensure consistency across all three types of time slot operations in the timetable system:

1. **Add Time Slot** - Regular scheduling of individual classes
2. **Joint Session** - Multiple courses taught together by one faculty member
3. **Split Class** - Single course divided into multiple groups with different schedules/resources

## Core Problem Solved

Previously, each operation had its own conflict logic, leading to inconsistencies. For example:
- If a faculty member had a regular class at 8:00 AM, Joint Sessions and Split Classes might not properly check for this conflict
- Different operations applied different conflict rules, causing scheduling conflicts

## Solution: Universal Conflict Detection

### Central Component: `UniversalConflictDetector`

Located in `services/conflictDetection.ts`, this class provides a single, comprehensive conflict detection system used by all three operations.

### Key Features

1. **Consistent Faculty Conflict Checking**
   - Faculty cannot be double-booked across any operation type
   - Considers ongoing regular classes, joint sessions, and split class groups

2. **Consistent Room Conflict Checking** 
   - Rooms cannot be double-booked across any operation type
   - Special handling for joint sessions (shared room) and split classes (different rooms per group)

3. **Smart Student Conflict Detection**
   - Students of the same year level cannot have overlapping mandatory classes
   - Special logic for split classes (students are divided) and joint sessions (students attend together)

4. **Operation-Specific Validation**
   - Each operation type has additional specific checks while maintaining universal consistency

## Implementation Details

### Universal Data Structure

All operations convert their form data to a standardized `UniversalTimeSlotData` format:

```typescript
interface UniversalTimeSlotData {
  // Core scheduling
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  academicYear: string;
  semester: number | string;
  yearLevel: string;
  
  // Resources
  facultyId?: string;
  roomId?: string;
  courseId?: string;
  departmentId?: string;
  
  // Operation context
  operation: 'add' | 'joint' | 'split';
  groupType?: GroupType;
  groupId?: string;
  
  // Operation-specific data
  splitGroups?: Array<{...}>;  // For split classes
  jointCourses?: string[];     // For joint sessions
}
```

### Conflict Checking Flow

1. **Basic Validation**
   - Time format validation
   - Required fields check
   - Time logic validation (end > start)

2. **Universal Conflict Checks** (Applied to all operations)
   - Faculty availability across all existing slots
   - Room availability across all existing slots
   - Student scheduling conflicts based on year level and department

3. **Operation-Specific Checks**
   - **Regular Add**: Standard single-slot conflicts
   - **Joint Session**: Multi-course validation, exclusive resource requirements
   - **Split Class**: Inter-group conflicts, resource distribution validation

4. **Suggestion Generation**
   - Alternative time slots
   - Resource alternatives
   - Operation-specific recommendations

## Usage in Forms

### Regular Time Slot Form
```typescript
import { checkTimeSlotConflicts } from '@/utils/conflictUtils';

const result = checkTimeSlotConflicts(
  formData,
  existingSlots,
  excludeSlotId,
  faculty,
  rooms,
  courses
);
```

### Joint Session Form  
```typescript
import { checkJointSessionConflicts } from '@/utils/conflictUtils';

const result = checkJointSessionConflicts(
  formData,
  existingSlots,
  faculty,
  rooms,
  courses
);
```

### Split Class Form
```typescript
import { checkSplitClassConflicts } from '@/utils/conflictUtils';

const result = checkSplitClassConflicts(
  formData,
  existingSlots, 
  faculty,
  rooms,
  courses
);
```

## Conflict Types and Severity

### Error Level Conflicts (Prevent Submission)
- Faculty double-booking
- Room double-booking  
- Student course conflicts (same course, same year level)
- Invalid time ranges

### Warning Level Conflicts (Allow with Confirmation)
- Unusual class durations
- Potential student conflicts (different courses, same year level)
- Room type mismatches

## Special Handling Cases

### Joint Sessions
- Multiple courses share the same time slot, faculty, and room
- Students from all included courses attend together
- Conflicts checked against all existing slots for the faculty and room
- Student conflicts checked for each course in the joint session

### Split Classes  
- Single course divided into multiple groups
- Each group can have different faculty, rooms, and/or times
- Conflicts checked for each group individually
- No student conflicts between groups (students are divided)
- Prevents conflicts with regular classes of the same course

### Cross-Operation Conflicts
- Regular classes conflict with joint sessions and split classes
- Joint sessions conflict with other joint sessions and split classes
- Split classes conflict with regular classes and joint sessions
- All operations respect faculty and room availability across the entire schedule

## Benefits

1. **Consistency**: All operations use the same conflict logic
2. **Reliability**: No scheduling conflicts slip through different validation systems
3. **Maintainability**: Single source of truth for conflict detection
4. **Extensibility**: Easy to add new conflict rules that apply universally
5. **User Experience**: Consistent error messages and suggestions across all forms

## Migration Notes

- Existing forms updated to use the new unified system
- Legacy conflict checking functions maintained for backward compatibility
- All three operation types now provide consistent conflict detection
- Form validation happens in real-time with immediate feedback

This unified system ensures that whether a user is adding a regular time slot, creating a joint session, or setting up split classes, the conflict detection will be thorough, consistent, and aware of all existing schedule commitments.
