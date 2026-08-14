import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear
} from 'date-fns';

export function dateKey(date = new Date(), timezone = 'Asia/Shanghai'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function todayKey(timezone = 'Asia/Shanghai'): string {
  return dateKey(new Date(), timezone);
}

export function shiftDateKey(value: string, amount: number): string {
  return format(addDays(parseISO(value), amount), 'yyyy-MM-dd');
}

export function periodBounds(type: 'day' | 'week' | 'month' | 'year', anchor: string): [string, string] {
  const date = parseISO(anchor);
  if (type === 'week') {
    return [
      format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    ];
  }
  if (type === 'month')
    return [format(startOfMonth(date), 'yyyy-MM-dd'), format(endOfMonth(date), 'yyyy-MM-dd')];
  if (type === 'year')
    return [format(startOfYear(date), 'yyyy-MM-dd'), format(endOfYear(date), 'yyyy-MM-dd')];
  return [anchor, anchor];
}

export function periodStart(type: 'day' | 'week' | 'month' | 'year', anchor: string): string {
  return periodBounds(type, anchor)[0];
}

export function formatDateLabel(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(
    'zh-CN',
    options ?? { month: 'long', day: 'numeric', weekday: 'short' }
  ).format(parseISO(value));
}

export function enumerateDates(start: string, end: string): string[] {
  const values: string[] = [];
  let cursor = parseISO(start);
  const last = parseISO(end);
  while (cursor <= last) {
    values.push(format(cursor, 'yyyy-MM-dd'));
    cursor = addDays(cursor, 1);
  }
  return values;
}

export function toLocalTimeInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function combineLocalDateTime(day: string, time: string): string | null {
  if (!time) return null;
  const date = new Date(`${day}T${time}:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
