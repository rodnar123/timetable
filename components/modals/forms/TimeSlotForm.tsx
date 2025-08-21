import React, { useState, useEffect, useCallback } from 'react';
import { Course, Department, Faculty, Room, TimeSlot } from '@/types/database';
import { validateTimeSlotForm, ValidationError, getFieldError, hasFieldError } from '@/utils/formValidation';
import { checkTimeSlotConflicts, ConflictCheckResult } from '@/utils/conflictUtils';
import { ConflictAlert } from '@/components/ConflictAlert';
import FieldError, { InputField } from '@/components/common/FieldError';

interface TimeSlotFormProps {
  formData: any;
  setFormData: (data: any) => void;
  departments: Department[];
  courses: Course[];
  faculty: Faculty[];
  rooms: Room[];
  timeSlots: TimeSlot[]; // Add timeSlots for conflict detection
  academicYears?: string[];
  semesters?: number[];
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
  onConflictChange?: (result: ConflictCheckResult | null) => void; // Add conflict callback
}

export default function TimeSlotForm({ 
  formData, 
  setFormData, 
  departments, 
  courses, 
  faculty, 
  rooms, 
  timeSlots,
  academicYears = ['2024', '2025', '2026'],
  semesters = [1, 2],
  onValidationChange,
  onConflictChange
}: TimeSlotFormProps) {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);

  // Memoize the validation change callback to prevent unnecessary re-renders
  const handleValidationChange = useCallback((isValid: boolean, errors: ValidationError[]) => {
    onValidationChange?.(isValid, errors);
  }, [onValidationChange]);

  // Validate form whenever formData changes
  useEffect(() => {
    const validation = validateTimeSlotForm(formData);
    setValidationErrors(validation.errors);
    handleValidationChange(validation.isValid, validation.errors);
  }, [formData, handleValidationChange]);

  // Check for conflicts whenever relevant form data changes
  useEffect(() => {
    if (formData.facultyId && formData.roomId && formData.courseId && 
        formData.dayOfWeek && formData.startTime && formData.endTime &&
        formData.academicYear && formData.semester && formData.yearLevel) {
      
      const result = checkTimeSlotConflicts(
        formData,
        timeSlots,
        formData.id, // Exclude current slot if editing
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
  }, [
    formData.facultyId,
    formData.roomId,
    formData.courseId,
    formData.dayOfWeek,
    formData.startTime,
    formData.endTime,
    formData.academicYear,
    formData.semester,
    formData.yearLevel,
    formData.departmentId,
    timeSlots,
    faculty,
    rooms,
    courses,
    onConflictChange
  ]);
  // Handlers to reset dependent fields
  const handleDepartmentChange = (departmentId: string) => {
    setFormData({
      ...formData,
      departmentId,
      courseId: '',
      facultyId: '',
      roomId: ''
    });
  };

  const handleCourseChange = (courseId: string) => {
    setFormData({
      ...formData,
      courseId
    });
  };

  // Filters now consider year level
  const filteredCourses = formData.departmentId
    ? courses.filter(course => {
        const matchesDept = course.departmentId === formData.departmentId;
        // If course has year restriction, filter by that too
        const matchesYear = !course.yearLevel || course.yearLevel === parseInt(formData.yearLevel);
        return matchesDept && matchesYear;
      })
    : [];

  const filteredFaculty = formData.departmentId
    ? faculty.filter(f => f.departmentId === formData.departmentId)
    : [];

  const filteredRooms = formData.departmentId
    ? rooms.filter(r => r.available)
    : rooms.filter(r => r.available);

  return (
    <div className="space-y-4">
      {/* Information about Add Time Slot */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg shadow-sm mb-6">
        <h3 className="font-medium text-blue-800">About Adding Time Slots</h3>
        <p className="text-sm text-blue-700 mt-1">
          Add individual class sessions to the timetable. Each time slot represents a regular class session
          with specific faculty, room, and time assignments.
        </p>
        <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-600">
          <strong>Smart Filtering:</strong> Courses are filtered by department and year level to show only relevant options.
        </div>
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          <strong>🔄 Cross-Visibility Conflict Detection:</strong> The system automatically checks for conflicts with:
          <ul className="mt-1 ml-4 list-disc">
            <li>Other regular time slots (same faculty, room, or student conflicts)</li>
            <li><strong>Joint Sessions</strong> - Detects when students/faculty are unavailable due to joint classes</li>
            <li><strong>Split Classes</strong> - Identifies partial or full conflicts with split class groups</li>
            <li>Faculty double-booking across all session types</li>
            <li>Room conflicts across all session types</li>
          </ul>
          <div className="mt-1 text-amber-600 font-medium">
            ✨ All three systems (Add Time Slot, Joint Session, Split Class) now see each other's records!
          </div>
        </div>
      </div>

      {/* Conflict Detection Alert */}
      {conflictResult && (
        <ConflictAlert 
          result={conflictResult}
        />
      )}

      {/* Department Selection */}
      <InputField 
        label="Department" 
        required 
        error={getFieldError(validationErrors, 'departmentId')}
      >
        <select
          value={formData.departmentId || ''}
          required
          onChange={(e) => handleDepartmentChange(e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasFieldError(validationErrors, 'departmentId') ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">Select Department</option>
          {departments.map(department => (
            <option key={department.id} value={department.id}>
              {department.code} - {department.name}
            </option>
          ))}
        </select>
      </InputField>

      {/* Year Level Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Year Level <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.yearLevel || ''}
          required
          onChange={(e) => setFormData({ ...formData, yearLevel: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Year Level</option>
          <option value="1">Year 1</option>
          <option value="2">Year 2</option>
          <option value="3">Year 3</option>
          <option value="4">Year 4</option>
        </select>
      </div>

      {/* Course Selection with Smart Filtering */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Course <span className="text-red-500">*</span>
        </label>
        {!formData.departmentId || !formData.yearLevel ? (
          <div className="mb-2 p-2 bg-gray-50 border rounded text-xs text-gray-600">
            💡 Please select a department and year level first to see available courses
          </div>
        ) : (
          <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-600">
            ✅ Showing {filteredCourses.length} courses for {departments.find(d => d.id === formData.departmentId)?.name} - Year {formData.yearLevel}
          </div>
        )}
        <select
          value={formData.courseId || ''}
          required
          onChange={(e) => handleCourseChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!formData.departmentId || !formData.yearLevel}
        >
          <option value="">
            {!formData.departmentId || !formData.yearLevel ? 'Select department and year first' : 'Select Course'}
          </option>
          {filteredCourses.map(course => (
            <option key={course.id} value={course.id}>
              {course.code} - {course.name} {course.credits && `(${course.credits} credits)`}
            </option>
          ))}
        </select>
      </div>

      {/* Faculty Selection with Department Filtering */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Faculty <span className="text-red-500">*</span>
        </label>
        {!formData.departmentId ? (
          <div className="mb-2 p-2 bg-gray-50 border rounded text-xs text-gray-600">
            💡 Please select a department first to see available faculty
          </div>
        ) : (
          <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-600">
            ✅ Showing {filteredFaculty.length} faculty members from {departments.find(d => d.id === formData.departmentId)?.name}
          </div>
        )}
        <select
          value={formData.facultyId || ''}
          required
          onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!formData.departmentId}
        >
          <option value="">
            {!formData.departmentId ? 'Select department first' : 'Select Faculty'}
          </option>
          {filteredFaculty.map(member => (
            <option key={member.id} value={member.id}>
              {member.title} {member.firstName} {member.lastName} {member.specialization && `(${member.specialization})`}
            </option>
          ))}
        </select>
      </div>

      {/* Room Selection with Capacity Info */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Room <span className="text-red-500">*</span>
        </label>
        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-600">
          ✅ Showing {filteredRooms.length} available rooms
        </div>
        <select
          value={formData.roomId || ''}
          required
          onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Room</option>
          {filteredRooms.map(room => (
            <option key={room.id} value={room.id}>
              {room.code} - {room.name} (Capacity: {room.capacity}) {room.type && `[${room.type}]`}
            </option>
          ))}
        </select>
      </div>

      {/* Day and Type Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Day of Week <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.dayOfWeek || ''}
            required
            onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Day</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lesson Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.type || ''}
            required
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Type</option>
            <option value="Lecture">Lecture</option>
            <option value="Tutorial">Tutorial</option>
            <option value="Lab">Lab</option>
            <option value="Workshop">Workshop</option>
          </select>
        </div>
      </div>

      {/* Academic Year and Semester Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Academic Year <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.academicYear || ''}
            required
            onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Year</option>
            {academicYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Semester <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.semester || ''}
            required
            onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Semester</option>
            {semesters.map(semester => (
              <option key={semester} value={semester}>Semester {semester}</option>
            ))}
          </select>
        </div>
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
            required
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={formData.endTime || ''}
            required
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Optional Group ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Group ID (Optional)
        </label>
        <input
          type="text"
          value={formData.groupId || ''}
          onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
          placeholder="e.g., Group A, Section 1"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}