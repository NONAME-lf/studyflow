import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { uk } from 'date-fns/locale';

/** Ukrainian locale, the week starts on Monday. */
export const WEEK = { weekStartsOn: 1, locale: uk } as const;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const timeOf = (date: Date) => format(date, 'HH:mm');
export const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

export function dayHeading(date: Date): string {
  if (isToday(date)) return 'Сьогодні';
  if (isTomorrow(date)) return 'Завтра';
  if (isYesterday(date)) return 'Учора';
  return capitalize(format(date, 'EEEE, d MMMM', { locale: uk }));
}

export const dueLabel = (date: Date) => format(date, "EEEEEE, d MMMM 'о' HH:mm", { locale: uk });

export const relativeToNow = (date: Date) =>
  formatDistanceToNowStrict(date, { locale: uk, addSuffix: true });

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, WEEK);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthGrid(anchor: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor), WEEK),
    end: endOfWeek(endOfMonth(anchor), WEEK),
  });
}

export function weekTitle(anchor: Date): string {
  const [first, last] = [startOfWeek(anchor, WEEK), endOfWeek(anchor, WEEK)];
  return first.getMonth() === last.getMonth()
    ? `${format(first, 'd')}–${format(last, 'd MMMM yyyy', { locale: uk })}`
    : `${format(first, 'd MMMM', { locale: uk })} – ${format(last, 'd MMMM yyyy', { locale: uk })}`;
}

export const monthTitle = (anchor: Date) => capitalize(format(anchor, 'LLLL yyyy', { locale: uk }));

export const toDateInput = (date: Date) => format(date, 'yyyy-MM-dd');
export const toTimeInput = (date: Date) => format(date, 'HH:mm');

/** Local date + time from form inputs → ISO string for the API. */
export const fromInputs = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();
