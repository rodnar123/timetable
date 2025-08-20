'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save, Clock, Calendar } from 'lucide-react';
import { TimeSlot, Course, Faculty, Room, Department } from '@/types/database';

import { checkTimeSlotConflicts, findAvailableSlots, ConflictCheckResult } from '@/utils/conflictUtils';

import { getDayName } from '@/utils/helpers';
import TimeSlotForm from './forms/TimeSlotForm';
import { ConflictAlert } from '../ConflictAlert';

interface TimeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<TimeSlot>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  data?: TimeSlot | null;
  courses: Course[];
  faculty: Faculty[];
  rooms: Room[];
  departments: Department[];
  existingSlots: TimeSlot[];
  selectedYear: string;
  selectedSemester: number;
  selectedDay?: number;
}

const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  data,
  courses,
  faculty,
  rooms,
  departments,
  existingSlots,
  selectedYear,
  selectedSemester,
  selectedDay = 1
}) => {
  const [formData, setFormData] = useState<Partial<TimeSlot>>({
    courseId: '',
    facultyId: '',
    roomId: '',
    departmentId: '',
    dayOfWeek: selectedDay,
    startTime: '08:00',
    endTime: '10:00',

    academicYear: selectedYear,
    semester: selectedSemester,
    yearLevel: 1 // Default year level
  });
  
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvailableSlots, setShowAvailableSlots] = useState(true);

  // Initialize form data when modal opens
  useEffect(() => {
    if (data) {
      const course = courses.find(c => c.id === data.courseId);
      setFormData({
        ...data,
        departmentId: course?.departmentId || data.departmentId || ''
      });
    } else {
      // For new entries, find available slots
      const slots = findAvailableSlots(
        selectedDay,
        existingSlots,
        selectedYear,
        String(selectedSemester),
        formData.yearLevel !== undefined ? String(formData.yearLevel) : undefined // Consider year level
      );
      setAvailableSlots(slots);
      
      // If there are available slots, use the first one as default
      if (slots.length > 0) {
        setFormData(prev => ({
          ...prev,
          startTime: slots[0].start,
          endTime: slots[0].end,
          dayOfWeek: selectedDay,
          academicYear: selectedYear,
          semester: selectedSemester
        }));
      }
    }
    
    // Reset states
    setConflictResult(null);
    setShowAvailableSlots(true);
  }, [data, isOpen, selectedDay, selectedYear, selectedSemester]);

  // Check for conflicts whenever form data changes
  useEffect(() => {
    if (formData.startTime && formData.endTime && formData.dayOfWeek && formData.yearLevel) {
      const result = checkTimeSlotConflicts(
        formData,
        existingSlots,
        data?.id
      );
      setConflictResult(result);
    }
  }, [
    formData.startTime,
    formData.endTime,
    formData.dayOfWeek,
    formData.facultyId,
    formData.roomId,
    formData.courseId,
    formData.academicYear,
    formData.semester,
    formData.yearLevel
  ]);

  // Update available slots when day or year level changes
  useEffect(() => {
    if (formData.dayOfWeek) {
      const slots = findAvailableSlots(
        formData.dayOfWeek,
        existingSlots,
        formData.academicYear || selectedYear,
        formData.semester || selectedSemester,
        formData.yearLevel !== undefined ? String(formData.yearLevel) : undefined // Pass year level to filter available slots
      );
      setAvailableSlots(slots);
    }
  }, [formData.dayOfWeek, formData.academicYear, formData.semester, formData.yearLevel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    if (!formData.courseId || !formData.facultyId || !formData.roomId || !formData.yearLevel) {
      return;
    }

    // Check if we can proceed despite conflicts
    if (conflictResult && !conflictResult.canProceed) {
      return;
    }

    // If there are warnings, confirm with user
    if (conflictResult?.hasConflicts && conflictResult.canProceed) {
      const warnings = conflictResult.conflicts.filter(c => c.severity === 'warning');
      if (warnings.length > 0) {
        const confirmMessage = `There ${warnings.length === 1 ? 'is' : 'are'} ${warnings.length} warning${warnings.length === 1 ? '' : 's'}:\n\n` +
          warnings.map(w => `• ${w.message}`).join('\n') +
          '\n\nDo you want to continue?';
        
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save time slot:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSlotSelect = (slot: { start: string; end: string }) => {
    setFormData(prev => ({
      ...prev,
      startTime: slot.start,
      endTime: slot.end
    }));
    setShowAvailableSlots(false);
  };

  const handleDelete = async () => {
    if (data?.id && onDelete) {
      if (window.confirm('Are you sure you want to delete this time slot?')) {
        try {
          await onDelete(data.id);
          onClose();
        } catch (error) {
          console.error('Failed to delete time slot:', error);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {data ? 'Edit Time Slot' : 'Add Time Slot'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {getDayName(formData.dayOfWeek || selectedDay)}, Year {formData.yearLevel || '?'}, 
              {' '}{formData.academicYear} - Semester {formData.semester}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Available Slots Section */}
            {availableSlots.length > 0 && showAvailableSlots && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="font-medium text-green-800">
                      Available Time Slots on {getDayName(formData.dayOfWeek || selectedDay)} 
                      {formData.yearLevel && ` for Year ${formData.yearLevel}`}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvailableSlots(false)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableSlots.slice(0, 6).map((slot, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleQuickSlotSelect(slot)}
                      className={`px-3 py-2 text-sm rounded-lg transition-all ${
                        formData.startTime === slot.start && formData.endTime === slot.end
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                      }`}
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      {slot.start} - {slot.end}
                    </button>
                  ))}
                </div>
                {availableSlots.length > 6 && (
                  <p className="text-sm text-green-600 mt-2">
                    +{availableSlots.length - 6} more available slots
                  </p>
                )}
              </div>
            )}

            {/* No Available Slots Warning */}
            {availableSlots.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-medium text-amber-800">No Available Slots</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      All time slots on {getDayName(formData.dayOfWeek || selectedDay)} 
                      {formData.yearLevel && ` for Year ${formData.yearLevel}`} are occupied. 
                      Try selecting a different day, year level, or adjust existing schedules.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <TimeSlotForm
              formData={formData}
              setFormData={setFormData}
              departments={departments}
              courses={courses}
              faculty={faculty}
              rooms={rooms}
              academicYears={[selectedYear]}
              semesters={[selectedSemester]}
            />

            {/* Real-time Conflict Display */}
            {conflictResult && conflictResult.hasConflicts && (
              <ConflictAlert result={conflictResult} />
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-between">
            <div>
              {data && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Delete Time Slot
                </button>
              )}
            </div>
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
                disabled={isSubmitting || !!(conflictResult && !conflictResult.canProceed)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  isSubmitting || (conflictResult && !conflictResult.canProceed)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : (data ? 'Update' : 'Create')} Time Slot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotModal;