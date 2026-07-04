export function calculateTimesheetHours(
  startTime: string,
  finishTime: string,
  breakMinutes: number
): number {
  if (!startTime || !finishTime) return 0;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [finishHour, finishMinute] = finishTime.split(":").map(Number);

  const start = startHour * 60 + startMinute;
  let finish = finishHour * 60 + finishMinute;

  if (finish < start) {
    finish += 24 * 60;
  }

  const workedMinutes = Math.max(0, finish - start - breakMinutes);
  return Math.round((workedMinutes / 60) * 100) / 100;
}
