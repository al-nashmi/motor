import { PLATE_LETTERS } from './catalog';

const AR_TO_EN = new Map<string, string>(PLATE_LETTERS.map(([ar, en]) => [ar, en]));
const EN_TO_AR = new Map<string, string>(PLATE_LETTERS.map(([ar, en]) => [en, ar]));

function normalizeArabic(ch: string): string {
  if (ch === 'أ' || ch === 'إ' || ch === 'آ') return 'ا';
  if (ch === 'ه' || ch === 'ة') return 'هـ';
  if (ch === 'ي') return 'ى';
  return ch;
}

/** يحوّل الحروف المدخلة (عربية أو لاتينية) إلى قائمة حروف اللوحة العربية المعتمدة، أو null إن وُجد حرف غير معتمد */
export function parsePlateLetters(input: string): string[] | null {
  const cleaned = input.replace(/هـ/g, 'ه').replace(/[\s\-ـ]/g, '');
  const out: string[] = [];
  for (const raw of Array.from(cleaned)) {
    const up = raw.toUpperCase();
    if (EN_TO_AR.has(up)) {
      out.push(EN_TO_AR.get(up)!);
      continue;
    }
    const ar = normalizeArabic(raw);
    if (AR_TO_EN.has(ar)) {
      out.push(ar);
      continue;
    }
    return null;
  }
  return out;
}

export function validatePlate(numbers: string, letters: string): string | null {
  const digits = numbers.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
  if (!/^\d{1,4}$/.test(digits)) return 'أرقام اللوحة من 1 إلى 4 أرقام';
  const l = parsePlateLetters(letters);
  if (!l) return 'حرف غير معتمد في اللوحات السعودية';
  if (l.length < 1 || l.length > 3) return 'حروف اللوحة من حرف إلى ثلاثة أحرف';
  return null;
}

export function normalizePlate(numbers: string, letters: string) {
  const digits = numbers.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
  const l = parsePlateLetters(letters) ?? [];
  return { plateNumbers: digits, plateLetters: l.join(' ') };
}

export function plateLatin(letters: string): string {
  return letters
    .split(' ')
    .filter(Boolean)
    .map((l) => AR_TO_EN.get(l) ?? '')
    .join(' ');
}

export function plateKey(numbers: string, letters: string) {
  return `${numbers}|${letters.replace(/\s/g, '')}`;
}
