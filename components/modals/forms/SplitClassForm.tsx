import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Course, Department, Faculty, Room, TimeSlot, LessonType, GroupType } from '@/types/database';
import { SplitClassFormData, SplitClassGroup } from '@/types/forms';
import { getDayName } from '@/utils/helpers';
import { checkSplitClassConflicts, ConflictCheckResult } from '@/utils/conflictUtils';
import { ConflictAlert } from '@/components/ConflictAlert';
import { ValidationError, validateSplitClassForm } from '@/utils/formValidation';
import { useFormValidation } from '@/hooks/useFormValidation';

interface SplitClassFormProps {
  formData: SplitClassFormData;
  setFormData: (data: SplitClassFormData) => void;
  departments: Department[];
  courses: Course[];
  faculty: Faculty[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  onConflictChange?: (result: ConflictCheckResult | null) => void;
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
}

export default function SplitClassForm({
  formData,
  setFormData,
  departments,
  courses,
  faculty,
  rooms,
  timeSlots,
  onConflictChange,
  onValidationChange
}: SplitClassFormProps) {
  const [conflictResults, setConflictResults] = useState<Record<number, ConflictCheckResult | null>>({});
  
  // Use validation hook
  const { isValid, validationErrors, hasFieldError, getFieldError } = useFormValidation({
    validateFn: validateSplitClassForm,
    formData,
    onValidationChange
  });
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

    // Use the new split class conflict checker
    const overallResult = checkSplitClassConflicts(
      formData,
      timeSlots,
      faculty,
      rooms,
      courses
    );

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
    formData.departmentId,
    timeSlots,
    getCourse,
    handleConflictChange,
    faculty,
    rooms,
    courses
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
      {/* Information about Split Classes */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg shadow-sm mb-6">
        <h3 className="font-medium text-green-800">About Split Classes</h3>
        <p className="text-sm text-green-700 mt-1">
          Split classes divide a single course into multiple groups with different faculty, rooms, or times.
          This is useful for managing large classes or providing specialized instruction.
        </p>
        <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-600">
          <strong>Note:</strong> Each group within the same split class will not conflict with each other, 
          but will be checked against all existing schedules for conflicts.
        </div>
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <strong>🔄 Cross-Visibility Conflict Detection:</strong> Each group is checked against existing schedules from:
          <ul className="mt-1 ml-4 list-disc">
            <li><strong>Regular Time Slots</strong> - Prevents conflicts with individual class sessions</li>
            <li><strong>Joint Sessions</strong> - Ensures no conflicts with joint classes</li>
            <li><strong>Other Split Classes</strong> - Avoids conflicts with existing split groups</li>
            <li>Per-group faculty availability across all session types</li>
            <li>Per-group room availability across all session types</li>
          </ul>
          <div className="mt-1 text-blue-600 font-medium">
            ✨ Complete visibility across Add Time Slot, Joint Session, and Split Class systems!
          </div>
        </div>
      </div>

      {/* Smart Course Selection */}
      {!formData.courseId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Course to Split <span className="text-red-500">*</span>
          </label>
          <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            💡 Choose a course that has many students and would benefit from being split into smaller groups
          </div>
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
            <option value="">Select a Course to Split</option>
            {courses
              .sort((a, b) => `${a.yearLevel}-${a.code}`.localeCompare(`${b.yearLevel}-${b.code}`))
              .map(course => (
                <option key={course.id} value={course.id}>
                  Year {course.yearLevel} - {course.code} - {course.name} 
                  {course.credits && ` (${course.credits} credits)`}
                </option>
              ))
            }
          </select>
        </div>
      )}
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Course Information</h3>
        
        {/* Enhanced Course details display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-blue-600">Course</p>
              <p className="font-semibold text-blue-800">{getCourse(formData.courseId)?.code} - {getCourse(formData.courseId)?.name}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Year Level</p>
              <p className="font-semibold text-blue-800">Year {formData.yearLevel}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Credits</p>
              <p className="font-semibold text-blue-800">{getCourse(formData.courseId)?.credits || 3} credits</p>
            </div>
          </div>
          {getCourse(formData.courseId)?.description && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-blue-600">Course Description</p>
              <p className="text-sm text-blue-700 mt-1">{getCourse(formData.courseId)?.description}</p>
            </div>
          )}
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
      
      {/* Enhanced Groups configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Groups Configuration</h3>
            <p className="text-sm text-gray-500 mt-1">Configure individual groups for the split class</p>
          </div>
          <button
            type="button"
            onClick={handleAddGroup}
            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Group
          </button>
        </div>
        
        {/* Groups Overview */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Groups: <strong>{(formData.groups || []).length}</strong></span>
            <span className="text-gray-600">
              Total Capacity: <strong>
                {(formData.groups || []).reduce((sum, g) => sum + (g.maxStudents || 0), 0)} students
              </strong>
            </span>
          </div>
        </div>
        
        <div className="space-y-4">
          {(formData.groups || []).map((group: SplitClassGroup, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800 flex items-center gap-2">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                    Group {index + 1}
                  </span>
                  {group.name && group.name !== `Group ${index + 1}` && (
                    <span className="text-gray-600">- {group.name}</span>
                  )}
                </h4>
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(index)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                  disabled={(formData.groups || []).length <= 2}
                  title="Remove Group"
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
                    placeholder={`e.g., Group ${String.fromCharCode(65 + index)}`}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Max Students
                    <span className="text-xs text-gray-500 ml-1">(recommended: 25-35)</span>
                  </label>
                  <input
                    type="number"
                    value={group.maxStudents || ''}
                    onChange={(e) => updateGroupField(index, 'maxStudents', parseInt(e.target.value))}
                    min="1"
                    max="100"
                    placeholder="30"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Assignment <span className="text-red-500">*</span>
                </label>
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  💡 Each group needs its own room. Choose rooms with appropriate capacity.
                </div>
                <select
                  value={group.roomId || ''}
                  onChange={(e) => updateGroupField(index, 'roomId', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                >
                  <option value="">Select Room for {group.name}</option>
                  {rooms
                    .filter(room => room.available)
                    .sort((a, b) => b.capacity - a.capacity)
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.code} - {room.name} (Cap: {room.capacity}) {room.type && `[${room.type}]`}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Faculty Assignment
                  <span className="text-xs text-gray-500 ml-1">(optional - defaults to main faculty)</span>
                </label>
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  💡 You can assign different faculty to each group or use the same faculty for all groups.
                </div>
                <select
                  value={group.facultyId || ''}
                  onChange={(e) => updateGroupField(index, 'facultyId', e.target.value || formData.facultyId)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Use Default Faculty ({
                    faculty.find(f => f.id === formData.facultyId)?.firstName 
                    + ' ' + 
                    faculty.find(f => f.id === formData.facultyId)?.lastName 
                    || 'Not selected'
                  })</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} {f.firstName} {f.lastName} {f.specialization && `(${f.specialization})`}
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


