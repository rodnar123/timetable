'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Users, BookOpen, Building, AlertCircle, Download, Upload, Menu, X, ChevronDown, Plus, Search, Filter, Grid, List, Bell, Settings, Home, BarChart3, Save, RefreshCw, User, GraduationCap, MapPin, Activity, Edit, Trash2, Eye, Check, XCircle, Database, UserPlus, BookPlus, Building2, CalendarPlus, Loader, CheckCircle, AlertTriangle, Info, School, CreditCard, FileText, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Database Types
interface Department {
  id: string;
  name: string;
  code: string;
  head: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Program {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  level: 'undergraduate' | 'postgraduate';
  duration: number; // in years
  createdAt: Date;
  updatedAt: Date;
}

interface Course {
  id: string;
  code: string;
  name: string;
  programId: string;
  departmentId: string;
  credits: number;
  semester: number;
  year: number;
  description: string;
  prerequisites: string[];
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Faculty {
  id: string;
  staffId: string;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: string;
  specialization: string;
  officeNumber: string;
  officeHours: string;
  qualifications: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Room {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  type: 'lecture' | 'tutorial' | 'lab' | 'computer' | 'workshop';
  equipment: string[];
  available: boolean;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface TimeSlot {
  id: string;
  courseId: string;
  facultyId: string;
  roomId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string;
  type: 'lecture' | 'tutorial' | 'lab' | 'workshop';
  groupId?: string; // for splitting classes into groups
  academicYear: string;
  semester: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  programId: string;
  year: number;
  enrolledCourses: string[]; // course IDs
  createdAt: Date;
  updatedAt: Date;
}

interface Substitution {
  id: string;
  originalSlotId: string;
  substituteFactoryId?: string;
  substituteRoomId?: string;
  date: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Conflict {
  id: string;
  type: 'room' | 'faculty' | 'student_group';
  description: string;
  severity: 'high' | 'medium' | 'low';
  affectedSlots: string[];
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AcademicCalendar {
  id: string;
  academicYear: string;
  semester: number;
  startDate: Date;
  endDate: Date;
  breakStart?: Date;
  breakEnd?: Date;
  examStart?: Date;
  examEnd?: Date;
  holidays: { date: Date; name: string }[];
  createdAt: Date;
  updatedAt: Date;
}

// IndexedDB Database Service
class TimetableDB {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'PNGUnitechTimetableDB';
  private readonly version = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        const stores = [
          'departments', 'programs', 'courses', 'faculty', 'rooms',
          'timeSlots', 'students', 'substitutions', 'conflicts', 'academicCalendar'
        ];

        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });

            // Add specific indexes
            switch (storeName) {
              case 'courses':
                store.createIndex('departmentId', 'departmentId', { unique: false });
                store.createIndex('programId', 'programId', { unique: false });
                break;
              case 'faculty':
                store.createIndex('departmentId', 'departmentId', { unique: false });
                store.createIndex('staffId', 'staffId', { unique: true });
                break;
              case 'timeSlots':
                store.createIndex('courseId', 'courseId', { unique: false });
                store.createIndex('facultyId', 'facultyId', { unique: false });
                store.createIndex('roomId', 'roomId', { unique: false });
                store.createIndex('dayOfWeek', 'dayOfWeek', { unique: false });
                break;
              case 'students':
                store.createIndex('programId', 'programId', { unique: false });
                store.createIndex('studentId', 'studentId', { unique: true });
                break;
            }
          }
        });
      };
    });
  }

  // Generic CRUD operations
  async create<T extends { id: string; createdAt: Date; updatedAt: Date }>(
      storeName: string,
      data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    const item = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as T;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async update<T extends { id: string; updatedAt: Date }>(
      storeName: string,
      id: string,
      data: Partial<T>
  ): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          resolve(null);
          return;
        }

        const updated = {
          ...existing,
          ...data,
          id,
          updatedAt: new Date()
        };

        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async delete(storeName: string, id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async query<T>(
      storeName: string,
      indexName: string,
      value: any
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export data
  async exportData(): Promise<string> {
    const stores = [
      'departments', 'programs', 'courses', 'faculty', 'rooms',
      'timeSlots', 'students', 'substitutions', 'academicCalendar'
    ];

    const data: any = {};

    for (const storeName of stores) {
      data[storeName] = await this.getAll(storeName);
    }

    return JSON.stringify(data, null, 2);
  }

  // Import data
  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);

    for (const [storeName, items] of Object.entries(data)) {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // Clear existing data
      await new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });

      // Add imported data
      for (const item of items as any[]) {
        await new Promise<void>((resolve, reject) => {
          const addRequest = store.add(item);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(addRequest.error);
        });
      }
    }
  }
}

// Main Application Component
export default function PNGUnitechTimetableSystem() {
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

  // UI States
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedYear, setSelectedYear] = useState('2025');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'department' | 'program' | 'course' | 'faculty' | 'room' | 'student' | 'timeslot' | 'substitution'>('department');
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form States
  const [formData, setFormData] = useState<any>({});

  // Toast/Alert State
  const [alert, setAlert] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>({ show: false, type: 'success', message: '' });

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
        depts, progs, crses, fac, rms, slots, stds, subs, conf, cal
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
        database.getAll<AcademicCalendar>('academicCalendar')
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
  const openModal = (type: typeof modalType, item?: any) => {
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

  // CRUD Handlers
  const handleCreate = async () => {
    if (!db) return;

    try {
      let result;
      switch (modalType) {
        case 'department':
          result = await db.create<Department>('departments', formData);
          setDepartments([...departments, result]);
          break;
        case 'program':
          result = await db.create<Program>('programs', formData);
          setPrograms([...programs, result]);
          break;
        case 'course':
          result = await db.create<Course>('courses', {
            ...formData,
            prerequisites: formData.prerequisites || [],
            color: formData.color || generateColor()
          });
          setCourses([...courses, result]);
          break;
        case 'faculty':
          result = await db.create<Faculty>('faculty', {
            ...formData,
            qualifications: formData.qualifications || []
          });
          setFaculty([...faculty, result]);
          break;
        case 'room':
          result = await db.create<Room>('rooms', {
            ...formData,
            equipment: formData.equipment || [],
            features: formData.features || [],
            available: formData.available !== false
          });
          setRooms([...rooms, result]);
          break;
        case 'student':
          result = await db.create<Student>('students', {
            ...formData,
            enrolledCourses: formData.enrolledCourses || []
          });
          setStudents([...students, result]);
          break;
        case 'timeslot':
          result = await db.create<TimeSlot>('timeSlots', {
            ...formData,
            isActive: true
          });
          setTimeSlots([...timeSlots, result]);
          await checkConflicts();
          break;
      }

      showAlert('success', `${modalType} created successfully`);
      closeModal();
    } catch (error) {
      console.error('Failed to create:', error);
      showAlert('error', `Failed to create ${modalType}`);
    }
  };

  const handleUpdate = async () => {
    if (!db || !editingItem) return;

    try {
      let result;
      switch (modalType) {
        case 'department':
          result = await db.update<Department>('departments', editingItem.id, formData);
          setDepartments(departments.map(d => d.id === editingItem.id ? result! : d));
          break;
        case 'program':
          result = await db.update<Program>('programs', editingItem.id, formData);
          setPrograms(programs.map(p => p.id === editingItem.id ? result! : p));
          break;
        case 'course':
          result = await db.update<Course>('courses', editingItem.id, formData);
          setCourses(courses.map(c => c.id === editingItem.id ? result! : c));
          break;
        case 'faculty':
          result = await db.update<Faculty>('faculty', editingItem.id, formData);
          setFaculty(faculty.map(f => f.id === editingItem.id ? result! : f));
          break;
        case 'room':
          result = await db.update<Room>('rooms', editingItem.id, formData);
          setRooms(rooms.map(r => r.id === editingItem.id ? result! : r));
          break;
        case 'student':
          result = await db.update<Student>('students', editingItem.id, formData);
          setStudents(students.map(s => s.id === editingItem.id ? result! : s));
          break;
        case 'timeslot':
          result = await db.update<TimeSlot>('timeSlots', editingItem.id, formData);
          setTimeSlots(timeSlots.map(t => t.id === editingItem.id ? result! : t));
          await checkConflicts();
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
    if (!db || !confirm('Are you sure you want to delete this item?')) return;

    try {
      await db.delete(type + 's', id);

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
          break;
      }

      showAlert('success', `${type} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete:', error);
      showAlert('error', `Failed to delete ${type}`);
    }
  };

  // Conflict Detection
  const checkConflicts = async () => {
    if (!db) return;

    const newConflicts: Omit<Conflict, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    // Check room conflicts
    const roomGroups = timeSlots.reduce((acc, slot) => {
      const key = `${slot.roomId}-${slot.dayOfWeek}-${slot.startTime}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);

    Object.entries(roomGroups).forEach(([key, slots]) => {
      if (slots.length > 1) {
        newConflicts.push({
          type: 'room',
          description: `Room conflict: Multiple classes scheduled in the same room at the same time`,
          severity: 'high',
          affectedSlots: slots.map(s => s.id),
          resolved: false
        });
      }
    });

    // Check faculty conflicts
    const facultyGroups = timeSlots.reduce((acc, slot) => {
      const key = `${slot.facultyId}-${slot.dayOfWeek}-${slot.startTime}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);

    Object.entries(facultyGroups).forEach(([key, slots]) => {
      if (slots.length > 1) {
        newConflicts.push({
          type: 'faculty',
          description: `Faculty conflict: Teacher scheduled for multiple classes at the same time`,
          severity: 'high',
          affectedSlots: slots.map(s => s.id),
          resolved: false
        });
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

    showAlert('info', 'Generating optimal timetable...');

    try {
      // This is a simplified version. A real implementation would use
      // genetic algorithms or constraint satisfaction algorithms

      // Clear existing time slots
      for (const slot of timeSlots) {
        await db.delete('timeSlots', slot.id);
      }

      const newSlots: TimeSlot[] = [];
      const availableRooms = rooms.filter(r => r.available);
      const activeCourses = courses.filter(c =>
          c.semester === selectedSemester &&
          c.year.toString() === selectedYear
      );

      // Simple scheduling algorithm
      let dayIndex = 1; // Start from Monday
      let timeIndex = 0;
      const timePeriods = ['08:00', '10:00', '13:00', '15:00'];

      for (const course of activeCourses) {
        const courseFaculty = faculty.find(f => f.departmentId === course.departmentId);
        const suitableRoom = availableRooms.find(r =>
            r.capacity >= 50 && // Assume minimum capacity
            (course.name.includes('Lab') ? r.type === 'lab' : r.type === 'lecture')
        );

        if (courseFaculty && suitableRoom) {
          const slot = await db.create<TimeSlot>('timeSlots', {
            courseId: course.id,
            facultyId: courseFaculty.id,
            roomId: suitableRoom.id,
            dayOfWeek: dayIndex,
            startTime: timePeriods[timeIndex],
            endTime: addHours(timePeriods[timeIndex], 2),
            type: course.name.includes('Lab') ? 'lab' : 'lecture',
            academicYear: selectedYear,
            semester: selectedSemester,
            isActive: true
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

  // Helper Functions
  const generateColor = () => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-yellow-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const addHours = (time: string, hours: number): string => {
    const [h, m] = time.split(':').map(Number);
    const newHour = h + hours;
    return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getDayName = (dayIndex: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  };

  // Export/Import Handlers
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

  // Menu Items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
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

  // Render Functions for each section
  const renderDashboard = () => (
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
          <div className="flex gap-3">
            <button
                onClick={generateTimetable}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Generate Timetable
            </button>
            <button
                onClick={handleExport}
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

  const renderTimetable = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlotHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-800">Weekly Timetable</h2>
            <div className="flex gap-3">
              <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
              <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
              <button
                  onClick={() => openModal('timeslot')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Time Slot
              </button>
            </div>
          </div>

          {/* Timetable Grid */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Time</th>
                  {days.map(day => (
                      <th key={day} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-l">
                        {day}
                      </th>
                  ))}
                </tr>
                </thead>
                <tbody>
                {timeSlotHours.map((hour, hourIndex) => (
                    <tr key={hour} className={hourIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-600 border-b whitespace-nowrap">
                        {hour}
                      </td>
                      {days.map((day, dayIndex) => {
                        const dayNumber = dayIndex + 1; // Monday = 1, Friday = 5
                        const slot = timeSlots.find(
                            s => s.dayOfWeek === dayNumber &&
                                s.startTime === hour &&
                                s.academicYear === selectedYear &&
                                s.semester === selectedSemester &&
                                s.isActive
                        );

                        if (slot) {
                          const course = courses.find(c => c.id === slot.courseId);
                          const room = rooms.find(r => r.id === slot.roomId);
                          const instructor = faculty.find(f => f.id === slot.facultyId);

                          return (
                              <td key={day} className="px-2 py-2 border-b border-l relative h-20">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={`${course?.color || 'bg-gray-400'} text-white p-2 rounded-md text-xs h-full flex flex-col justify-center cursor-pointer hover:shadow-lg transition-shadow`}
                                    onClick={() => openModal('timeslot', slot)}
                                >
                                  <p className="font-semibold">{course?.code}</p>
                                  <p className="text-xs opacity-90">{room?.code}</p>
                                  <p className="text-xs opacity-80">{instructor?.firstName} {instructor?.lastName}</p>
                                </motion.div>
                              </td>
                          );
                        }

                        return (
                            <td key={day} className="px-2 py-2 border-b border-l relative h-20 hover:bg-gray-100">
                              <button
                                  onClick={() => {
                                    setFormData({
                                      dayOfWeek: dayNumber,
                                      startTime: hour,
                                      endTime: addHours(hour, 1),
                                      academicYear: selectedYear,
                                      semester: selectedSemester
                                    });
                                    openModal('timeslot');
                                  }}
                                  className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                              >
                                <Plus className="w-4 h-4 text-gray-400" />
                              </button>
                            </td>
                        );
                      })}
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conflicts Display */}
          {conflicts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">Scheduling Conflicts ({conflicts.length})</h3>
                </div>
                <div className="space-y-2">
                  {conflicts.map(conflict => (
                      <div key={conflict.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm text-red-700">{conflict.description}</p>
                          <p className="text-xs text-red-500">Severity: {conflict.severity}</p>
                        </div>
                        <button
                            onClick={() => {
                              // Handle conflict resolution
                              showAlert('info', 'Conflict resolution coming soon');
                            }}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                        >
                          Resolve
                        </button>
                      </div>
                  ))}
                </div>
              </div>
          )}
        </motion.div>
    );
  };

  const renderDepartments = () => (
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Departments</h2>
          <button
              onClick={() => openModal('department')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map(dept => (
              <motion.div
                  key={dept.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{dept.name}</h3>
                    <p className="text-sm text-gray-600">Code: {dept.code}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-500">Department Head:</span>
                    <p className="text-gray-700">{dept.head}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Programs:</span>
                    <p className="text-gray-700">{programs.filter(p => p.departmentId === dept.id).length}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Faculty:</span>
                    <p className="text-gray-700">{faculty.filter(f => f.departmentId === dept.id).length}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                      onClick={() => openModal('department', dept)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                      onClick={() => handleDelete('department', dept.id)}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </motion.div>
          ))}
        </div>
      </motion.div>
  );

  const renderPrograms = () => (
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Programs</h2>
          <button
              onClick={() => openModal('program')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Program
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b flex gap-4">
            <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <table className="w-full">
            <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Level</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Duration</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
            </thead>
            <tbody>
            {programs
                .filter(p => selectedDepartment === 'all' || p.departmentId === selectedDepartment)
                .map((program, index) => {
                  const dept = departments.find(d => d.id === program.departmentId);
                  return (
                      <tr key={program.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{program.code}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{program.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{dept?.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">{program.level}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{program.duration} years</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                              onClick={() => openModal('program', program)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                              onClick={() => handleDelete('program', program.id)}
                              className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </motion.div>
  );

  const renderCourses = () => {
    const filteredCourses = courses.filter(course => {
      const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDepartment === 'all' || course.departmentId === selectedDepartment;
      const matchesProgram = selectedProgram === 'all' || course.programId === selectedProgram;
      return matchesSearch && matchesDept && matchesProgram;
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-800">Courses</h2>
            <button
                onClick={() => openModal('course')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Course
            </button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Programs</option>
                {programs.map(prog => (
                    <option key={prog.id} value={prog.id}>{prog.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                    onClick={() => setSelectedView('grid')}
                    className={`p-2 rounded-lg transition-colors ${selectedView === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setSelectedView('list')}
                    className={`p-2 rounded-lg transition-colors ${selectedView === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Courses Display */}
          {selectedView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map(course => {
                  const program = programs.find(p => p.id === course.programId);
                  const dept = departments.find(d => d.id === course.departmentId);

                  return (
                      <motion.div
                          key={course.id}
                          whileHover={{ scale: 1.02 }}
                          className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{course.code}</h3>
                            <p className="text-sm text-gray-600">{course.name}</p>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${course.color}`}></div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Department:</span>
                            <span className="text-gray-700">{dept?.name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Program:</span>
                            <span className="text-gray-700">{program?.name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Credits:</span>
                            <span className="text-gray-700">{course.credits}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Year/Semester:</span>
                            <span className="text-gray-700">Y{course.year} S{course.semester}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t flex gap-2">
                          <button
                              onClick={() => openModal('course', course)}
                              className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                          >
                            Edit
                          </button>
                          <button
                              onClick={() => handleDelete('course', course.id)}
                              className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </motion.div>
                  );
                })}
              </div>
          ) : (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Credits</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Year/Sem</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  {filteredCourses.map((course, index) => {
                    const dept = departments.find(d => d.id === course.departmentId);

                    return (
                        <tr key={course.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{course.code}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{course.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{dept?.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{course.credits}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">Y{course.year} S{course.semester}</td>
                          <td className="px-6 py-4 text-sm">
                            <button
                                onClick={() => openModal('course', course)}
                                className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              Edit
                            </button>
                            <button
                                onClick={() => handleDelete('course', course.id)}
                                className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
          )}
        </motion.div>
    );
  };

  const renderFaculty = () => (
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Faculty Members</h2>
          <button
              onClick={() => openModal('faculty')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Faculty
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faculty.map(member => {
            const dept = departments.find(d => d.id === member.departmentId);

            return (
                <motion.div
                    key={member.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {member.title} {member.firstName} {member.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{dept?.name}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-500">Staff ID:</span>
                      <p className="text-gray-700">{member.staffId}</p>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Email:</span>
                      <p className="text-gray-700">{member.email}</p>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Office:</span>
                      <p className="text-gray-700">{member.officeNumber}</p>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Office Hours:</span>
                      <p className="text-gray-700">{member.officeHours}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <button
                        onClick={() => openModal('faculty', member)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                        onClick={() => handleDelete('faculty', member.id)}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
            );
          })}
        </div>
      </motion.div>
  );

  const renderRooms = () => (
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Room Management</h2>
          <button
              onClick={() => openModal('room')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map(room => (
              <motion.div
                  key={room.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{room.code}</h3>
                    <p className="text-sm text-gray-600">{room.name}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${room.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {room.available ? 'Available' : 'Occupied'}
              </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Building:</span>
                    <span className="text-gray-700">{room.building}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Floor:</span>
                    <span className="text-gray-700">{room.floor}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Capacity:</span>
                    <span className="text-gray-700">{room.capacity} students</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span className="text-gray-700 capitalize">{room.type}</span>
                  </div>
                  {room.equipment.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-500">Equipment:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {room.equipment.map((item, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {item}
                      </span>
                          ))}
                        </div>
                      </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                      onClick={() => openModal('room', room)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                      onClick={() => handleDelete('room', room.id)}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
          ))}
        </div>
      </motion.div>
  );

  const renderStudents = () => (
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Students</h2>
          <button
              onClick={() => openModal('student')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <table className="w-full">
            <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Student ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Program</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Year</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
            </thead>
            <tbody>
            {students
                .filter(s =>
                    searchTerm === '' ||
                    s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((student, index) => {
                  const program = programs.find(p => p.id === student.programId);

                  return (
                      <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.studentId}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{student.firstName} {student.lastName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{student.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{program?.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">Year {student.year}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                              onClick={() => openModal('student', student)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                              onClick={() => handleDelete('student', student.id)}
                              className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </motion.div>
  );

  const renderSubstitutions = () => (
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
              const substituteFaculty = sub.substituteFactoryId ? faculty.find(f => f.id === sub.substituteFactoryId) : null;

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
                                onClick={() => {
                                  db?.update<Substitution>('substitutions', sub.id, { status: 'approved' });
                                  setSubstitutions(substitutions.map(s =>
                                      s.id === sub.id ? { ...s, status: 'approved' } : s
                                  ));
                                  showAlert('success', 'Substitution approved');
                                }}
                                className="text-green-600 hover:text-green-800 mr-3"
                            >
                              Approve
                            </button>
                            <button
                                onClick={() => {
                                  db?.update<Substitution>('substitutions', sub.id, { status: 'rejected' });
                                  setSubstitutions(substitutions.map(s =>
                                      s.id === sub.id ? { ...s, status: 'rejected' } : s
                                  ));
                                  showAlert('info', 'Substitution rejected');
                                }}
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

  const renderAcademicCalendar = () => (
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

  const renderAnalytics = () => (
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

  const renderSettings = () => (
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
      >
        <h2 className="text-3xl font-bold text-gray-800">Settings</h2>

        <div className="bg-white rounded-xl shadow-lg divide-y">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">General Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2026">2026</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Semester</label>
                <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Data Management</h3>
            <div className="space-y-4">
              <button
                  onClick={handleExport}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export All Data
              </button>
              <label className="w-full">
                <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                />
                <div className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Import Data
                </div>
              </label>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">System Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Version:</span>
                <span className="text-gray-700">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Database:</span>
                <span className="text-gray-700">IndexedDB (Local)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Backup:</span>
                <span className="text-gray-700">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
  );

  // Modal Component
  const renderModal = () => {
    if (!showModal) return null;

    const modalTitles = {
      department: editingItem ? 'Edit Department' : 'Add Department',
      program: editingItem ? 'Edit Program' : 'Add Program',
      course: editingItem ? 'Edit Course' : 'Add Course',
      faculty: editingItem ? 'Edit Faculty' : 'Add Faculty',
      room: editingItem ? 'Edit Room' : 'Add Room',
      student: editingItem ? 'Edit Student' : 'Add Student',
      timeslot: editingItem ? 'Edit Time Slot' : 'Add Time Slot',
      substitution: editingItem ? 'Edit Substitution' : 'Add Substitution'
    };

    return (
        <AnimatePresence>
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
                className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4"
                onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-semibold">{modalTitles[modalType]}</h3>
                <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {modalType === 'department' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Computer Science"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department Code</label>
                        <input
                            type="text"
                            value={formData.code || ''}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., CS"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department Head</label>
                        <input
                            type="text"
                            value={formData.head || ''}
                            onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Dr. John Smith"
                        />
                      </div>
                    </div>
                )}

                {modalType === 'program' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Program Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Bachelor of Computer Science"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Program Code</label>
                        <input
                            type="text"
                            value={formData.code || ''}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., BCS"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <select
                            value={formData.departmentId || ''}
                            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                        <select
                            value={formData.level || 'undergraduate'}
                            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="undergraduate">Undergraduate</option>
                          <option value="postgraduate">Postgraduate</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Duration (years)</label>
                        <input
                            type="number"
                            value={formData.duration || ''}
                            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 4"
                        />
                      </div>
                    </div>
                )}

                {modalType === 'course' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
                        <input
                            type="text"
                            value={formData.code || ''}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., CS101"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Introduction to Programming"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                          <select
                              value={formData.departmentId || ''}
                              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
                          <select
                              value={formData.programId || ''}
                              onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Program</option>
                            {programs
                                .filter(p => !formData.departmentId || p.departmentId === formData.departmentId)
                                .map(prog => (
                                    <option key={prog.id} value={prog.id}>{prog.name}</option>
                                ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Credits</label>
                          <input
                              type="number"
                              value={formData.credits || ''}
                              onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 3"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                          <input
                              type="number"
                              value={formData.year || ''}
                              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                          <select
                              value={formData.semester || ''}
                              onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Course description..."
                        />
                      </div>
                    </div>
                )}

                {modalType === 'faculty' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                          <select
                              value={formData.title || ''}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select</option>
                            <option value="Mr.">Mr.</option>
                            <option value="Mrs.">Mrs.</option>
                            <option value="Ms.">Ms.</option>
                            <option value="Dr.">Dr.</option>
                            <option value="Prof.">Prof.</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                          <input
                              type="text"
                              value={formData.firstName || ''}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="John"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                          <input
                              type="text"
                              value={formData.lastName || ''}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Smith"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Staff ID</label>
                        <input
                            type="text"
                            value={formData.staffId || ''}
                            onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., FAC001"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                              type="email"
                              value={formData.email || ''}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="john.smith@pnguot.ac.pg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                          <input
                              type="tel"
                              value={formData.phone || ''}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="+675 7XX XXXXX"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <select
                            value={formData.departmentId || ''}
                            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Office Number</label>
                          <input
                              type="text"
                              value={formData.officeNumber || ''}
                              onChange={(e) => setFormData({ ...formData, officeNumber: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., A201"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Office Hours</label>
                          <input
                              type="text"
                              value={formData.officeHours || ''}
                              onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Mon-Wed 2-4pm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                        <input
                            type="text"
                            value={formData.specialization || ''}
                            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Artificial Intelligence"
                        />
                      </div>
                    </div>
                )}

                {modalType === 'room' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
                          <input
                              type="text"
                              value={formData.code || ''}
                              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., LT-101"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Room Name</label>
                          <input
                              type="text"
                              value={formData.name || ''}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Lecture Theater 1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
                          <input
                              type="text"
                              value={formData.building || ''}
                              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Main Building"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                          <input
                              type="number"
                              value={formData.floor || ''}
                              onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                          <input
                              type="number"
                              value={formData.capacity || ''}
                              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 100"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
                        <select
                            value={formData.type || ''}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Type</option>
                          <option value="lecture">Lecture Hall</option>
                          <option value="tutorial">Tutorial Room</option>
                          <option value="lab">Laboratory</option>
                          <option value="computer">Computer Lab</option>
                          <option value="workshop">Workshop</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Equipment (comma-separated)</label>
                        <input
                            type="text"
                            value={formData.equipment?.join(', ') || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              equipment: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Projector, Whiteboard, AC"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Features (comma-separated)</label>
                        <input
                            type="text"
                            value={formData.features?.join(', ') || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              features: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Wheelchair Access, Sound System"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="available"
                            checked={formData.available !== false}
                            onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="available" className="ml-2 text-sm text-gray-700">
                          Room is available for scheduling
                        </label>
                      </div>
                    </div>
                )}

                {modalType === 'student' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
                        <input
                            type="text"
                            value={formData.studentId || ''}
                            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 21001234"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                          <input
                              type="text"
                              value={formData.firstName || ''}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="John"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                          <input
                              type="text"
                              value={formData.lastName || ''}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Doe"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                              type="email"
                              value={formData.email || ''}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="john.doe@student.pnguot.ac.pg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                          <input
                              type="tel"
                              value={formData.phone || ''}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="+675 7XX XXXXX"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
                          <select
                              value={formData.programId || ''}
                              onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Program</option>
                            {programs.map(prog => (
                                <option key={prog.id} value={prog.id}>{prog.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                          <input
                              type="number"
                              value={formData.year || ''}
                              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 1"
                              min="1"
                              max="6"
                          />
                        </div>
                      </div>
                    </div>
                )}

                {modalType === 'timeslot' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                        <select
                            value={formData.courseId || ''}
                            onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Course</option>
                          {courses.map(course => (
                              <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Faculty</label>
                        <select
                            value={formData.facultyId || ''}
                            onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
                        <select
                            value={formData.roomId || ''}
                            onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Room</option>
                          {rooms.filter(r => r.available).map(room => (
                              <option key={room.id} value={room.id}>
                                {room.code} - {room.name} (Cap: {room.capacity})
                              </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                          <select
                              value={formData.dayOfWeek || ''}
                              onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Day</option>
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                          <select
                              value={formData.type || 'lecture'}
                              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="lecture">Lecture</option>
                            <option value="tutorial">Tutorial</option>
                            <option value="lab">Lab</option>
                            <option value="workshop">Workshop</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                          <input
                              type="time"
                              value={formData.startTime || ''}
                              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                          <input
                              type="time"
                              value={formData.endTime || ''}
                              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                )}

                {modalType === 'substitution' && (
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
                )}
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                    onClick={editingItem ? handleUpdate : handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
    );
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
        {/* Alert Toast */}
        <AnimatePresence>
          {alert.show && (
              <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
                      alert.type === 'success' ? 'bg-green-500 text-white' :
                          alert.type === 'error' ? 'bg-red-500 text-white' :
                              alert.type === 'warning' ? 'bg-yellow-500 text-white' :
                                  'bg-blue-500 text-white'
                  }`}
              >
                {alert.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {alert.type === 'error' && <XCircle className="w-5 h-5" />}
                {alert.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {alert.type === 'info' && <Info className="w-5 h-5" />}
                <p>{alert.message}</p>
              </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.div
            initial={{ x: -300 }}
            animate={{ x: sidebarOpen ? 0 : -260 }}
            className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-40"
        >
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-gray-800">PNGUOT Timetable</h1>
            <p className="text-sm text-gray-600">Management System</p>
          </div>
          <nav className="p-4">
            {menuItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-2 ${
                        activeTab === item.id
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
            ))}
          </nav>
        </motion.div>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-4'}`}>
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="flex items-center justify-between p-4">
              <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <div className="flex items-center gap-4">
                <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                >
                  <Bell className="w-6 h-6 text-gray-700" />
                  {conflicts.length > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Admin</span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'timetable' && renderTimetable()}
            {activeTab === 'departments' && renderDepartments()}
            {activeTab === 'programs' && renderPrograms()}
            {activeTab === 'courses' && renderCourses()}
            {activeTab === 'faculty' && renderFaculty()}
            {activeTab === 'rooms' && renderRooms()}
            {activeTab === 'students' && renderStudents()}
            {activeTab === 'substitutions' && renderSubstitutions()}
            {activeTab === 'calendar' && renderAcademicCalendar()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'settings' && renderSettings()}
          </main>
        </div>

        {/* Modal */}
        {renderModal()}
      </div>
  );
}

