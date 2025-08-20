import { useEffect, useMemo, useState } from 'react';
import { TimeSlot } from '@/types/database';
import { ConflictCheckResult, checkTimeSlotConflicts, findAvailableSlots } from '@/utils/conflictUtils';









interface UseTimeSlotPlannerParams {
  existingSlots: TimeSlot[];
  selectedDay: number;
  selectedYear: string;
  selectedSemester: number|string;
  initialData?: Partial<TimeSlot> | null;
}

export function useTimeSlotPlanner({
  existingSlots,
  selectedDay,
  selectedYear,
  selectedSemester,
  initialData
}: UseTimeSlotPlannerParams) {
  const [formData, setFormData] = useState<Partial<TimeSlot>>(() => {
    if (initialData) return initialData as any;
    return {
      dayOfWeek: selectedDay,
      academicYear: selectedYear,
      semester: typeof selectedSemester === 'string' ? parseInt(selectedSemester) : selectedSemester,
      startTime: '08:00',
      endTime: '10:00',
      yearLevel: 1
    };
  });

  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);
  const [showAvailableSlots, setShowAvailableSlots] = useState(true);

  // Memoized available slots
  const availableSlots = useMemo(() => {
    if (!formData.dayOfWeek) return [] as { start: string; end: string }[];
    return findAvailableSlots(
      formData.dayOfWeek,
      existingSlots,
      formData.academicYear || selectedYear,
      formData.semester || selectedSemester,
      formData.yearLevel !== undefined ? String(formData.yearLevel) : undefined
    );
  }, [formData.dayOfWeek, formData.academicYear, formData.semester, formData.yearLevel, existingSlots, selectedYear, selectedSemester]);

  // Initialize with first available slot
  useEffect(() => {
    if (!initialData && availableSlots.length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        startTime: availableSlots[0].start,
        endTime: availableSlots[0].end
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, availableSlots.length]);

  // Debounced conflict check
  useEffect(() => {
    const handle = setTimeout(() => {
      if (formData.startTime && formData.endTime && formData.dayOfWeek && formData.yearLevel) {
        const result = checkTimeSlotConflicts(formData as any, existingSlots, (formData as any).id);
        setConflictResult(result);
      }
    }, 150);
    return () => clearTimeout(handle);
  }, [formData.startTime, formData.endTime, formData.dayOfWeek, formData.facultyId, formData.roomId, formData.courseId, formData.academicYear, formData.semester, formData.yearLevel, existingSlots]);

  const selectQuickSlot = (slot: { start: string; end: string }) => {
    setFormData((prev: any) => ({ ...prev, startTime: slot.start, endTime: slot.end }));
    setShowAvailableSlots(false);
  };

  return {
    formData,
    setFormData,
    conflictResult,
    availableSlots,
    showAvailableSlots,
    setShowAvailableSlots,
    selectQuickSlot
  };
}
