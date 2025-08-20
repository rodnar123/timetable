import { Attendance } from '@/types/database';
import { TimetableDB } from '@/services/database';

// In-memory cache for attendance records
let attendanceCache: Attendance[] = [];

// Timestamp of last refresh
let lastRefreshed: number = 0;

/**
 * Get all attendance records with optional refresh
 * @param db The database instance
 * @param forceRefresh Whether to force a refresh from the database
 * @returns Promise with attendance records
 */
export const getAttendanceRecords = async (
  db: TimetableDB | null, 
  forceRefresh: boolean = false
): Promise<Attendance[]> => {
  // If no database provided, return cache
  if (!db) return attendanceCache;
  
  const now = Date.now();
  const cacheExpired = now - lastRefreshed > 60000; // 1 minute cache
  
  // Refresh if forced, cache expired, or cache empty
  if (forceRefresh || cacheExpired || attendanceCache.length === 0) {
    try {
      const records = await db.getAll<Attendance>('attendance');
      attendanceCache = records;
      lastRefreshed = now;
      console.log(`Refreshed ${records.length} attendance records`);
    } catch (error) {
      console.error('Failed to refresh attendance records:', error);
    }
  }
  
  return attendanceCache;
};

/**
 * Update the attendance cache when new records are added
 * @param newRecords The new attendance records
 */
export const updateAttendanceCache = (newRecords: Attendance[]): void => {
  if (!newRecords.length) return;
  
  // For each new record, update cache or add it
  newRecords.forEach(record => {
    const index = attendanceCache.findIndex(r => r.id === record.id);
    if (index >= 0) {
      attendanceCache[index] = record;
    } else {
      attendanceCache.push(record);
    }
  });
};
