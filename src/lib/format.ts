const HINDI = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toHindiDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => HINDI[Number(d)]).replace(/,/g, '٬');
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function fmtNum(n: number, decimals = 0): string {
  if (!isFinite(n)) return '—';
  const fixed = Math.round(n * 10 ** decimals) / 10 ** decimals;
  const [i, f] = fixed.toFixed(decimals).split('.');
  const withSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return f ? `${withSep}.${f}` : withSep;
}

export function fmtSAR(n: number): string {
  return `${fmtNum(n, n % 1 === 0 ? 0 : 2)} ر.س`;
}

export function fmtKm(n: number): string {
  return `${fmtNum(n)} كم`;
}

/** يحوّل الأرقام العربية-الهندية المدخلة إلى لاتينية ويقرأ رقماً */
export function parseNum(s: string): number {
  const latin = s
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[٫]/g, '.')
    .replace(/[,٬\s]/g, '');
  const n = parseFloat(latin);
  return isNaN(n) ? NaN : n;
}

/** ينظّف إدخال الأرقام: يحوّل الهندية/الفارسية إلى لاتينية ويحذف أي حرف غير رقمي */
export function sanitizeNumeric(s: string, mode: 'int' | 'decimal' | 'phone'): string {
  let t = s
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٫,،]/g, mode === 'decimal' ? '.' : '');
  if (mode === 'int') return t.replace(/\D/g, '');
  if (mode === 'phone') return t.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  t = t.replace(/[^\d.]/g, '');
  const i = t.indexOf('.');
  return i === -1 ? t : t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, '');
}
