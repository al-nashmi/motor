// اقتراح نوع زيت المحرك حسب الشركة/الطراز/السنة.
// توصيات عامة شائعة لسيارات السوق السعودي — المرجع النهائي دائماً دليل المالك أو غطاء فتحة الزيت.
import type { OilBase } from './types';

interface OilRule {
  models?: string[];
  minYear?: number;
  maxYear?: number;
  viscosity: string;
  alt?: string;
  spec?: string;
  base: OilBase;
  intervalKm: number;
  note?: string;
}

export interface OilSuggestion {
  viscosity: string;
  alt?: string;
  spec?: string;
  base: OilBase;
  intervalKm: number;
  note?: string;
  /** هل التوصية خاصة بالطراز أم عامة للشركة */
  specific: boolean;
}

const RULES: Record<string, OilRule[]> = {
  'تويوتا': [
    { models: ['لاندكروزر'], minYear: 2022, viscosity: '0W-20', alt: '5W-30', base: 'synthetic', intervalKm: 10000, note: 'محرك V6 تيربو (LC300)' },
    { models: ['لاندكروزر'], minYear: 2008, viscosity: '5W-30', alt: '0W-20', base: 'synthetic', intervalKm: 10000, note: 'محرك V8 — الدليل يسمح بـ 0W-20 أو 5W-30' },
    { models: ['هايلكس', 'فورتشنر', 'إنوفا', 'برادو'], viscosity: '5W-30', alt: '10W-30', base: 'synthetic', intervalKm: 10000 },
    { models: ['كامري', 'كورولا', 'راف فور', 'يارس', 'أفالون'], minYear: 2018, viscosity: '0W-20', alt: '5W-30', base: 'synthetic', intervalKm: 10000, note: 'بعض فئات الهايبرد تستخدم 0W-16' },
    { maxYear: 2009, viscosity: '5W-30', alt: '10W-30', base: 'semi', intervalKm: 7500 },
    { viscosity: '0W-20', alt: '5W-30', base: 'synthetic', intervalKm: 10000 },
  ],
  'لكزس': [
    { models: ['LX'], minYear: 2022, viscosity: '0W-20', base: 'synthetic', intervalKm: 10000, note: 'محرك V6 تيربو' },
    { viscosity: '0W-20', alt: '5W-30', base: 'synthetic', intervalKm: 10000 },
  ],
  'هيونداي': [
    { minYear: 2020, viscosity: '0W-20', alt: '5W-30', spec: 'API SP', base: 'synthetic', intervalKm: 10000, note: 'محركات Smartstream؛ كثير من الوكالات محلياً تعتمد 5W-30' },
    { maxYear: 2010, viscosity: '5W-30', alt: '10W-30', base: 'semi', intervalKm: 7500 },
    { viscosity: '5W-30', spec: 'API SN/SP', base: 'synthetic', intervalKm: 10000 },
  ],
  'كيا': [
    { minYear: 2020, viscosity: '0W-20', alt: '5W-30', spec: 'API SP', base: 'synthetic', intervalKm: 10000, note: 'محركات Smartstream؛ كثير من الوكالات محلياً تعتمد 5W-30' },
    { maxYear: 2010, viscosity: '5W-30', alt: '10W-30', base: 'semi', intervalKm: 7500 },
    { viscosity: '5W-30', spec: 'API SN/SP', base: 'synthetic', intervalKm: 10000 },
  ],
  'نيسان': [
    { models: ['باترول'], minYear: 2010, viscosity: '5W-30', alt: '0W-20', base: 'synthetic', intervalKm: 10000, note: 'محرك VK56 V8' },
    { models: ['التيما', 'إكس تريل', 'كيكس'], minYear: 2013, viscosity: '0W-20', alt: '5W-30', base: 'synthetic', intervalKm: 10000 },
    { models: ['صني'], viscosity: '5W-30', alt: '10W-30', base: 'semi', intervalKm: 7500 },
    { viscosity: '5W-30', base: 'synthetic', intervalKm: 10000 },
  ],
  'شيفروليه': [
    { models: ['تاهو', 'سلفرادو', 'سوبربان'], minYear: 2014, viscosity: '0W-20', spec: 'dexos1', base: 'synthetic', intervalKm: 10000 },
    { viscosity: '5W-30', spec: 'dexos1', base: 'synthetic', intervalKm: 10000 },
  ],
  'جي إم سي': [
    { models: ['يوكن', 'سييرا'], minYear: 2014, viscosity: '0W-20', spec: 'dexos1', base: 'synthetic', intervalKm: 10000 },
    { viscosity: '5W-30', spec: 'dexos1', base: 'synthetic', intervalKm: 10000 },
  ],
  'فورد': [
    { models: ['F-150', 'إكسبديشن', 'إكسبلورر', 'تورس', 'إيدج'], minYear: 2011, viscosity: '5W-30', alt: '5W-20', base: 'synthetic', intervalKm: 10000, note: 'محركات EcoBoost تيربو 5W-30؛ محركات V8 العادية 5W-20' },
    { viscosity: '5W-30', base: 'synthetic', intervalKm: 10000 },
  ],
  'هوندا': [
    { maxYear: 2009, viscosity: '5W-20', alt: '5W-30', base: 'semi', intervalKm: 7500 },
    { viscosity: '0W-20', base: 'synthetic', intervalKm: 10000 },
  ],
  'مازدا': [
    { minYear: 2012, viscosity: '0W-20', alt: '5W-30', base: 'synthetic', intervalKm: 10000, note: 'محركات Skyactiv؛ المحركات التيربو تقبل 5W-30' },
    { viscosity: '5W-30', base: 'semi', intervalKm: 7500 },
  ],
  'ميتسوبيشي': [{ viscosity: '5W-30', alt: '0W-20', base: 'synthetic', intervalKm: 10000 }],
  'مرسيدس': [{ viscosity: '5W-30', alt: '0W-40', spec: 'MB 229.5 / 229.51', base: 'synthetic', intervalKm: 10000, note: 'التزم بمواصفة المصنّع المكتوبة على العبوة' }],
  'بي إم دبليو': [{ viscosity: '5W-30', alt: '0W-30', spec: 'BMW LL-01 / LL-04', base: 'synthetic', intervalKm: 10000, note: 'الشركة تسمح بفترات أطول، لكن الحرارة والغبار تستدعي فترة أقصر' }],
  'أودي': [{ viscosity: '5W-30', alt: '5W-40', spec: 'VW 504.00 / 502.00', base: 'synthetic', intervalKm: 10000 }],
  'بورش': [{ viscosity: '0W-40', alt: '5W-40', spec: 'Porsche A40', base: 'synthetic', intervalKm: 10000 }],
  'لاند روفر': [{ viscosity: '0W-20', alt: '5W-20', spec: 'STJLR', base: 'synthetic', intervalKm: 10000 }],
  'دودج': [{ viscosity: '5W-20', alt: '0W-20', spec: 'Chrysler MS-6395', base: 'synthetic', intervalKm: 10000, note: 'محرك هيمي V8 وبنتاستار V6' }],
  'جيب': [{ viscosity: '5W-20', alt: '0W-20', spec: 'Chrysler MS-6395', base: 'synthetic', intervalKm: 10000 }],
  'جيلي': [{ viscosity: '5W-30', alt: '5W-40', spec: 'API SN', base: 'synthetic', intervalKm: 10000 }],
  'شانجان': [{ viscosity: '5W-30', alt: '5W-40', spec: 'API SN', base: 'synthetic', intervalKm: 10000, note: 'المحركات التيربو تستفيد من 5W-40 في الصيف' }],
  'إم جي': [{ viscosity: '5W-30', alt: '5W-40', spec: 'API SN', base: 'synthetic', intervalKm: 10000 }],
};

const GENERIC_NEW: OilRule = { viscosity: '5W-30', alt: '0W-20', base: 'synthetic', intervalKm: 10000 };
const GENERIC_OLD: OilRule = { viscosity: '10W-40', alt: '20W-50', base: 'semi', intervalKm: 5000, note: 'المحركات القديمة أو كثيرة المشي تستفيد من لزوجة أعلى' };

function norm(s: string) {
  return s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function suggestOil(make: string, model: string, year: number): OilSuggestion {
  const rules = RULES[make] ?? Object.entries(RULES).find(([k]) => norm(k) === norm(make))?.[1];
  const m = norm(model);
  const fits = (r: OilRule) =>
    (!r.minYear || year >= r.minYear) && (!r.maxYear || year <= r.maxYear) && (!r.models || (!!m && r.models.some((x) => m.includes(norm(x)) || norm(x).includes(m))));
  const hit = rules?.find(fits);
  const rule = hit ?? (year && year < 2005 ? GENERIC_OLD : GENERIC_NEW);
  // سيارة قديمة جداً: اختصر الفترة حتى لو كان الزيت صناعياً
  const intervalKm = year && year < 2005 ? Math.min(rule.intervalKm, 5000) : rule.intervalKm;
  return { viscosity: rule.viscosity, alt: rule.alt, spec: rule.spec, base: rule.base, intervalKm, note: rule.note, specific: !!hit?.models };
}

export const OIL_DISCLAIMER = 'اقتراح عام — المرجع دليل المالك أو المكتوب على غطاء فتحة الزيت. في الحرارة والغبار والزحام اختصر الفترة.';
