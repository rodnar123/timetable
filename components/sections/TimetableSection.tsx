'use client';

import React, { useState, useMemo, useEffect, Dispatch, SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Edit, Trash2, AlertCircle, Printer, ChevronDown, ChevronUp, Clock, Users, Building2, Activity, CheckSquare, QrCode, Link, Unlink, Layers, GitBranch } from 'lucide-react';
import { TimeSlot, Course, Faculty, Room, Conflict, ModalType, Department, Student, Attendance, AttendanceCode, QRScanData, ConflictType, ConflictSeverity, GroupType } from '@/types/database';
import { getDayName} from '@/utils/helpers';
import PrintReport from '@/components/PrintReport';
import { checkTimeSlotConflicts } from '@/utils/conflictUtils';
import TimeSlotModal from '../modals/TimeSlotModal';
import AttendanceModal from '../modals/AttendanceModal';
import QRAttendanceGenerator from '../QRAttendanceGenerator';
import { TimetableDB } from '@/services/database';

interface TimetableSectionProps {
  timeSlots: TimeSlot[];
  courses: Course[];
  faculty: Faculty[];
  rooms: Room[];
  conflicts: Conflict[];
  departments: Department[];
  students: Student[];
  attendance: Attendance[];
  currentUser: { id: string; role: 'faculty' | 'admin' };
  selectedYear: string;
  selectedSemester: number;
  setSelectedYear: Dispatch<SetStateAction<string>>;
  setSelectedSemester: Dispatch<SetStateAction<number>>;
  setTimeSlots: Dispatch<SetStateAction<TimeSlot[]>>;
  setConflicts: Dispatch<SetStateAction<Conflict[]>>;
  openModal: (type: ModalType, item?: any) => void;
  showAlert: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  setFormData: Dispatch<SetStateAction<any>>;
  handleDelete: (type: string, id: string) => Promise<void>;
  onMarkAttendance: (attendanceData: Partial<Attendance>[]) => Promise<Attendance[] | undefined>;
  onGenerateQRCode?: (timeSlotId: string, courseId: string, date: string, startTime: string) => Promise<AttendanceCode | null>;
  onProcessQRAttendance?: (scanData: QRScanData) => Promise<{ success: boolean; message: string }>;
  db: TimetableDB | null; // Add database instance
  onRecalculateConflicts?: (slots: TimeSlot[]) => void; // NEW: callback to refresh conflicts
}

const TimetableSection: React.FC<TimetableSectionProps> = ({
  timeSlots,
  courses,
  faculty,
  rooms,
  conflicts,
  departments,
  students,
  attendance,
  currentUser,
  selectedYear,
  selectedSemester,
  setSelectedYear,
  setSelectedSemester,
  setTimeSlots,
  setConflicts,
  openModal,
  showAlert,
  setFormData,
  handleDelete,
  onMarkAttendance,
  onGenerateQRCode,
  onProcessQRAttendance,
  db,
  onRecalculateConflicts, // NEW
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>('all');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [isConflictSummaryOpen, setIsConflictSummaryOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<TimeSlot | null>(null);
  
  // Attendance modal states
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedAttendanceSlot, setSelectedAttendanceSlot] = useState<TimeSlot | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // QR Code modal states
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [selectedQRSlot, setSelectedQRSlot] = useState<TimeSlot | null>(null);

  // Joint session and class split states
  const [jointSessionMode, setJointSessionMode] = useState<boolean>(false);
  const [classSplitMode, setClassSplitMode] = useState<boolean>(false);

  // Add useEffect to clean up conflicts when time slots change
  useEffect(() => {
    const validSlotIds = new Set(timeSlots.map(slot => slot.id));
    const validConflicts = conflicts.filter(conflict => 
      conflict.affectedSlots.every(slotId => validSlotIds.has(slotId))
    );
    
    if (validConflicts.length !== conflicts.length) {
      setConflicts(validConflicts);
    }
  }, [timeSlots, conflicts, setConflicts]);

  const normalizeTimeSlot = (slot: TimeSlot): TimeSlot => ({
    ...slot,
    id: slot.id || '',
    academicYear: slot.academicYear || selectedYear,
    semester: slot.semester || selectedSemester,
    dayOfWeek: slot.dayOfWeek || selectedDay,
    startTime: slot.startTime || '08:00',
    endTime: slot.endTime || '09:00',
    courseId: slot.courseId || '',
    facultyId: slot.facultyId || '',
    roomId: slot.roomId || '',
    type: slot.type || 'Lecture',
    departmentId: slot.departmentId || '',
    yearLevel: slot.yearLevel || 1,
    isActive: slot.isActive !== undefined ? slot.isActive : true,
    createdAt: slot.createdAt || new Date(),
    updatedAt: slot.updatedAt || new Date(),
  });

  const isValidTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const filteredTimeSlots = useMemo(() => {
    // First pass: filter based on selected criteria
    const result = timeSlots
      .map(normalizeTimeSlot)
      .filter((slot) => {
        if (!slot || typeof slot !== 'object') {
          console.warn('Skipping invalid slot object:', slot);
          return false;
        }
        if (
          !slot.dayOfWeek ||
          !slot.startTime ||
          !slot.endTime ||
          !isValidTimeFormat(slot.startTime) ||
          !isValidTimeFormat(slot.endTime)
        ) {
          console.warn('Skipping slot with invalid time or day:', slot);
          return false;
        }
        const matchesYear = String(slot.academicYear) === String(selectedYear);
        const matchesSemester = Number(slot.semester) === Number(selectedSemester);
        const matchesCourse = selectedCourse === 'all' || slot.courseId === selectedCourse;
        const matchesFaculty = selectedFaculty === 'all' || slot.facultyId === selectedFaculty;
        const matchesRoom = selectedRoom === 'all' || slot.roomId === selectedRoom;
        const matchesYearLevel = selectedYearLevel === 'all' || slot.yearLevel?.toString() === selectedYearLevel;
        return matchesYear && matchesSemester && matchesCourse && matchesFaculty && matchesRoom && matchesYearLevel;
      });
    
    // Get all group IDs from the filtered results
    const includedGroupIds = new Set<string>();
    result.forEach(slot => {
      if (slot.groupId && (slot.groupType === GroupType.Joint || slot.groupType === GroupType.Split)) {
        includedGroupIds.add(slot.groupId);
      }
    });
    
    // Second pass: add related slots for joint sessions and split classes
    const additionalSlots = timeSlots
      .map(normalizeTimeSlot)
      .filter(slot => 
        slot.groupId && 
        includedGroupIds.has(slot.groupId) && 
        !result.some(r => r.id === slot.id)
      );
    
    return [...result, ...additionalSlots];
  }, [timeSlots, selectedYear, selectedSemester, selectedCourse, selectedFaculty, selectedRoom, selectedYearLevel]);

  const slotsByDayIndex = useMemo(() => {
    const index: Record<number, TimeSlot[]> = {};
    for (let i = 1; i <= 7; i++) {
      index[i] = [];
    }
    filteredTimeSlots.forEach((slot) => {
      const dayNum = Number(slot.dayOfWeek);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 7) {
        console.warn('Invalid dayOfWeek value:', slot.dayOfWeek, 'in slot:', slot);
        return;
      }
      index[dayNum].push(slot);
    });
    Object.keys(index).forEach((day) => {
      index[Number(day)].sort((a, b) => {
        try {
          const timeA = new Date(`1970/01/01 ${a.startTime}`).getTime();
          const timeB = new Date(`1970/01/01 ${b.startTime}`).getTime();
          return timeA - timeB;
        } catch (error) {
          console.error('Error sorting slots:', error);
          return 0;
        }
      });
    });
    return index;
  }, [filteredTimeSlots]);

  // Get attendance for a specific time slot and date - IMPROVED FUNCTION
  const getSlotAttendance = (slotId: string, date: string) => {
    // Normalize the date format to ensure consistent matching
    const normalizedDate = new Date(date).toISOString().split('T')[0];
    
    return attendance.filter(a => 
      a.timeSlotId === slotId && 
      new Date(a.date).toISOString().split('T')[0] === normalizedDate
    );
  };

  // Calculate summary statistics
  const totalSlots = filteredTimeSlots.length;
  const unresolvedConflicts = conflicts.filter(c => !c.resolved).length;
  const roomUtilization = rooms.length > 0 ? 
    Math.round((new Set(filteredTimeSlots.map(s => s.roomId)).size / rooms.length) * 100) : 0;
  const facultyWithClasses = new Set(filteredTimeSlots.map(s => s.facultyId)).size;

  const timePeriods = useMemo(() => {
    const periods = new Set<string>();
    filteredTimeSlots.forEach((slot) => {
      periods.add(`${slot.startTime}-${slot.endTime}`);
    });
    return Array.from(periods).sort();
  }, [filteredTimeSlots]);

  const getCourse = (courseId: string) => courses.find((c) => c.id === courseId);
  const getFaculty = (facultyId: string) => faculty.find((f) => f.id === facultyId);
  const getRoom = (roomId: string) => rooms.find((r) => r.id === roomId);

  const getSlotsForDay = (day: number) => slotsByDayIndex[day] || [];

  const hasConflict = (slotId: string) =>
    conflicts.some((c) => c.affectedSlots.includes(slotId) && !c.resolved);


  const getConflictTypes = (slotId: string) => {
    const slotConflicts = conflicts.filter(
      (c) => c.affectedSlots.includes(slotId) && !c.resolved,
    );
    return {
      hasFacultyConflict: slotConflicts.some((c) => c.type === 'faculty'),
      hasRoomConflict: slotConflicts.some((c) => c.type === 'room'),
      hasStudentGroupConflict: slotConflicts.some((c) => c.type === 'student_group'),
    };
  };

  const getConflictingSlots = (conflict: Conflict): TimeSlot[] => {
    const slots = timeSlots
      .filter((slot) => slot && conflict.affectedSlots.includes(slot.id))
      .map(normalizeTimeSlot)
      .filter(slot => slot.id);
    
    return slots;
  };

  const validateSlot = (slot: TimeSlot): { isValid: boolean; missingFields: string[] } => {
    const requiredFields: Record<string, any> = {
      id: slot.id,
      courseId: slot.courseId,
      facultyId: slot.facultyId,
      roomId: slot.roomId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      yearLevel: slot.yearLevel,
    };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([field]) => field);
    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  };

  const checkForConflicts = (slot: Partial<TimeSlot>, excludeSlotId?: string): Conflict[] => {
    if (
      !slot.dayOfWeek ||
      !slot.startTime ||
      !slot.endTime ||
      !slot.academicYear ||
      !slot.semester
    ) {
      return [];
    }

    if (!isValidTimeFormat(slot.startTime) || !isValidTimeFormat(slot.endTime)) {
      return [];
    }

    const start = new Date(`1970/01/01 ${slot.startTime}`).getTime();
    const end = new Date(`1970/01/01 ${slot.endTime}`).getTime();
    
    if (start >= end) {
      return [
      {
        id: `time-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        affectedSlots: [],
        details: 'Invalid time range: start time must be before end time',
        description: 'Time validation error',
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: ConflictType.Room,
        severity: ConflictSeverity.High
      },
      ];
    }

    const potentialConflicts: Conflict[] = [];
    const sameDaySlots = (slotsByDayIndex[slot.dayOfWeek] || [])
      .filter(s => s.id !== excludeSlotId)
      .filter(s => s.academicYear === slot.academicYear && s.semester === slot.semester)
      .filter(s => slot.yearLevel === undefined || s.yearLevel === slot.yearLevel);

    sameDaySlots.forEach((existingSlot) => {
      // NEW: Skip conflict checking if both slots are part of the same joint session
      if (slot.groupId && existingSlot.groupId && 
          slot.groupId === existingSlot.groupId && 
          slot.groupType === GroupType.Joint && 
          existingSlot.groupType === GroupType.Joint) {
        return; // Skip - this is intentional sharing for joint session
      }

      // NEW: Skip conflict checking if both slots are part of the same split class
      if (slot.groupId && existingSlot.groupId && 
          slot.groupId === existingSlot.groupId && 
          slot.groupType === GroupType.Split && 
          existingSlot.groupType === GroupType.Split) {
        return; // Skip - split classes can have different rooms/times
      }

      const newStart = new Date(`1970/01/01 ${slot.startTime}`).getTime();
      const newEnd = new Date(`1970/01/01 ${slot.endTime}`).getTime();
      const existingStart = new Date(`1970/01/01 ${existingSlot.startTime}`).getTime();
      const existingEnd = new Date(`1970/01/01 ${existingSlot.endTime}`).getTime();
      
      const hasTimeOverlap = newStart < existingEnd && newEnd > existingStart;
      
      if (hasTimeOverlap) {
        if (slot.facultyId && slot.facultyId === existingSlot.facultyId) {
          const facultyMember = getFaculty(slot.facultyId);
          potentialConflicts.push({
            id: `faculty-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            affectedSlots: [existingSlot.id],
            details: `Faculty member ${facultyMember?.firstName || 'Unknown'} ${facultyMember?.lastName || ''} is already scheduled from ${existingSlot.startTime} to ${existingSlot.endTime}`,
            description: `Faculty conflict: Teacher scheduled for multiple classes at the same time`,
            resolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            type: ConflictType.Faculty,
            severity: ConflictSeverity.High
          });
        }
        
        if (slot.roomId && slot.roomId === existingSlot.roomId) {
          const roomInfo = getRoom(slot.roomId);
          potentialConflicts.push({
            id: `room-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            affectedSlots: [existingSlot.id],
            details: `Room ${roomInfo?.name || 'Unknown'} is already booked from ${existingSlot.startTime} to ${existingSlot.endTime}`,
            description: `Room conflict: Multiple classes scheduled in the same room at the same time`,
            resolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            type: ConflictType.Room,
            severity: ConflictSeverity.High
          });
        }
        
        if (slot.yearLevel && slot.yearLevel === existingSlot.yearLevel) {
          const newCourse = getCourse(slot.courseId || '');
          const existingCourse = getCourse(existingSlot.courseId);
          const newCourseName = newCourse ? `${newCourse.code} (${newCourse.name})` : 'Unknown Course';
          const existingCourseName = existingCourse ? `${existingCourse.code} (${existingCourse.name})` : 'Unknown Course';
          
          potentialConflicts.push({
            id: `student-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            affectedSlots: [existingSlot.id],
            details: `Year ${slot.yearLevel} students have conflicting courses from ${existingSlot.startTime} to ${existingSlot.endTime}: ${newCourseName} and ${existingCourseName}`,
            description: `Course conflict: Students have multiple classes scheduled at the same time`,
            resolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            type: ConflictType.StudentGroup,
            severity: ConflictSeverity.High
          });
        }
      }
    });
    return potentialConflicts;
  };

  // Handle attendance marking
  const handleMarkAttendance = async (slot: TimeSlot) => {
    setSelectedAttendanceSlot(slot);
    setShowAttendanceModal(true);
  };

  // Updated handleSaveAttendance function to ensure proper refresh
  const handleSaveAttendance = async (attendanceData: Partial<Attendance>[]): Promise<Attendance[] | undefined> => {
    try {
      // Call the parent component's attendance update function
      const result = await onMarkAttendance(attendanceData);
      
      // Success message
      showAlert('success', 'Attendance marked successfully');
      
      // Close the modal
      setShowAttendanceModal(false);
      setSelectedAttendanceSlot(null);
      
      return result;
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      showAlert('error', 'Failed to mark attendance');
      throw error;
    }
  };

  // Handle QR code generation
  const handleGenerateQR = async (slot: TimeSlot) => {
    if (!onGenerateQRCode) {
      showAlert('warning', 'QR code generation is not available');
      return;
    }
    
    const course = getCourse(slot.courseId);
    if (!course) {
      showAlert('error', 'Course not found');
      return;
    }
    
    setSelectedQRSlot(slot);
    setShowQRGenerator(true);
  };

  // Updated handleEditTimeSlot
  const handleEditTimeSlot = (slot: TimeSlot) => {
    console.log('handleEditTimeSlot called for slot:', slot);
    
    const validation = validateSlot(slot);
    if (!validation.isValid) {
      showAlert('warning', `Cannot edit time slot. Missing fields: ${validation.missingFields.join(', ')}`);
      return;
    }
    
    // Open modal for editing
    setModalData(slot);
    setIsModalOpen(true);
  };

  // Updated handleAddTimeSlot
  const handleAddTimeSlot = () => {
    console.log('handleAddTimeSlot called');
    
    if (courses.length === 0 || faculty.length === 0 || rooms.length === 0) {
      showAlert('warning', 'Please add courses, faculty, and rooms before creating time slots.');
      return;
    }
    
    // Open modal for new time slot
    setModalData(null); // null indicates new entry
    setIsModalOpen(true);
  };

  // Updated handleSaveTimeSlot with database persistence
  const handleSaveTimeSlot = async (formData: Partial<TimeSlot>) => {
    if (!db) {
      showAlert('error', 'Database not initialized');
      return;
    }

    try {
      // Final conflict check (the modal already does this, but double-check)
      const conflictResult = checkTimeSlotConflicts(
        formData,
        timeSlots,
        formData.id
      );
      
      if (conflictResult.hasConflicts && !conflictResult.canProceed) {
        showAlert('error', 'Cannot save due to conflicts');
        throw new Error('Conflicts detected');
      }
      
      if (formData.id) {
        // Update existing - USE DATABASE
        const updated = await db.update<TimeSlot>('timeSlots', formData.id, {
          ...formData,
          updatedAt: new Date()
        });
        
        if (updated) {
          const updatedList = timeSlots.map(slot => slot.id === formData.id ? updated : slot);
          setTimeSlots(updatedList);
          
          // Clear conflicts for this slot
          const updatedConflicts = conflicts.filter(conflict => 
            !conflict.affectedSlots.includes(formData.id!)
          );
          setConflicts(updatedConflicts);
          
          onRecalculateConflicts?.(updatedList); // NEW: refresh conflicts
          showAlert('success', 'Time slot updated successfully');
        }
      } else {
        // Create new
        const newSlot = await db.create<TimeSlot>('timeSlots', {
          ...formData,
          academicYear: formData.academicYear || selectedYear,
          semester: formData.semester || selectedSemester,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as TimeSlot);
        const newList = [...timeSlots, newSlot];
        setTimeSlots(newList);
        onRecalculateConflicts?.(newList); // NEW
        showAlert('success', 'Time slot created successfully');
      }
    } catch (error) {
      console.error('Error saving time slot:', error);
      throw error; // Re-throw to prevent modal from closing
    }
  };

  // Delete handler for the modal
  const handleDeleteFromModal = async (id: string) => {
    await handleDeleteTimeSlot(id);
  };

  // Updated handleDeleteTimeSlot with database persistence
  const handleDeleteTimeSlot = async (slotId: string) => {
    console.log('handleDeleteTimeSlot called for slotId:', slotId);
    
    if (!db) {
      showAlert('error', 'Database not initialized');
      return;
    }
    
    const slot = timeSlots.find((s) => s.id === slotId);
    if (!slot) {
      showAlert('error', 'Time slot not found');
      return;
    }
    
    try {
      // Delete from database
      await db.delete('timeSlots', slotId);
      
      // Update state
      const remaining = timeSlots.filter(t => t.id !== slotId);
      setTimeSlots(remaining);
      
      // Clear conflicts for this slot
      const updatedConflicts = conflicts.filter(conflict => 
        !conflict.affectedSlots.includes(slotId)
      );
      setConflicts(updatedConflicts);
      
      onRecalculateConflicts?.(remaining); // NEW
      showAlert('success', 'Time slot deleted successfully');
    } catch (error) {
      console.error('Error deleting time slot:', error);
      showAlert('error', 'Failed to delete time slot');
    }
  };

  const handlePrint = () => {
    const reportData = {
      title: `Timetable - ${getDayName(selectedDay)}`,
      subtitle: `Academic Year: ${selectedYear}, Semester: ${selectedSemester}`,
      data: getSlotsForDay(selectedDay).map((slot) => {
        const course = getCourse(slot.courseId);
        const lecturer = getFaculty(slot.facultyId);
        const room = getRoom(slot.roomId);
        return {
          time: `${slot.startTime} - ${slot.endTime}`,
          course: `${course?.code} - ${course?.name}`,
          yearLevel: `Year ${slot.yearLevel || '?'}`,
          faculty: `${lecturer?.firstName} ${lecturer?.lastName}`,
          room: room?.name,
          type: slot.type,
        };
      }),
      filters: {
        course: selectedCourse === 'all' ? 'All Courses' : getCourse(selectedCourse)?.name,
        faculty: selectedFaculty === 'all' ? 'All Faculty' : `${getFaculty(selectedFaculty)?.firstName} ${getFaculty(selectedFaculty)?.lastName}`,
        room: selectedRoom === 'all' ? 'All Rooms' : getRoom(selectedRoom)?.name,
        yearLevel: selectedYearLevel === 'all' ? 'All Year Levels' : `Year ${selectedYearLevel}`,
      },
    };
    setPrintData(reportData);
    setShowPrintModal(true);
  };

  // Function to create a joint session
  const handleCreateJointSession = () => {
    openModal('jointSession', {
      dayOfWeek: selectedDay,
      academicYear: selectedYear,
      semester: selectedSemester,
      groupType: GroupType.Joint,
      // Generate a unique group ID for the joint session
      groupId: `joint-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    });
  };
  
  // Function to split a class into groups
  const handleSplitClass = (slot: TimeSlot) => {
    const course = getCourse(slot.courseId);
    if (!course) {
      showAlert('error', 'Course not found');
      return;
    }
    
    openModal('classSplit', {
      originalTimeSlot: slot,
      courseId: slot.courseId,
      courseName: course.name,
      facultyId: slot.facultyId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      yearLevel: slot.yearLevel,
      academicYear: slot.academicYear,
      semester: slot.semester,
      groupType: GroupType.Split,
      // Generate a unique group ID for the split groups
      groupId: `split-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    });
  };
  
  // Function to see all sessions of a joint class
  const findRelatedSessions = (slot: TimeSlot): TimeSlot[] => {
    if (!slot.groupId) return [slot];
    
    // If this is a joint session, find all slots with the same group ID
    if (slot.groupType === GroupType.Joint) {
      return timeSlots.filter(s => s.groupId === slot.groupId && s.groupType === GroupType.Joint);
    }
    
    // If this is a split class, find all splits with the same group ID
    if (slot.groupType === GroupType.Split) {
      return timeSlots.filter(s => s.groupId === slot.groupId && s.groupType === GroupType.Split);
    }
    
    return [slot];
  };
  
  // Updated function to display slot information
  const getSlotDisplayInfo = (slot: TimeSlot) => {
    const course = getCourse(slot.courseId);
    const lecturer = getFaculty(slot.facultyId);
    const room = getRoom(slot.roomId);
    
    // Check if this is part of a joint session or split class
    const isJoint = slot.groupType === GroupType.Joint;
    const isSplit = slot.groupType === GroupType.Split;
    
    // For joint sessions, show an indicator
    const jointLabel = isJoint ? ` (Joint Session)` : '';
    
    // For split classes, show the group name
    const splitLabel = isSplit ? ` (${slot.groupName || 'Group'})` : '';
    
    return {
      course,
      lecturer,
      room,
      isJoint,
      isSplit,
      jointLabel,
      splitLabel
    };
  };
  
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);

  // Update the handleRowClick function to set the selected time slot
  const handleRowClick = (slot: TimeSlot) => {
    setSelectedTimeSlot(selectedTimeSlot?.id === slot.id ? null : slot);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Timetable</h2>
          <p className="text-gray-600 mt-1">Manage class schedules and time slots</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCreateJointSession}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            disabled={isLoading}
            title="Create joint session with multiple classes sharing time, faculty and room"
            aria-label="Create joint session"
          >
            <Link className="w-4 h-4" />
            Joint Session
          </button>
          <button
            onClick={handleAddTimeSlot}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={isLoading}
            title="Add new time slot"
            aria-label="Add new time slot"
          >
            <Plus className="w-4 h-4" />
            Add Time Slot
          </button>
          <button
            onClick={() => {
              if (selectedTimeSlot) {
                // If a time slot is selected, use it for splitting
                const course = courses.find(c => c.id === selectedTimeSlot.courseId);
                openModal('classSplit', {
                  originalTimeSlot: selectedTimeSlot,
                  courseId: selectedTimeSlot.courseId,
                  courseName: course?.name,
                  facultyId: selectedTimeSlot.facultyId, 
                  dayOfWeek: selectedTimeSlot.dayOfWeek,
                  startTime: selectedTimeSlot.startTime,
                  endTime: selectedTimeSlot.endTime,
                  yearLevel: selectedTimeSlot.yearLevel,
                  departmentId: selectedTimeSlot.departmentId,
                  academicYear: selectedTimeSlot.academicYear,
                  semester: selectedTimeSlot.semester,
                  groupId: `split-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                });
              } else {
                // No time slot selected, open an empty form
                openModal('classSplit', {
                  groupId: `split-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  academicYear: selectedYear,
                  semester: selectedSemester
                });
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-rose-700 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            disabled={isLoading}
            title="Split class into groups"
            aria-label="Split class into groups"
          >
            <Layers className="w-4 h-4" />
            Split Class
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            disabled={isLoading}
            title="Print timetable report"
            aria-label="Print timetable report"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Slots</p>
              <p className="text-2xl font-bold text-gray-800">{totalSlots}</p>
              <p className="text-sm text-gray-500">This semester</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Conflicts</p>
              <p className="text-2xl font-bold text-red-600">{unresolvedConflicts}</p>
              <p className="text-sm text-gray-500">Need resolution</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Room Utilization</p>
              <p className="text-2xl font-bold text-gray-800">{roomUtilization}%</p>
              <p className="text-sm text-gray-500">Rooms in use</p>
            </div>
            <Building2 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Faculty</p>
              <p className="text-2xl font-bold text-gray-800">{facultyWithClasses}</p>
              <p className="text-sm text-gray-500">Have classes</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
        <div className="space-y-4">
          {/* Academic Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm font-medium text-gray-700">Academic Period:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select academic year"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select semester"
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>

          {/* Resource Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm font-medium text-gray-700">Filters:</span>
              <select
                value={selectedYearLevel}
                onChange={(e) => setSelectedYearLevel(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select year level filter"
              >
                <option value="all">All Year Levels</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select course filter"
              >
                <option value="all">All Courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select faculty filter"
              >
                <option value="all">All Faculty</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.firstName} {f.lastName}
                  </option>
                ))}
              </select>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select room filter"
              >
                <option value="all">All Rooms</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setSelectedCourse('all');
                  setSelectedFaculty('all');
                  setSelectedRoom('all');
                  setSelectedYearLevel('all');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                aria-label="Reset filters"
              >
                Reset filters
              </button>
            </div>
          </div>

          {/* Date picker for attendance */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Attendance Date:</span>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Select attendance date"
            />
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b" role="tablist">
          {[1, 2, 3, 4, 5, 6, 7].map((day, index) => (
            <motion.button
              key={day}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 px-4 py-3 font-medium transition-colors relative ${
                selectedDay === day
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              role="tab"
              aria-selected={selectedDay === day}
              aria-label={`View timetable for ${getDayName(day)}`}
            >
              {getDayName(day)}
              {getSlotsForDay(day).length > 0 && (
                <span className={`ml-1 text-xs rounded-full px-2 py-0.5 ${
                  selectedDay === day ? 'bg-blue-100' : 'bg-gray-200'
                }`}>
                  {getSlotsForDay(day).length}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Timetable Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faculty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getSlotsForDay(selectedDay).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium">No classes scheduled</p>
                    <p className="text-sm mt-1">Add time slots for {getDayName(selectedDay)}</p>
                  </td>
                </tr>
              ) : (
                getSlotsForDay(selectedDay).map((slot, index) => {
                  const displayInfo = getSlotDisplayInfo(slot);
                  const conflict = hasConflict(slot.id);
                  const conflictTypes = getConflictTypes(slot.id);
                  const slotAttendance = getSlotAttendance(slot.id, attendanceDate);
                  const isAttendanceMarked = slotAttendance.length > 0;
                  const presentCount = slotAttendance.filter(a => a.status === 'present').length;
                  const totalStudents = students.filter(s => s.currentYear === slot.yearLevel).length;
                  
                  // Determine if this is a joint or split session
                  const isJointSession = slot.groupType === GroupType.Joint;
                  const isSplitClass = slot.groupType === GroupType.Split;
                  
                  // Get related slots for joint sessions or split classes
                  const relatedSessions = findRelatedSessions(slot);
                  const hasMultipleRelatedSessions = relatedSessions.length > 1;

                  return (
                    <motion.tr
                      key={slot.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`${conflict ? 'bg-red-50' : 'hover:bg-gray-50'} 
                                  ${isJointSession ? 'border-l-4 border-purple-400' : ''} 
                                  ${isSplitClass ? 'border-l-4 border-green-400' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{slot.startTime} - {slot.endTime}</span>
                          {conflictTypes.hasStudentGroupConflict && (
                            <span title="Student group conflict" aria-label="Student group conflict">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-gray-900">
                              {displayInfo.course?.code || 'N/A'}
                            </span>
                            {isJointSession && (
                              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">
                                Joint
                              </span>
                            )}
                            {isSplitClass && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                {slot.groupName || 'Split'}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {displayInfo.course?.name || 'Unknown Course'}
                            {isJointSession && hasMultipleRelatedSessions && (
                              <span className="text-xs text-purple-600 ml-1">
                                (+{relatedSessions.length-1} more)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Year {slot.yearLevel || '?'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{displayInfo.lecturer ? `${displayInfo.lecturer.firstName} ${displayInfo.lecturer.lastName}` : 'No Faculty'}</span>
                          {conflictTypes.hasFacultyConflict && (
                            <span title="Faculty conflict" aria-label="Faculty conflict">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{displayInfo.room?.name || 'No Room'}</span>
                          {conflictTypes.hasRoomConflict && (
                            <span title="Room conflict" aria-label="Room conflict">
                              <AlertCircle className="w-4 h-4 text-purple-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          slot.type === 'Lecture'
                            ? 'bg-blue-100 text-blue-800'
                            : slot.type === 'Lab'
                            ? 'bg-green-100 text-green-800'
                            : slot.type === 'Tutorial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : slot.type === 'Seminar'
                            ? 'bg-indigo-100 text-indigo-800'
                            : slot.type === 'Workshop'
                            ? 'bg-pink-100 text-pink-800'
                            : slot.type === 'Exam'
                            ? 'bg-red-100 text-red-800'
                            : slot.type === 'Meeting'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {slot.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isAttendanceMarked ? (
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-green-500" />
                            <span className={`text-sm ${
                              presentCount > 0 
                                ? 'font-medium text-green-600' 
                                : 'text-amber-600'
                            }`}>
                              {presentCount}/{totalStudents} present
                              <span className="block text-xs text-gray-500">
                                {new Date(attendanceDate).toLocaleDateString()}
                              </span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Not marked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleGenerateQR(slot)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="Generate QR code for attendance"
                            aria-label={`Generate QR code for ${displayInfo.course?.name} at ${slot.startTime}`}
                            disabled={isLoading}
                          >
                            <QrCode className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(slot)}
                            className={`transition-colors ${
                              isAttendanceMarked
                                ? 'text-green-600 hover:text-green-900'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                            title={isAttendanceMarked ? 'Update attendance' : 'Mark attendance'}
                            aria-label={`${isAttendanceMarked ? 'Update' : 'Mark'} attendance for ${displayInfo.course?.name} at ${slot.startTime}`}
                            disabled={isLoading}
                          >
                            <CheckSquare className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEditTimeSlot(slot)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit time slot"
                            aria-label={`Edit time slot for ${displayInfo.course?.name} at ${slot.startTime}`}
                            disabled={isLoading}
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTimeSlot(slot.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete time slot"
                            aria-label={`Delete time slot for ${displayInfo.course?.name} at ${slot.startTime}`}
                            disabled={isLoading}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conflicts Summary */}
      {conflicts.length > 0 && conflicts.filter((c) => !c.resolved).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-amber-600 mr-2" aria-hidden="true" />
              <h3 className="text-amber-800 font-semibold">
                {conflicts.filter((c) => !c.resolved).length} Scheduling Conflict{conflicts.filter((c) => !c.resolved).length !== 1 ? 's' : ''} Detected
              </h3>
            </div>
            <button
              onClick={() => setIsConflictSummaryOpen(!isConflictSummaryOpen)}
              className="text-amber-600 hover:text-amber-800 transition-colors"
              aria-label={isConflictSummaryOpen ? 'Collapse conflict summary' : 'Expand conflict summary'}
            >
              {isConflictSummaryOpen ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
          {isConflictSummaryOpen && (
            <div className="space-y-3">
              {conflicts
                .filter((c) => !c.resolved)
                .map((conflict) => {
                  const slots = getConflictingSlots(conflict);
                  
                  if (slots.length === 0) {
                    return null;
                  }
                  
                  return (
                    <div key={conflict.id} className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-start gap-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          conflict.type === 'faculty'
                            ? 'bg-red-100 text-red-800'
                            : conflict.type === 'room'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {conflict.type.replace('_', ' ')}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-1">{conflict.details}</p>
                          <p className="text-sm text-gray-600 mb-2">{conflict.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {slots.map((slot) => {
                              const course = getCourse(slot.courseId);
                              return (
                                <button
                                  key={slot.id}
                                  onClick={() => handleEditTimeSlot(slot)}
                                  className="inline-flex items-center px-2 py-1 bg-amber-100 hover:bg-amber-200 rounded text-amber-700 text-xs transition-colors"
                                  aria-label={`Edit conflicting slot on ${getDayName(slot.dayOfWeek)} at ${slot.startTime}`}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  {getDayName(slot.dayOfWeek)} {slot.startTime}-{slot.endTime}
                                  {course && <span className="ml-1">({course.code})</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
                .filter(Boolean)}
              
              {conflicts.filter(c => !c.resolved && getConflictingSlots(c).length > 0).length === 0 && (
                <div className="text-sm text-amber-700 bg-white rounded-lg p-3 border border-amber-100">
                  <p>All conflicts have been resolved or the conflicting time slots have been removed.</p>
                </div>
              )}
              
              <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">💡 Tip:</span> Edit any conflicting time slot to change its schedule, or delete slots that are causing conflicts. The system will automatically update when conflicts are resolved.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {showPrintModal && printData && (
        <PrintReport data={printData} onClose={() => setShowPrintModal(false)} />
      )}

      {/* Time Slot Modal */}
      {isModalOpen && (
        <TimeSlotModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalData(null);
          }}
          onSave={handleSaveTimeSlot}
          onDelete={handleDeleteFromModal}
          data={modalData}
          courses={courses}
          faculty={faculty}
          rooms={rooms}
          existingSlots={timeSlots}
          departments={departments}
          selectedYear={selectedYear}
          selectedSemester={selectedSemester}
          selectedDay={selectedDay}
        />
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedAttendanceSlot && (
        <AttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => {
            setShowAttendanceModal(false);
            setSelectedAttendanceSlot(null);
          }}
          timeSlot={selectedAttendanceSlot}
          students={students.filter(s => 
            s.currentYear === Number(selectedAttendanceSlot.yearLevel) &&  
            s.enrolledCourses.includes(selectedAttendanceSlot.courseId)
          )}
          course={getCourse(selectedAttendanceSlot.courseId)!}
          existingAttendance={getSlotAttendance(selectedAttendanceSlot.id, attendanceDate)}
          date={attendanceDate}
          onSave={handleSaveAttendance}
          currentUserId={currentUser.id}
        />
      )}

      {/* QR Code Generator Modal */}
      {showQRGenerator && selectedQRSlot && (
        <QRAttendanceGenerator
          timeSlot={selectedQRSlot}
          course={getCourse(selectedQRSlot.courseId)!}
          date={attendanceDate}
          onClose={() => {
            setShowQRGenerator(false);
            setSelectedQRSlot(null);
          }}
        />
      )}
    </motion.div>
  );
};

export default TimetableSection;