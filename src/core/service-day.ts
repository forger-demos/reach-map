import type {Row} from './csv';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export type DayType = 'weekday' | 'saturday' | 'sunday';
export const DAY_TYPES: readonly DayType[] = ['weekday', 'saturday', 'sunday'];

/** Day of the week (0 = Sunday) of a `YYYYMMDD` date. */
export function dayOfWeek(date: string): number {
  return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)))).getUTCDay();
}

export function isDate(text: string): boolean {
  if (!/^\d{8}$/.test(text)) return false;
  const d = new Date(Date.UTC(Number(text.slice(0, 4)), Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8))));
  return d.toISOString().slice(0, 10).replaceAll('-', '') === text;
}

/** The day type a date belongs to: Monday to Friday are weekdays. */
export function dayTypeOf(date: string): DayType {
  const dow = dayOfWeek(date);
  return dow === 0 ? 'sunday' : dow === 6 ? 'saturday' : 'weekday';
}

/**
 * Services running on a date: the weekly pattern in `calendar` inside its start and end
 * dates, then `calendar_dates` adds (type 1) and removes (type 2) single dates.
 */
export function activeServices(calendar: Row[], calendarDates: Row[], date: string): Set<string> {
  const weekday = WEEKDAYS[dayOfWeek(date)] as string;
  const active = new Set<string>();
  for (const c of calendar) {
    if (c[weekday] === '1' && (c.start_date as string) <= date && date <= (c.end_date as string)) {
      active.add(c.service_id as string);
    }
  }
  for (const c of calendarDates) {
    if (c.date !== date) continue;
    if (c.exception_type === '1') active.add(c.service_id as string);
    else if (c.exception_type === '2') active.delete(c.service_id as string);
  }
  return active;
}
