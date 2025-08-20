import React, { useState, useMemo } from 'react';
import { X, Download, Printer, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { Student, Course, Attendance, AttendanceStats } from '@/types/database';

interface AttendanceReportProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  courses: Course[];
  attendance: Attendance[];
  attendanceStats: Record<string, AttendanceStats>;
}

export default function AttendanceReport({
  isOpen,
  onClose,
  students,
  courses,
  attendance,
  attendanceStats
}: AttendanceReportProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filteredStudents = students;
    let filteredAttendance = attendance;

    // Filter by year
    if (selectedYear !== 'all') {
      filteredStudents = students.filter(s => s.currentYear === parseInt(selectedYear));
    }

    // Filter by course
    if (selectedCourse !== 'all') {
      filteredAttendance = attendance.filter(a => a.courseId === selectedCourse);
    }

    // Filter by date range
    filteredAttendance = filteredAttendance.filter(a => {
      const date = new Date(a.date);
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      return date >= start && date <= end;
    });

    return {
      students: filteredStudents,
      attendance: filteredAttendance
    };
  }, [students, attendance, selectedCourse, selectedYear, dateRange]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats = {
      totalClasses: 0,
      averageAttendance: 0,
      studentsAtRisk: 0,
      perfectAttendance: 0
    };

    // Get unique class sessions
    const uniqueSessions = new Set(
      filteredData.attendance.map(a => `${a.courseId}-${a.date}-${a.timeSlotId}`)
    );
    stats.totalClasses = uniqueSessions.size;

    // Calculate average attendance
    const presentCount = filteredData.attendance.filter(a => 
      a.status === 'present' || a.status === 'late'
    ).length;
    const totalRecords = filteredData.attendance.length;
    stats.averageAttendance = totalRecords > 0 
      ? Math.round((presentCount / totalRecords) * 100) 
      : 0;

    // Count students at risk (< 75% attendance) and perfect attendance
    filteredData.students.forEach(student => {
      const studentStats = Object.values(attendanceStats).filter(
        stat => stat.studentId === student.id && 
        (selectedCourse === 'all' || stat.courseId === selectedCourse)
      );

      const avgAttendance = studentStats.reduce((sum, stat) => 
        sum + stat.attendancePercentage, 0
      ) / (studentStats.length || 1);

      if (avgAttendance < 75) stats.studentsAtRisk++;
      if (avgAttendance === 100) stats.perfectAttendance++;
    });

    return stats;
  }, [filteredData, attendanceStats, selectedCourse]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Generate CSV data
    const csvHeader = ['Student ID', 'Name', 'Course', 'Present', 'Absent', 'Late', 'Excused', 'Attendance %'];
    const csvRows: string[] = [];

    filteredData.students.forEach(student => {
      const relevantCourses = selectedCourse === 'all' 
        ? courses 
        : courses.filter(c => c.id === selectedCourse);

      relevantCourses.forEach(course => {
        const statsKey = `${student.id}-${course.id}`;
        const stats = attendanceStats[statsKey];
        
        if (stats) {
          csvRows.push([
            student.studentId,
            `${student.firstName} ${student.lastName}`,
            course.code,
            stats.present,
            stats.absent,
            stats.late,
            stats.excused,
            `${stats.attendancePercentage}%`
          ].join(','));
        }
      });
    });

    const csvContent = [csvHeader.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Attendance Report</h2>
            <p className="text-sm text-gray-500 mt-1">
              Generate and export attendance reports
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex flex-wrap gap-4">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 ml-auto">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="px-6 py-4 grid grid-cols-4 gap-4 border-b">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Total Classes</p>
            <p className="text-2xl font-bold text-blue-900">{summaryStats.totalClasses}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Average Attendance</p>
            <p className="text-2xl font-bold text-green-900">{summaryStats.averageAttendance}%</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Students at Risk</p>
            <p className="text-2xl font-bold text-red-900">{summaryStats.studentsAtRisk}</p>
            <p className="text-xs text-red-600">Below 75% attendance</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Perfect Attendance</p>
            <p className="text-2xl font-bold text-purple-900">{summaryStats.perfectAttendance}</p>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Detailed Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Student ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Year</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Present</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Absent</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Late</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Excused</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Attendance %</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.students.map((student, index) => {
                    // Calculate aggregate stats for the student
                    const studentCourses = selectedCourse === 'all' 
                      ? courses.filter(c => c.yearLevel === student.currentYear)
                      : courses.filter(c => c.id === selectedCourse);

                    let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalExcused = 0, totalClasses = 0;

                    studentCourses.forEach(course => {
                      const statsKey = `${student.id}-${course.id}`;
                      const stats = attendanceStats[statsKey];
                      if (stats) {
                        totalPresent += stats.present;
                        totalAbsent += stats.absent;
                        totalLate += stats.late;
                        totalExcused += stats.excused;
                        totalClasses += stats.totalClasses;
                      }
                    });

                    const attendancePercentage = totalClasses > 0
                      ? Math.round(((totalPresent + totalLate) / totalClasses) * 100)
                      : 0;

                    return (
                      <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3">{student.studentId}</td>
                        <td className="px-4 py-3 font-medium">{student.firstName} {student.lastName}</td>
                        <td className="px-4 py-3 text-center">Year {student.currentYear}</td>
                        <td className="px-4 py-3 text-center text-green-600">{totalPresent}</td>
                        <td className="px-4 py-3 text-center text-red-600">{totalAbsent}</td>
                        <td className="px-4 py-3 text-center text-yellow-600">{totalLate}</td>
                        <td className="px-4 py-3 text-center text-blue-600">{totalExcused}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${
                            attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {attendancePercentage}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {attendancePercentage >= 90 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Excellent
                            </span>
                          ) : attendancePercentage >= 75 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                              Good
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              At Risk
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}