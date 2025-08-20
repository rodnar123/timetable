import React from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus } from 'lucide-react';
import { AcademicCalendar as AcademicCalendarType } from '@/types/database';

interface AcademicCalendarProps {
  academicCalendar: AcademicCalendarType[];
  showAlert: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function AcademicCalendar({
  academicCalendar,
  showAlert
}: AcademicCalendarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Academic Calendar</h2>
        <button
          onClick={() => {
            showAlert('info', 'Calendar editing coming soon');
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <CalendarPlus className="w-4 h-4" />
          Add Academic Period
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="space-y-4">
          {academicCalendar.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No academic calendar entries yet</p>
          ) : (
            academicCalendar.map(cal => (
              <div key={cal.id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">
                  {cal.academicYear} - Semester {cal.semester}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Start Date:</span>
                    <p className="text-gray-700">{new Date(cal.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">End Date:</span>
                    <p className="text-gray-700">{new Date(cal.endDate).toLocaleDateString()}</p>
                  </div>
                  {cal.breakStart && (
                    <>
                      <div>
                        <span className="text-gray-500">Break Start:</span>
                        <p className="text-gray-700">{new Date(cal.breakStart).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Break End:</span>
                        <p className="text-gray-700">{new Date(cal.breakEnd!).toLocaleDateString()}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
