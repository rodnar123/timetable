import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Department, Program, Course, Faculty, Student, Room, TimeSlot } from '@/types/database';

interface AnalyticsProps {
  departments: Department[];
  programs: Program[];
  courses: Course[];
  faculty: Faculty[];
  students: Student[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  showAlert: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function Analytics({
  departments,
  programs,
  courses,
  faculty,
  students,
  rooms,
  timeSlots,
  showAlert
}: AnalyticsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-3xl font-bold text-gray-800">Analytics & Reports</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Utilization */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Room Utilization</h3>
          <div className="space-y-3">
            {rooms.slice(0, 5).map(room => {
              const roomSlots = timeSlots.filter(s => s.roomId === room.id);
              const utilization = Math.round((roomSlots.length / 40) * 100); // Assume 40 hours/week max

              return (
                <div key={room.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-20">{room.code}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${utilization}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="bg-blue-500 h-2 rounded-full"
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{utilization}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Statistics */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Department Course Load</h3>
          <div className="space-y-3">
            {departments.map(dept => {
              const deptCourses = courses.filter(c => c.departmentId === dept.id);
              const deptFaculty = faculty.filter(f => f.departmentId === dept.id);

              return (
                <div key={dept.id} className="flex items-center justify-between">
                  <span className="text-sm">{dept.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{deptCourses.length} courses</span>
                    <span className="text-sm text-gray-600">{deptFaculty.length} faculty</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Student Statistics */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Student Distribution</h3>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{students.length}</p>
            <p className="text-sm text-gray-600">Total Students</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xl font-semibold text-green-600">
                {students.filter(s => {
                  const prog = programs.find(p => p.id === s.programId);
                  return prog?.level === 'undergraduate';
                }).length}
              </p>
              <p className="text-xs text-gray-600">Undergraduate</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-purple-600">
                {students.filter(s => {
                  const prog = programs.find(p => p.id === s.programId);
                  return prog?.level === 'postgraduate';
                }).length}
              </p>
              <p className="text-xs text-gray-600">Postgraduate</p>
            </div>
          </div>
        </div>

        {/* Reports Generation */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Generate Reports</h3>
          <div className="space-y-3">
            <button
              onClick={() => showAlert('info', 'Report generation coming soon')}
              className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium">Weekly Timetable Report</span>
              <FileText className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => showAlert('info', 'Report generation coming soon')}
              className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium">Faculty Workload Report</span>
              <FileText className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => showAlert('info', 'Report generation coming soon')}
              className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium">Room Utilization Report</span>
              <FileText className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => showAlert('info', 'Report generation coming soon')}
              className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium">Student Enrollment Report</span>
              <FileText className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
