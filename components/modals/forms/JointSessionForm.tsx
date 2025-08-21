import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Clock } from 'lucide-react';
import { Course, Department, Faculty, Room, TimeSlot, LessonType, GroupType } from '@/types/database';
import { getDayName } from '@/utils/helpers';
import { checkJointSessionConflicts, ConflictCheckResult } from '@/utils/conflictUtils';
import { ConflictAlert } from '@/components/ConflictAlert';
import { ValidationError, validateJointSessionForm } from '@/utils/formValidation';
import { useFormValidation } from '@/hooks/useFormValidation';

interface JointSessionFormProps {
  formData: any;
  setFormData: (data: any) => void;
  departments: Department[];
  courses: Course[];
  faculty: Faculty[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  onConflictChange?: (result: ConflictCheckResult | null) => void;
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
}

export default function JointSessionForm({
  formData,
  setFormData,
  departments,
  courses,
  faculty,
  rooms,
  timeSlots,
  onConflictChange,
  onValidationChange
}: JointSessionFormProps) {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);
  
  // Use validation hook
  const { isValid, validationErrors, hasFieldError, getFieldError } = useFormValidation({
    validateFn: validateJointSessionForm,
    formData,
    onValidationChange
  });
  
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
          // Use the new joint session conflict checker
          const result = checkJointSessionConflicts(
            formData,
            timeSlots,
            faculty,
            rooms,
            courses
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
    formData.yearLevel,
    formData.departmentId,
    timeSlots,
    courses,
    faculty,
    rooms,
    onConflictChange
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
        alert(`❌ Cannot add ${courseToAdd.code} - ${courseToAdd.name}:\n\nAll courses in a joint session must be for the same year level.\n\nCurrent courses are for Year ${Array.from(yearLevels).join(', ')}.\n\n💡 Tip: Look for courses with Year ${existingCourses[0].yearLevel} to maintain compatibility.`);
        return;
      }
      
      // Enhanced department compatibility check
      const departments = new Set([...existingCourses.map((c: Course) => c.departmentId), courseToAdd.departmentId]);
      if (departments.size > 1) {
        // Get department names for better user experience
        const existingDeptIds = [...new Set(existingCourses.map((c: Course) => c.departmentId))];
        const confirmMessage = `⚠️ Cross-Department Joint Session Detected\n\n` +
          `"${courseToAdd.code} - ${courseToAdd.name}" is from a different department than existing courses.\n\n` +
          `Joint sessions typically involve courses from the same department for better student flow and resource management.\n\n` +
          `Continue with this interdisciplinary joint session?`;
        
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }
      
      // Auto-populate year level and department if this is the first course
      if (formData.courses.length === 0) {
        setFormData({
          ...formData,
          yearLevel: courseToAdd.yearLevel,
          departmentId: courseToAdd.departmentId,
          courses: [...(formData.courses || []), selectedCourse]
        });
      } else {
        setFormData({
          ...formData,
          courses: [...(formData.courses || []), selectedCourse]
        });
      }
    } else {
      // First course - set year level and department automatically
      setFormData({
        ...formData,
        yearLevel: courseToAdd.yearLevel,
        departmentId: courseToAdd.departmentId,
        courses: [...(formData.courses || []), selectedCourse]
      });
    }
    
    setSelectedCourse('');
  };
  
  const handleRemoveCourse = (courseId: string) => {
    setFormData({
      ...formData,
      courses: formData.courses.filter((id: string) => id !== courseId)
    });
  };
  
  const getCourse = (courseId: string) => courses.find(c => c.id === courseId);
  
  // Smart course filtering for better user experience
  const getAvailableCourses = () => {
    if (!formData.courses || formData.courses.length === 0) {
      // No courses selected yet, show all courses
      return courses;
    }
    
    // Get the first course to determine compatibility requirements
    const firstCourse = getCourse(formData.courses[0]);
    if (!firstCourse) return courses;
    
    // Filter courses that are compatible (same year level)
    return courses.filter(course => {
      // Don't show already selected courses
      if (formData.courses.includes(course.id)) return false;
      
      // Must be same year level
      if (course.yearLevel !== firstCourse.yearLevel) return false;
      
      return true;
    });
  };
  
  const getRecommendedCourses = () => {
    const available = getAvailableCourses();
    if (!formData.courses || formData.courses.length === 0) return [];
    
    const firstCourse = getCourse(formData.courses[0]);
    if (!firstCourse) return [];
    
    // Prioritize courses from the same department
    return available.filter(course => course.departmentId === firstCourse.departmentId);
  };
  
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
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <strong>🔄 Cross-Visibility Conflict Detection:</strong> The system checks against existing schedules from:
          <ul className="mt-1 ml-4 list-disc">
            <li><strong>Regular Time Slots</strong> - Prevents conflicts with individual class sessions</li>
            <li><strong>Other Joint Sessions</strong> - Avoids overlapping with existing joint classes</li>
            <li><strong>Split Classes</strong> - Ensures no conflicts with split class groups</li>
            <li>Faculty availability across all session types</li>
            <li>Room availability across all session types</li>
          </ul>
          <div className="mt-1 text-blue-600 font-medium">
            ✨ Full visibility across Add Time Slot, Joint Session, and Split Class records!
          </div>
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
          <h3 className="text-md font-medium text-gray-800 mb-4">
            Courses in this Joint Session
            {formData.courses && formData.courses.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                {formData.courses.length} course{formData.courses.length === 1 ? '' : 's'} selected
              </span>
            )}
          </h3>
          
          <div className="space-y-4">
            {/* Course Requirements Banner */}
            {formData.courses && formData.courses.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Compatibility Requirements:</span>
                    <span className="text-blue-600 ml-1">
                      Year {getCourse(formData.courses[0])?.yearLevel} courses only
                    </span>
                  </div>
                  {getRecommendedCourses().length > 0 && (
                    <div className="text-xs text-blue-600">
                      💡 {getRecommendedCourses().length} recommended course{getRecommendedCourses().length === 1 ? '' : 's'} available
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Course <span className="text-red-500">*</span>
                  {formData.courses && formData.courses.length === 0 && (
                    <span className="text-xs text-gray-500 ml-1">(At least 2 courses required for joint session)</span>
                  )}
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Course</option>
                  
                  {/* Recommended courses first (same department) */}
                  {getRecommendedCourses().length > 0 && (
                    <>
                      <optgroup label="🌟 Recommended (Same Department)">
                        {getRecommendedCourses().map((course) => (
                          <option 
                            key={course.id} 
                            value={course.id}
                            disabled={(formData.courses || []).includes(course.id)}
                          >
                            {course.code} - {course.name}
                          </option>
                        ))}
                      </optgroup>
                    </>
                  )}
                  
                  {/* Other compatible courses */}
                  {getAvailableCourses().filter(course => 
                    formData.courses && formData.courses.length > 0 ? 
                    !getRecommendedCourses().some(rec => rec.id === course.id) : 
                    true
                  ).length > 0 && (
                    <>
                      <optgroup label={formData.courses && formData.courses.length > 0 ? "⚠️  Other Compatible Courses" : "📚 All Courses"}>
                        {getAvailableCourses()
                          .filter(course => 
                            formData.courses && formData.courses.length > 0 ? 
                            !getRecommendedCourses().some(rec => rec.id === course.id) : 
                            true
                          )
                          .map((course) => (
                            <option 
                              key={course.id} 
                              value={course.id}
                              disabled={(formData.courses || []).includes(course.id)}
                            >
                              {course.code} - {course.name}
                              {formData.courses && formData.courses.length > 0 && 
                               course.departmentId !== getCourse(formData.courses[0])?.departmentId && 
                               ' (Different Dept)'}
                            </option>
                          ))
                        }
                      </optgroup>
                    </>
                  )}
                </select>
                
                {/* Helpful tips for course selection */}
                {formData.courses && formData.courses.length === 1 && (
                  <div className="mt-1 text-xs text-gray-500">
                    💡 Select courses that complement each other or can be taught together effectively
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddCourse}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!selectedCourse}
                title={!selectedCourse ? "Select a course first" : "Add course to joint session"}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* List of selected courses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Courses
                {formData.courses && formData.courses.length >= 2 && (
                  <span className="ml-2 text-green-600 text-xs">✅ Minimum requirement met</span>
                )}
                {formData.courses && formData.courses.length === 1 && (
                  <span className="ml-2 text-orange-600 text-xs">⚠️  Need at least 1 more course</span>
                )}
              </label>
              
              {(!formData.courses || formData.courses.length === 0) ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">
                    📚 No courses selected yet. 
                    <br />
                    <span className="text-xs text-gray-400 mt-1 block">
                      Joint sessions require at least 2 courses to be effective.
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {formData.courses.map((courseId: string, index: number) => {
                    const course = getCourse(courseId);
                    const isFirstCourse = index === 0;
                    return course ? (
                      <div key={courseId} className={`flex items-center justify-between p-3 rounded-lg border ${
                        isFirstCourse ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              isFirstCourse ? 'text-blue-800' : 'text-green-800'
                            }`}>
                              {course.code} - {course.name}
                            </span>
                            {isFirstCourse && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                Base Course
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 flex items-center gap-3">
                            <span>Year {course.yearLevel}</span>
                            <span>•</span>
                            <span>{course.credits || 'N/A'} Credits</span>
                            {course.departmentId !== getCourse(formData.courses[0])?.departmentId && (
                              <>
                                <span>•</span>
                                <span className="text-orange-600">Cross-Department</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCourse(courseId)}
                          className="text-gray-500 hover:text-red-600 p-1 rounded transition-colors"
                          title={`Remove ${course.code} from joint session`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null;
                  })}
                  
                  {/* Summary information */}
                  {formData.courses.length > 1 && (
                    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <div className="text-sm text-indigo-800">
                        <strong>Joint Session Summary:</strong>
                      </div>
                      <div className="text-xs text-indigo-600 mt-1 space-y-1">
                        <div>📊 {formData.courses.length} courses will be taught simultaneously</div>
                        <div>👥 Year {getCourse(formData.courses[0])?.yearLevel} students from all courses will attend together</div>
                        <div>🎯 All courses share the same faculty, room, and time slot</div>
                        {/* Check if all courses are from same department */}
                        {(() => {
                          const departments = new Set(formData.courses.map((id: string) => getCourse(id)?.departmentId));
                          return departments.size > 1 ? (
                            <div>🌐 Interdisciplinary session spanning {departments.size} departments</div>
                          ) : (
                            <div>🏢 All courses from the same department</div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
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
      
      {/* Validation errors with enhanced feedback */}
      {(!formData.facultyId || !formData.roomId || !formData.courses?.length || formData.courses?.length < 2 || !formData.startTime || !formData.endTime || timeError || (conflictResult && !conflictResult.canProceed)) && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-grow">
              <p className="font-medium text-red-800 text-sm mb-2">Joint Session Setup Requirements:</p>
              
              <div className="space-y-2">
                {/* Basic requirements */}
                <div className="grid grid-cols-1 gap-1 text-sm">
                  <div className={`flex items-center gap-2 ${formData.facultyId ? 'text-green-700' : 'text-red-700'}`}>
                    <span className="w-4 h-4 text-center">{formData.facultyId ? '✅' : '❌'}</span>
                    <span>Faculty member selected</span>
                  </div>
                  <div className={`flex items-center gap-2 ${formData.roomId ? 'text-green-700' : 'text-red-700'}`}>
                    <span className="w-4 h-4 text-center">{formData.roomId ? '✅' : '❌'}</span>
                    <span>Room selected</span>
                  </div>
                  <div className={`flex items-center gap-2 ${formData.startTime && formData.endTime && !timeError ? 'text-green-700' : 'text-red-700'}`}>
                    <span className="w-4 h-4 text-center">{formData.startTime && formData.endTime && !timeError ? '✅' : '❌'}</span>
                    <span>Valid time range set</span>
                    {timeError && <span className="text-xs text-red-600">({timeError})</span>}
                  </div>
                  <div className={`flex items-center gap-2 ${formData.courses?.length >= 2 ? 'text-green-700' : 'text-red-700'}`}>
                    <span className="w-4 h-4 text-center">{formData.courses?.length >= 2 ? '✅' : '❌'}</span>
                    <span>At least 2 courses added</span>
                    {formData.courses?.length === 1 && (
                      <span className="text-xs text-orange-600">(Need 1 more course)</span>
                    )}
                    {!formData.courses?.length && (
                      <span className="text-xs text-red-600">(No courses selected)</span>
                    )}
                  </div>
                  
                  {/* Conflict status */}
                  {conflictResult && (
                    <div className={`flex items-center gap-2 ${conflictResult.canProceed ? 'text-green-700' : 'text-red-700'}`}>
                      <span className="w-4 h-4 text-center">{conflictResult.canProceed ? '✅' : '❌'}</span>
                      <span>No scheduling conflicts</span>
                      {!conflictResult.canProceed && (
                        <span className="text-xs text-red-600">({conflictResult.conflicts.length} conflict{conflictResult.conflicts.length === 1 ? '' : 's'})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress indicator */}
              {(() => {
                const totalRequirements = 5; // faculty, room, time, courses, conflicts
                let completed = 0;
                if (formData.facultyId) completed++;
                if (formData.roomId) completed++;
                if (formData.startTime && formData.endTime && !timeError) completed++;
                if (formData.courses?.length >= 2) completed++;
                if (!conflictResult || conflictResult.canProceed) completed++;
                
                const progress = (completed / totalRequirements) * 100;
                
                return (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Setup Progress</span>
                      <span>{completed}/{totalRequirements} complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          progress === 100 ? 'bg-green-500' : progress >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Success preview */}
              {formData.courses?.length >= 2 && formData.facultyId && formData.roomId && (!conflictResult || conflictResult.canProceed) && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
                  <div className="text-green-800 font-medium">🎉 Joint Session Ready!</div>
                  <div className="text-green-700 text-xs mt-1">
                    {formData.courses.length} courses will be taught together by{' '}
                    {(() => {
                      const selectedFaculty = faculty.find(f => f.id === formData.facultyId);
                      return selectedFaculty ? `${selectedFaculty.firstName} ${selectedFaculty.lastName}` : 'the selected faculty';
                    })()} in{' '}
                    {(() => {
                      const selectedRoom = rooms.find(r => r.id === formData.roomId);
                      return selectedRoom ? selectedRoom.name : 'the selected room';
                    })()}.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

