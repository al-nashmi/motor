const DAY = 24 * 60 * 60 * 1000;

const GREG_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** يقرأ YYYY-MM-DD كتاريخ محلي (بدون انزياح المنطقة الزمنية) */
export function parseDate(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysUntil(s: string, from: Date = new Date()): number {
  return Math.round((startOfDay(parseDate(s)).getTime() - startOfDay(from).getTime()) / DAY);
}

export function daysSince(s: string, now: Date = new Date()): number {
  return -daysUntil(s, now);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function monthsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (DAY * 30.4375);
}

let hijriFormatter: Intl.DateTimeFormat | null | undefined;
function getHijri(): Intl.DateTimeFormat | null {
  if (hijriFormatter !== undefined) return hijriFormatter;
  try {
    const f = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
    const sample = f.format(new Date(2026, 0, 1));
    hijriFormatter = /14\d\d/.test(sample) ? f : null;
  } catch {
    hijriFormatter = null;
  }
  return hijriFormatter;
}

export function fmtGregorian(s: string | Date): string {
  const d = typeof s === 'string' ? parseDate(s) : s;
  return `${d.getDate()} ${GREG_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtHijri(s: string | Date): string | null {
  const f = getHijri();
  if (!f) return null;
  const d = typeof s === 'string' ? parseDate(s) : s;
  return f.format(d);
}

export function fmtDate(s: string | Date, calendar: 'gregorian' | 'hijri' = 'gregorian'): string {
  if (calendar === 'hijri') {
    const h = fmtHijri(s);
    if (h) return h;
  }
  return fmtGregorian(s);
}

export function fmtMonthShort(d: Date): string {
  return GREG_MONTHS[d.getMonth()];
}

export function relativeDays(n: number): string {
  const a = Math.abs(n);
  if (n === 0) return 'اليوم';
  const unit = a === 1 ? 'يوم' : a === 2 ? 'يومين' : a <= 10 ? `${a} أيام` : `${a} يوماً`;
  return n > 0 ? `بعد ${unit}` : `منذ ${unit}`;
}
