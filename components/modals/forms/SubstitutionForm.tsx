import React from 'react';
import { TimeSlot, Course, Faculty } from '@/types/database';
import { getDayName } from '@/utils/helpers';

interface SubstitutionFormProps {
  formData: any;
  setFormData: (data: any) => void;
  timeSlots: TimeSlot[];
  courses: Course[];
  faculty: Faculty[];
}

export default function SubstitutionForm({ formData, setFormData, timeSlots, courses, faculty }: SubstitutionFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Original Time Slot</label>
        <select
          value={formData.originalSlotId || ''}
          onChange={(e) => setFormData({ ...formData, originalSlotId: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Time Slot</option>
          {timeSlots.map(slot => {
            const course = courses.find(c => c.id === slot.courseId);
            const facultyMember = faculty.find(f => f.id === slot.facultyId);
            return (
              <option key={slot.id} value={slot.id}>
                {getDayName(slot.dayOfWeek)} {slot.startTime} - {course?.code} ({facultyMember?.firstName} {facultyMember?.lastName})
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Substitute Faculty</label>
        <select
          value={formData.substituteFactoryId || ''}
          onChange={(e) => setFormData({ ...formData, substituteFactoryId: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Faculty</option>
          {faculty.map(member => (
            <option key={member.id} value={member.id}>
              {member.title} {member.firstName} {member.lastName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
        <input
          type="date"
          value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
          onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
        <textarea
          value={formData.reason || ''}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Reason for substitution..."
        />
      </div>
    </div>
  );
}
