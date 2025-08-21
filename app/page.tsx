'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Loader, Building2, CalendarPlus, Home, Calendar, School, BookOpen, User,
  Users, GraduationCap, Building, RefreshCw, BarChart3, Settings 
} from 'lucide-react';


// Import types
import { 
  Department, Program, Course, Faculty, Room, TimeSlot, 
  Student, Substitution, Conflict, AcademicCalendar, 
  ModalType, AlertState, 
  Attendance,
  LessonType,
  SubstitutionStatus,
  GroupType,
  ConflictType,
  ConflictSeverity,
  RoomType,
  ProgramMode,
  ProgramLevel
} from '@/types/database';

// Import services
import { TimetableDB } from '@/services/database';

// Import utilities
import { generateColor, addHours, getDayName } from '@/utils/helpers';

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
import { ConstraintManager } from '@/services/constraintManager';
import { ConflictResolver } from '@/services/conflictResolver';
import { EnhancedConflict, ResolutionAction, ResolutionSuggestion } from '@/types/conflicts';

// Database Integrity Checker
class DatabaseIntegrityChecker {
  static async checkAndFixTimeSlots(db: TimetableDB): Promise<{
    fixed: number;
    errors: string[];
    report: string;
  }> {
    const errors: string[] = [];
    let fixed = 0;
    let report = '=== TimeSlot Integrity Check ===\n';

    try {
      const timeSlots = await db.getAll<TimeSlot>('timeSlots');
      report += `Total TimeSlots found: ${timeSlots.length}\n`;

      for (const slot of timeSlots) {
        const issues: string[] = [];
        let needsUpdate = false;
        const updates: Partial<TimeSlot> = {};

        if (!slot.id) {
          issues.push('Missing ID');
          continue;
        }

        if (!slot.yearLevel && slot.yearLevel !== 0) {
          issues.push('Missing yearLevel');
          updates.yearLevel = 1;
          needsUpdate = true;
        }

        if (!slot.academicYear) {
          issues.push('Missing academicYear');
          updates.academicYear = '2025';
          needsUpdate = true;
        }

        if (!slot.semester && slot.semester !== 0) {
          issues.push('Missing semester');
          updates.semester = 1;
          needsUpdate = true;
        }

        if (issues.length > 0) {
          report += `\nSlot ${slot.id}: ${issues.join(', ')}\n`;
        }

        if (needsUpdate) {
          try {
            await db.update<TimeSlot>('timeSlots', slot.id, updates);
            fixed++;
            report += `  ✓ Fixed\n`;
          } catch (error) {
            errors.push(`Failed to fix slot ${slot.id}: ${error}`);
            report += `  ✗ Failed to fix: ${error}\n`;
          }
        }
      }

      report += `\n=== Summary ===\n`;
      report += `Total slots: ${timeSlots.length}\n`;
      report += `Fixed: ${fixed}\n`;
      report += `Errors: ${errors.length}\n`;

    } catch (error) {
      errors.push(`Fatal error: ${error}`);
      report += `\nFatal error: ${error}\n`;
    }

    return { fixed, errors, report };
  }

  static async verifyAndRepairDatabase(db: TimetableDB): Promise<{
    success: boolean;
    message: string;
    details: {
      timeslotFix?: {
        errors: string[];
        fixed: number;
        report: string;
      };
      error?: string;
    };
  }> {
    try {
      const timeslotFix = await this.checkAndFixTimeSlots(db);
      
      return {
        success: timeslotFix.errors.length === 0,
        message: `Database verification complete. Fixed ${timeslotFix.fixed} issues.`,
        details: { timeslotFix }
      };
    } catch (error) {
      return {
        success: false,
        message: `Database verification failed: ${error}`,
        details: { error: String(error) }
      };
    }
  }
}

export default function PNGUnitechTimetableSystem() {
  // State Management
  const [db, setDb] = useState<TimetableDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed by default, will be set by useEffect
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

  // Conflict Resolution States
  const [constraintManager] = useState(() => new ConstraintManager());
  const [conflictResolver] = useState(() => new ConflictResolver(constraintManager));
  const [isAutoResolving, setIsAutoResolving] = useState(false);

  // Current user for attendance
  const currentUser = { id: 'admin', role: 'admin' as const };

  // Initialize Database
  useEffect(() => {
    const initDB = async () => {
      try {
        console.log('Initializing database...');
        const database = new TimetableDB();
        await database.init();
        setDb(database);
        
        console.log('Database initialized, loading data...');
        await loadAllData(database);
        
        // Check if timeslots were loaded properly
        const slots = await database.getAll<TimeSlot>('timeSlots');
        console.log('TimeSlots after initial load:', slots.length);
        
        // Run integrity check on first load
        const integrity = await database.verifyIntegrity();
        if (!integrity.isValid) {
          console.warn('Database integrity issues detected:', integrity.issues);
          showAlert('warning', 'Database integrity issues detected. Run diagnostics from Settings.');
        }
        
        console.log('Data loaded successfully');
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        showAlert('error', 'Failed to initialize database');
        setLoading(false);
      }
    };

    initDB();
  }, []);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      // Close sidebar on mobile, open on desktop by default
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
      // Close notifications dropdown on resize
      setShowNotifications(false);
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load all data (memoized)
  const loadAllData = useCallback(async (database: TimetableDB) => {
    try {
      console.log('Loading all data from database...');
      
      const [
        depts, progs, crses, fac, rms, slots, stds, subs, conf, cal, att
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
        database.getAll<Attendance>('attendance').catch(() => [])
      ]);

      console.log('Loaded timeSlots:', slots.length);
      
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
    } catch (error) {
      console.error('Failed to load data:', error);
      showAlert('error', 'Failed to load data');
    }
  }, []); // data reload invoked explicitly; safe with empty deps

  // Alert Helper
  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type, message: '' }), 3000);
  };

  // Modal Handlers
  const openModal = (type: ModalType, item?: Department | Program | Course | Faculty | Room | TimeSlot | Student | Substitution | null) => {
    setModalType(type);
    setEditingItem(item || null);
    setFormData(item || {});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({});
  };

  // Validation Helper Function
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    switch (modalType) {
      case 'department':
        if (!formData.name?.trim()) errors.push('Department name is required');
        if (!formData.code?.trim()) errors.push('Department code is required');
        if (!formData.head?.trim()) errors.push('Department head is required');
        break;
        
      case 'program':
        if (!formData.name?.trim()) errors.push('Program name is required');
        if (!formData.code?.trim()) errors.push('Program code is required');
        if (!formData.departmentId) errors.push('Department is required');
        if (!formData.level) errors.push('Level is required');
        if (!formData.duration || formData.duration <= 0) errors.push('Duration must be greater than 0');
        break;
        
      case 'course':
        if (!formData.code?.trim()) errors.push('Course code is required');
        if (!formData.name?.trim()) errors.push('Course name is required');
        if (!formData.programId) errors.push('Program is required');
        if (!formData.departmentId) errors.push('Department is required');
        if (!formData.credits || formData.credits <= 0) errors.push('Credits must be greater than 0');
        if (!formData.semester || formData.semester < 1 || formData.semester > 2) errors.push('Valid semester is required (1 or 2)');
        if (!formData.yearLevel) errors.push('Year level is required');
        break;
        
      case 'faculty':
        if (!formData.title?.trim()) errors.push('Title is required');
        if (!formData.firstName?.trim()) errors.push('First name is required');
        if (!formData.lastName?.trim()) errors.push('Last name is required');
        if (!formData.departmentId) errors.push('Department is required');
        if (formData.email && !emailRegex.test(formData.email)) {
          errors.push('Invalid email format');
        }
        break;
        
      case 'room':
        if (!formData.code?.trim()) errors.push('Room code is required');
        if (!formData.name?.trim()) errors.push('Room name is required');
        if (!formData.building?.trim()) errors.push('Building is required');
        if (!formData.capacity || formData.capacity <= 0) errors.push('Capacity must be greater than 0');
        if (!formData.type) errors.push('Room type is required');
        break;
        
      case 'student':
        if (!formData.studentId?.trim()) errors.push('Student ID is required');
        if (!formData.firstName?.trim()) errors.push('First name is required');
        if (!formData.lastName?.trim()) errors.push('Last name is required');
        if (!formData.email?.trim()) errors.push('Email is required');
        if (!formData.phone?.trim()) errors.push('Phone number is required');
        if (!formData.programId) errors.push('Program is required');
        if (!formData.enrolledCourses) errors.push('At least one course must be selected');
        if (!formData.currentYear && !formData.year) errors.push('Year level is required');
        if (!formData.currentSemester && !formData.semester) errors.push('Semester is required');
        if (formData.email && !emailRegex.test(formData.email)) {
          errors.push('Invalid email format');
        }
        break;
        
      case 'timeslot':
        if (!formData.courseId) errors.push('Course is required');
        if (!formData.facultyId) errors.push('Faculty is required');
        if (!formData.roomId) errors.push('Room is required');
        if (formData.dayOfWeek === undefined || formData.dayOfWeek < 1 || formData.dayOfWeek > 5) {
          errors.push('Valid day of week is required (Monday-Friday)');
        }
        if (!formData.startTime) errors.push('Start time is required');
        if (!formData.endTime) errors.push('End time is required');
        if (!formData.type) errors.push('Type is required');
        
        // Validate time logic
        if (formData.startTime && formData.endTime) {
          const start = new Date(`2000-01-01T${formData.startTime}`).getTime();
          const end = new Date(`2000-01-01T${formData.endTime}`).getTime();
          if (end <= start) {
            errors.push('End time must be after start time');
          }
        }
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // CRUD Handlers
  const handleCreate = async () => {
    if (!db) return;

    // Validate form
    const validation = validateForm();
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      showAlert('error', errorMessage);
      return;
    }

    try {
      // Clean the formData to remove functions and other non-serializable data
      const cleanFormData = { ...formData };
      
      // Remove functions and modal-specific properties
      delete cleanFormData.getFilteredCourses;
      delete cleanFormData.getFilteredFaculty;
      delete cleanFormData.departments;
      delete cleanFormData.courses;
      delete cleanFormData.faculty;
      delete cleanFormData.rooms;
      // Remove id for create (it will be auto-generated)
      delete cleanFormData.id;

      let result;
      switch (modalType) {
        case 'department':
          result = await db.create<Department>('departments', cleanFormData);
          setDepartments([...departments, result]);
          break;
        case 'program':
          result = await db.create<Program>('programs', cleanFormData);
          setPrograms([...programs, result]);
          break;
       
// Updated COURSE case:
case 'course':
  // Ensure we use yearLevel instead of year AND convert to numbers
  const courseData = {
    ...cleanFormData,
    yearLevel: cleanFormData.yearLevel !== undefined
      ? Number(cleanFormData.yearLevel)
      : (cleanFormData.year !== undefined ? Number(cleanFormData.year) : 1),
    semester: cleanFormData.semester !== undefined
      ? Number(cleanFormData.semester)
      : 1, // Default to 1, never null/undefined
    credits: cleanFormData.credits !== undefined
      ? Number(cleanFormData.credits)
      : 3, // Default credits
    prerequisites: cleanFormData.prerequisites || [],
    color: cleanFormData.color || generateColor(),
    isCore: cleanFormData.isCore === true // Ensure boolean
  };
  delete courseData.year;
  result = await db.create<Course>('courses', courseData);
  setCourses([...courses, result]);
  break;
        case 'faculty':
          result = await db.create<Faculty>('faculty', {
            ...cleanFormData,
            qualifications: cleanFormData.qualifications || []
          });
          setFaculty([...faculty, result]);
          break;
        case 'room':
          result = await db.create<Room>('rooms', {
            ...cleanFormData,
            equipment: cleanFormData.equipment || [],
            features: cleanFormData.features || [],
            available: cleanFormData.available !== false,
            type: cleanFormData.type ? 
              cleanFormData.type.charAt(0).toUpperCase() + cleanFormData.type.slice(1).toLowerCase() as Room['type'] : 
              'Lecture'
          });
          setRooms([...rooms, result]);
          break;
       // Updated STUDENT case:
case 'student':
  // Ensure we use currentYear AND convert to numbers
  const studentData = {
    ...cleanFormData,
    currentYear: cleanFormData.currentYear !== undefined
      ? Number(cleanFormData.currentYear)
      : (cleanFormData.year !== undefined ? Number(cleanFormData.year) : 1),
    currentSemester: cleanFormData.currentSemester !== undefined
      ? Number(cleanFormData.currentSemester)
      : (cleanFormData.semester !== undefined ? Number(cleanFormData.semester) : 1),
    enrolledCourses: cleanFormData.enrolledCourses || cleanFormData.courseIds || [],
    // Add any other numeric conversions
    gpa: cleanFormData.gpa !== undefined && cleanFormData.gpa !== '' && cleanFormData.gpa !== null
      ? parseFloat(cleanFormData.gpa.toString())
      : null
  };
  delete studentData.year;
  delete studentData.courseIds;
  delete studentData.semester;
  result = await db.create<Student>('students', studentData);
  setStudents([...students, result]);
  break;
        case 'timeslot':
          const timeSlotData: Omit<TimeSlot, 'id' | 'createdAt' | 'updatedAt'> = {
            courseId: cleanFormData.courseId,
            facultyId: cleanFormData.facultyId,
            roomId: cleanFormData.roomId,
            departmentId: cleanFormData.departmentId || '',
            dayOfWeek: Number(cleanFormData.dayOfWeek) || 1,
            startTime: cleanFormData.startTime,
            endTime: cleanFormData.endTime,
            yearLevel: Number(cleanFormData.yearLevel) || 1,
            academicYear: cleanFormData.academicYear || selectedYear,
            semester: Number(cleanFormData.semester) || selectedSemester,
            groupId: cleanFormData.groupId,
            groupType: cleanFormData.groupType || GroupType.Regular,
            groupName: cleanFormData.groupName,
            maxStudents: cleanFormData.maxStudents,
            isActive: true,
            type: cleanFormData.type || LessonType.Lecture
          };
          const created = await db.create<TimeSlot>('timeSlots', timeSlotData);
          const updatedSlots = [...timeSlots, created];
          setTimeSlots(updatedSlots);
          // Pass fresh list to conflict checker to avoid stale closure
          await checkConflicts(updatedSlots);
          break;
      }

      showAlert('success', `${modalType} created successfully`);
      closeModal();
    } catch (error) {
      console.error('Failed to create:', error);
      showAlert('error', `Failed to create ${modalType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdate = async () => {
    if (!db) {
      showAlert('error', 'Database not available');
      return;
    }
    
    // Special handling for joint sessions which may not have a direct editingItem.id
    if (modalType === 'jointSession') {
      try {
        // Validate required fields
        if (!formData.groupId) {
          showAlert('error', 'Missing groupId for joint session update');
          return;
        }
        
        if (!formData.courses || formData.courses.length === 0) {
          showAlert('error', 'Please select at least one course for the joint session');
          return;
        }
        
        if (!formData.facultyId || !formData.roomId || !formData.startTime || !formData.endTime) {
          showAlert('error', 'Please complete all required fields');
          return;
        }
        
        // Ensure dayOfWeek is a number
        const dayOfWeek = parseInt(formData.dayOfWeek?.toString() || "1");
        if (isNaN(dayOfWeek)) {
          showAlert('error', 'Invalid day of week');
          return;
        }
        
        // Find all existing sessions with this group ID
        const existingJointSlots = timeSlots.filter(
          slot => slot.groupId === formData.groupId
        );
        
        console.log(`Found ${existingJointSlots.length} existing slots for group ${formData.groupId}`);
        
        // Delete sessions that are no longer part of the joint session
        const coursesToKeep = new Set(formData.courses);
        for (const slot of existingJointSlots) {
          if (!coursesToKeep.has(slot.courseId)) {
            await db.delete('timeSlots', slot.id);
          }
        }
        
        // Update existing slots and create new ones as needed
        const updatedSessions: TimeSlot[] = [];
        
        // Validate course compatibility before creating slots
        const coursesToProcess = formData.courses.map((courseId: string) => courses.find(c => c.id === courseId)).filter(Boolean);
        if (coursesToProcess.length === 0) {
          showAlert('error', 'No valid courses found for joint session');
          return;
        }
        
        // Check year level consistency
        const yearLevels = new Set(coursesToProcess.map((c: Course) => c.yearLevel));
        if (yearLevels.size > 1) {
          showAlert('error', `All courses in a joint session must be for the same year level. Found year levels: ${Array.from(yearLevels).join(', ')}`);
          return;
        }
        
        const targetYearLevel = coursesToProcess[0].yearLevel;
        
        for (const courseId of formData.courses) {
          const existingSlot = existingJointSlots.find(s => s.courseId === courseId);
          const course = courses.find(c => c.id === courseId);
          
          if (!course) {
            console.warn(`Course not found: ${courseId}`);
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
              updatedSessions.push(updated);
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
              type: formData.type || 'Lecture',
              yearLevel: course?.yearLevel || 1,
              groupId: formData.groupId,
              groupType: GroupType.Joint,
              academicYear: formData.academicYear || selectedYear,
              semester: parseInt(formData.semester?.toString()) || selectedSemester,
              isActive: true
            });
            
            updatedSessions.push(newJointSlot);
          }
        }
        
        // Update the timeSlots state with the modified slots
        setTimeSlots(prev => {
          // Remove existing joint slots with this group ID
          const remaining = prev.filter(slot => 
            !(slot.groupId === formData.groupId)
          );
          // Add the updated slots
          return [...remaining, ...updatedSessions];
        });
        
        showAlert('success', 'Joint session updated successfully');
        closeModal();
        await checkConflicts();
        return;
      } catch (error) {
        console.error('Failed to update joint session:', error);
        showAlert('error', `Failed to update joint session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
    }
    
    // Add special handling for classSplit modalType
    if (modalType === 'classSplit') {
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
          closeModal();
          return;
        } else {
          showAlert('error', 'No time slots were created for the split groups');
          return; // Don't close modal if nothing was created
        }
      } catch (error) {
        console.error('Failed to update split class:', error);
        showAlert('error', `Failed to update split class: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return; // Don't close modal on error
      }
    }
    
    // Regular update logic for other entity types
    if (!editingItem || !editingItem.id) {
      console.error('Missing required data for update:', { db: !!db, editingItem, id: editingItem?.id });
      showAlert('error', 'Cannot update: missing ID');
      return;
    }

    // Validate form
    const validation = validateForm();
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      showAlert('error', errorMessage);
      return;
    }

    try {
      let result;
      
      switch (modalType) {
        case 'department':
          const deptData = {
            id: editingItem.id,
            name: formData.name || editingItem.name,
            code: formData.code || editingItem.code,
            head: formData.head || editingItem.head,
            createdAt: editingItem.createdAt || new Date(),
            updatedAt: new Date()
          };
          result = await db.update<Department>('departments', editingItem.id, deptData);
          setDepartments(departments.map(d => d.id === editingItem.id ? result! : d));
          break;
          
        case 'program':
          const progData = {
            id: editingItem.id,
            name: formData.name || editingItem.name,
            code: formData.code || editingItem.code,
            departmentId: formData.departmentId || editingItem.departmentId,
            level: formData.level || editingItem.level,
            duration: formData.duration || editingItem.duration,
            createdAt: editingItem.createdAt || new Date(),
            updatedAt: new Date()
          };
          result = await db.update<Program>('programs', editingItem.id, progData);
          setPrograms(programs.map(p => p.id === editingItem.id ? result! : p));
          break;
          
       // Updated COURSE UPDATE case:
case 'course':
  // Ensure semester is strictly 1 or 2
  const parsedSemester = formData.semester !== undefined
    ? Number(formData.semester)
    : (editingItem.semester !== undefined ? Number(editingItem.semester) : 1);
  const semester: 1 | 2 = parsedSemester === 2 ? 2 : 1;

  const courseUpdateData = {
    code: formData.code || editingItem.code,
    name: formData.name || editingItem.name,
    programId: formData.programId || editingItem.programId,
    departmentId: formData.departmentId || editingItem.departmentId,
    credits: formData.credits !== undefined
      ? Number(formData.credits)
      : (editingItem.credits !== undefined ? Number(editingItem.credits) : 3),
    semester,
    yearLevel: formData.yearLevel !== undefined
      ? Number(formData.yearLevel)
      : (formData.year !== undefined ? Number(formData.year)
        : (editingItem.yearLevel !== undefined ? Number(editingItem.yearLevel)
          : (editingItem.year !== undefined ? Number(editingItem.year) : 1))),
    description: formData.description || editingItem.description || '',
    prerequisites: formData.prerequisites || editingItem.prerequisites || [],
    color: formData.color || editingItem.color || generateColor(),
    isCore: formData.isCore !== undefined ? formData.isCore : editingItem.isCore,
    updatedAt: new Date()
  };
  result = await db.update<Course>('courses', editingItem.id, courseUpdateData);
  setCourses(courses.map(c => c.id === editingItem.id ? result! : c));
  break;
          
        case 'faculty':
          const facultyData = {
            id: editingItem.id,
            staffId: formData.staffId || editingItem.staffId,
            title: formData.title || editingItem.title,
            firstName: formData.firstName || editingItem.firstName,
            lastName: formData.lastName || editingItem.lastName,
            email: formData.email || editingItem.email,
            phone: formData.phone || editingItem.phone,
            departmentId: formData.departmentId || editingItem.departmentId,
            specialization: formData.specialization || editingItem.specialization || '',
            officeNumber: formData.officeNumber || editingItem.officeNumber || '',
            officeHours: formData.officeHours || editingItem.officeHours || '',
            qualifications: formData.qualifications || editingItem.qualifications || [],
            preferences: formData.preferences || editingItem.preferences,
            createdAt: editingItem.createdAt || new Date(),
            updatedAt: new Date()
          };
          result = await db.update<Faculty>('faculty', editingItem.id, facultyData);
          setFaculty(faculty.map(f => f.id === editingItem.id ? result! : f));
          break;
          
        case 'room':
          const roomData = {
            id: editingItem.id,
            code: formData.code || editingItem.code,
            name: formData.name || editingItem.name,
            departmentId: formData.departmentId || editingItem.departmentId,
            building: formData.building || editingItem.building,
            floor: formData.floor || editingItem.floor,
            capacity: formData.capacity || editingItem.capacity,
            type: formData.type ? 
              (formData.type.charAt(0).toUpperCase() + formData.type.slice(1).toLowerCase() as Room['type']) : 
              editingItem.type,
            equipment: formData.equipment || editingItem.equipment || [],
            available: formData.available !== undefined ? formData.available : editingItem.available,
            features: formData.features || editingItem.features || [],
            createdAt: editingItem.createdAt || new Date(),
            updatedAt: new Date()
          };
          result = await db.update<Room>('rooms', editingItem.id, roomData);
          setRooms(rooms.map(r => r.id === editingItem.id ? result! : r));
          break;
          
        // Updated STUDENT UPDATE case:
case 'student':
  const studentUpdateData = {
    studentId: formData.studentId || editingItem.studentId,
    firstName: formData.firstName || editingItem.firstName,
    lastName: formData.lastName || editingItem.lastName,
    middleName: formData.middleName !== undefined ? formData.middleName : editingItem.middleName,
    email: formData.email || editingItem.email,
    phone: formData.phone || editingItem.phone,
    programId: formData.programId || editingItem.programId,
    currentYear: formData.currentYear !== undefined
      ? Number(formData.currentYear)
      : (formData.year !== undefined ? Number(formData.year)
        : (editingItem.currentYear !== undefined ? Number(editingItem.currentYear)
          : (editingItem.year !== undefined ? Number(editingItem.year) : 1))),
    currentSemester: formData.currentSemester !== undefined
      ? Number(formData.currentSemester)
      : (formData.semester !== undefined ? Number(formData.semester)
        : (editingItem.currentSemester !== undefined ? Number(editingItem.currentSemester)
          : (editingItem.semester !== undefined ? Number(editingItem.semester) : 1))),
    dateOfBirth: formData.dateOfBirth || editingItem.dateOfBirth,
    enrolledCourses: formData.enrolledCourses || formData.courseIds || editingItem.enrolledCourses || [],
    completedCourses: formData.completedCourses || editingItem.completedCourses || [],
    gpa: formData.gpa !== undefined
      ? (formData.gpa !== '' && formData.gpa !== null ? parseFloat(formData.gpa.toString()) : null)
      : editingItem.gpa,
    status: formData.status || editingItem.status || 'active',
    studentType: formData.studentType || editingItem.studentType || 'regular',
    enrollmentDate: formData.enrollmentDate || editingItem.enrollmentDate,
    // Additional fields
    address: formData.address !== undefined ? formData.address : editingItem.address,
    emergencyContactName: formData.emergencyContactName !== undefined
      ? formData.emergencyContactName : editingItem.emergencyContactName,
    emergencyContactPhone: formData.emergencyContactPhone !== undefined
      ? formData.emergencyContactPhone : editingItem.emergencyContactPhone,
    gender: formData.gender !== undefined ? formData.gender : editingItem.gender,
    notes: formData.notes !== undefined ? formData.notes : editingItem.notes,
    updatedAt: new Date()
  };
  result = await db.update<Student>('students', editingItem.id, studentUpdateData);
  setStudents(students.map(s => s.id === editingItem.id ? result! : s));
  break;
          
        case 'timeslot': {
          const currentSlot = timeSlots.find(ts => ts.id === editingItem.id);
          if (!currentSlot) {
            throw new Error('Time slot not found');
          }
          
          const timeSlotData: TimeSlot = {
            id: editingItem.id,
            courseId: formData.courseId || currentSlot.courseId,
            facultyId: formData.facultyId || currentSlot.facultyId,
            roomId: formData.roomId || currentSlot.roomId,
            departmentId: formData.departmentId || currentSlot.departmentId || '',
            dayOfWeek: formData.dayOfWeek !== undefined ? Number(formData.dayOfWeek) : currentSlot.dayOfWeek,
            startTime: formData.startTime || currentSlot.startTime,
            endTime: formData.endTime || currentSlot.endTime,
            yearLevel: formData.yearLevel !== undefined ? Number(formData.yearLevel) : currentSlot.yearLevel || 1,
            type: formData.type ? 
              (formData.type.charAt(0).toUpperCase() + formData.type.slice(1).toLowerCase() as TimeSlot['type']) : 
              currentSlot.type,
            academicYear: formData.academicYear || currentSlot.academicYear || selectedYear,
            semester: formData.semester !== undefined ? Number(formData.semester) : currentSlot.semester || selectedSemester,
            groupId: formData.groupId || currentSlot.groupId,
            isActive: formData.isActive !== undefined ? formData.isActive : currentSlot.isActive,
            createdAt: currentSlot.createdAt || new Date(),
            updatedAt: new Date()
          };
          
          console.log('Updating timeslot with data:', timeSlotData);
          result = await db.update<TimeSlot>('timeSlots', editingItem.id, timeSlotData);
          const updatedList = timeSlots.map(t => t.id === editingItem.id ? result! : t);
            setTimeSlots(updatedList);
            await checkConflicts(updatedList);
          break;
        }
          
        default:
          throw new Error(`Unknown modal type: ${modalType}`);
      }

      showAlert('success', `${modalType} updated successfully`);
      closeModal();
    } catch (error) {
      console.error('Failed to update:', error);
      showAlert('error', `Failed to update ${modalType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        'timeslot': 'timeSlots',
        'substitution': 'substitutions',
        'conflict': 'conflicts',
        'academicCalendar': 'academicCalendar'
      };

      const tableName = tableMap[type];
      if (!tableName) {
        throw new Error(`Unknown type: ${type}`);
      }

      console.log(`Deleting ${type} with id ${id} from table ${tableName}`);
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
        case 'timeslot': {
          const remaining = timeSlots.filter(t => t.id !== id);
          setTimeSlots(remaining);
          setConflicts(conflicts.filter(c => !c.affectedSlots.includes(id)));
          // Re-evaluate conflicts after removal
          await checkConflicts(remaining);
          break;
        }
      }

      showAlert('success', `${type} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete:', error);
      showAlert('error', `Failed to delete ${type}`);
    }
  };

  // Attendance Handlers
  const onMarkAttendance = async (attendanceData: Partial<Attendance>[]): Promise<Attendance[] | undefined> => {
    if (!db) return;
    
    try {
      const createdAttendance: Attendance[] = [];
      
      for (const data of attendanceData) {
        // Check if attendance already exists for this student, timeslot, and date
        const existing = attendance.find(a => 
          a.studentId === data.studentId && 
          a.timeSlotId === data.timeSlotId && 
          a.date === data.date
        );
        
        if (existing) {
          // Update existing attendance
          const updated = await db.update<Attendance>('attendance', existing.id, {
            ...existing,
            ...data,
            updatedAt: new Date()
          });
          if (updated) createdAttendance.push(updated);
        } else {
          // Create new attendance record
          const created = await db.create<Attendance>('attendance', {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>);
          createdAttendance.push(created);
        }
      }
      
      // Reload all attendance data
      const updatedAttendance = await db.getAll<Attendance>('attendance');
      setAttendance(updatedAttendance);
      
      showAlert('success', 'Attendance marked successfully');
      
      // Return the created/updated attendance records
      return createdAttendance;
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      showAlert('error', 'Failed to mark attendance');
      return undefined;
    }
  };

  const onUpdateAttendance = async (id: string, status: Attendance['status'], remarks?: string) => {
    if (!db) return;
    
    try {
      const updated = await db.update<Attendance>('attendance', id, {
        status,
        remarks,
        updatedAt: new Date()
      });
      
      if (updated) {
        setAttendance(prev => prev.map(a => a.id === id ? updated : a));
        showAlert('success', 'Attendance updated successfully');
      }
    } catch (error) {
      console.error('Failed to update attendance:', error);
      showAlert('error', 'Failed to update attendance');
    }
  };

  // Migration function
  const migrateDataStructure = async () => {
    if (!db) return;
    
    try {
      showAlert('info', 'Migrating data structure...');
      let migrationCount = 0;
      
      // Migrate students - rename 'year' to 'currentYear'
      const students = await db.getAll<any>('students');
      for (const student of students) {
        if (student.year !== undefined && student.currentYear === undefined) {
          await db.update('students', student.id, {
            ...student,
            currentYear: student.year,
            year: undefined
          });
          migrationCount++;
        }
      }
      
      // Migrate courses - ensure they use yearLevel instead of year
      const courses = await db.getAll<any>('courses');
      for (const course of courses) {
        if (course.year !== undefined && course.yearLevel === undefined) {
          await db.update('courses', course.id, {
            ...course,
            yearLevel: course.year,
            year: undefined
          });
          migrationCount++;
        }
      }
      
      // Remove yearLevel from departments if it exists
      const departments = await db.getAll<any>('departments');
      for (const dept of departments) {
        if (dept.yearLevel !== undefined) {
          const { yearLevel, ...deptWithoutYearLevel } = dept;
          await db.update('departments', dept.id, deptWithoutYearLevel);
          migrationCount++;
        }
      }
      
      // Remove yearLevel from faculty if it exists
      const facultyMembers = await db.getAll<any>('faculty');
      for (const fac of facultyMembers) {
        if (fac.yearLevel !== undefined) {
          const { yearLevel, ...facWithoutYearLevel } = fac;
          await db.update('faculty', fac.id, facWithoutYearLevel);
          migrationCount++;
        }
      }
      
      // Remove yearLevel from programs if it exists
      const programs = await db.getAll<any>('programs');
      for (const prog of programs) {
        if (prog.yearLevel !== undefined) {
          const { yearLevel, ...progWithoutYearLevel } = prog;
          await db.update('programs', prog.id, progWithoutYearLevel);
          migrationCount++;
        }
      }
      
      showAlert('success', `Data migration completed! Updated ${migrationCount} records.`);
      await loadAllData(db);
    } catch (error) {
      console.error('Migration failed:', error);
      showAlert('error', 'Data migration failed');
    }
  };

  // ===== Conflict Detection (refactored to useCallback & accept optional slots) =====
  const checkConflicts = useCallback(async (slotsOverride?: TimeSlot[]) => {
    if (!db) return;
    const slotsToUse = slotsOverride || timeSlots;

    try {
      addDynamicConstraints();

      // --- Custom conflict grouping logic for split classes ---
      // Helper: isSplitGroup
      const isSplitGroup = (slot: TimeSlot) =>
        slot.groupType === GroupType.Split && !!slot.groupId;

      // Room conflicts (ignore split groups with different groupIds)
      const roomGroups = slotsToUse.reduce((acc, slot) => {
        // For split groups, use groupId as part of the key to separate them
        const key = isSplitGroup(slot)
          ? `split-${slot.groupId}-${slot.roomId}-${slot.dayOfWeek}-${slot.startTime}`
          : `${slot.roomId}-${slot.dayOfWeek}-${slot.startTime}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(slot);
        return acc;
      }, {} as Record<string, TimeSlot[]>);

      // Faculty conflicts (ignore split groups with different groupIds)
      const facultyGroups = slotsToUse.reduce((acc, slot) => {
        const key = isSplitGroup(slot)
          ? `split-${slot.groupId}-${slot.facultyId}-${slot.dayOfWeek}-${slot.startTime}`
          : `${slot.facultyId}-${slot.dayOfWeek}-${slot.startTime}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(slot);
        return acc;
      }, {} as Record<string, TimeSlot[]>);

      // Year-level conflicts (ignore split groups with same groupId)
      const yearGroups = slotsToUse.reduce((acc, slot) => {
        // For split groups, use groupId as part of the key to separate them
        const key = isSplitGroup(slot)
          ? `split-${slot.groupId}-${slot.yearLevel}-${slot.dayOfWeek}-${slot.startTime}`
          : `${slot.yearLevel}-${slot.dayOfWeek}-${slot.startTime}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(slot);
        return acc;
      }, {} as Record<string, TimeSlot[]>);

      const newConflicts: Omit<Conflict, 'id' | 'createdAt' | 'updatedAt'>[] = [];

      // Room conflicts
      Object.entries(roomGroups).forEach(([key, slots]) => {
        // Only flag as conflict if more than one slot and NOT all from the same split group
        if (slots.length > 1) {
          // If all slots are split and share the same groupId, it's not a conflict
          const allSplit = slots.every(isSplitGroup);
          const allSameGroup = allSplit && slots.every(s => s.groupId === slots[0].groupId);
          if (allSplit && allSameGroup) return; // skip, intentional split

          const room = rooms.find(r => r.id === slots[0].roomId);
          newConflicts.push({
            description: `Room conflict: Multiple classes scheduled in the same room at the same time`,
            details: `Room ${room?.name || slots[0].roomId} has ${slots.length} conflicting classes at ${slots[0].startTime}`,
            affectedSlots: slots.map(s => s.id),
            resolved: false,
            type: ConflictType.Room,
            severity: ConflictSeverity.High
          });
        }
      });

      // Faculty conflicts
      Object.entries(facultyGroups).forEach(([key, slots]) => {
        if (slots.length > 1) {
          const allSplit = slots.every(isSplitGroup);
          const allSameGroup = allSplit && slots.every(s => s.groupId === slots[0].groupId);
          if (allSplit && allSameGroup) return; // skip, intentional split

          const fac = faculty.find(f => f.id === slots[0].facultyId);
          newConflicts.push({
            description: `Faculty conflict: Teacher scheduled for multiple classes at the same time`,
            details: `${fac?.firstName} ${fac?.lastName} has ${slots.length} conflicting classes at ${slots[0].startTime}`,
            affectedSlots: slots.map(s => s.id),
            resolved: false,
            type: ConflictType.Faculty,
            severity: ConflictSeverity.High
          });
        }
      });

      // Year-level conflicts
      Object.entries(yearGroups).forEach(([key, slots]) => {
        if (slots.length > 1) {
          const allSplit = slots.every(isSplitGroup);
          const allSameGroup = allSplit && slots.every(s => s.groupId === slots[0].groupId);
          if (allSplit && allSameGroup) return; // skip, intentional split

          newConflicts.push({
            description: `Student group conflict: Year level has multiple classes at the same time`,
            details: `Year ${slots[0].yearLevel} students have ${slots.length} conflicting classes at ${slots[0].startTime}`,
            affectedSlots: slots.map(s => s.id),
            resolved: false,
            type: ConflictType.StudentGroup,
            severity: ConflictSeverity.High,
          });
        }
      });

      // Clear & persist (could be optimized later with diffing)
      const oldConflicts = await db.getAll<Conflict>('conflicts');
      if (oldConflicts.length) {
        await Promise.all(oldConflicts.map(c => db.delete('conflicts', c.id)));
      }
      const savedConflicts: Conflict[] = [];
      for (const conflict of newConflicts) {
        const saved = await db.create<Conflict>('conflicts', conflict);
        savedConflicts.push(saved);
      }
      setConflicts(savedConflicts);
      showConflictSummaryAlert(analyzeConflictSummary(savedConflicts));
    } catch (err) {
      console.error('Conflict detection failed:', err);
      showAlert('error', 'Failed to analyze conflicts');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, courses, faculty, rooms, students, constraintManager, conflictResolver]); 
  // NOTE: Intentionally excluding timeSlots so we can pass explicit lists & avoid stale capture bugs.

  // Add dynamic constraints based on faculty preferences
  const addDynamicConstraints = () => {
    constraintManager.clearDynamicConstraints();
    
    faculty.forEach(fac => {
      if (fac.preferences?.noAfternoons) {
        constraintManager.addConstraint({
          id: `pref-${fac.id}-no-afternoon`,
          type: 'soft',
          category: 'preference',
          description: `${fac.firstName} ${fac.lastName} prefers morning classes`,
          importance: 400,
          canRelax: true,
          relaxationPenalty: 100
        });
      }
      
      if (fac.preferences?.maxDailyHours) {
        constraintManager.addConstraint({
          id: `pref-${fac.id}-max-hours`,
          type: 'soft',
          category: 'faculty',
          description: `${fac.firstName} max ${fac.preferences.maxDailyHours} hours/day`,
          importance: 600,
          canRelax: true,
          relaxationPenalty: 150
        });
      }
    });
  };

  // Analyze conflict summary
  const analyzeConflictSummary = (conflicts: Conflict[]) => {
    const summary = {
      total: conflicts.length,
      high: conflicts.filter(c => c.severity === 'high').length,
      medium: conflicts.filter(c => c.severity === 'medium').length,
      low: conflicts.filter(c => c.severity === 'low').length,
      autoResolvable: conflicts.filter(c => c.autoResolvable).length,
      byType: {} as Record<string, number>
    };
    
    conflicts.forEach(c => {
      summary.byType[c.type] = (summary.byType[c.type] || 0) + 1;
    });
    
    return summary;
  };

  // Show conflict summary alert
  const showConflictSummaryAlert = (summary: { 
    total: number; 
    high: number; 
    medium: number; 
    low: number; 
    autoResolvable: number; 
    byType: Record<string, number>; 
  }) => {
    if (summary.total === 0) {
      showAlert('success', '✨ Perfect! No scheduling conflicts detected.');
      return;
    }
    
    let message = `Found ${summary.total} conflicts: `;
    
    if (summary.high > 0) {
      message += `${summary.high} critical`;
    }
    if (summary.medium > 0) {
      message += `${summary.high > 0 ? ', ' : ''}${summary.medium} important`;
    }
    if (summary.low > 0) {
      message += `${(summary.high > 0 || summary.medium > 0) ? ', ' : ''}${summary.low} minor`;
    }
    
    if (summary.autoResolvable > 0) {
      message += ` (${summary.autoResolvable} can be auto-resolved)`;
    }
    
    showAlert(summary.high > 0 ? 'error' : 'warning', message);
  };

  // ===== Timetable Generation (batch & conflict-safe) =====
  const generateTimetable = useCallback(async () => {
    if (!db) return;
    if (timeSlots.length > 0) {
      const confirmClear = window.confirm(
        `This will delete all ${timeSlots.length} existing time slots and generate new ones. Continue?`
      );
      if (!confirmClear) return;
    }
    showAlert('info', 'Generating optimal timetable...');
    try {
      // Clear existing
      await Promise.all(timeSlots.map(s => db.delete('timeSlots', s.id)));

      const newSlots: TimeSlot[] = [];
      const availableRooms = rooms.filter(r => r.available);
      const activeCourses = courses.filter(c => c.semester === selectedSemester);
      let dayIndex = 1;
      let timeIndex = 0;
      const timePeriods = ['08:00', '10:00', '13:00', '15:00'];

      for (const course of activeCourses) {
        const courseFaculty = faculty.find(f => f.departmentId === course.departmentId);
        const suitableRoom = availableRooms.find(r =>
          r.capacity >= 50 &&
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
            yearLevel: course.yearLevel || 1,
            academicYear: selectedYear,
            semester: selectedSemester,
            isActive: true,
            type: LessonType.Lecture
          });
          newSlots.push(slot);
          timeIndex = (timeIndex + 1) % timePeriods.length;
          if (timeIndex === 0) {
            dayIndex++;
            if (dayIndex > 5) dayIndex = 1;
          }
        }
      }
      setTimeSlots(newSlots);
      await checkConflicts(newSlots);
      showAlert('success', 'Timetable generated successfully!');
    } catch (e) {
      console.error('Failed to generate timetable:', e);
      showAlert('error', 'Failed to generate timetable');
    }
  }, [db, timeSlots, rooms, courses, faculty, selectedSemester, selectedYear, checkConflicts]); 

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

  // Add handler for bulk importing students
  const handleBulkImport = async (importedStudents: Partial<Student>[]) => {
    if (!db) return;
    
    try {
      setLoading(true);
      showAlert('info', `Importing ${importedStudents.length} students...`);
      
      const results = await Promise.allSettled(
        importedStudents.map(async (studentData) => {
          // Prepare the student data with all required fields
          const newStudent: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
            studentId: studentData.studentId || '',
            firstName: studentData.firstName || '',
            lastName: studentData.lastName || '',
            email: studentData.email || '',
            phone: studentData.phone || '',
            programId: studentData.programId || '',
            currentYear: studentData.currentYear || (studentData as any).year || 1,
            enrolledCourses: studentData.enrolledCourses || [],
            currentSemester: studentData.currentSemester || (studentData as any).semester || 1 // was 0 (invalid)
          };
          
          // Create the student in the database
          return await db.create<Student>('students', newStudent);
        })
      );
      
      // Count successful and failed imports
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Reload all students to update the UI
      const updatedStudents = await db.getAll<Student>('students');
      setStudents(updatedStudents);
      
      // Show appropriate alert based on results
      if (failed === 0) {
        showAlert('success', `Successfully imported ${successful} students`);
      } else if (successful === 0) {
        showAlert('error', `Failed to import all ${failed} students`);
      } else {
        showAlert('warning', `Imported ${successful} students successfully, ${failed} failed`);
      }
      
    } catch (error) {
      console.error('Bulk import error:', error);
      showAlert('error', 'Failed to import students');
    } finally {
      setLoading(false);
    }
  };

  // Add handler for bulk importing departments
  const handleBulkImportDepartments = async (importedDepartments: Partial<Department>[]) => {
    if (!db) return;
    
    try {
      setLoading(true);
      showAlert('info', `Importing ${importedDepartments.length} departments...`);
      
      const results = await Promise.allSettled(
        importedDepartments.map(async (deptData) => {
          const newDepartment: Omit<Department, 'id' | 'createdAt' | 'updatedAt'> = {
            code: deptData.code || '',
            name: deptData.name || '',
            description: deptData.description || '',
            head: deptData.head || '',
            email: deptData.email || '',
            phone: deptData.phone || ''
          };
          return await db.create<Department>('departments', newDepartment);
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Reload departments to update the UI
      await loadAllData(db);
      
      if (failed === 0) {
        showAlert('success', `Successfully imported ${successful} departments`);
      } else if (successful === 0) {
        showAlert('error', `Failed to import all ${failed} departments`);
      } else {
        showAlert('warning', `Imported ${successful} departments successfully, ${failed} failed`);
      }
      
    } catch (error) {
      console.error('Bulk import error:', error);
      showAlert('error', 'Failed to import departments');
    } finally {
      setLoading(false);
    }
  };

  // Add handler for bulk importing programs
  const handleBulkImportPrograms = async (importedPrograms: Partial<Program>[]) => {
    if (!db) return;
    
    try {
      setLoading(true);
      showAlert('info', `Importing ${importedPrograms.length} programs...`);
      
      const results = await Promise.allSettled(
        importedPrograms.map(async (programData) => {
          const newProgram: Omit<Program, 'id' | 'createdAt' | 'updatedAt'> = {
            code: programData.code || '',
            name: programData.name || '',
            description: programData.description || '',
            departmentId: programData.departmentId || '',
            duration: programData.duration || 4,
            totalCredits: programData.totalCredits || 120,
            coordinator: programData.coordinator || '',
            mode: programData.mode || ProgramMode.FullTime,
            level: programData.level || ProgramLevel.Undergraduate
          };
          return await db.create<Program>('programs', newProgram);
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Reload programs to update the UI
      await loadAllData(db);
      
      if (failed === 0) {
        showAlert('success', `Successfully imported ${successful} programs`);
      } else if (successful === 0) {
        showAlert('error', `Failed to import all ${failed} programs`);
      } else {
        showAlert('warning', `Imported ${successful} programs successfully, ${failed} failed`);
      }
      
    } catch (error) {
      console.error('Bulk import error:', error);
      showAlert('error', 'Failed to import programs');
    } finally {
      setLoading(false);
    }
  };

  // Add handler for bulk importing courses
  const handleBulkImportCourses = async (importedCourses: Partial<Course>[]) => {
    if (!db) return;
    
    try {
      setLoading(true);
      showAlert('info', `Importing ${importedCourses.length} courses...`);
      
      const results = await Promise.allSettled(
        importedCourses.map(async (courseData) => {
          const newCourse: Omit<Course, 'id' | 'createdAt' | 'updatedAt'> = {
            code: courseData.code || '',
            name: courseData.name || '',
            description: courseData.description || '',
            credits: courseData.credits || 3,
            departmentId: courseData.departmentId || '',
            programId: courseData.programId || '',
            semester: courseData.semester || 1,
            yearLevel: courseData.yearLevel || 1,
            isCore: courseData.isCore !== undefined ? courseData.isCore : true,
            prerequisites: courseData.prerequisites || []
          };
          return await db.create<Course>('courses', newCourse);
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Reload courses to update the UI
      await loadAllData(db);
      
      if (failed === 0) {
        showAlert('success', `Successfully imported ${successful} courses`);
      } else if (successful === 0) {
        showAlert('error', `Failed to import all ${failed} courses`);
      } else {
        showAlert('warning', `Imported ${successful} courses successfully, ${failed} failed`);
      }
      
    } catch (error) {
      console.error('Bulk import error:', error);
      showAlert('error', 'Failed to import courses');
    } finally {
      setLoading(false);
    }
  };

  // Add handler for bulk importing faculty
  const handleBulkImportFaculty = async (importedFaculty: Partial<Faculty>[]) => {
    if (!db) return;
    
    try {
      setLoading(true);
      showAlert('info', `Importing ${importedFaculty.length} faculty members...`);
      
      const results = await Promise.allSettled(
        importedFaculty.map(async (facultyData) => {
          const newFaculty: Omit<Faculty, 'id' | 'createdAt' | 'updatedAt'> = {
            staffId: facultyData.staffId || '',
            title: facultyData.title || 'Mr.',
            firstName: facultyData.firstName || '',
            lastName: facultyData.lastName || '',
            email: facultyData.email || '',
            phone: facultyData.phone || '',
            departmentId: facultyData.departmentId || '',
            specialization: facultyData.specialization || '',
            officeNumber: facultyData.officeNumber || '',
            officeHours: facultyData.officeHours || ''
          };
          return await db.create<Faculty>('faculty', newFaculty);
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Reload faculty to update the UI
      await loadAllData(db);
      
      if (failed === 0) {
        showAlert('success', `Successfully imported ${successful} faculty members`);
      } else if (successful === 0) {
        showAlert('error', `Failed to import all ${failed} faculty members`);
      } else {
        showAlert('warning', `Imported ${successful} faculty members successfully, ${failed} failed`);
      }
      
    } catch (error) {
      console.error('Bulk import error:', error);
      showAlert('error', 'Failed to import faculty');
    } finally {
      setLoading(false);
    }
  };

  // Add handler for bulk importing rooms
  const handleBulkImportRooms = async (importedRooms: Partial<Room>[]) => {
    if (!db) return;
    
    try {
      setLoading(true);
      showAlert('info', `Importing ${importedRooms.length} rooms...`);
      
      const results = await Promise.allSettled(
        importedRooms.map(async (roomData) => {
          const newRoom: Omit<Room, 'id' | 'createdAt' | 'updatedAt'> = {
            code: roomData.code || '',
            name: roomData.name || '',
            building: roomData.building || '',
            floor: roomData.floor || 1,
            capacity: roomData.capacity || 30,
            type: roomData.type || RoomType.Lecture,
            equipment: roomData.equipment || [],
            available: roomData.available !== undefined ? roomData.available : true
          };
          return await db.create<Room>('rooms', newRoom);
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Reload rooms to update the UI
      await loadAllData(db);
      
      if (failed === 0) {
        showAlert('success', `Successfully imported ${successful} rooms`);
      } else if (successful === 0) {
        showAlert('error', `Failed to import all ${failed} rooms`);
      } else {
        showAlert('warning', `Imported ${successful} rooms successfully, ${failed} failed`);
      }
      
    } catch (error) {
      console.error('Bulk import error:', error);
      showAlert('error', 'Failed to import rooms');
    } finally {
      setLoading(false);
    }
  };

  // Add handler for substitution actions
  const handleSubstitutionAction = async (id: string, action: 'approve' | 'reject') => {
    if (!db) return;
    
    // Use the correct SubstitutionStatus enum values
    const status = action === 'approve' ? SubstitutionStatus.Approved : SubstitutionStatus.Rejected;
    await db.update<Substitution>('substitutions', id, { status });
    setSubstitutions(substitutions.map(s =>
      s.id === id ? { ...s, status } : s
    ));
    showAlert('success', `Substitution ${status.toLowerCase()}`);
  };

  // Add handler for migrating time slots
  const handleMigrateTimeSlots = async () => {
    if (!db) return;
    
    try {
      showAlert('info', 'Migrating time slots to next semester...');
      
      // Get current time slots
      const currentSlots = timeSlots.filter(slot => 
        slot.semester === selectedSemester && 
        slot.academicYear === selectedYear
      );
      
      // Calculate next semester/year
      const nextSemester = selectedSemester === 2 ? 1 : 2;
      const nextYear = selectedSemester === 2 ? (parseInt(selectedYear) + 1).toString() : selectedYear;
      
      // Create new time slots for next semester
      const newSlots: TimeSlot[] = [];
      for (const slot of currentSlots) {
        const newSlot = await db.create<TimeSlot>('timeSlots', {
          courseId: slot.courseId,
          facultyId: slot.facultyId,
          roomId: slot.roomId,
          departmentId: slot.departmentId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          yearLevel: slot.yearLevel,
          type: slot.type,
          academicYear: nextYear,
          semester: nextSemester,
          isActive: true
        });
        newSlots.push(newSlot);
      }
      
      setTimeSlots([...timeSlots, ...newSlots]);
      showAlert('success', `Migrated ${newSlots.length} time slots to Semester ${nextSemester}, ${nextYear}`);
    } catch (error) {
      console.error('Failed to migrate time slots:', error);
      showAlert('error', 'Failed to migrate time slots');
    }
  };

  // Database diagnostics function
  const runDatabaseDiagnostics = async () => {
    if (!db) {
      showAlert('error', 'Database not initialized');
      return;
    }

    console.log('Running database diagnostics...');
    
    try {
      const result = await DatabaseIntegrityChecker.verifyAndRepairDatabase(db);
      
      console.log('Diagnostic Results:', result);
      
      if (result.success) {
        showAlert('success', result.message);
        // Reload data after fixes
        await loadAllData(db);
      } else {
        showAlert('warning', result.message);
      }
      
      // Log detailed report to console
      console.log('Detailed Report:', result.details);
      
      // Create download link for diagnostic data
      const blob = new Blob([JSON.stringify(result.details, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-diagnostic-${new Date().toISOString()}.json`;
      
      // Ask user if they want to download the diagnostic file
      if (window.confirm('Download diagnostic report?')) {
        a.click();
      }
      
      URL.revokeObjectURL(url);
      
      return result;
    } catch (error) {
      console.error('Diagnostic failed:', error);
      showAlert('error', 'Failed to run database diagnostics');
      return null;
    }
  };

  // Menu Items with icon mapping
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'programs', label: 'Programs', icon: School },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'faculty', label: 'Faculty', icon: Users },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'rooms', label: 'Rooms', icon: Building },
    { id: 'attendance', label: 'Attendance', icon: User },
    { id: 'substitutions', label: 'Substitutions', icon: RefreshCw },
    { id: 'calendar', label: 'Academic Calendar', icon: CalendarPlus },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
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
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div className={`
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-4'}
        ml-0
      `}>
        {/* Header Component */}
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          conflicts={conflicts}
        />

        {/* Page Content */}
        <main className="p-3 sm:p-4 lg:p-6 min-h-screen bg-gray-50">
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
              onMigrateTimeSlots={handleMigrateTimeSlots}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceSection
              students={students}
              timeSlots={timeSlots}
              courses={courses}
              faculty={faculty}
              rooms={rooms}
              conflicts={conflicts}
              departments={departments}
              selectedYear={selectedYear}
              selectedSemester={selectedSemester}
              setSelectedYear={setSelectedYear}
              setSelectedSemester={setSelectedSemester}
              openModal={openModal}
              showAlert={showAlert}
              setFormData={setFormData}
              attendance={attendance}
              currentUser={currentUser}
              onMarkAttendance={onMarkAttendance}
              onUpdateAttendance={onUpdateAttendance}
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
              onMarkAttendance={onMarkAttendance}
              db={db}
              onRecalculateConflicts={checkConflicts} // NEW
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
              handleBulkImport={handleBulkImportDepartments}
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
              handleBulkImport={handleBulkImportPrograms}
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
              handleBulkImport={handleBulkImportCourses}
            />
          )}
          
          {activeTab === 'faculty' && (
            <FacultySection
              faculty={faculty}
              departments={departments}
              openModal={openModal}
              handleDelete={handleDelete}
              handleBulkImport={handleBulkImportFaculty}
            />
          )}
          
          {activeTab === 'rooms' && (
            <Rooms
              rooms={rooms}
              openModal={openModal}
              handleDelete={handleDelete}
              handleBulkImport={handleBulkImportRooms}
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
              handleBulkImport={handleBulkImport}
              
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
              onRunDiagnostics={runDatabaseDiagnostics}
              onClearDatabase={async () => {
                if (window.confirm('⚠️ This will permanently delete ALL data. Are you absolutely sure?')) {
                  if (window.confirm('⚠️ FINAL WARNING: This action cannot be undone. Continue?')) {
                    try {
                      await db?.clearDatabase();
                      window.location.reload();
                    } catch (error) {
                      showAlert('error', 'Failed to clear database');
                    }
                  }
                }
              }}
            />
          )}
        </main>
      </div>

      {/* Modal */}
      <FormModal
        showModal={showModal}
        modalType={modalType}
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