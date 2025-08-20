import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Clock } from 'lucide-react';
import { Course, Department, Faculty, Room, TimeSlot, LessonType, GroupType } from '@/types/database';
import { getDayName } from '@/utils/helpers';
import { checkTimeSlotConflicts, ConflictCheckResult } from '@/utils/conflictUtils';
import { ConflictAlert } from '@/components/ConflictAlert';

interface JointSessionFormProps {
  formData: any;
  setFormData: (data: any) => void;
  departments: Department[];
  courses: Course[];
  faculty: Faculty[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  onConflictChange?: (result: ConflictCheckResult | null) => void;
}

export default function JointSessionForm({
  formData,
  setFormData,
  departments,
  courses,
  faculty,
  rooms,
  timeSlots,
  onConflictChange
}: JointSessionFormProps) {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);
  
  // Initialize form data if needed
  useEffect(() => {
    // Ensure form has required fields
    const initializedData = {
      ...formData,
      courses: formData.courses || [],
      dayOfWeek: formData.dayOfWeek || 1,
      groupId: formData.groupId || `joint-${Date.now()}` // Ensure there's always a groupId
    };
    
    // Only update if we need to
    if (JSON.stringify(initializedData) !== JSON.stringify(formData)) {
      console.log('Initializing joint session form data:', initializedData);
      setFormData(initializedData);
    }
  }, []);
  
  // When editing, load all courses with this groupId
  useEffect(() => {
    // Only run this for edit mode (when we have a groupId)
    if (formData.groupId && !formData.coursesLoaded) {
      const groupTimeSlots = timeSlots.filter(slot => 
        slot.groupId === formData.groupId
      );
      
      if (groupTimeSlots.length > 0) {
        const courseIds = groupTimeSlots.map(slot => slot.courseId);
        console.log('Loading courses for existing joint session:', courseIds);
        
        // Get values from first timeslot for common fields
        const firstSlot = groupTimeSlots[0];
        
        setFormData({
          ...formData,
          courses: courseIds,
          facultyId: formData.facultyId || firstSlot.facultyId,
          roomId: formData.roomId || firstSlot.roomId,
          dayOfWeek: formData.dayOfWeek || firstSlot.dayOfWeek,
          startTime: formData.startTime || firstSlot.startTime,
          endTime: formData.endTime || firstSlot.endTime,
          type: formData.type || firstSlot.type,
          coursesLoaded: true // Mark as loaded to prevent infinite loop
        });
      }
    }
  }, [formData.groupId, timeSlots]);
  
  // Validate time inputs and check for conflicts
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      if (formData.endTime <= formData.startTime) {
        setTimeError('End time must be after start time');
        setConflictResult(null);
      } else {
        setTimeError(null);
        
        // Check for conflicts if we have all required data
        if (formData.facultyId && formData.roomId && formData.dayOfWeek && formData.courses?.length > 0) {
          // For joint sessions, we check conflicts for each course separately
          // but we'll create a representative slot for conflict checking
          const representativeSlot = {
            ...formData,
            courseId: formData.courses[0], // Use first course as representative
            yearLevel: courses.find(c => c.id === formData.courses[0])?.yearLevel || 1,
            academicYear: formData.academicYear || '2025',
            semester: formData.semester || 1,
            groupType: GroupType.Joint,
            groupId: formData.groupId
          };
          
          const result = checkTimeSlotConflicts(
            representativeSlot,
            timeSlots,
            formData.id // Exclude current slot if editing
          );
          setConflictResult(result);
          onConflictChange?.(result);
        } else {
          setConflictResult(null);
          onConflictChange?.(null);
        }
      }
    } else {
      setTimeError(null);
      setConflictResult(null);
    }
  }, [
    formData.startTime,
    formData.endTime,
    formData.facultyId,
    formData.roomId,
    formData.dayOfWeek,
    formData.courses,
    formData.academicYear,
    formData.semester,
    formData.groupId,
    timeSlots,
    courses
  ]);
  
  const handleAddCourse = () => {
    if (!selectedCourse || formData.courses?.includes(selectedCourse)) return;
    
    // Get the course being added
    const courseToAdd = getCourse(selectedCourse);
    if (!courseToAdd) return;
    
    // Validate compatibility with existing courses
    if (formData.courses && formData.courses.length > 0) {
      const existingCourses = formData.courses
        .map((id: string) => getCourse(id))
        .filter((course: any): course is Course => course !== undefined);
      
      // Check if all courses are for the same year level
      const yearLevels = new Set([...existingCourses.map((c: Course) => c.yearLevel), courseToAdd.yearLevel]);
      if (yearLevels.size > 1) {
        alert(`Cannot add ${courseToAdd.name} - all courses in a joint session must be for the same year level. Current year levels: ${Array.from(yearLevels).join(', ')}`);
        return;
      }
      
      // Check if all courses are from the same department (optional warning)
      const departments = new Set([...existingCourses.map((c: Course) => c.departmentId), courseToAdd.departmentId]);
      if (departments.size > 1) {
        const confirmMessage = `Warning: ${courseToAdd.name} is from a different department than existing courses. Joint sessions typically involve courses from the same department. Continue anyway?`;
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }
    }
    
    setFormData({
      ...formData,
      courses: [...(formData.courses || []), selectedCourse]
    });
    setSelectedCourse('');
  };
  
  const handleRemoveCourse = (courseId: string) => {
    setFormData({
      ...formData,
      courses: formData.courses.filter((id: string) => id !== courseId)
    });
  };
  
  const getCourse = (courseId: string) => courses.find(c => c.id === courseId);
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-lg shadow-sm mb-6">
        <h3 className="font-medium text-purple-800">About Joint Sessions</h3>
        <p className="text-sm text-purple-700 mt-1">
          Joint sessions allow multiple courses to share the same time slot, faculty, and room.
          This is useful for courses that need to be taught together or combined classes.
        </p>
        <div className="mt-2 p-2 bg-purple-100 rounded text-xs text-purple-600">
          <strong>Note:</strong> Joint sessions will not trigger conflicts for room, faculty, or time sharing 
          between the selected courses since they are intentionally scheduled together.
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Day of Week <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.dayOfWeek || 1}
            onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {[1, 2, 3, 4, 5, 6, 7].map(day => (
              <option key={day} value={day}>{getDayName(day)}</option>
            ))}
          </select>
        </div>
        
        {/* Time Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.startTime || ''}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className={`w-full px-4 py-2 border ${timeError ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.endTime || ''}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className={`w-full px-4 py-2 border ${timeError ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              required
            />
          </div>
          {timeError && (
            <div className="col-span-2 flex items-center text-red-600 text-sm mt-1">
              <Clock className="w-4 h-4 mr-1" />
              {timeError}
            </div>
          )}
        </div>
        
        {/* Faculty selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Faculty <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.facultyId || ''}
            onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Faculty</option>
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.firstName} {f.lastName}
              </option>
            ))}
          </select>
        </div>
        
        {/* Room selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.roomId || ''}
            onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        
        {/* Lesson type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lesson Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.type || LessonType.Lecture}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {Object.values(LessonType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        
        {/* Courses selection */}
        <div className="mt-6">
          <h3 className="text-md font-medium text-gray-800 mb-4">Courses in this Joint Session</h3>
          
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Course <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option 
                      key={course.id} 
                      value={course.id}
                      disabled={(formData.courses || []).includes(course.id)}
                    >
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddCourse}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedCourse}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* List of selected courses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Selected Courses</label>
              {(!formData.courses || formData.courses.length === 0) ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">No courses selected. Please add at least one course.</p>
                </div>
              ) : (
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {formData.courses.map((courseId: string) => {
                    const course = getCourse(courseId);
                    return course ? (
                      <div key={courseId} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <span className="text-sm font-medium">
                          {course.code} - {course.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCourse(courseId)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Real-time Conflict Display */}
      {conflictResult && conflictResult.hasConflicts && (
        <div className="mt-4">
          <ConflictAlert result={conflictResult} />
        </div>
      )}
      
      {/* Validation errors */}
      {(!formData.facultyId || !formData.roomId || !formData.courses?.length || !formData.startTime || !formData.endTime || timeError || (conflictResult && !conflictResult.canProceed)) && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 text-sm">Please resolve the following issues:</p>
            <ul className="mt-1 text-sm text-red-700 list-disc pl-5">
              {!formData.facultyId && <li>Select a faculty member</li>}
              {!formData.roomId && <li>Select a room</li>}
              {!formData.courses?.length && <li>Add at least one course</li>}
              {!formData.startTime && <li>Set a start time</li>}
              {!formData.endTime && <li>Set an end time</li>}
              {timeError && <li>{timeError}</li>}
              {conflictResult && !conflictResult.canProceed && <li>Resolve conflicts before proceeding</li>}
            </ul>
            {formData.courses?.length > 0 && (!conflictResult || conflictResult.canProceed) && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-600">
                <strong>Joint Session Preview:</strong> {formData.courses.length} courses will share 
                the same {formData.facultyId ? 'faculty, ' : ''}
                {formData.roomId ? 'room, ' : ''}
                and time slot without conflicts.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

