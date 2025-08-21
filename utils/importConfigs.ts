import { ImportConfig, ImportField } from '@/components/common/BulkImportComponent';
import { Department, Program, Course, Faculty, Room, RoomType } from '@/types/database';

// Department Import Configuration
export const departmentImportConfig: ImportConfig<Department> = {
  entityName: 'Department',
  entityNamePlural: 'Departments',
  fields: [
    { key: 'code', label: 'Department Code', required: true, type: 'string' },
    { key: 'name', label: 'Department Name', required: true, type: 'string' },
    { key: 'description', label: 'Description', required: false, type: 'string' },
    { key: 'headOfDepartment', label: 'Head of Department', required: false, type: 'string' },
    { key: 'email', label: 'Email', required: false, type: 'email' },
    { key: 'phone', label: 'Phone', required: false, type: 'phone' }
  ],
  columnMappings: {
    code: ['Code', 'Department Code', 'Dept Code', 'DeptCode'],
    name: ['Name', 'Department Name', 'Dept Name', 'DeptName'],
    description: ['Description', 'Desc'],
    headOfDepartment: ['Head of Department', 'HOD', 'Head', 'Department Head'],
    email: ['Email', 'E-mail', 'email'],
    phone: ['Phone', 'Phone Number', 'Contact', 'Tel']
  },
  validateRow: (row: any, index: number, existingDepartments: Department[] = []) => {
    const errors: string[] = [];
    
    // Required field validation
    if (!row.code || String(row.code).trim() === '') errors.push('Department code is required');
    if (!row.name || String(row.name).trim() === '') errors.push('Department name is required');
    
    // Code uniqueness check
    if (row.code) {
      const code = String(row.code).trim().toUpperCase();
      if (existingDepartments.some(dept => dept.code.toUpperCase() === code)) {
        errors.push(`Department code "${code}" already exists`);
      }
    }
    
    // Name uniqueness check
    if (row.name) {
      const name = String(row.name).trim();
      if (existingDepartments.some(dept => dept.name.toLowerCase() === name.toLowerCase())) {
        errors.push(`Department name "${name}" already exists`);
      }
    }
    
    // Email validation
    if (row.email && row.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(row.email).trim())) {
        errors.push('Invalid email format');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  },
  transformRow: (row: any) => ({
    code: String(row.code || '').trim().toUpperCase(),
    name: String(row.name || '').trim(),
    description: String(row.description || '').trim(),
    head: String(row.headOfDepartment || '').trim(),
    email: String(row.email || '').trim(),
    phone: String(row.phone || '').trim()
  }),
  sampleData: [
    {
      'Department Code': 'CS',
      'Department Name': 'Computer Science',
      'Description': 'Department of Computer Science and Information Technology',
      'Head of Department': 'Dr. John Smith',
      'Email': 'cs@university.edu',
      'Phone': '+1-555-0101'
    },
    {
      'Department Code': 'EE',
      'Department Name': 'Electrical Engineering',
      'Description': 'Department of Electrical and Electronics Engineering',
      'Head of Department': 'Prof. Jane Doe',
      'Email': 'ee@university.edu',
      'Phone': '+1-555-0102'
    },
    {
      'Department Code': 'ME',
      'Department Name': 'Mechanical Engineering',
      'Description': 'Department of Mechanical Engineering',
      'Head of Department': 'Dr. Robert Johnson',
      'Email': 'me@university.edu',
      'Phone': '+1-555-0103'
    }
  ]
};

// Program Import Configuration
export const programImportConfig: ImportConfig<Program> = {
  entityName: 'Program',
  entityNamePlural: 'Programs',
  fields: [
    { key: 'code', label: 'Program Code', required: true, type: 'string' },
    { key: 'name', label: 'Program Name', required: true, type: 'string' },
    { key: 'description', label: 'Description', required: false, type: 'string' },
    { key: 'duration', label: 'Duration (years)', required: true, type: 'number' },
    { key: 'departmentCode', label: 'Department Code', required: true, type: 'string' },
    { key: 'degree', label: 'Degree Type', required: false, type: 'string' }
  ],
  columnMappings: {
    code: ['Code', 'Program Code', 'Prog Code', 'ProgCode'],
    name: ['Name', 'Program Name', 'Prog Name', 'ProgName'],
    description: ['Description', 'Desc'],
    duration: ['Duration', 'Years', 'Duration (years)', 'Program Duration'],
    departmentCode: ['Department Code', 'Dept Code', 'Department', 'DeptCode'],
    degree: ['Degree', 'Degree Type', 'Level']
  },
  validateRow: (row: any, index: number, existingData: { programs: Program[], departments: Department[] } = { programs: [], departments: [] }) => {
    const errors: string[] = [];
    const { programs = [], departments = [] } = existingData;
    
    // Required field validation
    if (!row.code || String(row.code).trim() === '') errors.push('Program code is required');
    if (!row.name || String(row.name).trim() === '') errors.push('Program name is required');
    if (!row.duration || isNaN(Number(row.duration))) errors.push('Valid duration is required');
    if (!row.departmentCode || String(row.departmentCode).trim() === '') errors.push('Department code is required');
    
    // Duration validation
    const duration = Number(row.duration);
    if (duration && (duration < 1 || duration > 8)) {
      errors.push('Duration must be between 1 and 8 years');
    }
    
    // Department existence check
    if (row.departmentCode) {
      const deptCode = String(row.departmentCode).trim().toUpperCase();
      if (!departments.some(dept => dept.code.toUpperCase() === deptCode)) {
        errors.push(`Department with code "${deptCode}" not found`);
      }
    }
    
    // Code uniqueness check
    if (row.code) {
      const code = String(row.code).trim().toUpperCase();
      if (programs.some(prog => prog.code.toUpperCase() === code)) {
        errors.push(`Program code "${code}" already exists`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  },
  transformRow: (row: any, existingData: { programs: Program[], departments: Department[] } = { programs: [], departments: [] }) => {
    const { departments = [] } = existingData;
    const department = departments.find(dept => dept.code.toUpperCase() === String(row.departmentCode || '').trim().toUpperCase());
    
    return {
      code: String(row.code || '').trim().toUpperCase(),
      name: String(row.name || '').trim(),
      description: String(row.description || '').trim(),
      duration: Number(row.duration) || 4,
      departmentId: department?.id || '',
      degree: String(row.degree || '').trim()
    };
  },
  sampleData: [
    {
      'Program Code': 'BSCS',
      'Program Name': 'Bachelor of Science in Computer Science',
      'Description': 'Comprehensive program in computer science and software development',
      'Duration (years)': 4,
      'Department Code': 'CS',
      'Degree Type': 'Bachelor'
    },
    {
      'Program Code': 'BSEE',
      'Program Name': 'Bachelor of Science in Electrical Engineering',
      'Description': 'Program focusing on electrical and electronics engineering',
      'Duration (years)': 4,
      'Department Code': 'EE',
      'Degree Type': 'Bachelor'
    },
    {
      'Program Code': 'MSCS',
      'Program Name': 'Master of Science in Computer Science',
      'Description': 'Advanced program in computer science research and development',
      'Duration (years)': 2,
      'Department Code': 'CS',
      'Degree Type': 'Master'
    }
  ]
};

// Course Import Configuration
export const courseImportConfig: ImportConfig<Course> = {
  entityName: 'Course',
  entityNamePlural: 'Courses',
  fields: [
    { key: 'code', label: 'Course Code', required: true, type: 'string' },
    { key: 'name', label: 'Course Name', required: true, type: 'string' },
    { key: 'description', label: 'Description', required: false, type: 'string' },
    { key: 'credits', label: 'Credits', required: true, type: 'number' },
    { key: 'departmentCode', label: 'Department Code', required: true, type: 'string' },
    { key: 'yearLevel', label: 'Year Level', required: true, type: 'number' },
    { key: 'semester', label: 'Semester', required: false, type: 'number' },
    { key: 'type', label: 'Course Type', required: false, type: 'string' }
  ],
  columnMappings: {
    code: ['Code', 'Course Code', 'CourseCode', 'Subject Code'],
    name: ['Name', 'Course Name', 'Subject Name', 'Title'],
    description: ['Description', 'Desc', 'Course Description'],
    credits: ['Credits', 'Credit Hours', 'Units', 'Credit Units'],
    departmentCode: ['Department Code', 'Dept Code', 'Department', 'DeptCode'],
    yearLevel: ['Year Level', 'Year', 'Level', 'Grade Level'],
    semester: ['Semester', 'Sem', 'Term'],
    type: ['Type', 'Course Type', 'Category']
  },
  validateRow: (row: any, index: number, existingData: { courses: Course[], departments: Department[] } = { courses: [], departments: [] }) => {
    const errors: string[] = [];
    const { courses = [], departments = [] } = existingData;
    
    // Required field validation
    if (!row.code || String(row.code).trim() === '') errors.push('Course code is required');
    if (!row.name || String(row.name).trim() === '') errors.push('Course name is required');
    if (!row.credits || isNaN(Number(row.credits))) errors.push('Valid credits is required');
    if (!row.departmentCode || String(row.departmentCode).trim() === '') errors.push('Department code is required');
    if (!row.yearLevel || isNaN(Number(row.yearLevel))) errors.push('Valid year level is required');
    
    // Credits validation
    const credits = Number(row.credits);
    if (credits && (credits < 1 || credits > 6)) {
      errors.push('Credits must be between 1 and 6');
    }
    
    // Year level validation
    const yearLevel = Number(row.yearLevel);
    if (yearLevel && (yearLevel < 1 || yearLevel > 6)) {
      errors.push('Year level must be between 1 and 6');
    }
    
    // Semester validation
    if (row.semester && row.semester !== '') {
      const semester = Number(row.semester);
      if (isNaN(semester) || (semester < 1 || semester > 3)) {
        errors.push('Semester must be 1, 2, or 3');
      }
    }
    
    // Department existence check
    if (row.departmentCode) {
      const deptCode = String(row.departmentCode).trim().toUpperCase();
      if (!departments.some(dept => dept.code.toUpperCase() === deptCode)) {
        errors.push(`Department with code "${deptCode}" not found`);
      }
    }
    
    // Course code uniqueness check
    if (row.code) {
      const code = String(row.code).trim().toUpperCase();
      if (courses.some(course => course.code.toUpperCase() === code)) {
        errors.push(`Course code "${code}" already exists`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  },
  transformRow: (row: any, existingData: { courses: Course[], departments: Department[] } = { courses: [], departments: [] }) => {
    const { departments = [] } = existingData;
    const department = departments.find(dept => dept.code.toUpperCase() === String(row.departmentCode || '').trim().toUpperCase());
    
    // Validate semester to ensure it's only 1 or 2
    let semester: 1 | 2 | undefined = undefined;
    if (row.semester && !isNaN(Number(row.semester))) {
      const semesterNum = Number(row.semester);
      if (semesterNum === 1 || semesterNum === 2) {
        semester = semesterNum as 1 | 2;
      }
    }
    
    return {
      code: String(row.code || '').trim().toUpperCase(),
      name: String(row.name || '').trim(),
      description: String(row.description || '').trim(),
      credits: Number(row.credits) || 3,
      departmentId: department?.id || '',
      yearLevel: Number(row.yearLevel) || 1,
      semester,
      type: String(row.type || 'Core').trim()
    };
  },
  sampleData: [
    {
      'Course Code': 'CS101',
      'Course Name': 'Introduction to Computer Science',
      'Description': 'Fundamental concepts of computer science and programming',
      'Credits': 3,
      'Department Code': 'CS',
      'Year Level': 1,
      'Semester': 1,
      'Course Type': 'Core'
    },
    {
      'Course Code': 'CS201',
      'Course Name': 'Data Structures and Algorithms',
      'Description': 'Study of data structures, algorithms, and their applications',
      'Credits': 4,
      'Department Code': 'CS',
      'Year Level': 2,
      'Semester': 1,
      'Course Type': 'Core'
    },
    {
      'Course Code': 'EE101',
      'Course Name': 'Circuit Analysis',
      'Description': 'Basic principles of electrical circuit analysis',
      'Credits': 3,
      'Department Code': 'EE',
      'Year Level': 1,
      'Semester': 2,
      'Course Type': 'Core'
    }
  ]
};

// Faculty Import Configuration
export const facultyImportConfig: ImportConfig<Faculty> = {
  entityName: 'Faculty',
  entityNamePlural: 'Faculty',
  fields: [
    { key: 'staffId', label: 'Staff ID', required: true, type: 'string' },
    { key: 'firstName', label: 'First Name', required: true, type: 'string' },
    { key: 'lastName', label: 'Last Name', required: true, type: 'string' },
    { key: 'title', label: 'Title', required: false, type: 'string' },
    { key: 'email', label: 'Email', required: true, type: 'email' },
    { key: 'phone', label: 'Phone', required: false, type: 'phone' },
    { key: 'departmentCode', label: 'Department Code', required: true, type: 'string' },
    { key: 'specialization', label: 'Specialization', required: false, type: 'string' },
    { key: 'officeNumber', label: 'Office Number', required: false, type: 'string' },
    { key: 'officeHours', label: 'Office Hours', required: false, type: 'string' }
  ],
  columnMappings: {
    staffId: ['Staff ID', 'StaffID', 'Employee ID', 'ID'],
    firstName: ['First Name', 'FirstName', 'Given Name', 'FName'],
    lastName: ['Last Name', 'LastName', 'Surname', 'LName'],
    title: ['Title', 'Academic Title', 'Position'],
    email: ['Email', 'E-mail', 'Email Address'],
    phone: ['Phone', 'Phone Number', 'Contact', 'Mobile', 'Tel'],
    departmentCode: ['Department Code', 'Dept Code', 'Department', 'DeptCode'],
    specialization: ['Specialization', 'Area of Expertise', 'Field', 'Specialty'],
    officeNumber: ['Office Number', 'Office', 'Room Number', 'Office Room'],
    officeHours: ['Office Hours', 'Hours', 'Available Hours', 'Consultation Hours']
  },
  validateRow: (row: any, index: number, existingData: { faculty: Faculty[], departments: Department[] } = { faculty: [], departments: [] }) => {
    const errors: string[] = [];
    const { faculty = [], departments = [] } = existingData;
    
    // Required field validation
    if (!row.staffId || String(row.staffId).trim() === '') errors.push('Staff ID is required');
    if (!row.firstName || String(row.firstName).trim() === '') errors.push('First name is required');
    if (!row.lastName || String(row.lastName).trim() === '') errors.push('Last name is required');
    if (!row.email || String(row.email).trim() === '') errors.push('Email is required');
    if (!row.departmentCode || String(row.departmentCode).trim() === '') errors.push('Department code is required');
    
    // Staff ID uniqueness check
    if (row.staffId) {
      const staffId = String(row.staffId).trim();
      if (faculty.some(f => f.staffId === staffId)) {
        errors.push(`Staff ID "${staffId}" already exists`);
      }
    }
    
    // Email validation
    if (row.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(row.email).trim())) {
        errors.push('Invalid email format');
      }
      
      // Email uniqueness check
      const email = String(row.email).trim().toLowerCase();
      if (faculty.some(f => f.email.toLowerCase() === email)) {
        errors.push(`Email "${row.email}" already exists`);
      }
    }
    
    // Department existence check
    if (row.departmentCode) {
      const deptCode = String(row.departmentCode).trim().toUpperCase();
      if (!departments.some(dept => dept.code.toUpperCase() === deptCode)) {
        errors.push(`Department with code "${deptCode}" not found`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  },
  transformRow: (row: any, existingData: { faculty: Faculty[], departments: Department[] } = { faculty: [], departments: [] }) => {
    const { departments = [] } = existingData;
    const department = departments.find(dept => dept.code.toUpperCase() === String(row.departmentCode || '').trim().toUpperCase());
    
    return {
      staffId: String(row.staffId || '').trim(),
      firstName: String(row.firstName || '').trim(),
      lastName: String(row.lastName || '').trim(),
      title: String(row.title || 'Mr.').trim(),
      email: String(row.email || '').trim().toLowerCase(),
      phone: String(row.phone || '').trim(),
      departmentId: department?.id || '',
      specialization: String(row.specialization || '').trim(),
      officeNumber: String(row.officeNumber || '').trim(),
      officeHours: String(row.officeHours || '').trim()
    };
  },
  sampleData: [
    {
      'Staff ID': 'FAC001',
      'First Name': 'John',
      'Last Name': 'Smith',
      'Title': 'Dr.',
      'Email': 'john.smith@university.edu',
      'Phone': '+1-555-1001',
      'Department Code': 'CS',
      'Specialization': 'Artificial Intelligence',
      'Office Number': 'CS-201',
      'Office Hours': 'Mon-Wed 10:00-12:00'
    },
    {
      'Staff ID': 'FAC002',
      'First Name': 'Jane',
      'Last Name': 'Doe',
      'Title': 'Prof.',
      'Email': 'jane.doe@university.edu',
      'Phone': '+1-555-1002',
      'Department Code': 'EE',
      'Specialization': 'Digital Signal Processing',
      'Office Number': 'EE-105',
      'Office Hours': 'Tue-Thu 14:00-16:00'
    },
    {
      'Staff ID': 'FAC003',
      'First Name': 'Robert',
      'Last Name': 'Johnson',
      'Title': 'Dr.',
      'Email': 'robert.johnson@university.edu',
      'Phone': '+1-555-1003',
      'Department Code': 'ME',
      'Specialization': 'Thermodynamics',
      'Office Number': 'ME-301',
      'Office Hours': 'Mon-Fri 09:00-11:00'
    }
  ]
};

// Room Import Configuration
export const roomImportConfig: ImportConfig<Room> = {
  entityName: 'Room',
  entityNamePlural: 'Rooms',
  fields: [
    { key: 'code', label: 'Room Code', required: true, type: 'string' },
    { key: 'name', label: 'Room Name', required: true, type: 'string' },
    { key: 'building', label: 'Building', required: false, type: 'string' },
    { key: 'floor', label: 'Floor', required: false, type: 'string' },
    { key: 'capacity', label: 'Capacity', required: true, type: 'number' },
    { key: 'type', label: 'Room Type', required: false, type: 'string' },
    { key: 'equipment', label: 'Equipment', required: false, type: 'string' },
    { key: 'available', label: 'Available', required: false, type: 'boolean' }
  ],
  columnMappings: {
    code: ['Code', 'Room Code', 'Room ID', 'RoomCode'],
    name: ['Name', 'Room Name', 'RoomName', 'Title'],
    building: ['Building', 'Building Name', 'Block'],
    floor: ['Floor', 'Level', 'Floor Level'],
    capacity: ['Capacity', 'Max Capacity', 'Seats', 'Maximum Students'],
    type: ['Type', 'Room Type', 'Category', 'Kind'],
    equipment: ['Equipment', 'Facilities', 'Resources', 'Equipment List'],
    available: ['Available', 'Status', 'Active', 'Is Available']
  },
  validateRow: (row: any, index: number, existingRooms: Room[] = []) => {
    const errors: string[] = [];
    
    // Required field validation
    if (!row.code || String(row.code).trim() === '') errors.push('Room code is required');
    if (!row.name || String(row.name).trim() === '') errors.push('Room name is required');
    if (!row.capacity || isNaN(Number(row.capacity))) errors.push('Valid capacity is required');
    
    // Capacity validation
    const capacity = Number(row.capacity);
    if (capacity && (capacity < 1 || capacity > 500)) {
      errors.push('Capacity must be between 1 and 500');
    }
    
    // Room code uniqueness check
    if (row.code) {
      const code = String(row.code).trim().toUpperCase();
      if (existingRooms.some(room => room.code.toUpperCase() === code)) {
        errors.push(`Room code "${code}" already exists`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  },
  transformRow: (row: any) => {
    // Parse boolean availability
    let available = true;
    if (row.available !== undefined && row.available !== null && row.available !== '') {
      const availableStr = String(row.available).toLowerCase().trim();
      available = availableStr === 'true' || availableStr === '1' || availableStr === 'yes' || availableStr === 'available';
    }
    
    // Parse floor as number
    let floor: number | undefined;
    if (row.floor && !isNaN(Number(row.floor))) {
      floor = Number(row.floor);
    }
    
    // Parse equipment as array
    let equipment: string[] | undefined;
    if (row.equipment && String(row.equipment).trim()) {
      equipment = String(row.equipment).trim().split(',').map(item => item.trim()).filter(item => item);
    }
    
    // Parse room type
    let type: RoomType = RoomType.Lecture; // Default
    if (row.type) {
      const typeStr = String(row.type).trim();
      const matchedType = Object.values(RoomType).find(rt => rt.toLowerCase() === typeStr.toLowerCase());
      if (matchedType) {
        type = matchedType;
      }
    }
    
    return {
      code: String(row.code || '').trim().toUpperCase(),
      name: String(row.name || '').trim(),
      building: String(row.building || '').trim(),
      floor,
      capacity: Number(row.capacity) || 0,
      type,
      equipment,
      available
    };
  },
  sampleData: [
    {
      'Room Code': 'CS101',
      'Room Name': 'Computer Science Lab 1',
      'Building': 'Engineering Building',
      'Floor': 1,
      'Capacity': 40,
      'Room Type': 'Computer',
      'Equipment': 'Computers, Projector, Whiteboard',
      'Available': 'true'
    },
    {
      'Room Code': 'LH201',
      'Room Name': 'Lecture Hall 201',
      'Building': 'Academic Building',
      'Floor': 2,
      'Capacity': 150,
      'Room Type': 'Lecture',
      'Equipment': 'Projector, Sound System, Podium',
      'Available': 'true'
    },
    {
      'Room Code': 'LAB301',
      'Room Name': 'Physics Laboratory',
      'Building': 'Science Building',
      'Floor': 3,
      'Capacity': 30,
      'Room Type': 'Lab',
      'Equipment': 'Lab Equipment, Safety Gear, Fume Hood',
      'Available': 'true'
    }
  ]
};
