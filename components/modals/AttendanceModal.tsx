import React, { useState, useEffect } from 'react';
import { X, Save, Users, CheckCircle, XCircle, Clock, AlertCircle, Check } from 'lucide-react';
import { Student, Course, TimeSlot, Attendance, AttendanceStatus, AttendanceStats } from '@/types/database';
import { motion } from 'framer-motion';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeSlot: TimeSlot;
  students: Student[];
  course: Course;
  existingAttendance: Attendance[];
  date: string;
  onSave: (attendanceData: Partial<Attendance>[]) => Promise<Attendance[] | undefined>;
  currentUserId: string;
}

interface AttendanceRecord {
  id?: string; // Add ID field to track existing records
  studentId: string;
  status: AttendanceStatus;
  remarks: string;
  isExisting: boolean; // Track if this is an existing record
  timeSlotId: string;
  courseId: string;
  date: string;
}

export default function AttendanceModal({
  isOpen,
  onClose,
  timeSlot,
  students,
  course,
  existingAttendance,
  date,
  onSave,
  currentUserId
}: AttendanceModalProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkAction, setBulkAction] = useState<AttendanceStatus | ''>('');
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log('=== ATTENDANCE MODAL DEBUG ===');
  console.log('TimeSlot:', timeSlot);
  console.log('Course:', course);
  console.log('Students received:', students.length);
  console.log('Existing attendance records:', existingAttendance.length);
  console.log('=== END DEBUG ===');

  // Initialize attendance records
  useEffect(() => {
    const records: Record<string, AttendanceRecord> = {};
    
    students.forEach(student => {
      const existing = existingAttendance.find(a => a.studentId === student.id);
      records[student.id] = {
        id: existing?.id, // Store existing ID if available
        studentId: student.id,
        status: existing ? existing.status : ('absent' as AttendanceStatus), // Default to 'absent' if no existing record
        remarks: existing?.remarks || '',
        isExisting: !!existing, // Mark if this is an existing record
        timeSlotId: timeSlot.id,
        courseId: course.id,
        date: date
      };
    });
    
    setAttendanceRecords(records);
  }, [students, existingAttendance, timeSlot.id, course.id, date]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks
      }
    }));
  };

  const handleBulkAction = () => {
    if (!bulkAction) return;
    
    const updatedRecords = { ...attendanceRecords };
    Object.keys(updatedRecords).forEach(studentId => {
      updatedRecords[studentId].status = bulkAction;
    });
    
    setAttendanceRecords(updatedRecords);
    setBulkAction('');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Build attendance data with proper uniqueness handling
      const attendanceData: Partial<Attendance>[] = Object.values(attendanceRecords).map(record => {
        // For existing records, include the ID to ensure update instead of create
        if (record.isExisting && record.id) {
          return {
            id: record.id,
            status: record.status,
            remarks: record.remarks,
            markedBy: currentUserId,
            markedAt: new Date()
          };
        } 
        // For new records, ensure we have the composite key fields
        else {
          return {
            studentId: record.studentId,
            timeSlotId: timeSlot.id,
            courseId: course.id,
            date: date,
            status: record.status,
            remarks: record.remarks,
            markedBy: currentUserId,
            markedAt: new Date()
          };
        }
      });
      
      const result = await onSave(attendanceData);
      if (result) {
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      setError(error?.message || 'Failed to save attendance. Please try again.');
      
      // Special handling for uniqueness constraint errors
      if (error?.message?.includes('uniqueness requirements')) {
        setError('Duplicate attendance records detected. Please refresh and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'absent': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'late': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'excused': return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const stats = {
    present: Object.values(attendanceRecords).filter(r => r.status === 'present').length,
    absent: Object.values(attendanceRecords).filter(r => r.status === 'absent').length,
    late: Object.values(attendanceRecords).filter(r => r.status === 'late').length,
    excused: Object.values(attendanceRecords).filter(r => r.status === 'excused').length
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mark Attendance</h2>
            <p className="text-sm text-gray-500 mt-1">
              {course.code} - {course.name} | Year {timeSlot.yearLevel} | {new Date(date).toLocaleDateString()}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-6 py-3 bg-red-100 border-b border-red-200">
            <p className="text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Present: {stats.present}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-500" />
                Absent: {stats.absent}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                Late: {stats.late}
              </span>
              <span className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                Excused: {stats.excused}
              </span>
            </div>
            
            {/* Bulk Actions */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Bulk Action:</span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value as Attendance['status'])}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                <option value="present">Mark All Present</option>
                <option value="absent">Mark All Absent</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {students.map((student, index) => {
              const record = attendanceRecords[student.id];
              
              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {student.studentId} - {student.firstName} {student.lastName}
                        {record?.isExisting && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full">
                            Previously Marked
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                    
                    {/* Status Buttons */}
                    <div className="flex items-center gap-2">
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => handleStatusChange(student.id, 'present' as AttendanceStatus)}
                          className={`px-3 py-1.5 rounded-md flex items-center gap-1 text-sm transition-colors ${
                            record?.status === 'present'
                              ? 'bg-green-100 text-green-700'
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Present
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.id, 'absent' as AttendanceStatus)}
                          className={`px-3 py-1.5 rounded-md flex items-center gap-1 text-sm transition-colors ${
                            record?.status === 'absent'
                              ? 'bg-red-100 text-red-700'
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          Absent
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.id, 'late' as AttendanceStatus)}
                          className={`px-3 py-1.5 rounded-md flex items-center gap-1 text-sm transition-colors ${
                            record?.status === 'late'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                          Late
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.id, 'excused' as AttendanceStatus)}
                          className={`px-3 py-1.5 rounded-md flex items-center gap-1 text-sm transition-colors ${
                            record?.status === 'excused'
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <AlertCircle className="w-4 h-4" />
                          Excused
                        </button>
                      </div>
                      
                      {/* Remarks */}
                      <input
                        type="text"
                        placeholder="Remarks (optional)"
                        value={record?.remarks || ''}
                        onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              <Users className="w-4 h-4 inline mr-1" />
              Total Students: {students.length}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}