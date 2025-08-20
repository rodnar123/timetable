import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Course, Department, Faculty, Room, TimeSlot, LessonType, GroupType } from '@/types/database';
import { SplitClassFormData, SplitClassGroup } from '@/types/forms';
import { getDayName } from '@/utils/helpers';
import { checkTimeSlotConflicts, ConflictCheckResult } from '@/utils/conflictUtils';
import { ConflictAlert } from '@/components/ConflictAlert';

interface SplitClassFormProps {
  formData: SplitClassFormData;
  setFormData: (data: SplitClassFormData) => void;
  departments: Department[];
  courses: Course[];
  faculty: Faculty[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  onConflictChange?: (result: ConflictCheckResult | null) => void;
}

export default function SplitClassForm({
  formData,
  setFormData,
  departments,
  courses,
  faculty,
  rooms,
  timeSlots,
  onConflictChange
}: SplitClassFormProps) {
  const [conflictResults, setConflictResults] = useState<Record<number, ConflictCheckResult | null>>({});
  const [overallConflictResult, setOverallConflictResult] = useState<ConflictCheckResult | null>(null);
  const lastCheckRef = useRef<string>('');
  
  // Simple memoization based on groups length and basic properties
  const memoizedGroups = useMemo(() => {
    return formData.groups || [];
  }, [formData.groups]);

  // Stable course getter
  const getCourse = useCallback((courseId: string) => {
    return courses.find(c => c.id === courseId);
  }, [courses]);

  // Stable conflict change callback
  const handleConflictChange = useCallback((result: ConflictCheckResult | null) => {
    if (onConflictChange) {
      onConflictChange(result);
    }
  }, [onConflictChange]);
  
  // Initialize default groups if none exist
  React.useEffect(() => {
    // Initialize empty groups if none exist
    if (!formData.groups || formData.groups.length === 0) {
      setFormData({
        ...formData,
        groups: [
          { name: 'Group A', roomId: '', facultyId: formData.facultyId, maxStudents: 30 },
          { name: 'Group B', roomId: '', facultyId: formData.facultyId, maxStudents: 30 }
        ]
      });
    }
  }, [formData.facultyId, formData.groups, setFormData]);

  // Check conflicts for all groups whenever relevant data changes
  React.useEffect(() => {
    // Create a checksum of all relevant data to avoid unnecessary recalculations
    const checksum = JSON.stringify({
      groups: memoizedGroups.map((g: SplitClassGroup) => ({ 
        roomId: g.roomId, 
        facultyId: g.facultyId,
        overrideTime: g.overrideTime,
        startTime: g.startTime,
        endTime: g.endTime
      })),
      courseId: formData.courseId,
      dayOfWeek: formData.dayOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
      facultyId: formData.facultyId,
      yearLevel: formData.yearLevel,
      academicYear: formData.academicYear,
      semester: formData.semester,
      groupId: formData.groupId
    });

    // If nothing has changed, skip the calculation
    if (checksum === lastCheckRef.current) {
      return;
    }
    lastCheckRef.current = checksum;

    if (!memoizedGroups || !formData.courseId || !formData.dayOfWeek) {
      setConflictResults({});
      setOverallConflictResult(null);
      handleConflictChange(null);
      return;
    }

    const course = getCourse(formData.courseId);
    if (!course) return;

    const newConflictResults: Record<number, ConflictCheckResult | null> = {};
    let hasAnyConflicts = false;
    let canProceed = true;

    memoizedGroups.forEach((group: SplitClassGroup, index: number) => {
      if (!group.roomId) {
        newConflictResults[index] = null;
        return;
      }

      // Create a representative slot for this group
      const groupSlot = {
        courseId: formData.courseId,
        facultyId: group.facultyId || formData.facultyId,
        roomId: group.roomId,
        dayOfWeek: formData.dayOfWeek,
        startTime: group.overrideTime ? group.startTime : formData.startTime,
        endTime: group.overrideTime ? group.endTime : formData.endTime,
        yearLevel: formData.yearLevel || course.yearLevel || 1,
        academicYear: formData.academicYear || '2025',
        semester: formData.semester || 1,
        groupType: GroupType.Split,
        groupId: formData.groupId,
        groupName: group.name
      };

      const result = checkTimeSlotConflicts(
        groupSlot,
        timeSlots,
        formData.originalTimeSlot?.id // Exclude original if splitting existing
      );

      newConflictResults[index] = result;
      if (result.hasConflicts) {
        hasAnyConflicts = true;
        if (!result.canProceed) {
          canProceed = false;
        }
      }
    });

    setConflictResults(newConflictResults);

    // Create overall result
    const overallResult: ConflictCheckResult = {
      hasConflicts: hasAnyConflicts,
      conflicts: Object.values(newConflictResults)
        .filter((result): result is ConflictCheckResult => result !== null)
        .flatMap(result => result.conflicts),
      canProceed: canProceed
    };

    setOverallConflictResult(overallResult);
    handleConflictChange(overallResult);
  }, [
    memoizedGroups,
    formData.courseId,
    formData.dayOfWeek,
    formData.startTime,
    formData.endTime,
    formData.facultyId,
    formData.yearLevel,
    formData.academicYear,
    formData.semester,
    formData.groupId,
    timeSlots,
    getCourse,
    handleConflictChange
  ]);

  const handleAddGroup = () => {
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const nextGroupIndex = formData.groups?.length || 0;
    const nextGroupName = nextGroupIndex < groupNames.length 
      ? `Group ${groupNames[nextGroupIndex]}`
      : `Group ${nextGroupIndex + 1}`;
    
    setFormData({
      ...formData,
      groups: [...(formData.groups || []), { 
        name: nextGroupName, 
        roomId: '', 
        facultyId: formData.facultyId, 
        maxStudents: 30 
      }]
    });
  };
  
  const handleRemoveGroup = (index: number) => {
    if ((formData.groups || []).length <= 2) {
      alert('You must have at least 2 groups for a class split.');
      return;
    }
    
    setFormData({
      ...formData,
      groups: formData.groups.filter((_: SplitClassGroup, i: number) => i !== index)
    });
  };
  
  const updateGroupField = (index: number, field: keyof SplitClassGroup, value: string | number | boolean) => {
    const updatedGroups = [...(formData.groups || [])];
    updatedGroups[index] = {
      ...updatedGroups[index],
      [field]: value
    };
    
    // If we're updating room or time, check for conflicts
    if (field === 'roomId' || field === 'startTime' || field === 'endTime') {
      const group = updatedGroups[index];
      const startTime = field === 'startTime' ? value : (group.startTime || formData.startTime);
      const endTime = field === 'endTime' ? value : (group.endTime || formData.endTime);
      const roomId = field === 'roomId' ? value : group.roomId;
      
      // Check if this group conflicts with other non-split classes
      if (roomId && startTime && endTime && formData.dayOfWeek) {
        // This would need access to existing time slots to check conflicts
        // For now, we'll add a warning message
        console.log('Group conflict check needed for:', { roomId, startTime, endTime });
      }
    }
    
    setFormData({
      ...formData,
      groups: updatedGroups
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Add course selection if no course is selected */}
      {!formData.courseId && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Course</label>
          <select
            value={formData.courseId || ''}
            onChange={(e) => {
              const courseId = e.target.value;
              const selectedCourse = courses.find(c => c.id === courseId);
              setFormData({
                ...formData,
                courseId,
                yearLevel: selectedCourse?.yearLevel || 1,
                departmentId: selectedCourse?.departmentId || ''
              });
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select a Course</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Course Information</h3>
        
        {/* Course details (read-only) */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Course</p>
              <p className="font-semibold">{getCourse(formData.courseId)?.code} - {getCourse(formData.courseId)?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Year Level</p>
              <p className="font-semibold">Year {formData.yearLevel}</p>
            </div>
          </div>
        </div>
        
        {/* Session details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Day</label>
            <select
              value={formData.dayOfWeek || 1}
              onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={!!formData.originalTimeSlot}
            >
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <option key={day} value={day}>{getDayName(day)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Lesson Type</label>
            <select
              value={formData.type || LessonType.Tutorial}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as LessonType })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {Object.values(LessonType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="time"
              value={formData.startTime || ''}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              disabled={!!formData.originalTimeSlot}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Time</label>
            <input
              type="time"
              value={formData.endTime || ''}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              disabled={!!formData.originalTimeSlot}
            />
          </div>
        </div>
      </div>
      
      {/* Groups configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-700">Groups Configuration</h3>
          <button
            type="button"
            onClick={handleAddGroup}
            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <Plus className="w-4 h-4" />
            Add Group
          </button>
        </div>
        
        <div className="space-y-4">
          {(formData.groups || []).map((group: SplitClassGroup, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800">
                  Group {index + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(index)}
                  className="text-red-600 hover:text-red-800"
                  disabled={(formData.groups || []).length <= 2}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Group Name</label>
                  <input
                    type="text"
                    value={group.name || ''}
                    onChange={(e) => updateGroupField(index, 'name', e.target.value)}
                    placeholder="e.g., Group A"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Students</label>
                  <input
                    type="number"
                    value={group.maxStudents || ''}
                    onChange={(e) => updateGroupField(index, 'maxStudents', parseInt(e.target.value))}
                    min="1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Room</label>
                <select
                  value={group.roomId || ''}
                  onChange={(e) => updateGroupField(index, 'roomId', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                >
                  <option value="">Select Room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} - Capacity: {room.capacity}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Faculty (Optional)</label>
                <select
                  value={group.facultyId || ''}
                  onChange={(e) => updateGroupField(index, 'facultyId', e.target.value || formData.facultyId)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Use Default Faculty</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.firstName} {f.lastName}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Optional time override section */}
              <div className="mt-4">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id={`override-time-${index}`}
                    checked={group.overrideTime || false}
                    onChange={(e) => updateGroupField(index, 'overrideTime', e.target.checked)}
                    className="rounded text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor={`override-time-${index}`} className="ml-2 text-sm text-gray-700">
                    Different time for this group
                  </label>
                </div>
                
                {group.overrideTime && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Time</label>
                      <input
                        type="time"
                        value={group.startTime || formData.startTime || ''}
                        onChange={(e) => updateGroupField(index, 'startTime', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Time</label>
                      <input
                        type="time"
                        value={group.endTime || formData.endTime || ''}
                        onChange={(e) => updateGroupField(index, 'endTime', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Real-time Conflict Display for Groups */}
      {Object.entries(conflictResults).map(([groupIndex, result]) => 
        result && result.hasConflicts ? (
          <div key={groupIndex} className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Conflicts for Group {parseInt(groupIndex) + 1}:
            </h4>
            <ConflictAlert result={result} />
          </div>
        ) : null
      )}
      
      {/* Overall Conflict Summary */}
      {overallConflictResult && overallConflictResult.hasConflicts && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-800 text-sm">Split Class Conflicts Detected</h4>
          <p className="text-sm text-amber-700 mt-1">
            {overallConflictResult.canProceed 
              ? 'Some warnings were found but you can still proceed.'
              : 'Critical conflicts must be resolved before proceeding.'
            }
          </p>
        </div>
      )}
      
      {/* Validation messages */}
      {(!formData.courseId || !formData.startTime || !formData.endTime || !formData.dayOfWeek) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
          <p className="text-sm text-red-600">Please fill in all required fields</p>
        </div>
      )}
      
      {(formData.groups || []).some((g: SplitClassGroup) => !g.roomId) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
          <p className="text-sm text-red-600">Each group needs to have a room assigned</p>
        </div>
      )}
    </div>
  );
}


