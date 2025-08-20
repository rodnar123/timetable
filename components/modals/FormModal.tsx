import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ModalType, Department, Program, Course, Faculty, Room, TimeSlot, Student, Substitution } from '@/types/database';
import { 
  DepartmentFormData, 
  ProgramFormData, 
  CourseFormData, 
  FacultyFormData, 
  RoomFormData, 
  StudentFormData, 
  SubstitutionFormData, 
  TimeSlotFormData, 
  SplitClassFormData, 
  JointSessionFormData 
} from '@/types/forms';

// Import form components
import DepartmentForm from './forms/DepartmentForm';
import ProgramForm from './forms/ProgramForm';
import CourseForm from './forms/CourseForm';
import FacultyForm from './forms/FacultyForm';
import RoomForm from './forms/RoomForm';
import StudentForm from './forms/StudentForm';

import SubstitutionForm from './forms/SubstitutionForm';
import TimeSlotForm from './forms/TimeSlotForm';
import JointSessionForm from './forms/JointSessionForm';
import SplitClassForm from './forms/SplitClassForm';

// Import DebugPanel at the top with your other imports
import DebugPanel from '@/components/DebugPanel';

interface FormModalProps {
  showModal: boolean;
  modalType: ModalType;
  editingItem: Department | Program | Course | Faculty | Room | TimeSlot | Student | Substitution | null;
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown>) => void;
  closeModal: () => void;
  handleCreate: () => void;
  handleUpdate: () => void;
  departments: Department[];
  programs: Program[];
  courses: Course[];
  faculty: Faculty[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  getDayName: (day: number) => string;
  conflictResult?: { canProceed: boolean; hasConflicts: boolean } | null;
}

const modalTitles: Record<ModalType, { create: string; edit: string }> = {
  department: { create: 'Add Department', edit: 'Edit Department' },
  program: { create: 'Add Program', edit: 'Edit Program' },
  course: { create: 'Add Course', edit: 'Edit Course' },
  faculty: { create: 'Add Faculty Member', edit: 'Edit Faculty Member' },
  room: { create: 'Add Room', edit: 'Edit Room' },
  student: { create: 'Add Student', edit: 'Edit Student' },
  timeslot: { create: 'Add Time Slot', edit: 'Edit Time Slot' },
  jointSession: { create: 'Create Joint Session', edit: 'Edit Joint Session' },
  classSplit: { create: 'Split Class into Groups', edit: 'Edit Class Groups' },
  substitution: { create: 'Add Substitution', edit: 'Edit Substitution' },
  conflict: { create: 'Add Conflict', edit: 'Edit Conflict' },
  // deletetimeslot: { create: 'Delete Time Slot', edit: 'Delete Time Slot' },
  academicCalendar: { create: '', edit: '' },
  attendance: { create: 'Add Attendance', edit: 'Edit Attendance' },
  report: { create: 'Add Report', edit: 'Edit Report' },
  alert: { create: 'Add Alert', edit: 'Edit Alert' },
  deleteRequest: {
    create: '',
    edit: ''
  },
  qrGenerator: {
    create: '',
    edit: ''
  },
  bulkImport: {
    create: '',
    edit: ''
  }
};

export default function FormModal({
  showModal,
  modalType,
  editingItem,
  formData,
  setFormData,
  closeModal,
  handleCreate,
  handleUpdate,
  departments,
  programs,
  courses,
  faculty,
  rooms,
  timeSlots,
  conflictResult
}: FormModalProps) {
  const [localConflictResult, setLocalConflictResult] = React.useState<{ canProceed: boolean; hasConflicts: boolean } | null>(null);
  
  const handleConflictChange = (result: { canProceed: boolean; hasConflicts: boolean } | null) => {
    setLocalConflictResult(result);
  };
  
  // Use local conflict result if available, otherwise use passed conflict result
  const currentConflictResult = localConflictResult || conflictResult;
  const renderForm = () => {
    switch (modalType) {
      case 'department':
        return <DepartmentForm formData={formData as unknown as DepartmentFormData} setFormData={setFormData as unknown as (data: DepartmentFormData) => void} />;
      case 'program':
        return <ProgramForm formData={formData as unknown as ProgramFormData} setFormData={setFormData as unknown as (data: ProgramFormData) => void} departments={departments} />;
      case 'course':
        return <CourseForm formData={formData as unknown as CourseFormData} setFormData={setFormData as unknown as (data: CourseFormData) => void} departments={departments} programs={programs} />;
      case 'faculty':
        return <FacultyForm formData={formData as unknown as FacultyFormData} setFormData={setFormData as unknown as (data: FacultyFormData) => void} departments={departments} />;
      case 'room':
        return <RoomForm formData={formData as any} setFormData={setFormData as any} departments={departments} />;
      case 'student':
        return <StudentForm formData={formData as unknown as StudentFormData} setFormData={setFormData as unknown as (data: StudentFormData) => void}  programs={programs} courses={courses}  />;
      case 'timeslot':
        return <TimeSlotForm formData={formData as unknown as TimeSlotFormData} setFormData={setFormData as unknown as (data: TimeSlotFormData) => void} departments={departments} courses={courses} faculty={faculty} rooms={rooms} />;
      case 'substitution':
        return <SubstitutionForm formData={formData as unknown as SubstitutionFormData} setFormData={setFormData} timeSlots={timeSlots} courses={courses} faculty={faculty} />;
      case 'jointSession':
        return <JointSessionForm formData={formData as unknown as JointSessionFormData} setFormData={setFormData} departments={departments} courses={courses} faculty={faculty} rooms={rooms} timeSlots={timeSlots} onConflictChange={handleConflictChange} />;
      case 'classSplit':
        return <SplitClassForm formData={formData as unknown as SplitClassFormData} setFormData={setFormData as unknown as (data: SplitClassFormData) => void} departments={departments} courses={courses} faculty={faculty} rooms={rooms} timeSlots={timeSlots} onConflictChange={handleConflictChange} />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editingItem ? modalTitles[modalType]?.edit : modalTitles[modalType]?.create}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {renderForm()}
            </div>

            {/* Debug Panel - only shown in development
            {process.env.NODE_ENV === 'development' && (
              <DebugPanel 
                show={modalType === 'jointSession'} 
                title="Joint Session Debug Data"
                data={{
                  formData,
                  editingItem,
                  hasId: editingItem?.id !== undefined,
                  groupId: formData?.groupId,
                  refId: formData?.refId,
                  courses: formData?.courses?.length
                }}
              />
            )} */}

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdate : handleCreate}
                disabled={!!(currentConflictResult && !currentConflictResult.canProceed)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentConflictResult && !currentConflictResult.canProceed
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
