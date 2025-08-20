import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Clock, CheckCircle, XCircle, AlertCircle, FileText, TrendingUp, QrCode } from 'lucide-react';
import { Student, Course, TimeSlot, Faculty, Attendance, AttendanceStats, Room, Conflict, Department, AttendanceCode, QRScanData } from '@/types/database';
import { getDayName } from '@/utils/helpers';
import AttendanceModal from '../modals/AttendanceModal';
import AttendanceReport from '../AttendanceReport';
import QRAttendanceGenerator from '../QRAttendanceGenerator';

interface AttendanceSectionProps {
  students: Student[];
  courses: Course[];
  timeSlots: TimeSlot[];
  faculty: Faculty[];
  attendance: Attendance[];
  currentUser: { id: string; role: 'faculty' | 'admin' };
  onMarkAttendance: (attendanceData: Partial<Attendance>[]) => Promise<Attendance[] | undefined | void>;
  onUpdateAttendance: (id: string, status: Attendance['status'], remarks?: string) => Promise<void>;
  onGenerateQRCode?: (timeSlotId: string, courseId: string, date: string, startTime: string) => Promise<AttendanceCode | null>;
  onProcessQRAttendance?: (scanData: QRScanData) => Promise<{ success: boolean; message: string }>;

  rooms?: Room[];
  conflicts?: Conflict[];
  departments?: Department[];
  selectedYear?: string;
  selectedSemester?: number;
  setSelectedYear?: (year: string) => void;
  setSelectedSemester?: (semester: number) => void;
  openModal?: (...args: any[]) => void;
  showAlert?: (...args: any[]) => void;
  setFormData?: (...args: any[]) => void;
}

export default function AttendanceSection({
  students,
  courses,
  timeSlots,
  faculty,
  attendance,
  currentUser,
  onMarkAttendance,
  onUpdateAttendance
}: AttendanceSectionProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [selectedQRSlot, setSelectedQRSlot] = useState<TimeSlot | null>(null);
  const [viewMode, setViewMode] = useState<'today' | 'history' | 'stats'>('today');
  const [isSaving, setIsSaving] = useState(false);

  // Get today's day of week (1-7)
  const todayDayOfWeek = new Date(selectedDate).getDay() || 7; // Convert Sunday (0) to 7

  // Filter time slots for selected date
  const todayTimeSlots = useMemo(() => {
    return timeSlots.filter(slot => {
      const isToday = slot.dayOfWeek === todayDayOfWeek;
      const isFacultySlot = currentUser.role === 'admin' || slot.facultyId === currentUser.id;
      const matchesCourse = selectedCourse === 'all' || slot.courseId === selectedCourse;
      return isToday && isFacultySlot && matchesCourse;
    });
  }, [timeSlots, todayDayOfWeek, currentUser, selectedCourse]);

  // Calculate attendance statistics
  const attendanceStats = useMemo(() => {
    const stats: Record<string, AttendanceStats> = {};
    
    courses.forEach(course => {
      const courseAttendance = attendance.filter(a => a.courseId === course.id);
      const courseTimeSlots = timeSlots.filter(ts => ts.courseId === course.id);
      
      // Group by student
      students.forEach(student => {
        const key = `${student.id}-${course.id}`;
        const studentAttendance = courseAttendance.filter(a => a.studentId === student.id);

        // Count attendance statuses
        const present = studentAttendance.filter(a => a.status === 'present').length;
        const absent = studentAttendance.filter(a => a.status === 'absent').length;
        const late = studentAttendance.filter(a => a.status === 'late').length;
        const excused = studentAttendance.filter(a => a.status === 'excused').length;

        stats[key] = {
          studentId: student.id,
          courseId: course.id,
          present,
          absent,
          late,
          excused,
          semester: course.semester,
          academicYear: course.yearLevel.toString(),
          lastUpdated: new Date(),
          totalClasses: courseTimeSlots.length,
          attendancePercentage: 0
        };

        // Calculate percentage
        const attendedClasses = stats[key].present + stats[key].late;
        stats[key].attendancePercentage = stats[key].totalClasses > 0
          ? Math.round((attendedClasses / stats[key].totalClasses) * 100)
          : 0;
      });
    });
    
    return stats;
  }, [students, courses, timeSlots, attendance]);

  // Get attendance for a specific time slot
  const getSlotAttendance = (slotId: string) => {
    return attendance.filter(a => 
      a.timeSlotId === slotId && 
      a.date === selectedDate
    );
  };

  // Calculate quick stats
  const quickStats = {
    totalClassesToday: todayTimeSlots.length,
    markedClasses: todayTimeSlots.filter(slot => 
      getSlotAttendance(slot.id).length > 0
    ).length,
    studentsPresent: attendance.filter(a => 
      a.date === selectedDate && a.status === 'present'
    ).length,
    studentsAbsent: attendance.filter(a => 
      a.date === selectedDate && a.status === 'absent'
    ).length
  };

  const handleMarkAttendance = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    setShowAttendanceModal(true);
  };

  // Improved attendance saving with better error handling
  const handleSaveAttendance = async (attendanceData: Partial<Attendance>[]): Promise<Attendance[] | undefined> => {
    if (isSaving) {
      alert('Please wait for the current save operation to complete.');
      return undefined;
    }

    setIsSaving(true);
    
    try {
      // Prepare attendance data to ensure uniqueness
      // If a record has an ID, it's an update; otherwise, it's a new record
      const preparedData = attendanceData.map(record => ({
        ...record,
        // For records without an ID, ensure we have the composite key fields
        studentId: record.studentId,
        timeSlotId: record.timeSlotId,
        date: record.date
      }));
      
      // Call parent component's attendance handler and return its result
      const result = await onMarkAttendance(preparedData);
      
      // Close modal on successful save
      setShowAttendanceModal(false);
      setSelectedTimeSlot(null);
      
      // Ensure only Attendance[] or undefined is returned
      return typeof result === 'undefined' ? undefined : result as Attendance[] | undefined;
    } catch (error) {
      console.error('Error in handleSaveAttendance:', error);
      alert('Failed to save attendance. Please try again.');
      return undefined;
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateQR = (slot: TimeSlot) => {
    setSelectedQRSlot(slot);
    setShowQRGenerator(true);
  };

  const getStatusColor = (status: Attendance['status']) => {
    switch (status) {
      case 'present': return 'text-green-600';
      case 'absent': return 'text-red-600';
      case 'late': return 'text-yellow-600';
      case 'excused': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: Attendance['status']) => {
    switch (status) {
      case 'present': return 'bg-green-100';
      case 'absent': return 'bg-red-100';
      case 'late': return 'bg-yellow-100';
      case 'excused': return 'bg-blue-100';
      default: return 'bg-gray-100';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Attendance Tracking</h2>
          <p className="text-gray-600 mt-1">Mark and manage student attendance</p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Classes</p>
              <p className="text-2xl font-bold text-gray-800">{quickStats.totalClassesToday}</p>
              <p className="text-sm text-gray-500">{quickStats.markedClasses} marked</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Present Today</p>
              <p className="text-2xl font-bold text-green-600">{quickStats.studentsPresent}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Absent Today</p>
              <p className="text-2xl font-bold text-red-600">{quickStats.studentsAbsent}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Attendance</p>
              <p className="text-2xl font-bold text-gray-800">
                {quickStats.studentsPresent + quickStats.studentsAbsent > 0
                  ? Math.round((quickStats.studentsPresent / (quickStats.studentsPresent + quickStats.studentsAbsent)) * 100)
                  : 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setViewMode('today')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              viewMode === 'today'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Today's Classes
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              viewMode === 'history'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Attendance History
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              viewMode === 'stats'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Statistics
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content based on view mode */}
        <div className="p-6">
          {viewMode === 'today' && (
            <div className="space-y-4">
              {todayTimeSlots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-lg font-medium">No classes scheduled for {getDayName(todayDayOfWeek)}</p>
                </div>
              ) : (
                todayTimeSlots.map(slot => {
                  const course = courses.find(c => c.id === slot.courseId);
                  const slotAttendance = getSlotAttendance(slot.id);
                  const isMarked = slotAttendance.length > 0;
                  
                  return (
                    <motion.div
                      key={slot.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {course?.code} - {course?.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {slot.startTime} - {slot.endTime} | Year {slot.yearLevel} | {slot.type}
                          </p>
                          {isMarked && (
                            <div className="mt-2 flex gap-4 text-sm">
                              <span className="text-green-600">
                                Present: {slotAttendance.filter(a => a.status === 'present').length}
                              </span>
                              <span className="text-red-600">
                                Absent: {slotAttendance.filter(a => a.status === 'absent').length}
                              </span>
                              <span className="text-yellow-600">
                                Late: {slotAttendance.filter(a => a.status === 'late').length}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {/* QR Code Button */}
                          <button
                            onClick={() => handleGenerateQR(slot)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                            title="Generate QR Code for attendance"
                            disabled={isSaving}
                          >
                            <QrCode className="w-4 h-4" />
                            QR Code
                          </button>
                          
                          {/* Manual Attendance Button */}
                          <button
                            onClick={() => handleMarkAttendance(slot)}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              isMarked
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isSaving}
                          >
                            {isSaving ? 'Saving...' : (isMarked ? 'Update Attendance' : 'Mark Manually')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {viewMode === 'history' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Course</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Marked By</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance
                    .filter(a => selectedCourse === 'all' || a.courseId === selectedCourse)
                    .slice(0, 50) // Show last 50 records
                    .map((record, index) => {
                      const student = students.find(s => s.id === record.studentId);
                      const course = courses.find(c => c.id === record.courseId);
                      const marker = faculty.find(f => f.id === record.markedBy);
                      
                      return (
                        <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">{student?.firstName} {student?.lastName}</td>
                          <td className="px-4 py-3 text-sm">{course?.code}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBgColor(record.status)} ${getStatusColor(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{marker?.firstName} {marker?.lastName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{record.remarks || '-'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'stats' && (
            <div className="space-y-6">
              {courses
                .filter(course => selectedCourse === 'all' || course.id === selectedCourse)
                .map(course => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">
                      {course.code} - {course.name}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left">Student</th>
                            <th className="px-3 py-2 text-center">Present</th>
                            <th className="px-3 py-2 text-center">Absent</th>
                            <th className="px-3 py-2 text-center">Late</th>
                            <th className="px-3 py-2 text-center">Excused</th>
                            <th className="px-3 py-2 text-center">Attendance %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students
                            .filter(s => s.currentYear === parseInt(course.yearLevel.toString()) 
                            && s.enrolledCourses.includes(course.id)
                          
                          )
                            .map((student, index) => {
                              const statsKey = `${student.id}-${course.id}`;
                              const stats = attendanceStats[statsKey];
                              
                              return (
                                <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-3 py-2">{student.firstName} {student.lastName}</td>
                                  <td className="px-3 py-2 text-center text-green-600">{stats?.present || 0}</td>
                                  <td className="px-3 py-2 text-center text-red-600">{stats?.absent || 0}</td>
                                  <td className="px-3 py-2 text-center text-yellow-600">{stats?.late || 0}</td>
                                  <td className="px-3 py-2 text-center text-blue-600">{stats?.excused || 0}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`font-semibold ${
                                      stats?.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {stats?.attendancePercentage || 0}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAttendanceModal && selectedTimeSlot && (
        <AttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => {
            setShowAttendanceModal(false);
            setSelectedTimeSlot(null);
          }}
          timeSlot={selectedTimeSlot}
          students={students.filter(s => 
            s.currentYear === Number(selectedTimeSlot.yearLevel) && 
            s.enrolledCourses.includes(selectedTimeSlot.courseId)
          )}
          course={courses.find(c => c.id === selectedTimeSlot.courseId)!}
          existingAttendance={getSlotAttendance(selectedTimeSlot.id)}
          date={selectedDate}
          onSave={handleSaveAttendance}
          currentUserId={currentUser.id}
        />
      )}

      {/* QR Code Generator Modal */}
      {showQRGenerator && selectedQRSlot && (
        <QRAttendanceGenerator
          timeSlot={selectedQRSlot}
          course={courses.find(c => c.id === selectedQRSlot.courseId)!}
          date={selectedDate}
          onClose={() => {
            setShowQRGenerator(false);
            setSelectedQRSlot(null);
          }}
        />
      )}

      {showReportModal && (
        <AttendanceReport
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          students={students}
          courses={courses}
          attendance={attendance}
          attendanceStats={attendanceStats}
        />
      )}
    </motion.div>
  );
}