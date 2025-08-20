import React from 'react';
import { Course, Department, Faculty, Room } from '@/types/database';

interface TimeSlotFormProps {
  formData: any;
  setFormData: (data: any) => void;
  departments: Department[];
  courses: Course[];
  faculty: Faculty[];
  rooms: Room[];
  academicYears?: string[];
  semesters?: number[];
}

export default function TimeSlotForm({ 
  formData, 
  setFormData, 
  departments, 
  courses, 
  faculty, 
  rooms, 
  academicYears = ['2024', '2025', '2026'],
  semesters = [1, 2]
}: TimeSlotFormProps) {
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
      {/* Department Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Department <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.departmentId || ''}
          required
          onChange={(e) => handleDepartmentChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Department</option>
          {departments.map(department => (
            <option key={department.id} value={department.id}>
              {department.code} - {department.name}
            </option>
          ))}
        </select>
      </div>

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

      {/* Course Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Course <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.courseId || ''}
          required
          onChange={(e) => handleCourseChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!formData.departmentId || !formData.yearLevel}
        >
          <option value="">Select Course</option>
          {filteredCourses.map(course => (
            <option key={course.id} value={course.id}>
              {course.code} - {course.name}
            </option>
          ))}
        </select>
      </div>

      {/* Faculty Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Faculty <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.facultyId || ''}
          required
          onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!formData.departmentId}
        >
          <option value="">Select Faculty</option>
          {filteredFaculty.map(member => (
            <option key={member.id} value={member.id}>
              {member.title} {member.firstName} {member.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Room Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Room <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.roomId || ''}
          required
          onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Room</option>
          {filteredRooms.map(room => (
            <option key={room.id} value={room.id}>
              {room.code} - {room.name} (Cap: {room.capacity})
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