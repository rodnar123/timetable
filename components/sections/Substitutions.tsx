import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Substitution, TimeSlot, Course, Faculty, ModalType } from '@/types/database';
import { getDayName } from '@/utils/helpers';

interface SubstitutionsProps {
  substitutions: Substitution[];
  timeSlots: TimeSlot[];
  courses: Course[];
  faculty: Faculty[];
  openModal: (type: ModalType, item?: any) => void;
  handleSubstitutionAction: (id: string, action: 'approve' | 'reject') => void;
}

export default function Substitutions({
  substitutions,
  timeSlots,
  courses,
  faculty,
  openModal,
  handleSubstitutionAction
}: SubstitutionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Substitutions</h2>
        <button
          onClick={() => openModal('substitution')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Substitution
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Original Slot</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Substitute</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Reason</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {substitutions.map((sub, index) => {
              const slot = timeSlots.find(s => s.id === sub.originalSlotId);
              const course = slot ? courses.find(c => c.id === slot.courseId) : null;
              const originalFaculty = slot ? faculty.find(f => f.id === slot.facultyId) : null;
              const substituteFaculty = sub.substituteFacultyId ? faculty.find(f => f.id === sub.substituteFacultyId) : null;

              return (
                <tr key={sub.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(sub.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {course?.code} - {originalFaculty?.firstName} {originalFaculty?.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {substituteFaculty ? `${substituteFaculty.firstName} ${substituteFaculty.lastName}` : 'Not assigned'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{sub.reason}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      sub.status === 'approved' ? 'bg-green-100 text-green-700' :
                      sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {sub.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleSubstitutionAction(sub.id, 'approve')}
                          className="text-green-600 hover:text-green-800 mr-3"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleSubstitutionAction(sub.id, 'reject')}
                          className="text-red-600 hover:text-red-800"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
