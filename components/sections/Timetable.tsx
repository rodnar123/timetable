'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Loader, Plus, Building2, Edit, Trash2, Search, Grid, List, User, 
  CalendarPlus, Download, Upload, X, FileText, CheckCircle, XCircle, 
  AlertTriangle, Info, Menu, Bell, Home, Calendar, School, BookOpen, 
  Users, GraduationCap, Building, RefreshCw, BarChart3, Settings, QrCode 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import types
import { 
  Department, Program, Course, Faculty, Room, TimeSlot, 
  Student, Substitution, Conflict, AcademicCalendar, 
  ModalType, AlertState, 
  Attendance,
  AttendanceCode,
  QRScanData,
  LessonType,
  ConflictType,
  ConflictSeverity,
  GroupType
} from '@/types/database';

// Import services
import { TimetableDB } from '@/services/database';

// Import utilities
import { generateColor, addHours, getDayName } from '@/utils/helpers';
import { processQRAttendance, generateAttendanceQRCode } from '@/utils/qrAttendanceHandler';

// Import components
import Alert from '@/components/Alert';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

// Import section components
import Dashboard from '@/components/sections/Dashboard';
import TimetableSection from '@/components/sections/TimetableSection';
import Departments from '@/components/sections/Departments';
import Programs from '@/components/sections/Programs';
import Courses from '@/components/sections/Courses';
import FacultySection from '@/components/sections/Faculty';
import Rooms from '@/components/sections/Rooms';
import Students from '@/components/sections/Students';
import Substitutions from '@/components/sections/Substitutions';
import AcademicCalendarSection from '@/components/sections/AcademicCalendar';
import Analytics from '@/components/sections/Analytics';
import SettingsSection from '@/components/sections/Settings';
import AttendanceSection from '@/components/sections/AttendanceSection';

// Import modal components
import FormModal from '@/components/modals/FormModal';

export default function TimetablePage() {
  // State Management
  const [db, setDb] = useState<TimetableDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  // Data States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [academicCalendar, setAcademicCalendar] = useState<AcademicCalendar[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceCodes, setAttendanceCodes] = useState<AttendanceCode[]>([]);

  // UI States
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedYear, setSelectedYear] = useState('2025');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('department');
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form States
  const [formData, setFormData] = useState<any>({});

  // Toast/Alert State
  const [alert, setAlert] = useState<AlertState>({ show: false, type: 'success', message: '' });

  // Current user (mock - replace with actual auth)
  const [currentUser] = useState({ id: 'faculty-1', role: 'faculty' as 'faculty' | 'admin' });

  // Initialize Database
  useEffect(() => {
    const initDB = async () => {
      try {
        const database = new TimetableDB();
        await database.init();
        setDb(database);
        await loadAllData(database);
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        showAlert('error', 'Failed to initialize database');
        setLoading(false);
      }
    };

    initDB();
  }, []);

  // Load all data from database
  const loadAllData = async (database: TimetableDB) => {
    try {
      const [
        depts, progs, crses, fac, rms, slots, stds, subs, conf, cal, att, codes
      ] = await Promise.all([
        database.getAll<Department>('departments'),
        database.getAll<Program>('programs'),
        database.getAll<Course>('courses'),
        database.getAll<Faculty>('faculty'),
        database.getAll<Room>('rooms'),
        database.getAll<TimeSlot>('timeSlots'),
        database.getAll<Student>('students'),
        database.getAll<Substitution>('substitutions'),
        database.getAll<Conflict>('conflicts'),
        database.getAll<AcademicCalendar>('academicCalendar'),
        database.getAll<Attendance>('attendance').catch(() => []),
        database.getAll<AttendanceCode>('attendanceCodes').catch(() => [])
      ]);

      setDepartments(depts);
      setPrograms(progs);
      setCourses(crses);
      setFaculty(fac);
      setRooms(rms);
      setTimeSlots(slots);
      setStudents(stds);
      setSubstitutions(subs);
      setConflicts(conf);
      setAcademicCalendar(cal);
      setAttendance(att);
      setAttendanceCodes(codes);
    } catch (error) {
      console.error('Failed to load data:', error);
      showAlert('error', 'Failed to load data');
    }
  };

  // Alert Helper
  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type, message: '' }), 3000);
  };

  // Modal Handlers
 // Replace the openModal function in your parent component with this:

// Replace these functions in your parent component (TimetablePage)

// 1. Improve the openModal function to better handle joint sessions
const openModal = (type: ModalType | 'deletetimeslot', item?: any) => {
  setModalType(type as ModalType);
  
  // For joint sessions, we need to ensure we have a valid editingItem with an id
  if (type === 'jointSession' && item) {
    // When editing, find all time slots with this groupId to get complete data
    if (item.groupId) {
      const groupSlots = timeSlots.filter(slot => slot.groupId === item.groupId);
      if (groupSlots.length > 0) {
        // Use the first slot of the group as our editing item
        // This ensures we have a valid ID for the update operation
        setEditingItem(groupSlots[0]);
        
        // Set form data with enough info for the form to load all related courses
        setFormData({
          groupId: item.groupId,
          facultyId: item.facultyId || groupSlots[0].facultyId,
          roomId: item.roomId || groupSlots[0].roomId,
          dayOfWeek: item.dayOfWeek || groupSlots[0].dayOfWeek,
          startTime: item.startTime || groupSlots[0].startTime,
          endTime: item.endTime || groupSlots[0].endTime,
          type: item.type || groupSlots[0].type,
          academicYear: item.academicYear || selectedYear,
          semester: item.semester || selectedSemester,
          // Set a reference to one of the actual time slots for this group
          refId: groupSlots[0].id,
          // We'll load courses in the form component
        });
      } else {
        showAlert('error', 'Could not find time slots for this joint session');
        return; // Don't open modal if we can't find the data
      }
    } else {
      // This is a new joint session
      setEditingItem(null);
      setFormData({
        groupId: `joint-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
        // Initialize with empty values but with required semester/year data
        courses: [],
        dayOfWeek: item.dayOfWeek || 1,
        academicYear: selectedYear,
        semester: selectedSemester,
        groupType: GroupType.Joint
      });
    }
  } else if (type === 'deletetimeslot' && item) {
    setEditingItem(item);
    setFormData(item);
  } else if (type === 'student' && item) {
    setEditingItem(item);
    // Special handling for student data
    // ...existing code...
  } else if (type === 'course' && item) {
    setEditingItem(item);
    // ...existing code...
  } else {
    setEditingItem(item || null);
    setFormData(item || {});
  }
  
  setShowModal(true);
};

  

// 2. Replace the closeModal function to clear formData properly
const closeModal = () => {
  // Remove console.log for production
  setShowModal(false);
  setEditingItem(null);
  setFormData({});
  // Force a small delay to ensure state is cleared
  setTimeout(() => {
    setFormData({});
  }, 100);
};
  // CRUD Handlers
// Complete handleCreate function
const handleCreate = async () => {
  if (!db) return;

  try {
    let result;
    switch (modalType) {
      case 'department':
        result = await db.create<Department>('departments', {
          ...formData,
          updatedAt: new Date()
        });
        setDepartments([...departments, result]);
        break;
        
      case 'program':
        result = await db.create<Program>('programs', {
          ...formData,
          duration: formData.duration ? parseInt(formData.duration.toString()) : 4,
          totalCredits: formData.totalCredits ? parseInt(formData.totalCredits.toString()) : 120,
          maxEnrollment: formData.maxEnrollment ? parseInt(formData.maxEnrollment.toString()) : undefined,
          prerequisites: Array.isArray(formData.prerequisites) ? formData.prerequisites : [],
          updatedAt: new Date()
        });
        setPrograms([...programs, result]);
        break;
        
      case 'course':
        // Process course data to ensure correct types
        const courseData = {
          ...formData,
          // Ensure yearLevel and semester are numbers, never null
          yearLevel: formData.yearLevel 
            ? parseInt(formData.yearLevel.toString()) 
            : 1, // Default to 1
          semester: formData.semester 
            ? parseInt(formData.semester.toString()) 
            : 1, // Default to 1
          credits: formData.credits 
            ? parseInt(formData.credits.toString()) 
            : 3, // Default credits
          // Ensure other fields
          prerequisites: Array.isArray(formData.prerequisites) ? formData.prerequisites : [],
          isCore: formData.isCore === true,
          color: formData.color || generateColor(),
          updatedAt: new Date()
        };
        
        console.log('Creating course with data:', {
          yearLevel: courseData.yearLevel,
          semester: courseData.semester
        });
        
        result = await db.create<Course>('courses', courseData);
        setCourses([...courses, result]);
        break;
        
      case 'faculty':
        result = await db.create<Faculty>('faculty', {
          ...formData,
          qualifications: Array.isArray(formData.qualifications) ? formData.qualifications : [],
          preferences: formData.preferences || {},
          updatedAt: new Date()
        });
        setFaculty([...faculty, result]);
        break;
        
      case 'room':
        result = await db.create<Room>('rooms', {
          ...formData,
          capacity: formData.capacity ? parseInt(formData.capacity.toString()) : 30,
          floor: formData.floor ? parseInt(formData.floor.toString()) : undefined,
          equipment: Array.isArray(formData.equipment) ? formData.equipment : [],
          features: Array.isArray(formData.features) ? formData.features : [],
          available: formData.available !== false,
          updatedAt: new Date()
        });
        setRooms([...rooms, result]);
        break;
        
      case 'student':
        // Process student data to ensure correct types
        const studentData = {
          ...formData,
          // Convert semester and year to numbers
          currentSemester: formData.currentSemester 
            ? parseInt(formData.currentSemester.toString()) 
            : 1,
          currentYear: formData.currentYear 
            ? parseInt(formData.currentYear.toString()) 
            : 1,
          // Ensure arrays are properly formatted
          enrolledCourses: Array.isArray(formData.enrolledCourses) 
            ? formData.enrolledCourses 
            : [],
          completedCourses: Array.isArray(formData.completedCourses) 
            ? formData.completedCourses 
            : [],
          // Handle GPA - convert to number or set to null
          gpa: formData.gpa !== undefined && formData.gpa !== '' && formData.gpa !== null
            ? parseFloat(formData.gpa.toString()) 
            : null,
          // Ensure status and type have defaults
          status: formData.status || 'active',
          studentType: formData.studentType || 'regular',
          // Handle enrollment date
          enrollmentDate: formData.enrollmentDate ? new Date(formData.enrollmentDate) : new Date(),
          // Set timestamps
          updatedAt: new Date()
        };
        
        console.log('Creating student with processed data:', {
          semester: studentData.currentSemester,
          year: studentData.currentYear,
          courses: studentData.enrolledCourses.length
        });
        
        result = await db.create<Student>('students', studentData);
        setStudents([...students, result]);
        break;
        
      case 'timeslot':
        result = await db.create<TimeSlot>('timeSlots', {
          ...formData,
          dayOfWeek: formData.dayOfWeek ? parseInt(formData.dayOfWeek.toString()) : 1,
          yearLevel: formData.yearLevel ? parseInt(formData.yearLevel.toString()) : 1,
          academicYear: formData.academicYear || selectedYear,
          semester: formData.semester || selectedSemester,
          isActive: true,
          updatedAt: new Date()
        });
        setTimeSlots([...timeSlots, result]);
        await checkConflicts();
        break;
        
      case 'substitution':
        result = await db.create<Substitution>('substitutions', {
          ...formData,
          date: new Date(formData.date),
          status: formData.status || 'pending',
          notificationSent: false,
          createdBy: currentUser.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        setSubstitutions([...substitutions, result]);
        break;
        
      case 'academicCalendar':
        result = await db.create<AcademicCalendar>('academicCalendar', {
          ...formData,
          semester: formData.semester ? parseInt(formData.semester.toString()) : 1,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
          breakStart: formData.breakStart ? new Date(formData.breakStart) : undefined,
          breakEnd: formData.breakEnd ? new Date(formData.breakEnd) : undefined,
          examStart: formData.examStart ? new Date(formData.examStart) : undefined,
          examEnd: formData.examEnd ? new Date(formData.examEnd) : undefined,
          holidays: Array.isArray(formData.holidays) ? formData.holidays : [],
          importantDates: Array.isArray(formData.importantDates) ? formData.importantDates : [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        setAcademicCalendar([...academicCalendar, result]);
        break;
        
      case 'jointSession':
        // Validate required fields before creating
        if (!formData.courses || formData.courses.length === 0) {
          showAlert('error', 'Please select at least one course for the joint session');
          return;
        }
        
        if (!formData.facultyId) {
          showAlert('error', 'Please select a faculty member');
          return;
        }
        
        if (!formData.roomId) {
          showAlert('error', 'Please select a room');
          return;
        }
        
        if (!formData.startTime || !formData.endTime) {
          showAlert('error', 'Please set start and end times');
          return;
        }
        
        // Create joint sessions with validated data
        const jointSessions = [];
        
        // Create a time slot for each course in the joint session
        for (let i = 0; i < formData.courses.length; i++) {
          const courseId = formData.courses[i];
          const course = courses.find(c => c.id === courseId);
          
          if (!course) {
            showAlert('error', `Course not found: ${courseId}`);
            continue;
          }
          
          try {
            const newJointSlot = await db.create<TimeSlot>('timeSlots', {
              courseId: courseId,
              facultyId: formData.facultyId,
              roomId: formData.roomId,
              departmentId: course?.departmentId || departments[0].id,
              dayOfWeek: parseInt(formData.dayOfWeek.toString()) || 1,
              startTime: formData.startTime,
              endTime: formData.endTime,
              type: formData.type || LessonType.Lecture,
              yearLevel: course?.yearLevel || 1,
              groupId: formData.groupId,
              groupType: GroupType.Joint,
              academicYear: formData.academicYear || selectedYear,
              semester: parseInt(formData.semester?.toString()) || selectedSemester,
              isActive: true,
          
            
            });
            
            jointSessions.push(newJointSlot);
          } catch (error) {
            console.error(`Failed to create time slot for course ${courseId}:`, error);
            showAlert('error', `Failed to create time slot for course ${course.code}`);
          }
        }
        
        if (jointSessions.length > 0) {
          setTimeSlots([...timeSlots, ...jointSessions]);
          await checkConflicts();
          showAlert('success', 'Joint session created successfully');
        } else {
          showAlert('error', 'Failed to create any time slots for joint session');
          return; // Don't close modal if nothing was created
        }
        break;
        
      case 'classSplit':
        // Handle creation of class splits
        const splitGroups = [];
        const originalSlot = formData.originalTimeSlot;
        
        // Delete the original time slot if it exists
        if (originalSlot?.id) {
          await db.delete('timeSlots', originalSlot.id);
          setTimeSlots(timeSlots.filter(t => t.id !== originalSlot.id));
        }
        
        // Create a time slot for each group
        for (let i = 0; i < formData.groups.length; i++) {
          const group = formData.groups[i];
          
          const newSplitSlot = await db.create<TimeSlot>('timeSlots', {
            courseId: formData.courseId,
            facultyId: group.facultyId || formData.facultyId,
            roomId: group.roomId,
            departmentId: formData.departmentId || departments[0].id,
            dayOfWeek: group.dayOfWeek || formData.dayOfWeek,
            startTime: group.startTime || formData.startTime,
            endTime: group.endTime || formData.endTime,
            type: formData.type || 'Lecture',
            yearLevel: formData.yearLevel,
            groupId: formData.groupId,
            groupType: GroupType.Split,
            groupName: group.name || `Group ${i + 1}`,
            maxStudents: group.maxStudents,
            academicYear: formData.academicYear || selectedYear,
            semester: formData.semester || selectedSemester,
            isActive: true,
           
          });
          
          splitGroups.push(newSplitSlot);
        }
        
        setTimeSlots([...timeSlots, ...splitGroups]);
        await checkConflicts();
        showAlert('success', 'Class split into groups successfully');
        break;
        
      }

      showAlert('success', `${modalType} created successfully`);
      closeModal();
    } catch (error) {
      console.error('Failed to create:', error);
      showAlert('error', `Failed to create ${modalType}`);
    }
  };
  
  // Update the handleUpdate function to handle joint sessions and class splits
  const handleUpdate = async () => {
    if (!db || !editingItem) return;

    try {
      let result;
      switch (modalType) {
        case 'department':
          result = await db.update<Department>('departments', editingItem.id, {
            ...formData,
            updatedAt: new Date()
          });
          setDepartments(departments.map(d => d.id === editingItem.id ? result! : d));
          break;
          
        case 'program':
          result = await db.update<Program>('programs', editingItem.id, {
            ...formData,
            duration: formData.duration ? parseInt(formData.duration.toString()) : 4,
            totalCredits: formData.totalCredits ? parseInt(formData.totalCredits.toString()) : 120,
            maxEnrollment: formData.maxEnrollment ? parseInt(formData.maxEnrollment.toString()) : undefined,
            prerequisites: Array.isArray(formData.prerequisites) ? formData.prerequisites : [],
            updatedAt: new Date()
          });
          setPrograms(programs.map(p => p.id === editingItem.id ? result! : p));
          break;
          
        case 'course':
          // Process course data to ensure correct types
          const courseUpdateData = {
            ...formData,
            // Ensure yearLevel and semester are numbers, never null
            yearLevel: formData.yearLevel 
              ? parseInt(formData.yearLevel.toString()) 
              : 1, // Default to 1 instead of null
            semester: formData.semester 
              ? parseInt(formData.semester.toString()) 
              : 1, // Default to 1 instead of null
            credits: formData.credits 
              ? parseInt(formData.credits.toString()) 
              : 3, // Default credits
            // Ensure other fields
            prerequisites: Array.isArray(formData.prerequisites) ? formData.prerequisites : [],
            isCore: formData.isCore === true, // Ensure boolean
            color: formData.color || 'bg-gray-400',
            updatedAt: new Date()
          };
          
          console.log('Updating course with data:', {
            id: editingItem.id,
            yearLevel: courseUpdateData.yearLevel,
            semester: courseUpdateData.semester
          });
          
          result = await db.update<Course>('courses', editingItem.id, courseUpdateData);
          setCourses(courses.map(c => c.id === editingItem.id ? result! : c));
          break;
          
        case 'faculty':
          result = await db.update<Faculty>('faculty', editingItem.id, {
            ...formData,
            qualifications: Array.isArray(formData.qualifications) ? formData.qualifications : [],
            preferences: formData.preferences || {},
            updatedAt: new Date()
          });
          setFaculty(faculty.map(f => f.id === editingItem.id ? result! : f));
          break;
          
        case 'room':
          result = await db.update<Room>('rooms', editingItem.id, {
            ...formData,
            capacity: formData.capacity ? parseInt(formData.capacity.toString()) : 30,
            floor: formData.floor ? parseInt(formData.floor.toString()) : undefined,
            equipment: Array.isArray(formData.equipment) ? formData.equipment : [],
            features: Array.isArray(formData.features) ? formData.features : [],
            available: formData.available !== false,
            updatedAt: new Date()
          });
          setRooms(rooms.map(r => r.id === editingItem.id ? result! : r));
          break;
          
        case 'student':
          // Process student data to ensure correct types
          const studentUpdateData = {
            ...formData,
            // Convert semester and year to numbers
            currentSemester: formData.currentSemester 
              ? parseInt(formData.currentSemester.toString()) 
              : 1,
            currentYear: formData.currentYear 
              ? parseInt(formData.currentYear.toString()) 
              : 1,
            // Ensure arrays are properly formatted
            enrolledCourses: Array.isArray(formData.enrolledCourses) 
              ? formData.enrolledCourses 
              : [],
            completedCourses: Array.isArray(formData.completedCourses) 
              ? formData.completedCourses 
              : [],
            // Handle GPA - convert to number or set to null
            gpa: formData.gpa !== undefined && formData.gpa !== '' && formData.gpa !== null
              ? parseFloat(formData.gpa.toString()) 
              : null,
            // Ensure status and type have defaults
            status: formData.status || 'active',
            studentType: formData.studentType || 'regular',
            // Handle enrollment date
            enrollmentDate: formData.enrollmentDate ? new Date(formData.enrollmentDate) : undefined,
            // Update timestamp
            updatedAt: new Date()
          };
          
          console.log('Updating student with processed data:', {
            id: editingItem.id,
            semester: studentUpdateData.currentSemester,
            year: studentUpdateData.currentYear,
            courses: studentUpdateData.enrolledCourses.length
          });
          
          result = await db.update<Student>('students', editingItem.id, studentUpdateData);
          setStudents(students.map(s => s.id === editingItem.id ? result! : s));
          break;
          
        case 'timeslot':
          result = await db.update<TimeSlot>('timeSlots', editingItem.id, {
            ...formData,
            dayOfWeek: formData.dayOfWeek ? parseInt(formData.dayOfWeek.toString()) : 1,
            yearLevel: formData.yearLevel ? parseInt(formData.yearLevel.toString()) : 1,
            academicYear: formData.academicYear || selectedYear,
            semester: formData.semester || selectedSemester,
            updatedAt: new Date()
          });
          setTimeSlots(timeSlots.map(t => t.id === editingItem.id ? result! : t));
          await checkConflicts();
          break;
          
        case 'substitution':
          result = await db.update<Substitution>('substitutions', editingItem.id, {
            ...formData,
            date: new Date(formData.date),
            updatedAt: new Date()
          });
          setSubstitutions(substitutions.map(s => s.id === editingItem.id ? result! : s));
          break;
          
        case 'academicCalendar':
          result = await db.update<AcademicCalendar>('academicCalendar', editingItem.id, {
            ...formData,
            semester: formData.semester ? parseInt(formData.semester.toString()) : 1,
            startDate: new Date(formData.startDate),
            endDate: new Date(formData.endDate),
            breakStart: formData.breakStart ? new Date(formData.breakStart) : undefined,
            breakEnd: formData.breakEnd ? new Date(formData.breakEnd) : undefined,
            examStart: formData.examStart ? new Date(formData.examStart) : undefined,
            examEnd: formData.examEnd ? new Date(formData.examEnd) : undefined,
            holidays: Array.isArray(formData.holidays) ? formData.holidays : [],
            importantDates: Array.isArray(formData.importantDates) ? formData.importantDates : [],
            updatedAt: new Date()
          });
          setAcademicCalendar(academicCalendar.map(a => a.id === editingItem.id ? result! : a));
          break;
          
        case 'jointSession':
          // Handle updating joint sessions
          try {
            // Validate required fields
            if (!formData.groupId) {
              showAlert('error', 'Missing groupId for joint session update');
              return; // Don't proceed with update
            }
            
            if (!formData.courses || formData.courses.length === 0) {
              showAlert('error', 'Please select at least one course for the joint session');
              return; // Don't proceed with update
            }
            
            if (!formData.facultyId || !formData.roomId || !formData.startTime || !formData.endTime) {
              showAlert('error', 'Please complete all required fields');
              return; // Don't proceed with update
            }
            
            // (Optional) Add time validation here if needed
            
            // Ensure dayOfWeek is a number
            const dayOfWeek = parseInt(formData.dayOfWeek?.toString() || "1");
            if (isNaN(dayOfWeek)) {
              showAlert('error', 'Invalid day of week');
              return; // Don't proceed with update
            }
            
            // Find all existing sessions with this group ID
            const existingJointSlots = timeSlots.filter(
              slot => slot.groupId === formData.groupId
            );
            
            // Delete sessions that are no longer part of the joint session
            const coursesToKeep = new Set(formData.courses);
            for (const slot of existingJointSlots) {
              if (!coursesToKeep.has(slot.courseId)) {
                await db.delete('timeSlots', slot.id);
                setTimeSlots(prev => prev.filter(t => t.id !== slot.id));
              }
            }
            
            // Update existing slots and create new ones as needed
            const updatedJointSessions: TimeSlot[] = [];
            
            for (const courseId of formData.courses) {
              const existingSlot = existingJointSlots.find(s => s.courseId === courseId);
              const course = courses.find(c => c.id === courseId);
              
              if (!course) {
                showAlert('warning', `Course not found: ${courseId}`);
                continue;
              }
              
              if (existingSlot) {
                // Update existing slot
                const updated = await db.update<TimeSlot>('timeSlots', existingSlot.id, {
                  facultyId: formData.facultyId,
                  roomId: formData.roomId,
                  dayOfWeek: dayOfWeek,
                  startTime: formData.startTime,
                  endTime: formData.endTime,
                  type: formData.type || existingSlot.type,
                  updatedAt: new Date()
                });
                
                if (updated) {
                  updatedJointSessions.push(updated);
                }
              } else {
                // Create new slot for this course
                const newJointSlot = await db.create<TimeSlot>('timeSlots', {
                  courseId: courseId,
                  facultyId: formData.facultyId,
                  roomId: formData.roomId,
                  departmentId: course?.departmentId || departments[0].id,
                  dayOfWeek: dayOfWeek,
                  startTime: formData.startTime,
                  endTime: formData.endTime,
                  type: formData.type || LessonType.Lecture,
                  yearLevel: course?.yearLevel || 1,
                  groupId: formData.groupId,
                  groupType: GroupType.Joint,
                  academicYear: formData.academicYear || selectedYear,
                  semester: parseInt(formData.semester?.toString()) || selectedSemester,
                  isActive: true
                });
                
                updatedJointSessions.push(newJointSlot);
              }
            }
            
            // Update timeSlots state
            if (updatedJointSessions.length > 0) {
              setTimeSlots(prev => {
                // Filter out existing joint session slots with this group ID
                const filtered = prev.filter(slot => 
                  !(slot.groupId === formData.groupId && slot.groupType === GroupType.Joint)
                );
                // Add the updated ones
                return [...filtered, ...updatedJointSessions];
              });
              
              await checkConflicts();
              showAlert('success', 'Joint session updated successfully');
            } else {
              showAlert('error', 'No time slots were updated or created');
              return; // Don't close modal if nothing was updated
            }
          } catch (error) {
            console.error('Failed to update joint session:', error);
            showAlert('error', `Failed to update joint session: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return; // Don't close modal on error
          }
          break;
        
        case 'classSplit':
          // Special handling for class split updates - similar to jointSession
          try {
            // Validate required fields
            if (!formData.groupId) {
              showAlert('error', 'Missing groupId for split class update');
              return;
            }
            
            if (!formData.courseId) {
              showAlert('error', 'Missing courseId for split class');
              return;
            }
            
            if (!formData.groups || formData.groups.length < 2) {
              showAlert('error', 'Split class needs at least 2 groups');
              return;
            }
            
            // Find all existing time slots with this group ID
            const existingSplitSlots = timeSlots.filter(
              slot => slot.groupId === formData.groupId && slot.groupType === GroupType.Split
            );
            
            console.log(`Found ${existingSplitSlots.length} existing slots for split group ${formData.groupId}`);
            
            // Delete all existing slots for this split group - we'll recreate them
            for (const slot of existingSplitSlots) {
              await db.delete('timeSlots', slot.id);
            }
            
            // Create new time slots for each group
            const updatedSplitSessions: TimeSlot[] = [];
            
            for (const group of formData.groups) {
              if (!group.roomId) {
                showAlert('error', `Group ${group.name} is missing a room assignment`);
                continue;
              }
              
              // Use group's time values if overridden, otherwise use the default class times
              const startTime = group.overrideTime ? group.startTime : formData.startTime;
              const endTime = group.overrideTime ? group.endTime : formData.endTime;
              const dayOfWeek = group.overrideTime && group.dayOfWeek ? parseInt(group.dayOfWeek) : parseInt(formData.dayOfWeek);
              
              // Use group's faculty if specified, otherwise use the main faculty
              const facultyId = group.facultyId || formData.facultyId;
              
              const newSplitSlot = await db.create<TimeSlot>('timeSlots', {
                courseId: formData.courseId,
                facultyId: facultyId,
                roomId: group.roomId,
                departmentId: formData.departmentId || '',
                dayOfWeek: dayOfWeek,
                startTime: startTime,
                endTime: endTime,
                type: formData.type || LessonType.Tutorial,
                yearLevel: parseInt(formData.yearLevel?.toString() || "1"),
                groupId: formData.groupId,
                groupType: GroupType.Split,
                groupName: group.name,
                maxStudents: parseInt(group.maxStudents?.toString() || "30"),
                academicYear: formData.academicYear || selectedYear,
                semester: parseInt(formData.semester?.toString()) || selectedSemester,
                isActive: true
              });
              
              updatedSplitSessions.push(newSplitSlot);
            }
            
            // Update timeSlots state
            if (updatedSplitSessions.length > 0) {
              setTimeSlots(prev => {
                // Filter out existing split slots with this group ID
                const filtered = prev.filter(slot => 
                  !(slot.groupId === formData.groupId && slot.groupType === GroupType.Split)
                );
                // Add the new ones
                return [...filtered, ...updatedSplitSessions];
              });
              
              await checkConflicts();
              showAlert('success', `Class split into ${updatedSplitSessions.length} groups successfully`);
            } else {
              showAlert('error', 'No time slots were created for the split groups');
              return; // Don't close modal if nothing was created
            }
          } catch (error) {
            console.error('Failed to update split class:', error);
            showAlert('error', `Failed to update split class: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return; // Don't close modal on error
          }
          break;
      }

      showAlert('success', `${modalType} updated successfully`);
      closeModal();
    } catch (error) {
      console.error('Failed to update:', error);
      showAlert('error', `Failed to update ${modalType}`);
    }
  };
  const handleDelete = async (type: string, id: string) => {
    if (!db) return;

    try {
      // Map the type to the correct table name
      const tableMap: Record<string, string> = {
        'department': 'departments',
        'program': 'programs',
        'course': 'courses',
        'faculty': 'faculty',
        'room': 'rooms',
        'student': 'students',
        'timeslot': 'timeSlots'
      };

      const tableName = tableMap[type];
      if (!tableName) {
        throw new Error(`Unknown type: ${type}`);
      }

      await db.delete(tableName, id);

      switch (type) {
        case 'department':
          setDepartments(departments.filter(d => d.id !== id));
          break;
        case 'program':
          setPrograms(programs.filter(p => p.id !== id));
          break;
        case 'course':
          setCourses(courses.filter(c => c.id !== id));
          break;
        case 'faculty':
          setFaculty(faculty.filter(f => f.id !== id));
          break;
        case 'room':
          setRooms(rooms.filter(r => r.id !== id));
          break;
        case 'student':
          setStudents(students.filter(s => s.id !== id));
          break;
        case 'timeslot':
          setTimeSlots(timeSlots.filter(t => t.id !== id));
          setConflicts(conflicts.filter(c => !c.affectedSlots.includes(id)));
          break;
      }

      showAlert('success', `${type} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete:', error);
      showAlert('error', `Failed to delete ${type}`);
    }
  };

  // Attendance Handlers
const handleMarkAttendance = async (attendanceData: Partial<Attendance>[]) => {
  if (!db) {
    showAlert('error', 'Database not initialized');
    return;
  }

  try {
    // First, get ALL existing attendance records to check against
    const existingAttendance = await db.getAll<Attendance>('attendance');
    
    const createdAttendance: Attendance[] = [];
    const errors: string[] = [];
    
    for (const data of attendanceData) {
      try {
        // Check if attendance already exists for this student+slot+date
        const existing = existingAttendance.find(a => 
          a.studentId === data.studentId && 
          a.timeSlotId === data.timeSlotId && 
          a.date === data.date
        );

        if (existing) {
          // Update existing record
          console.log(`Updating existing attendance for student ${data.studentId}`);
          
          const updated = await db.update<Attendance>('attendance', existing.id, {
            status: data.status,
            remarks: data.remarks,
            markedBy: data.markedBy,
            markedAt: new Date(),
            updatedAt: new Date()
          });
          
          if (updated) {
            createdAttendance.push(updated);
          }
        } else {
          // Create new record
          console.log(`Creating new attendance for student ${data.studentId}`);
          
          const created = await db.create<Attendance>('attendance', {
            studentId: data.studentId!,
            timeSlotId: data.timeSlotId!,
            courseId: data.courseId!,
            date: data.date!,
            status: data.status!,
            remarks: data.remarks || '',
            markedBy: data.markedBy!,
            markedAt: data.markedAt || new Date(),
          });
          
          createdAttendance.push(created);
        }
      } catch (error: any) {
        console.error(`Error processing attendance for student ${data.studentId}:`, error);
        errors.push(`Student ${data.studentId}: ${error.message}`);
      }
    }

    // IMPORTANT: Reload all attendance data to update the UI
    const updatedAttendance = await db.getAll<Attendance>('attendance');
    setAttendance(updatedAttendance);
    
    if (errors.length > 0) {
      showAlert('warning', `Marked ${createdAttendance.length} attendance records. ${errors.length} failed.`);
    } else {
      showAlert('success', 'Attendance marked successfully');
    }
    
    return createdAttendance;
  } catch (error) {
    console.error('Failed to mark attendance:', error);
    showAlert('error', 'Failed to mark attendance');
    throw error; // Re-throw to allow components to handle it
  }
};

  const handleUpdateAttendance = async (id: string, status: Attendance['status'], remarks?: string) => {
    if (!db) return;

    try {
      const updated = await db.update<Attendance>('attendance', id, { 
        status, 
        remarks,
        updatedAt: new Date()
      });
      if (updated) {
        setAttendance(attendance.map(a => a.id === id ? updated : a));
        showAlert('success', 'Attendance updated successfully');
      }
    } catch (error) {
      console.error('Failed to update attendance:', error);
      showAlert('error', 'Failed to update attendance');
    }
  };

  // QR Code Handlers
  const handleProcessQRAttendance = async (scanData: QRScanData): Promise<{
    success: boolean;
    message: string;
    attendanceRecord?: Attendance;
    attendanceCode?: AttendanceCode;
  }> => {
    if (!db) return { success: false, message: 'Database not initialized' };

    try {
      // Process the QR scan
      const result: {
        success: boolean;
        message: string;
        attendanceRecord?: Attendance;
        attendanceCode?: AttendanceCode;
      } = await processQRAttendance({
        ...scanData,
        scannedAt: typeof scanData.scannedAt === 'string'
          ? scanData.scannedAt
          : scanData.scannedAt?.toISOString?.() ?? ''
      });

      if (result.success && result.attendanceRecord) {
        // Save to database
        const created = await db.create<Attendance>('attendance', result.attendanceRecord);
        setAttendance([...attendance, created]);

        // Update the attendance code's usedBy list
        if (result.attendanceCode && result.attendanceCode.id) {
          const updatedCode = await db.update<AttendanceCode>(
            'attendanceCodes',
            result.attendanceCode.id as string,
            {
              usedBy: [...result.attendanceCode.usedBy, scanData.studentId],
              updatedAt: new Date(), // Ensure updatedAt is always a Date
            }
          );
          if (updatedCode) {
            setAttendanceCodes(attendanceCodes.map(c => c.id === updatedCode.id ? updatedCode : c));
          }
        } else if (result.attendanceCode && !result.attendanceCode.id) {
          console.error('AttendanceCode id is undefined');
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to process QR attendance:', error);
      return { success: false, message: 'Failed to process attendance' };
    }
  };

  const handleGenerateQRCode = async (timeSlotId: string, courseId: string, date: string, startTime: string) => {
    if (!db) return null;

    try {
      const attendanceCode = await generateAttendanceQRCode(timeSlotId, courseId, date, startTime);
      // Ensure id is a string (generate if missing)
      const attendanceCodeWithId: AttendanceCode = {
        ...attendanceCode,
        id: attendanceCode.id !== undefined ? attendanceCode.id : crypto.randomUUID(),
        createdBy: currentUser.id,
        validUntil: new Date(),
        updatedAt: new Date()
      };
      // Type assertion to guarantee id is string
      const saved = await db.create<AttendanceCode>('attendanceCodes', attendanceCodeWithId as AttendanceCode & { id: string });
      setAttendanceCodes([...attendanceCodes, saved]);
      return saved;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      showAlert('error', 'Failed to generate QR code');
      return null;
    }
  };

  // Conflict Detection
  const checkConflicts = async () => {
    if (!db) return;

    const newConflicts: Omit<Conflict, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    // Filter time slots for current semester and year
    const relevantSlots = timeSlots.filter(slot => 
      slot.academicYear === selectedYear && 
      slot.semester === selectedSemester
    );

    // Check room conflicts - UPDATED to handle joint sessions
    const roomGroups = relevantSlots.reduce((acc, slot) => {
      const key = `${slot.roomId}-${slot.dayOfWeek}-${slot.startTime}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);

    Object.entries(roomGroups).forEach(([key, slots]) => {
      if (slots.length > 1) {
        // Filter out joint sessions - they're supposed to share rooms
        const conflictingSlots = slots.filter((slot, index, arr) => {
          // If this slot is part of a joint session, check if all other slots share the same groupId
          if (slot.groupType === GroupType.Joint && slot.groupId) {
            const otherJointSlots = arr.filter(s => 
              s.groupType === GroupType.Joint && 
              s.groupId === slot.groupId && 
              s.id !== slot.id
            );
            // If all other slots in this time/room are part of the same joint session, no conflict
            return otherJointSlots.length !== arr.length - 1;
          }
          return true;
        });

        if (conflictingSlots.length > 1) {
          const room = rooms.find(r => r.id === slots[0].roomId);
          newConflicts.push({
            description: `Room conflict: Multiple classes scheduled in the same room at the same time`,
            details: `Room ${room?.name || slots[0].roomId} is already booked from ${slots[0].startTime} to ${slots[0].endTime}`,
            affectedSlots: conflictingSlots.map(s => s.id),
            resolved: false,
            type: ConflictType.Room,
            severity: ConflictSeverity.High
          });
        }
      }
    });

    // Check faculty conflicts - UPDATED to handle joint sessions
    const facultyGroups = relevantSlots.reduce((acc, slot) => {
      const key = `${slot.facultyId}-${slot.dayOfWeek}-${slot.startTime}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);
    
    Object.entries(facultyGroups).forEach(([key, slots]) => {
      if (slots.length > 1) {
        // Filter out joint sessions - they're supposed to share faculty
        const conflictingSlots = slots.filter((slot, index, arr) => {
          // If this slot is part of a joint session, check if all other slots share the same groupId
          if (slot.groupType === GroupType.Joint && slot.groupId) {
            const otherJointSlots = arr.filter(s => 
              s.groupType === GroupType.Joint && 
              s.groupId === slot.groupId && 
              s.id !== slot.id
            );
            // If all other slots in this time are part of the same joint session, no conflict
            return otherJointSlots.length !== arr.length - 1;
          }
          return true;
        });

        if (conflictingSlots.length > 1) {
          const fac = faculty.find(f => f.id === slots[0].facultyId);
          newConflicts.push({
            description: `Faculty conflict: Teacher scheduled for multiple classes at the same time`,
            details: `Faculty member ${fac?.firstName || 'Unknown'} ${fac?.lastName || ''} is already scheduled from ${slots[0].startTime} to ${slots[0].endTime}`,
            affectedSlots: conflictingSlots.map(s => s.id),
            resolved: false,
            type: ConflictType.Faculty,
            severity: ConflictSeverity.High
          });
        }
      }
    });

    // Check student group conflicts (same year level) - UPDATED to handle joint sessions and provide specific course details
    const studentGroups = relevantSlots.reduce((acc, slot) => {
      const key = `${slot.yearLevel}-${slot.dayOfWeek}-${slot.startTime}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);

    Object.entries(studentGroups).forEach(([key, slots]) => {
      if (slots.length > 1) {
        // For student conflicts, joint sessions are actually expected to have the same students
        // Split classes should be allowed to have overlapping times (different groups of same year)
        const conflictingSlots = slots.filter((slot, index, arr) => {
          // Allow joint sessions - they're meant for the same students
          if (slot.groupType === GroupType.Joint) {
            return false;
          }
          // Allow split classes - different groups of the same course
          if (slot.groupType === GroupType.Split) {
            return false;
          }
          return true;
        });

        if (conflictingSlots.length > 1) {
          // Get course details for the conflicting courses
          const conflictingCourses = conflictingSlots.map(slot => {
            const course = courses.find(c => c.id === slot.courseId);
            return course ? `${course.code} (${course.name})` : 'Unknown Course';
          });
          
          newConflicts.push({
            description: `Course Conflict Year ${slots[0].yearLevel} students in this department may have a scheduling conflict with another course at this time`,
            details: `Year ${slots[0].yearLevel} students have conflicting courses from ${slots[0].startTime} to ${slots[0].endTime}: ${conflictingCourses.join(' and ')}`,
            affectedSlots: conflictingSlots.map(s => s.id),
            resolved: false,
            type: ConflictType.StudentGroup,
            severity: ConflictSeverity.High
          });
        }
      }
    });

    // Clear old conflicts and add new ones
    const conflictStore = await db.getAll<Conflict>('conflicts');
    for (const conflict of conflictStore) {
      await db.delete('conflicts', conflict.id);
    }

    const createdConflicts: Conflict[] = [];
    for (const conflictData of newConflicts) {
      const created = await db.create<Conflict>('conflicts', conflictData);
      createdConflicts.push(created);
    }

    setConflicts(createdConflicts);
  };

  // Generate Timetable Algorithm
  const generateTimetable = async () => {
    if (!db) return;

    // Confirm before clearing existing time slots
    if (timeSlots.length > 0) {
      const confirmClear = window.confirm(
        `This will delete all ${timeSlots.length} existing time slots and generate new ones. Are you sure you want to continue?`
      );
      if (!confirmClear) return;
    }

    showAlert('info', 'Generating optimal timetable...');

    try {
      // Clear existing time slots
      for (const slot of timeSlots) {
        await db.delete('timeSlots', slot.id);
      }

      const newSlots: TimeSlot[] = [];
      const availableRooms = rooms.filter(r => r.available);
      const activeCourses = courses.filter(c => c.semester === selectedSemester);

      // Simple scheduling algorithm
      let dayIndex = 1; // Start from Monday
      let timeIndex = 0;
      const timePeriods = ['08:00', '10:00', '13:00', '15:00'];

      for (const course of activeCourses) {
        const courseFaculty = faculty.find(f => f.departmentId === course.departmentId);
        const suitableRoom = availableRooms.find(r =>
            r.capacity >= 50 && // Assume minimum capacity
            (course.name.includes('Lab') ? r.type === 'Lab' : r.type === 'Lecture')
        );

        if (courseFaculty && suitableRoom) {
          const slot = await db.create<TimeSlot>('timeSlots', {
            courseId: course.id,
            facultyId: courseFaculty.id,
            roomId: suitableRoom.id,
            departmentId: course.departmentId,
            dayOfWeek: dayIndex,
            startTime: timePeriods[timeIndex],
            endTime: addHours(timePeriods[timeIndex], 2),

            academicYear: selectedYear,
            semester: selectedSemester,
            yearLevel: course.yearLevel,
            isActive: true,
            type: LessonType.Lecture
          });

          newSlots.push(slot);

          // Move to next time slot
          timeIndex++;
          if (timeIndex >= timePeriods.length) {
            timeIndex = 0;
            dayIndex++;
            if (dayIndex > 5) dayIndex = 1; // Reset to Monday after Friday
          }
        }
      }

      setTimeSlots(newSlots);
      await checkConflicts();
      showAlert('success', 'Timetable generated successfully!');
    } catch (error) {
      console.error('Failed to generate timetable:', error);
      showAlert('error', 'Failed to generate timetable');
    }
  };

  // Export data
  const handleExport = async () => {
    if (!db) return;

    try {
      const data = await db.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pnguot-timetable-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showAlert('success', 'Data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      showAlert('error', 'Failed to export data');
    }
  };

  // Import data
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!db || !event.target.files?.[0]) return;

    try {
      const file = event.target.files[0];
      const text = await file.text();
      await db.importData(text);
      await loadAllData(db);
      showAlert('success', 'Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      showAlert('error', 'Failed to import data');
    }
  };

  // Migration function to fix existing time slots
  const migrateTimeSlots = async () => {
    if (!db) return;

    try {
      showAlert('info', 'Migrating time slots...');
      
      const allTimeSlots = await db.getAll<TimeSlot>('timeSlots');
      let migratedCount = 0;
      
      for (const slot of allTimeSlots) {
        if (slot.academicYear === undefined || slot.semester === undefined) {
          await db.update<TimeSlot>('timeSlots', slot.id, {
            ...slot,
            academicYear: slot.academicYear || selectedYear,
            semester: slot.semester || selectedSemester
          });
          migratedCount++;
        }
      }
      
      const updatedTimeSlots = await db.getAll<TimeSlot>('timeSlots');
      setTimeSlots(updatedTimeSlots);
      
      showAlert('success', `Migration complete! Updated ${migratedCount} time slots.`);
    } catch (error) {
      console.error('Failed to migrate time slots:', error);
      showAlert('error', 'Failed to migrate time slots');
    }
  };

  // Database diagnostics function
  const handleRunDiagnostics = async () => {
    if (!db) {
      showAlert('error', 'Database not initialized');
      return null;
    }

    try {
      showAlert('info', 'Running database diagnostics...');
      
      // Check database integrity
      const integrity = await db.verifyIntegrity();
      
      // Check for orphaned references
      const orphanedSlots = timeSlots.filter(slot => {
        const course = courses.find(c => c.id === slot.courseId);
        const fac = faculty.find(f => f.id === slot.facultyId);
        const room = rooms.find(r => r.id === slot.roomId);
        return !course || !fac || !room;
      });

      const result = {
        success: integrity.isValid && orphanedSlots.length === 0,
        message: integrity.isValid 
          ? `Database is healthy. Found ${orphanedSlots.length} orphaned time slots.`
          : `Database has ${integrity.issues.length} issues`,
        details: {
          integrity,
          orphanedSlots: orphanedSlots.length,
          totalRecords: {
            departments: departments.length,
            programs: programs.length,
            courses: courses.length,
            faculty: faculty.length,
            rooms: rooms.length,
            students: students.length,
            timeSlots: timeSlots.length,
            attendance: attendance.length
          }
        }
      };
      
      if (!result.success) {
        showAlert('warning', result.message);
      } else {
        showAlert('success', 'Database diagnostics completed successfully');
      }
      
      // Log detailed report
      console.log('Database Diagnostic Report:', result.details);
      
      return result;
    } catch (error) {
      console.error('Diagnostic failed:', error);
      showAlert('error', 'Failed to run database diagnostics');
      return null;
    }
  };

  // Clear database function
  const handleClearDatabase = async () => {
    if (!db) {
      showAlert('error', 'Database not initialized');
      return null;
    }

    // Triple confirmation for safety
    const firstConfirm = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL data including departments, courses, faculty, students, and timetables. Are you absolutely sure?'
    );
    
    if (!firstConfirm) return null;
    
    const secondConfirm = window.confirm(
      '⚠️ FINAL WARNING: This action cannot be undone. All data will be lost forever. Continue?'
    );
    
    if (!secondConfirm) return null;

    try {
      showAlert('warning', 'Clearing database...');
      
      // Clear all stores
      const stores = [
        'departments', 'programs', 'courses', 'faculty',
        'rooms', 'timeSlots', 'students', 'substitutions',
        'conflicts', 'academicCalendar', 'attendance', 'attendanceCodes'
      ];
      
      for (const store of stores) {
        const items = await db.getAll(store);
        for (const item of items) {
          await db.delete(store, (item as any).id);
        }
      }
      
      // Reset all state
      setDepartments([]);
      setPrograms([]);
      setCourses([]);
      setFaculty([]);
      setRooms([]);
      setTimeSlots([]);
      setStudents([]);
      setSubstitutions([]);
      setConflicts([]);
      setAcademicCalendar([]);
      setAttendance([]);
      setAttendanceCodes([]);
      
      showAlert('success', 'Database cleared successfully');
      
      return {
        success: true,
        message: 'Database cleared successfully',
        details: { clearedAt: new Date() }
      };
    } catch (error) {
      console.error('Failed to clear database:', error);
      showAlert('error', 'Failed to clear database');
      return {
        success: false,
        message: 'Failed to clear database',
        details: { error: String(error) }
      };
    }
  };

  // Menu Items with icon mapping
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: CheckCircle },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'programs', label: 'Programs', icon: School },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'faculty', label: 'Faculty', icon: Users },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'rooms', label: 'Rooms', icon: Building },
    { id: 'substitutions', label: 'Substitutions', icon: RefreshCw },
    { id: 'calendar', label: 'Academic Calendar', icon: CalendarPlus },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Add handler for substitution actions
  const handleSubstitutionAction = async (id: string, action: 'approve' | 'reject') => {
    if (!db) return;
    
    const status = (action === 'approve' ? 'approved' : 'rejected') as Substitution['status'];
    const updated = await db.update<Substitution>('substitutions', id, { 
      status,
      approvedBy: currentUser.id,
      approvedAt: new Date(),
      updatedAt: new Date()
    });
    if (updated) {
      setSubstitutions(substitutions.map(s =>
        s.id === id ? updated : s
      ));
    }
    showAlert('success', `Substitution ${status}`);
  };

  // Main render
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading PNG University of Technology Timetable System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Alert Component */}
      <Alert 
        show={alert.show}
        type={alert.type}
        message={alert.message}
      />

      {/* Sidebar Component */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        menuItems={menuItems}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-4'}`}>
        {/* Header Component */}
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          conflicts={conflicts}
        />

        {/* Page Content */}
        <main className="p-6">
          {activeTab === 'dashboard' && (
            <Dashboard 
              departments={departments}
              courses={courses}
              faculty={faculty}
              students={students}
              rooms={rooms}
              timeSlots={timeSlots}
              conflicts={conflicts}
              onGenerateTimetable={generateTimetable}
              onExport={handleExport}
              openModal={openModal}
              onMigrateTimeSlots={migrateTimeSlots}
            />
          )}
          {activeTab === 'timetable' && (
            <TimetableSection
              timeSlots={timeSlots}
              courses={courses}
              faculty={faculty}
              rooms={rooms}
              conflicts={conflicts}
              departments={departments}
              students={students}
              attendance={attendance}
              currentUser={currentUser}
              selectedYear={selectedYear}
              selectedSemester={selectedSemester}
              setSelectedYear={setSelectedYear}
              setSelectedSemester={setSelectedSemester}
              setTimeSlots={setTimeSlots}
              setConflicts={setConflicts}
              openModal={openModal}
              showAlert={showAlert}
              setFormData={setFormData}
              handleDelete={handleDelete}
              onMarkAttendance={handleMarkAttendance}
              onGenerateQRCode={handleGenerateQRCode}
              onProcessQRAttendance={handleProcessQRAttendance}
              db={db}
            />
          )}
          {activeTab === 'attendance' && (
            <AttendanceSection
              students={students}
              courses={courses}
              timeSlots={timeSlots}
              faculty={faculty}
              attendance={attendance}
              currentUser={currentUser}
              onMarkAttendance={handleMarkAttendance}
              onUpdateAttendance={handleUpdateAttendance}
              onGenerateQRCode={handleGenerateQRCode}
              onProcessQRAttendance={handleProcessQRAttendance}
            />
          )}
          {activeTab === 'departments' && (
            <Departments
              departments={departments}
              programs={programs}
              faculty={faculty}
              openModal={openModal}
              handleDelete={handleDelete}
              selectedView={selectedView}
              setSelectedView={setSelectedView}
            />
          )}
          {activeTab === 'programs' && (
            <Programs
              programs={programs}
              departments={departments}
              selectedDepartment={selectedDepartment}
              setSelectedDepartment={setSelectedDepartment}
              openModal={openModal}
              handleDelete={handleDelete}
              selectedView={selectedView}
              setSelectedView={setSelectedView}
            />
          )}
          {activeTab === 'courses' && (
            <Courses
              courses={courses}
              departments={departments}
              programs={programs}
              selectedView={selectedView}
              setSelectedView={setSelectedView}
              openModal={openModal}
              handleDelete={handleDelete}
            />
          )}
          {activeTab === 'faculty' && (
            <FacultySection
              faculty={faculty}
              departments={departments}
              openModal={openModal}
              handleDelete={handleDelete}
            />
          )}
          {activeTab === 'rooms' && (
            <Rooms
              rooms={rooms}
              openModal={openModal}
              handleDelete={handleDelete}
            />
          )}
          {activeTab === 'students' && (
            <Students
              students={students}
              programs={programs}
              courses={courses}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              openModal={openModal}
              handleDelete={handleDelete}
            />
          )}
          {activeTab === 'substitutions' && (
            <Substitutions
              substitutions={substitutions}
              timeSlots={timeSlots}
              courses={courses}
              faculty={faculty}
              openModal={openModal}
              handleSubstitutionAction={handleSubstitutionAction}
            />
          )}
          {activeTab === 'calendar' && (
            <AcademicCalendarSection
              academicCalendar={academicCalendar}
              showAlert={showAlert}
            />
          )}
          {activeTab === 'analytics' && (
            <Analytics
              departments={departments}
              programs={programs}
              courses={courses}
              faculty={faculty}
              students={students}
              rooms={rooms}
              timeSlots={timeSlots}
              showAlert={showAlert}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsSection
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              selectedSemester={selectedSemester}
              setSelectedSemester={setSelectedSemester}
              handleExport={handleExport}
              handleImport={handleImport}
              onRunDiagnostics={handleRunDiagnostics}
              onClearDatabase={handleClearDatabase}
            />
          )}
        </main>
      </div>

      {/* Modal */}
      <FormModal
        showModal={showModal}
        modalType={String(modalType) === 'deletetimeslot' ? 'timeslot' : modalType}
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        closeModal={closeModal}
        handleCreate={handleCreate}
        handleUpdate={handleUpdate}
        departments={departments}
        programs={programs}
        courses={courses}
        faculty={faculty}
        rooms={rooms}
        timeSlots={timeSlots}
        getDayName={getDayName}
      />
    </div>
  );
}