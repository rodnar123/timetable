// utils/qrAttendanceHandler.ts
// QR Attendance Handler Functions
// This can be implemented as API endpoints or Firebase functions

interface QRScanData {
  code: string;
  studentId: string;
  timeSlotId?: string;
  courseId?: string;
  date?: string;
  manual?: boolean;
  scannedAt: string;
}

interface AttendanceCode {
  id: string;
  timeSlotId: string;
  courseId: string;
  date: string;
  startTime: string; // Added startTime property
  code: string;
  createdAt: Date;
  expiresAt: Date;
  usedBy: string[]; // Array of student IDs who have used this code
}

// Store for active QR codes (could be in database)
const activeQRCodes = new Map<string, AttendanceCode>();

// Function to validate and process QR scan
export async function processQRAttendance(scanData: QRScanData): Promise<{ success: boolean; message: string }> {
  try {
    let attendanceCode: AttendanceCode | undefined;
    
    if (scanData.manual) {
      // For manual entry, find the code in active codes
      attendanceCode = Array.from(activeQRCodes.values()).find(ac => ac.code === scanData.code);
    } else {
      // For QR scan, extract the code from the scan data
      const codeMatch = scanData.code.match(/^([^-]+-[^-]+-\d+-\w+)$/);
      if (codeMatch) {
        attendanceCode = activeQRCodes.get(codeMatch[1]);
      }
    }
    
    if (!attendanceCode) {
      return {
        success: false,
        message: 'Invalid or expired attendance code'
      };
    }
    
    // Check if code has expired
    if (new Date() > attendanceCode.expiresAt) {
      return {
        success: false,
        message: 'This attendance code has expired'
      };
    }
    
    // Check if student has already used this code
    if (attendanceCode.usedBy.includes(scanData.studentId)) {
      return {
        success: false,
        message: 'You have already marked your attendance for this class'
      };
    }
    // Get current time and class time
    const now = new Date();
    const [classHour, classMinute] = attendanceCode.startTime.split(':').map(Number);
    const classStartTime = new Date(attendanceCode.date);
    classStartTime.setHours(classHour, classMinute, 0, 0);
    
    // Determine attendance status based on scan time
    let status: 'present' | 'late' = 'present';
    const minutesLate = Math.floor((now.getTime() - classStartTime.getTime()) / 60000);
    
    if (minutesLate > 15) {
      status = 'late';
    }
    // Create attendance record
    const attendanceRecord = {
      studentId: scanData.studentId,
      timeSlotId: attendanceCode.timeSlotId,
      courseId: attendanceCode.courseId,
      date: attendanceCode.date,
      status: status,
      remarks: scanData.manual ? 'Manual code entry' : 'QR scan',
      markedBy: 'system', // Or use a system user ID
      markedAt: new Date(),
      qrCode: attendanceCode.code
    };
    
    // Save attendance record to database
    // await saveAttendanceRecord(attendanceRecord);
    
    // Update the code's usedBy list
    attendanceCode.usedBy.push(scanData.studentId);
    
    return {
      success: true,
      message: status === 'present' 
        ? 'Successfully marked as present!' 
        : 'Marked as late. Please arrive on time for future classes.'
    };
    
  } catch (error) {
    console.error('Error processing QR attendance:', error);
    return {
      success: false,
      message: 'Failed to process attendance. Please try again.'
    };
  }
}

export function generateAttendanceQRCode(
  timeSlotId: string,
  courseId: string,
  date: string,
  startTime: string
): AttendanceCode {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const code = `${timeSlotId}-${date}-${timestamp}-${random}`;
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60000); // 15 minutes
  
  const attendanceCode: AttendanceCode = {
    id: code,
    timeSlotId,
    courseId,
    date,
    startTime, // Pass startTime here
    code,
    createdAt: now,
    expiresAt,
    usedBy: []
  };
  
  // Store the code
  activeQRCodes.set(code, attendanceCode);
  
  // Clean up expired codes
  cleanupExpiredCodes();
  
  return attendanceCode;
}


// Function to clean up expired codes
function cleanupExpiredCodes() {
  const now = new Date();
  
  for (const [code, data] of activeQRCodes.entries()) {
    if (now > data.expiresAt) {
      activeQRCodes.delete(code);
    }
  }
}

// Function to get attendance statistics for a QR code
export function getQRCodeStats(code: string): { total: number; scanned: number } | null {
  const attendanceCode = activeQRCodes.get(code);
  
  if (!attendanceCode) {
    return null;
  }
  
  // You would get the total number of students from your database
  // For now, returning mock data
  return {
    total: 30, // Total students in the class
    scanned: attendanceCode.usedBy.length
  };
}

// Function to manually mark attendance (fallback)
export async function manualMarkAttendance(
  studentId: string,
  timeSlotId: string,
  courseId: string,
  date: string,
  status: 'present' | 'absent' | 'late' | 'excused',
  markedBy: string,
  remarks?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const attendanceRecord = {
      studentId,
      timeSlotId,
      courseId,
      date,
      status,
      remarks: remarks || '',
      markedBy,
      markedAt: new Date()
    };
    
    // Save to database
    // await saveAttendanceRecord(attendanceRecord);
    
    return {
      success: true,
      message: 'Attendance marked successfully'
    };
  } catch (error) {
    console.error('Error marking attendance:', error);
    return {
      success: false,
      message: 'Failed to mark attendance'
    };
  }
}