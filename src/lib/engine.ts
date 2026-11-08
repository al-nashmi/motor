// محركات الحساب: تقدير العداد (7.8)، عمر المكوّنات (7.3)، كفاءة الوقود (7.7)، درجة الصحة (7.2)، ما تحتاجه الآن (S07)
import { COMPONENT_DEFAULTS, COMPONENT_LABELS, DOC_LABELS, MAIN_DOCS, oilMonthsFor } from './catalog';
import { addDays, daysSince, daysUntil, monthsBetween, parseDate, relativeDays } from './dates';
import { fmtKm, fmtNum } from './format';
import type {
  ComponentLife,
  ComponentType,
  FuelFillUp,
  MaintenanceRecord,
  OdometerPoint,
  Severity,
  Vehicle,
  VehicleDocument,
} from './types';

// ───────────── العداد ─────────────

export interface OdometerEstimate {
  /** آخر قراءة فعلية */
  lastKm: number | null;
  lastDate: string | null;
  /** العداد المقدّر الآن */
  km: number | null;
  dailyRate: number;
  rateSource: 'measured' | 'default';
  estimated: boolean;
  daysSinceReading: number | null;
  needsConfirm: boolean;
  stale: boolean;
}

export function sortedPoints(points: OdometerPoint[], vehicleId: string) {
  return points.filter((p) => p.vehicleId === vehicleId).sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime() || a.km - b.km);
}

export function estimateOdometer(points: OdometerPoint[], vehicleId: string, defaultDailyKm: number, now = new Date()): OdometerEstimate {
  const pts = sortedPoints(points, vehicleId);
  if (pts.length === 0) {
    return { lastKm: null, lastDate: null, km: null, dailyRate: defaultDailyKm, rateSource: 'default', estimated: false, daysSinceReading: null, needsConfirm: false, stale: false };
  }
  const last = pts[pts.length - 1];
  const lastD = parseDate(last.date);
  // المعدل اليومي = (آخر قراءة − قراءة قبل نافذة ≥ 30 يوماً) ÷ عدد الأيام
  let rate = defaultDailyKm;
  let rateSource: OdometerEstimate['rateSource'] = 'default';
  for (let i = pts.length - 2; i >= 0; i--) {
    const days = (lastD.getTime() - parseDate(pts[i].date).getTime()) / 86400000;
    if (days >= 30) {
      const r = (last.km - pts[i].km) / days;
      if (r >= 0) {
        rate = r;
        rateSource = 'measured';
      }
      break;
    }
  }
  const ds = Math.max(0, daysSince(last.date, now));
  const km = Math.round(last.km + rate * ds);
  return {
    lastKm: last.km,
    lastDate: last.date,
    km,
    dailyRate: rate,
    rateSource,
    estimated: ds >= 1,
    daysSinceReading: ds,
    needsConfirm: ds > 60,
    stale: ds > 90,
  };
}

// ───────────── المكوّنات ─────────────

export interface ComponentStatus {
  type: ComponentType;
  life: ComponentLife;
  known: boolean;
  lastDate?: string;
  lastKm?: number;
  kmUsed?: number;
  monthsUsed?: number;
  ratio: number; // 0..∞
  severity: Severity;
  remainingKm?: number;
  remainingDays?: number;
  dueDate?: Date;
  basis: string;
}

export const ALL_COMPONENTS: ComponentType[] = ['oil', 'oil_filter', 'tires', 'battery', 'air_filter', 'ac_filter', 'brake_fluid'];

/** آخر عملية استبدلت هذا المكوّن */
export function lastReset(records: MaintenanceRecord[], vehicleId: string, t: ComponentType): MaintenanceRecord | undefined {
  return records
    .filter((r) => r.vehicleId === vehicleId && r.resets.includes(t))
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime() || b.km - a.km)[0];
}

/**
 * عمر المكوّن. للزيت: فترة آخر زيت مسجّل (5000/10000/…) تتقدّم على الافتراضي.
 * لفلتر الزيت: ضعف فترة الزيت (يُغيّر مرة كل تبديلتين) ما لم يحدد المستخدم عمراً خاصاً.
 */
export function componentLife(v: Vehicle, t: ComponentType, records: MaintenanceRecord[] = []): ComponentLife {
  const own = v.componentOverrides?.[t];
  if (t !== 'oil' && t !== 'oil_filter') return { ...COMPONENT_DEFAULTS[t], ...(own ?? {}) };
  const lastOil = lastReset(records, v.id, 'oil');
  const oil: ComponentLife = lastOil?.oil?.intervalKm
    ? { km: lastOil.oil.intervalKm, months: lastOil.oil.intervalMonths || oilMonthsFor(lastOil.oil.intervalKm) }
    : { ...COMPONENT_DEFAULTS.oil, ...(v.componentOverrides?.oil ?? {}) };
  if (t === 'oil') return oil;
  if (own && (own.km || own.months)) return { ...COMPONENT_DEFAULTS.oil_filter, ...own };
  return { km: oil.km ? oil.km * 2 : undefined, months: oil.months ? oil.months * 2 : undefined };
}

export function componentStatus(v: Vehicle, t: ComponentType, records: MaintenanceRecord[], odo: OdometerEstimate, now = new Date()): ComponentStatus {
  const life = componentLife(v, t, records);
  const last = lastReset(records, v.id, t);
  if (!last) {
    return { type: t, life, known: false, ratio: 0, severity: 'info', basis: 'لم يُسجّل أي استبدال بعد — سجّل آخر عملية ليبدأ التتبع' };
  }
  const monthsUsed = Math.max(0, monthsBetween(parseDate(last.date), now));
  const kmUsed = odo.km != null ? Math.max(0, odo.km - last.km) : undefined;
  const ratios: number[] = [];
  if (life.months) ratios.push(monthsUsed / life.months);
  if (life.km && kmUsed != null) ratios.push(kmUsed / life.km);
  const ratio = ratios.length ? Math.max(...ratios) : 0;
  const severity: Severity = ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warning' : 'ok';

  // الموعد المتوقع: الأقرب بين الزمن والمسافة
  const candidates: Date[] = [];
  if (life.months) {
    const d = new Date(parseDate(last.date));
    d.setMonth(d.getMonth() + life.months);
    candidates.push(d);
  }
  let remainingKm: number | undefined;
  if (life.km && kmUsed != null) {
    remainingKm = life.km - kmUsed;
    if (odo.dailyRate > 0) candidates.push(addDays(now, remainingKm / odo.dailyRate));
  }
  const dueDate = candidates.length ? new Date(Math.min(...candidates.map((d) => d.getTime()))) : undefined;
  const remainingDays = dueDate ? Math.round((dueDate.getTime() - now.getTime()) / 86400000) : undefined;
  const parts: string[] = [`آخر استبدال ${fmtKm(last.km)}`];
  if (odo.km != null) parts.push(`العداد ${odo.estimated ? 'المقدّر' : 'الحالي'} ${fmtKm(odo.km)}`);
  return { type: t, life, known: true, lastDate: last.date, lastKm: last.km, kmUsed, monthsUsed, ratio, severity, remainingKm, remainingDays, dueDate, basis: parts.join(' · ') };
}

// ───────────── الضمان (الكفرات/البطارية) ─────────────

export interface WarrantyStatus {
  type: ComponentType;
  recordId: string;
  months: number;
  expiry: string;
  daysLeft: number;
  active: boolean;
  severity: Severity;
}

export const WARRANTY_COMPONENTS: ComponentType[] = ['tires', 'battery'];

/** ضمان آخر قطعة مركّبة من هذا النوع (لا قيمة لضمان قطعة استُبدلت بعدها) */
export function warrantyStatus(v: Vehicle, t: ComponentType, records: MaintenanceRecord[], now = new Date()): WarrantyStatus | null {
  const last = lastReset(records, v.id, t);
  if (!last?.warranty?.expiry) return null;
  const daysLeft = daysUntil(last.warranty.expiry, now);
  return {
    type: t,
    recordId: last.id,
    months: last.warranty.months,
    expiry: last.warranty.expiry,
    daysLeft,
    active: daysLeft >= 0,
    severity: daysLeft < 0 ? 'info' : daysLeft <= 30 ? 'warning' : 'ok',
  };
}

// ───────────── الوثائق ─────────────

export function docSeverity(expiry: string, now = new Date()): Severity {
  const d = daysUntil(expiry, now);
  if (d <= 7) return 'danger';
  if (d <= 30) return 'warning';
  return 'ok';
}

export function docStatusText(expiry: string, now = new Date()): string {
  const d = daysUntil(expiry, now);
  if (d < 0) return 'منتهية';
  if (d <= 30) return 'قاربت على الانتهاء';
  return 'سارية';
}

export function findDoc(v: Vehicle, type: VehicleDocument['type']) {
  return v.documents.find((d) => d.type === type);
}

// ───────────── الوقود ─────────────

export interface FuelStats {
  samples: { date: string; kmPerL: number }[];
  average: number | null;
  latest: number | null;
  dropPct: number | null;
  alert: boolean;
  totalSpend: number;
  totalLiters: number;
}

export function fuelStats(fills: FuelFillUp[], vehicleId: string): FuelStats {
  const list = fills.filter((f) => f.vehicleId === vehicleId).sort((a, b) => a.km - b.km);
  const samples: FuelStats['samples'] = [];
  let lastFull: FuelFillUp | null = null;
  let litersSince = 0;
  for (const f of list) {
    if (lastFull) litersSince += f.liters;
    if (f.full) {
      if (lastFull && litersSince > 0 && f.km > lastFull.km) {
        samples.push({ date: f.date, kmPerL: (f.km - lastFull.km) / litersSince });
      }
      lastFull = f;
      litersSince = 0;
    }
  }
  const totalSpend = list.reduce((s, f) => s + f.total, 0);
  const totalLiters = list.reduce((s, f) => s + f.liters, 0);
  if (samples.length === 0) return { samples, average: null, latest: null, dropPct: null, alert: false, totalSpend, totalLiters };
  const latest = samples[samples.length - 1].kmPerL;
  const prev = samples.slice(0, -1);
  const baseline = prev.length ? prev.reduce((s, x) => s + x.kmPerL, 0) / prev.length : null;
  const average = samples.reduce((s, x) => s + x.kmPerL, 0) / samples.length;
  const dropPct = baseline ? ((baseline - latest) / baseline) * 100 : null;
  // تنبيه الارتفاع المفاجئ: تدهور > 15% بعد نمط تسجيل منتظم (3 عينات على الأقل)
  const alert = samples.length >= 3 && dropPct != null && dropPct > 15;
  return { samples, average, latest, dropPct, alert, totalSpend, totalLiters };
}

// ───────────── درجة الصحة ─────────────

export interface HealthBreakdown {
  score: number;
  parts: { label: string; score: number; max: number; reasons: string[] }[];
}

export function healthScore(v: Vehicle, comps: ComponentStatus[], odo: OdometerEstimate, recordsCount: number, now = new Date()): HealthBreakdown {
  // سريان الوثائق (40)
  const docReasons: string[] = [];
  let docScore = 40;
  const per = 40 / MAIN_DOCS.length;
  for (const t of MAIN_DOCS) {
    const d = findDoc(v, t);
    if (!d) {
      docScore -= per * 0.4;
      docReasons.push(`${DOC_LABELS[t]}: التاريخ غير مُدخل`);
      continue;
    }
    const days = daysUntil(d.expiry, now);
    if (days < 0) {
      docScore -= per;
      docReasons.push(`${DOC_LABELS[t]}: منتهية`);
    } else if (days <= 7) {
      docScore -= per * 0.6;
      docReasons.push(`${DOC_LABELS[t]}: تنتهي خلال ${days} أيام`);
    } else if (days <= 30) {
      docScore -= per * 0.3;
      docReasons.push(`${DOC_LABELS[t]}: تنتهي خلال ${days} يوماً`);
    }
  }

  // الالتزام بالصيانة (40)
  const maint: ComponentType[] = ['oil', 'oil_filter', 'air_filter', 'ac_filter', 'brake_fluid'];
  const weights: Record<string, number> = { oil: 16, oil_filter: 4, air_filter: 6, ac_filter: 4, brake_fluid: 10 };
  let maintScore = 0;
  const maintReasons: string[] = [];
  for (const t of maint) {
    const c = comps.find((x) => x.type === t);
    if (!c) continue;
    const w = weights[t];
    if (!c.known) {
      maintScore += w * 0.5;
      maintReasons.push(`${COMPONENT_LABELS[t]}: لا يوجد سجل`);
    } else if (c.ratio >= 1) {
      maintScore += w * Math.max(0, 1 - (c.ratio - 1) * 2) * 0.3;
      maintReasons.push(`${COMPONENT_LABELS[t]}: متجاوز الموعد`);
    } else if (c.ratio >= 0.8) {
      maintScore += w * 0.75;
      maintReasons.push(`${COMPONENT_LABELS[t]}: يقترب موعده`);
    } else maintScore += w;
  }

  // الإطارات والبطارية (10)
  let tbScore = 0;
  const tbReasons: string[] = [];
  for (const t of ['tires', 'battery'] as ComponentType[]) {
    const c = comps.find((x) => x.type === t)!;
    if (!c.known) {
      tbScore += 2.5;
      tbReasons.push(`${COMPONENT_LABELS[t]}: لا يوجد سجل`);
    } else if (c.ratio >= 1) {
      tbReasons.push(`${COMPONENT_LABELS[t]}: تجاوز العمر الموصى به`);
    } else if (c.ratio >= 0.8) {
      tbScore += 3;
      tbReasons.push(`${COMPONENT_LABELS[t]}: قارب نهاية عمره`);
    } else tbScore += 5;
  }

  // حداثة البيانات (10)
  let freshScore = 0;
  const freshReasons: string[] = [];
  if (odo.daysSinceReading == null) freshReasons.push('لا توجد قراءة عداد');
  else if (odo.daysSinceReading <= 30) freshScore += 6;
  else if (odo.daysSinceReading <= 90) {
    freshScore += 4;
    freshReasons.push(`آخر قراءة عداد ${relativeDays(-odo.daysSinceReading)}`);
  } else {
    freshScore += 1;
    freshReasons.push(`آخر قراءة عداد ${relativeDays(-odo.daysSinceReading)}`);
  }
  if (recordsCount > 0) freshScore += 4;
  else freshReasons.push('لا توجد سجلات صيانة');

  const parts = [
    { label: 'سريان الوثائق', score: Math.max(0, docScore), max: 40, reasons: docReasons },
    { label: 'الالتزام بالصيانة', score: maintScore, max: 40, reasons: maintReasons },
    { label: 'الإطارات والبطارية', score: tbScore, max: 10, reasons: tbReasons },
    { label: 'حداثة البيانات', score: freshScore, max: 10, reasons: freshReasons },
  ];
  const score = Math.round(parts.reduce((s, p) => s + p.score, 0));
  return { score: Math.max(0, Math.min(100, score)), parts };
}

// ───────────── ما تحتاجه الآن ─────────────

export interface NeedItem {
  key: string;
  vehicleId: string;
  kind: 'document' | 'component' | 'odometer' | 'fuel' | 'warranty';
  severity: Severity;
  title: string;
  subtitle: string;
  sort: number;
  action: { label: string; href: string };
}

const SEV_RANK: Record<Severity, number> = { danger: 0, warning: 1, info: 2, ok: 3 };

export function vehicleNeeds(
  v: Vehicle,
  comps: ComponentStatus[],
  odo: OdometerEstimate,
  fuel: FuelStats,
  now = new Date(),
  warranties: WarrantyStatus[] = [],
): NeedItem[] {
  const items: NeedItem[] = [];
  const vname = `${v.make} ${v.model}`;
  for (const d of v.documents) {
    const days = daysUntil(d.expiry, now);
    if (days > 30) continue;
    const label = d.type === 'other' && d.title ? d.title : DOC_LABELS[d.type];
    items.push({
      key: `doc:${v.id}:${d.type}:${d.id}`,
      vehicleId: v.id,
      kind: 'document',
      severity: days <= 7 ? 'danger' : 'warning',
      title: days < 0 ? `${label} منتهية` : `${label} تنتهي ${relativeDays(days)}`,
      subtitle: days < 0 ? `انتهت ${relativeDays(days)} — لا تُقَد المركبة حتى التجديد` : vname,
      sort: days,
      action: { label: 'جهّز التجديد', href: `/vehicle/document?vehicleId=${v.id}&docId=${d.id}` },
    });
  }
  for (const t of MAIN_DOCS) {
    if (!findDoc(v, t)) {
      items.push({
        key: `docmissing:${v.id}:${t}`,
        vehicleId: v.id,
        kind: 'document',
        severity: 'info',
        title: `أضف تاريخ انتهاء ${DOC_LABELS[t]}`,
        subtitle: 'حتى نذكّرك قبل الانتهاء بـ 30 و15 و7 أيام',
        sort: 500,
        action: { label: 'إضافة', href: `/vehicle/document?vehicleId=${v.id}&type=${t}` },
      });
    }
  }
  for (const w of warranties) {
    if (!w.active || w.daysLeft > 30) continue;
    items.push({
      key: `warranty:${v.id}:${w.type}:${w.recordId}`,
      vehicleId: v.id,
      kind: 'warranty',
      severity: 'warning',
      title: `ضمان ${COMPONENT_LABELS[w.type]} ينتهي ${relativeDays(w.daysLeft)}`,
      subtitle: 'إن لاحظت أي مشكلة فافحصها الآن قبل انتهاء الضمان',
      sort: 150 + w.daysLeft,
      action: { label: 'التفاصيل', href: `/vehicle/component?vehicleId=${v.id}&type=${w.type}` },
    });
  }
  for (const c of comps) {
    if (!c.known || c.severity === 'ok') continue;
    const w = warranties.find((x) => x.type === c.type && x.active);
    const over = c.ratio >= 1;
    const remain =
      c.remainingKm != null && c.life.km
        ? over
          ? `متجاوز بـ ${fmtKm(Math.abs(c.remainingKm))}`
          : `متبقٍ نحو ${fmtKm(c.remainingKm)}`
        : c.remainingDays != null
          ? over
            ? `متجاوز ${relativeDays(c.remainingDays)}`
            : `مستحق ${relativeDays(c.remainingDays)}`
          : '';
    items.push({
      key: `comp:${v.id}:${c.type}`,
      vehicleId: v.id,
      kind: 'component',
      severity: c.severity,
      title: `${COMPONENT_LABELS[c.type]} — ${over ? 'تجاوز الموعد' : 'يقترب الموعد'}`,
      subtitle: `${remain} · ${fmtNum(Math.round(c.ratio * 100))}% من العمر${w ? ' · لا يزال ضمن الضمان' : ''}`,
      sort: 100 - c.ratio * 100,
      action: { label: 'سجّل الصيانة', href: `/record/new?vehicleId=${v.id}&component=${c.type}` },
    });
  }
  if (odo.daysSinceReading != null && odo.needsConfirm) {
    items.push({
      key: `odo:${v.id}`,
      vehicleId: v.id,
      kind: 'odometer',
      severity: odo.stale ? 'warning' : 'info',
      title: `العداد نحو ${fmtKm(odo.km ?? 0)} — صحيح؟`,
      subtitle: `آخر قراءة فعلية ${relativeDays(-odo.daysSinceReading)} (مقدَّر)`,
      sort: 200,
      action: { label: 'تأكيد/تحديث', href: `/vehicle/odometer?vehicleId=${v.id}` },
    });
  } else if (odo.lastKm == null) {
    items.push({
      key: `odo:${v.id}`,
      vehicleId: v.id,
      kind: 'odometer',
      severity: 'info',
      title: 'أدخل قراءة العداد الحالية',
      subtitle: 'نقطة الأساس لتذكيرات الصيانة والتوقعات',
      sort: 300,
      action: { label: 'إدخال', href: `/vehicle/odometer?vehicleId=${v.id}` },
    });
  }
  if (fuel.alert && fuel.dropPct != null) {
    items.push({
      key: `fuel:${v.id}`,
      vehicleId: v.id,
      kind: 'fuel',
      severity: 'warning',
      title: `كفاءة الوقود انخفضت ${fmtNum(fuel.dropPct)}%`,
      subtitle: 'احتمالات: ضغط الكفرات، فلتر الهواء، أو حاجة لفحص المحرك',
      sort: 250,
      action: { label: 'سجّل فحصاً', href: `/record/new?vehicleId=${v.id}&type=other` },
    });
  }
  return items.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.sort - b.sort);
}

export function worstSeverity(items: { severity: Severity }[]): Severity {
  let w: Severity = 'ok';
  for (const i of items) if (SEV_RANK[i.severity] < SEV_RANK[w]) w = i.severity;
  return w === 'info' ? 'ok' : w;
}
