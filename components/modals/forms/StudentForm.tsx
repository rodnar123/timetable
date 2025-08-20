import React, { useEffect, useState } from 'react';
import { Program, Course } from '@/types/database';
import { BookOpen, User, Mail, Phone, Calendar, Hash, MapPin, Award, CreditCard, FileText, AlertCircle, Globe, Info, X } from 'lucide-react';

interface StudentFormProps {
  formData: any;
  setFormData: (data: any) => void;
  programs: Program[];
  courses?: Course[];
}

export default function StudentForm({ formData, setFormData, programs, courses = [] }: StudentFormProps) {
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>(formData.enrolledCourses || []);
  const [completedCredits, setCompletedCredits] = useState(0);

  // Debug logging for semester changes
  useEffect(() => {
    console.log('FormData updated:', {
      currentYear: formData.currentYear,
      currentSemester: formData.currentSemester,
      yearType: typeof formData.currentYear,
      semesterType: typeof formData.currentSemester
    });
  }, [formData.currentYear, formData.currentSemester]);

  // Force re-render when formData changes
  useEffect(() => {
    // This ensures the component re-renders with new formData
    console.log('Full formData:', formData);
  }, [formData]);

  // Calculate completed credits
  useEffect(() => {
    if (formData.completedCourses && courses.length > 0) {
      const credits = formData.completedCourses.reduce((sum: number, courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        return sum + (course?.credits || 0);
      }, 0);
      setCompletedCredits(credits);
    }
  }, [formData.completedCourses, courses]);

  // Update available courses when program changes (allow all courses from the program)
 useEffect(() => {
  if (formData.programId && courses.length > 0) {
    let filteredCourses = courses.filter(course => course.programId === formData.programId);
    
    if (formData.currentYear) {
      filteredCourses = filteredCourses.filter(course => 
        course.yearLevel === Number(formData.currentYear)
      );
    }
    
    if (formData.currentSemester) {
      filteredCourses = filteredCourses.filter(course => 
        course.semester === Number(formData.currentSemester)
      );
    }
    
    setAvailableCourses(filteredCourses.sort((a, b) => a.code.localeCompare(b.code)));
    
    const validCourseIds = filteredCourses.map(c => c.id);
    setSelectedCourses(prev => prev.filter(id => validCourseIds.includes(id)));
  } else {
    setAvailableCourses([]);
    setSelectedCourses([]);
  }
}, [formData.programId, formData.currentYear, formData.currentSemester, courses.length]);

  // Sync enrolledCourses to formData only when selectedCourses changes
// This should be syncing selectedCourses to formData.enrolledCourses
useEffect(() => {
  const currentEnrolledCourses = formData.enrolledCourses || [];
  const isDifferent = currentEnrolledCourses.length !== selectedCourses.length || 
    !currentEnrolledCourses.every((id: string) => selectedCourses.includes(id));
  
  if (isDifferent) {
    setFormData((prev: any) => ({ ...prev, enrolledCourses: selectedCourses }));
  }
}, [selectedCourses]);

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleGPAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const gpa = e.target.value ? parseFloat(e.target.value) : null;
    setFormData({ ...formData, gpa });
  };

  // Get program details for duration validation
  const selectedProgram = programs.find(p => p.id === formData.programId);

  return (
    <div className="space-y-6">
      {/* Basic Information Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-gray-600" />
          Basic Information
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400 inline-block" />
                Student ID
              </label>
              <input
                type="text"
                value={formData.studentId || ''}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 21001234"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 inline-block" />
                Enrollment Date
              </label>
              <input
                type="date"
                value={formData.enrollmentDate || ''}
                onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
              <input
                type="text"
                value={formData.middleName || ''}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Michael"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth || ''}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={formData.gender || ''}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-600" />
          Contact Information
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400 inline-block" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="john.doe@student.university.edu"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 inline-block" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+675 7XX XXXXX"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 inline-block" />
              Address
            </label>
            <textarea
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Enter full address..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
              <input
                type="text"
                value={formData.emergencyContactName || ''}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Emergency contact name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
              <input
                type="tel"
                value={formData.emergencyContactPhone || ''}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Emergency phone number"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Academic Information Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gray-600" />
          Academic Information
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400 inline-block" />
                Program
              </label>
              <select
                value={formData.programId || ''}
                onChange={(e) => {
                  setFormData((prev: any) => ({ 
                    ...prev, 
                    programId: e.target.value,
                    // Reset courses when program changes since they're program-specific
                    enrolledCourses: []
                  }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Program</option>
                {programs.map(prog => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name} ({prog.level === 'undergraduate' ? 'UG' : 'PG'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 inline-block" />
                Current Year
              </label>
              <select
                key={`year-${formData.currentYear}`}
                value={formData.currentYear ? formData.currentYear.toString() : ''} 
                onChange={(e) => {
                  const yearValue = e.target.value ? parseInt(e.target.value) : null;
                  console.log('Year onChange:', e.target.value, '→', yearValue);
                  setFormData((prev: any) => ({ 
                    ...prev, 
                    currentYear: yearValue
                  }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!formData.programId}
              >
                <option value="">Select Year</option>
                {selectedProgram ? (
                  Array.from({ length: selectedProgram.duration }, (_, i) => (
                    <option key={i + 1} value={(i + 1).toString()}>Year {i + 1}</option>
                  ))
                ) : (
                  <>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </>
                )}
              </select>
              {selectedProgram && formData.currentYear > selectedProgram.duration && (
                <p className="text-xs text-red-600 mt-1">
                  This exceeds the program duration of {selectedProgram.duration} years
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 inline-block" />
                Current Semester
              </label>
              <select
                key={`semester-${formData.currentSemester}`}
                value={formData.currentSemester ? formData.currentSemester.toString() : ''} 
                onChange={(e) => {
                  const semesterValue = e.target.value ? parseInt(e.target.value) : null;
                  console.log('Semester onChange:', e.target.value, '→', semesterValue);
                  setFormData((prev: any) => ({ 
                    ...prev, 
                    currentSemester: semesterValue
                  }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!formData.currentYear}
              >
                <option value="">Select Semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Student's current academic position
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400 inline-block" />
                Add Course
              </label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !selectedCourses.includes(e.target.value)) {
                    setSelectedCourses([...selectedCourses, e.target.value]);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.programId || availableCourses.length === 0}
              >
                <option value="">
                  {!formData.programId 
                    ? "Select program first" 
                    : availableCourses.length === 0 
                    ? "No courses available" 
                    : "Select a course to add"}
                </option>
                {availableCourses.length > 0 && (
                  <>
                    {/* Group courses by year for better organization */}
                    {[1, 2, 3, 4, 5, 6].map(year => {
                      const yearCourses = availableCourses.filter(c => c.yearLevel === year);
                      if (yearCourses.length === 0) return null;
                      
                      return (
                        <optgroup key={year} label={`Year ${year}`}>
                          {yearCourses
                            .filter(course => !selectedCourses.includes(course.id))
                            .map(course => (
                              <option key={course.id} value={course.id}>
                                {course.code} - {course.name} (S{course.semester}, {course.credits} credits)
                              </option>
                            ))}
                        </optgroup>
                      );
                    })}
                  </>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                You can enroll the student in any course from their program
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Award className="w-4 h-4 text-gray-400 inline-block" />
                Current GPA
              </label>
              <input
                type="number"
                value={formData.gpa ?? ''}
                onChange={handleGPAChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 3.75"
                min="0"
                max="4"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400 inline-block" />
                Completed Credits
              </label>
              <input
                type="number"
                value={completedCredits}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="0"
              />
            </div>
          </div>

          {/* Enrolled Courses Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enrolled Courses
              {selectedCourses.length > 0 && (
                <span className="text-xs text-gray-500 ml-2">
                  ({selectedCourses.length} selected, {
                    courses
                      .filter(c => selectedCourses.includes(c.id))
                      .reduce((sum, c) => sum + (c.credits || 0), 0)
                  } credits total)
                </span>
              )}
            </label>
            
            {selectedCourses.length === 0 ? (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-500 text-center">
                  No courses enrolled. Select a program to see available courses.
                </p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {/* Group enrolled courses by year/semester for clarity */}
                  {[1, 2, 3, 4, 5, 6].map(year => {
                    const yearCourses = selectedCourses
                      .map(courseId => courses.find(c => c.id === courseId))
                      .filter((course): course is typeof courses[0] => course !== undefined && course.yearLevel === year);
                    
                    if (yearCourses.length === 0) return null;
                    
                    return (
                      <div key={year} className="mb-3">
                        <h5 className="text-xs font-semibold text-gray-600 mb-1">Year {year}</h5>
                        {yearCourses.map(course => (
                          <div
                            key={course.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">
                                {course.code} - {course.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                Semester {course.semester} | {course.credits} credits | 
                                {course.isCore ? ' Core' : ' Elective'}
                                {course.yearLevel !== formData.currentYear && (
                                  <span className="text-amber-600 ml-1">
                                    (Y{course.yearLevel} course)
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCourseToggle(course.id)}
                              className="ml-2 text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Available Courses Info */}
          {formData.programId && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <p className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                {availableCourses.length > 0 ? (
                  <>
                    {availableCourses.length} course{availableCourses.length !== 1 ? 's' : ''} available 
                    in {programs.find(p => p.id === formData.programId)?.name}. 
                    Student is currently in Year {formData.currentYear || '?'}, 
                    Semester {formData.currentSemester || '?'}.
                  </>
                ) : (
                  <>
                    No courses found for {programs.find(p => p.id === formData.programId)?.name}. 
                    Please add courses to this program first.
                  </>
                )}
              </p>
              <p className="text-xs mt-1 text-gray-500">
                You can enroll the student in courses from any year/semester within their program.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status and Additional Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-gray-600" />
          Status & Additional Information
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="graduated">Graduated</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student Type</label>
              <select
                value={formData.studentType || 'regular'}
                onChange={(e) => setFormData({ ...formData, studentType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="regular">Regular</option>
                <option value="transfer">Transfer</option>
                <option value="exchange">Exchange</option>
                <option value="international">International</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400 inline-block" />
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any additional notes or special circumstances..."
            />
          </div>
        </div>
      </div>

      {/* Form Summary */}
      {formData.studentId && formData.firstName && formData.lastName && formData.programId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Student Summary</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><span className="font-medium">ID:</span> {formData.studentId}</p>
            <p><span className="font-medium">Name:</span> {formData.firstName} {formData.middleName} {formData.lastName}</p>
            <p><span className="font-medium">Program:</span> {programs.find(p => p.id === formData.programId)?.name}</p>
            <p><span className="font-medium">Current:</span> Year {formData.currentYear || 'N/A'}, Semester {formData.currentSemester || 'N/A'}</p>
            {formData.gpa && <p><span className="font-medium">GPA:</span> {formData.gpa}</p>}
            <p><span className="font-medium">Status:</span> {(formData.status || 'active').charAt(0).toUpperCase() + (formData.status || 'active').slice(1)}</p>
            <p><span className="font-medium">Enrolled Courses:</span> {selectedCourses.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}