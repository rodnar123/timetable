import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Upload, BookOpen, Users, Filter, X, Mail, Phone, Calendar, Award, AlertCircle, TrendingUp, Download } from 'lucide-react';
import { Student, Program, Course, ModalType } from '@/types/database';
import ImportStudents from '../StudentImportComponent';

interface StudentsProps {
  students: Student[];
  programs: Program[];
  courses: Course[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  openModal: (type: ModalType, item?: any) => void;
  handleDelete: (type: string, id: string) => void;
  handleBulkImport?: (students: Partial<Student>[]) => void;
}

export default function Students({
  students,
  programs,
  courses,
  searchTerm,
  setSearchTerm,
  openModal,
  handleDelete,
  handleBulkImport,
}: StudentsProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  // State to hold course input per student
  const [courseInputs, setCourseInputs] = useState<Record<string, string>>({});

  const handleImport = (importedStudents: Partial<Student>[]) => {
    if (handleBulkImport) {
      // Convert string values to proper types before importing
      const processedStudents = importedStudents.map(student => ({
        ...student,
        currentSemester: student.currentSemester 
          ? (typeof student.currentSemester === 'string' 
            ? parseInt(student.currentSemester) 
            : student.currentSemester)
          : 1,
        currentYear: student.currentYear 
          ? (typeof student.currentYear === 'string' 
            ? parseInt(student.currentYear) 
            : student.currentYear)
          : 1,
        gpa: student.gpa 
          ? (typeof student.gpa === 'string' 
            ? parseFloat(student.gpa) 
            : student.gpa)
          : undefined,
        enrolledCourses: Array.isArray(student.enrolledCourses) 
          ? student.enrolledCourses 
          : [],
        completedCourses: Array.isArray(student.completedCourses) 
          ? student.completedCourses 
          : [],
        status: (student.status || 'active') as Student['status'],
        studentType: (student.studentType || 'regular') as Student['studentType'],
      }));
      
      handleBulkImport(processedStudents);
    }
    setShowImportModal(false);
  };

  const toggleStudentExpansion = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Get the selected program details
  const selectedProgramDetails = useMemo(() => {
    if (selectedProgram === 'all') return null;
    return programs.find(p => p.id === selectedProgram);
  }, [selectedProgram, programs]);

  // Get valid year options based on selected program
  const yearOptions = useMemo(() => {
    if (selectedProgram === 'all') {
      // If no program selected, show all possible years (max 6 for medicine)
      return [1, 2, 3, 4, 5, 6];
    }
    
    const program = programs.find(p => p.id === selectedProgram);
    if (!program) return [1, 2, 3, 4];
    
    // Return years based on program duration
    return Array.from({ length: program.duration }, (_, i) => i + 1);
  }, [selectedProgram, programs]);

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.middleName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.phone?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Year filter
      const studentYear = student.currentYear || 1;
      const matchesYear = selectedYear === 'all' || studentYear.toString() === selectedYear;

      // Semester filter
      const studentSemester = student.currentSemester || 1;
      const matchesSemester = selectedSemester === 'all' || studentSemester.toString() === selectedSemester;

      // Program filter
      const matchesProgram = selectedProgram === 'all' || student.programId === selectedProgram;
      
      // Status filter
      const studentStatus = student.status || 'active';
      const matchesStatus = selectedStatus === 'all' || studentStatus === selectedStatus;
      
      // Type filter
      const studentType = student.studentType || 'regular';
      const matchesType = selectedType === 'all' || studentType === selectedType;
      
      return matchesSearch && matchesYear && matchesSemester && matchesProgram && matchesStatus && matchesType;
    });
  }, [students, searchTerm, selectedYear, selectedSemester, selectedProgram, selectedStatus, selectedType]);

  // Get courses for a specific student
  // (No longer used for direct display, but kept for stats)
  const getStudentCourses = (student: Student) => {
    // Get the student's enrolled course IDs
    const enrolledCourseIds = student.enrolledCourses || [];
    
    // Find the actual course objects
    const enrolledCourses = courses.filter(course => 
      enrolledCourseIds.includes(course.id)
    );
    
    // Also get available courses for the student's current year and program
    const availableCourses = courses.filter(course => 
      course.programId === student.programId && 
      course.yearLevel === (student.currentYear || 1) &&
      course.semester === (student.currentSemester || 1)
    );
    
    // Calculate credits
    const currentCredits = enrolledCourses.reduce((sum, course) => sum + (course.credits || 0), 0);
    const completedCredits = student.completedCourses 
      ? student.completedCourses.reduce((sum, courseId) => {
          const course = courses.find(c => c.id === courseId);
          return sum + (course?.credits || 0);
        }, 0)
      : 0;
    
    return {
      enrolled: courses.filter(course => (student.enrolledCourses || []).includes(course.id)),
      available: courses.filter(course => 
        course.programId === student.programId && 
        course.yearLevel === (student.currentYear || 1) &&
        course.semester === (student.currentSemester || 1)
      ),
      enrollmentRate: 0, // ...existing code...
      currentCredits: 0, // ...existing code...
      completedCredits: 0 // ...existing code...
    };
  };

  // Get statistics
  const statistics = useMemo(() => {
    const stats = {
      total: students.length,
      active: students.filter(s => (s.status || 'active') === 'active').length,
      avgGPA: 0,
      highGPA: 0,
      byProgram: {} as Record<string, number>,
      byYear: {} as Record<number, number>,
      byType: {} as Record<string, number>,
      avgEnrollment: 0
    };
    
    // Calculate averages and counts
    let gpaSum = 0;
    let gpaCount = 0;
    
    students.forEach(student => {
      // Count by program
      stats.byProgram[student.programId] = (stats.byProgram[student.programId] || 0) + 1;
      
      // Count by year
      const year = student.currentYear || 1;
      stats.byYear[year] = (stats.byYear[year] || 0) + 1;
      
      // Count by type
      const type = student.studentType || 'regular';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      // GPA calculation
      if (student.gpa) {
        gpaSum += student.gpa;
        gpaCount++;
        if (student.gpa > stats.highGPA) {
          stats.highGPA = student.gpa;
        }
      }
    });
    
    stats.avgGPA = gpaCount > 0 ? parseFloat((gpaSum / gpaCount).toFixed(2)) : 0;
    
    // Calculate average enrollment
    const totalEnrollments = students.reduce((sum, student) => 
      sum + (student.enrolledCourses?.length || 0), 0
    );
    stats.avgEnrollment = students.length > 0 
      ? Math.round(totalEnrollments / students.length) 
      : 0;
    
    return stats;
  }, [students]);

  // Clear filters
  const clearFilters = () => {
    setSelectedProgram('all');
    setSelectedYear('all');
    setSelectedSemester('all');
    setSelectedStatus('all');
    setSelectedType('all');
    setSearchTerm('');
  };

  const hasActiveFilters = selectedProgram !== 'all' || selectedYear !== 'all' ||
    selectedSemester !== 'all' || selectedStatus !== 'all' || selectedType !== 'all' || searchTerm !== '';

  // Export students function
  const exportStudents = () => {
    // This would typically export to CSV/Excel
    console.log('Export students:', filteredStudents);
  };

  // Function to handle opening modal with properly typed data
  const handleEditStudent = (student: Student) => {
    // Ensure the student data has proper types before opening modal
    const studentWithCorrectTypes = {
      ...student,
      currentSemester: typeof student.currentSemester === 'string' 
        ? parseInt(student.currentSemester) 
        : student.currentSemester || 1,
      currentYear: typeof student.currentYear === 'string' 
        ? parseInt(student.currentYear) 
        : student.currentYear || 1,
      gpa: student.gpa || undefined,
      enrolledCourses: Array.isArray(student.enrolledCourses) ? student.enrolledCourses : [],
      completedCourses: Array.isArray(student.completedCourses) ? student.completedCourses : [],
    };
    openModal('student', studentWithCorrectTypes);
  };

  // Handler to add a course code to a student's enrolledCourses (UI only)
  const handleAddCourse = (studentId: string) => {
    const courseCode = courseInputs[studentId]?.trim();
    if (!courseCode) return;
    // Find course by code
    const course = courses.find(c => c.code.toLowerCase() === courseCode.toLowerCase());
    if (!course) return;
    // Find student and update enrolledCourses (UI only, not persistent)
    const studentIdx = students.findIndex(s => s.id === studentId);
    if (studentIdx === -1) return;
    if (!students[studentIdx].enrolledCourses?.includes(course.id)) {
      students[studentIdx].enrolledCourses = [
        ...(students[studentIdx].enrolledCourses || []),
        course.id
      ];
    }
    setCourseInputs(inputs => ({ ...inputs, [studentId]: '' }));
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Students</h2>
            <p className="text-gray-600 mt-1">Manage student records and enrollments</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportStudents}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Excel
            </button>
            <button
              onClick={() => openModal('student')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Students</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.active}</p>
                <p className="text-xs text-gray-500">{Math.round(statistics.active / statistics.total * 100)}%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average GPA</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.avgGPA}</p>
                <p className="text-xs text-gray-500">High: {statistics.highGPA}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Programs</p>
                <p className="text-2xl font-bold text-gray-800">{Object.keys(statistics.byProgram).length}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Courses</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.avgEnrollment}</p>
                <p className="text-xs text-gray-500">Per student</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-full">
                <BookOpen className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b space-y-4">
            {/* Search Bar and Filter Toggle */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search students by name, ID, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                    Active
                  </span>
                )}
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-4 pt-2"
              >
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => {
                      setSelectedProgram(e.target.value);
                      // Reset year if it exceeds the program duration
                      if (e.target.value !== 'all') {
                        const program = programs.find(p => p.id === e.target.value);
                        if (program && selectedYear !== 'all' && parseInt(selectedYear) > program.duration) {
                          setSelectedYear('all');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Programs</option>
                    {programs.map(program => (
                      <option key={program.id} value={program.id}>
                        {program.name} ({program.level === 'undergraduate' ? 'UG' : 'PG'})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Years</option>
                    {yearOptions.map(year => (
                      <option key={year} value={year}>Year {year}</option>
                    ))}
                  </select>
                  {selectedProgramDetails && selectedYear !== 'all' && 
                   parseInt(selectedYear) > selectedProgramDetails.duration && (
                    <p className="text-xs text-amber-600 mt-1">
                      This program only has {selectedProgramDetails.duration} years
                    </p>
                  )}
                </div>
                
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="graduated">Graduated</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>
                
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="regular">Regular</option>
                    <option value="transfer">Transfer</option>
                    <option value="exchange">Exchange</option>
                    <option value="international">International</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Semesters</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
                
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Results summary */}
          <div className="px-6 py-2 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredStudents.length}</span> of{' '}
              <span className="font-semibold">{students.length}</span> students
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Student ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Program</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Year/Sem</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Academic</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => {
                  const program = programs.find(p => p.id === student.programId);
                  const courseInfo = getStudentCourses(student);
                  const studentYear = student.currentYear || 1;
                  const studentSemester = student.currentSemester || 1;
                  const studentStatus = student.status || 'active';
                  const studentType = student.studentType || 'regular';
                  const isExpanded = expandedStudents.has(student.id);

                  return (
                    <React.Fragment key={student.id}>
                      <motion.tr
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.studentId}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div>
                            <div className="font-medium">
                              {student.firstName} {student.middleName ? `${student.middleName} ` : ''}{student.lastName}
                            </div>
                            {studentType !== 'regular' && (
                              <span className="text-xs text-gray-500">
                                {studentType.charAt(0).toUpperCase() + studentType.slice(1)} Student
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="text-xs">{student.email}</span>
                            </div>
                            {student.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span className="text-xs">{student.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            <div>
                              <div>{program?.name || 'N/A'}</div>
                              {program && (
                                <div className="text-xs text-gray-500">
                                  {program.level === 'undergraduate' ? 'UG' : 'PG'}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              program && studentYear > program.duration
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              Y{studentYear} S{studentSemester}
                              {program && studentYear > program.duration && ' ⚠️'}
                            </span>
                            {student.enrollmentDate && (
                              <div className="text-xs text-gray-500">
                                Since {new Date(student.enrollmentDate).getFullYear()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="space-y-1">
                            {student.gpa && (
                              <div className="flex items-center gap-1">
                                <Award className="w-3 h-3 text-gray-400" />
                                <span className={`font-medium ${
                                  student.gpa >= 3.5 ? 'text-green-600' : 
                                  student.gpa >= 3.0 ? 'text-blue-600' : 
                                  student.gpa >= 2.5 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {student.gpa.toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div className="text-xs">
                              <span className="font-medium">{courseInfo.currentCredits}</span>
                              <span className="text-gray-500">/{courseInfo.completedCredits} credits</span>
                            </div>
                            <button
                              onClick={() => toggleStudentExpansion(student.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              {isExpanded ? 'Hide' : 'View'} courses ({courseInfo.enrolled.length})
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            studentStatus === 'active' ? 'bg-green-100 text-green-800' :
                            studentStatus === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            studentStatus === 'graduated' ? 'bg-blue-100 text-blue-800' :
                            studentStatus === 'suspended' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {studentStatus.charAt(0).toUpperCase() + studentStatus.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditStudent(student)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete('student', student.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                      
                      {/* Expanded course details */}
                      {isExpanded && (
                        <tr className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td colSpan={8} className="px-6 py-3 border-t">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-gray-700">
                                Add Course to Student
                              </h4>
                              <div className="flex gap-2 items-center mb-2">
                                <input
                                  type="text"
                                  placeholder="Enter course code (e.g. MATH101)"
                                  value={courseInputs[student.id] || ''}
                                  onChange={e =>
                                    setCourseInputs(inputs => ({
                                      ...inputs,
                                      [student.id]: e.target.value
                                    }))
                                  }
                                  className="px-2 py-1 border rounded text-sm"
                                />
                                <button
                                  onClick={() => handleAddCourse(student.id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                                >
                                  Add Course
                                </button>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-700">
                                Currently Enrolled Courses
                              </h4>
                              {student.enrolledCourses && student.enrolledCourses.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {student.enrolledCourses.map(courseId => {
                                    const course = courses.find(c => c.id === courseId);
                                    return course ? (
                                      <div key={course.id} className="text-xs bg-white rounded p-2 border">
                                        <span className="font-medium">{course.code}</span> - {course.name}
                                        <div className="text-gray-500">
                                          {course.credits} credits | {course.isCore ? 'Core' : 'Elective'}
                                        </div>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No courses enrolled</p>
                              )}
                              {student.notes && (
                                <div className="mt-3 pt-3 border-t">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes</h4>
                                  <p className="text-xs text-gray-600">{student.notes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm mt-1">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Add students to get started'}
              </p>
            </div>
          )}
        </div>

        {/* Additional Statistics */}
        {filteredStudents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700">
                  <strong>{Object.values(statistics.byType).reduce((sum, count) => 
                    sum + (statistics.byType['international'] || 0), 0)}</strong> international students
                  {' '}| <strong>{statistics.avgGPA}</strong> average GPA
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportStudents
          programs={programs}
          courses={courses}
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </>
  );
}