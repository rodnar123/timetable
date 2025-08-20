import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Building2, BookOpen, Users, GraduationCap, Database, AlertCircle, Activity, BookPlus, UserPlus, MapPin } from 'lucide-react';
import { Department, Program, Course, Faculty, Room, Student, TimeSlot, Conflict, ModalType } from '@/types/database';

interface DashboardProps {
  departments: Department[];
  courses: Course[];
  faculty: Faculty[];
  students: Student[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  conflicts: Conflict[];
  onGenerateTimetable: () => Promise<void>;
  onExport: () => Promise<void>;
  openModal: (type: ModalType, item?: any) => void;
  onMigrateTimeSlots: () => Promise<void>;
}

export default function Dashboard({
  departments,
  courses,
  faculty,
  students,
  rooms,
  timeSlots,
  conflicts,
  onGenerateTimetable,
  onExport,
  openModal
}: DashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
        <div className="flex gap-3">
          <button
            onClick={onGenerateTimetable}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Generate Timetable
          </button>
          <button
            onClick={onExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Departments</p>
              <p className="text-2xl font-bold text-gray-800">{departments.length}</p>
            </div>
            <Building2 className="w-10 h-10 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Courses</p>
              <p className="text-2xl font-bold text-gray-800">{courses.length}</p>
            </div>
            <BookOpen className="w-10 h-10 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Faculty Members</p>
              <p className="text-2xl font-bold text-gray-800">{faculty.length}</p>
            </div>
            <Users className="w-10 h-10 text-purple-500" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Students</p>
              <p className="text-2xl font-bold text-gray-800">{students.length}</p>
            </div>
            <GraduationCap className="w-10 h-10 text-orange-500" />
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">System Status</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Database className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">Database Connected</p>
              <p className="text-xs text-gray-500">All systems operational</p>
            </div>
          </div>
          {conflicts.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">{conflicts.length} Conflicts Detected</p>
                <p className="text-xs text-gray-500">Review and resolve scheduling conflicts</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Activity className="w-5 h-5 text-blue-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{timeSlots.length} Time Slots Scheduled</p>
              <p className="text-xs text-gray-500">Current semester timetable</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => openModal('department')}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center gap-2"
          >
            <Building2 className="w-6 h-6 text-gray-600" />
            <span className="text-sm">Add Department</span>
          </button>
          <button
            onClick={() => openModal('course')}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center gap-2"
          >
            <BookPlus className="w-6 h-6 text-gray-600" />
            <span className="text-sm">Add Course</span>
          </button>
          <button
            onClick={() => openModal('faculty')}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center gap-2"
          >
            <UserPlus className="w-6 h-6 text-gray-600" />
            <span className="text-sm">Add Faculty</span>
          </button>
          <button
            onClick={() => openModal('room')}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center gap-2"
          >
            <MapPin className="w-6 h-6 text-gray-600" />
            <span className="text-sm">Add Room</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
