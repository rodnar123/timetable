export function generateColor(): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h + hours, m, 0, 0);
  return date.toTimeString().slice(0, 5);
}

export function getDayName(dayNumber: number): string {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayNumber] || '';
}

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleDateString();
}

export function timeSlotsOverlap(
  slot1: { startTime: string; endTime: string },
  slot2: { startTime: string; endTime: string }
): boolean {
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);

  return start1 < end2 && start2 < end1;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
