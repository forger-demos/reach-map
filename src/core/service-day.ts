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

const DAY_SECONDS = 86400;

/** Clock times before this read the previous service day, whose trips run on past midnight (ADR 0002). */
export const SERVICE_DAY_START = 4 * 3600;

/** The day type that ran the day before. A weekday follows a weekday: the files hold one typical weekday, not Monday. */
const PREVIOUS: Record<DayType, DayType> = {weekday: 'weekday', saturday: 'weekday', sunday: 'saturday'};

export interface ServiceQuery {
  /** The day file to search. */
  dayType: DayType;
  /** Seconds from the start of that file's service day; past 86400 in the small hours. */
  offset: number;
}

/**
 * Which day file and offset answer "leave at `clock` on a `dayType`", where `clock` is seconds
 * since midnight of the chosen day. The small hours belong to the night service of the day before.
 */
export function resolveServiceDay(dayType: DayType, clock: number): ServiceQuery {
  if (!Number.isFinite(clock) || clock < 0 || clock >= DAY_SECONDS) throw new Error(`clock out of range: ${clock}`);
  return clock < SERVICE_DAY_START ? {dayType: PREVIOUS[dayType], offset: clock + DAY_SECONDS} : {dayType, offset: clock};
}

/** `HH:MM` of a clock time in seconds, for labels. */
export function clockLabel(clock: number): string {
  const minutes = Math.floor(clock / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
