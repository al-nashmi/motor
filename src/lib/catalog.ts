import type { Category, ComponentLife, ComponentType, DocType, OilBase, RecordType } from './types';

export const DOC_LABELS: Record<DocType, string> = {
  insurance: 'التأمين',
  inspection: 'الفحص الدوري',
  registration: 'الاستمارة',
  driver_auth: 'تفويض السائق',
  warranty: 'الضمان',
  other: 'وثيقة أخرى',
};

/** الوثائق الثلاث الأساسية التي تظهر شاراتها على بطاقة المركبة */
export const MAIN_DOCS: DocType[] = ['insurance', 'inspection', 'registration'];

export const DOC_RENEWAL: Record<DocType, string> = {
  insurance: 'جدّد عبر شركة التأمين أو منصات مقارنة التأمين المرخصة، ثم ارجع وحدّث التاريخ هنا.',
  inspection: 'احجز موعد الفحص الدوري لدى أحد المراكز المعتمدة، وبعد اجتياز الفحص حدّث التاريخ هنا.',
  registration: 'تجدد الاستمارة عبر أبشر (خدمات المركبات ← تجديد رخصة سير) بعد سداد الرسوم وسريان التأمين والفحص.',
  driver_auth: 'يصدر تفويض القيادة وتجديده عبر أبشر.',
  warranty: 'راجع الوكالة لمعرفة شروط تمديد الضمان.',
  other: 'جدّد عبر الجهة المختصة ثم حدّث التاريخ هنا.',
};

export const RECORD_LABELS: Record<RecordType, string> = {
  oil: 'تبديل زيت',
  tires: 'استبدال كفرات',
  battery: 'بطارية',
  brakes: 'فرامل',
  periodic: 'صيانة دورية شاملة',
  filters: 'فلاتر',
  other: 'أخرى',
};

export const RECORD_ICONS: Record<RecordType, string> = {
  oil: 'water',
  tires: 'disc',
  battery: 'battery-charging',
  brakes: 'stop-circle',
  periodic: 'construct',
  filters: 'funnel',
  other: 'build',
};

export const RECORD_DEFAULT_RESETS: Record<RecordType, ComponentType[]> = {
  oil: ['oil', 'oil_filter'],
  tires: ['tires'],
  battery: ['battery'],
  brakes: ['brake_fluid'],
  periodic: ['oil', 'oil_filter', 'air_filter', 'ac_filter'],
  filters: ['air_filter', 'ac_filter'],
  other: [],
};

export const RECORD_CATEGORY: Record<RecordType, Category> = {
  oil: 'oil',
  tires: 'tires',
  battery: 'parts',
  brakes: 'parts',
  periodic: 'periodic',
  filters: 'parts',
  other: 'other',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  oil: 'زيت وسوائل',
  tires: 'كفرات',
  parts: 'قطع غيار',
  periodic: 'صيانة دورية',
  labor: 'أجور يد',
  documents: 'وثائق',
  fuel: 'وقود',
  other: 'أخرى',
};

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  oil: 'زيت المحرك',
  oil_filter: 'فلتر الزيت',
  tires: 'الكفرات',
  battery: 'البطارية',
  air_filter: 'فلتر الهواء',
  ac_filter: 'فلتر المكيف',
  brake_fluid: 'سائل الفرامل',
};

export const COMPONENT_ICONS: Record<ComponentType, string> = {
  oil: 'water',
  oil_filter: 'funnel',
  tires: 'disc',
  battery: 'battery-charging',
  air_filter: 'leaf',
  ac_filter: 'snow',
  brake_fluid: 'stop-circle',
};

// جدول 15 — أعمار افتراضية نموذجية قابلة للتعديل لكل مركبة
export const COMPONENT_DEFAULTS: Record<ComponentType, ComponentLife> = {
  oil: { km: 10000, months: 6 },
  // الافتراضي: مرة كل تبديلتي زيت (ضعف فترة الزيت) — يُحسب من فترة آخر زيت مسجّل
  oil_filter: { km: 20000, months: 12 },
  tires: { km: 50000, months: 48 },
  battery: { months: 30 },
  air_filter: { km: 20000, months: 12 },
  ac_filter: { km: 15000, months: 12 },
  brake_fluid: { months: 24 },
};

export const COMPONENT_TIPS: Record<ComponentType, string> = {
  oil: 'في الحرارة والغبار والطرق الطويلة يُفضّل الالتزام بالحد الأدنى من الفترة.',
  oil_filter: 'الشائع تغييره مرة كل تبديلتين للزيت؛ بعض الوكالات توصي بتغييره مع كل تبديل — راجع دليل المالك.',
  tires: 'افحص الكفرات قبل الصيف — الحرارة تسرّع تلف المطاط. تاريخ التصنيع (DOT) مهم.',
  battery: 'حرارة الصيف أكبر عدو للبطارية؛ افحصها مجاناً قبل موسم الحر.',
  air_filter: 'في موسم الغبار (الربيع والصيف) قد يحتاج تغييراً أبكر.',
  ac_filter: 'فلتر المكيف المتسخ يضعف التبريد ويؤثر على جودة الهواء داخل المركبة.',
  brake_fluid: 'سائل الفرامل يمتص الرطوبة مع الوقت فيقل أداء الفرامل — غيّره كل سنتين تقريباً.',
};

export const MAKES: Record<string, string[]> = {
  'تويوتا': ['كامري', 'كورولا', 'لاندكروزر', 'هايلكس', 'يارس', 'راف فور', 'فورتشنر', 'برادو', 'أفالون', 'إنوفا'],
  'هيونداي': ['النترا', 'سوناتا', 'أكسنت', 'توسان', 'سنتافي', 'كريتا', 'أزيرا', 'باليسيد'],
  'نيسان': ['باترول', 'صني', 'التيما', 'ماكسيما', 'إكس تريل', 'نافارا', 'كيكس', 'باثفايندر'],
  'كيا': ['سيراتو', 'K5', 'سبورتاج', 'سورينتو', 'بيجاس', 'كارنفال', 'تيلورايد'],
  'شيفروليه': ['تاهو', 'سلفرادو', 'ماليبو', 'كابتيفا', 'سوبربان', 'جروف'],
  'فورد': ['إكسبلورر', 'إكسبديشن', 'تورس', 'F-150', 'إيدج', 'رينجر'],
  'جي إم سي': ['يوكن', 'سييرا', 'أكاديا', 'تيرين'],
  'هوندا': ['أكورد', 'سيفيك', 'CR-V', 'بايلوت', 'سيتي'],
  'لكزس': ['ES', 'LX', 'RX', 'GX', 'IS', 'LS'],
  'مازدا': ['مازدا 3', 'مازدا 6', 'CX-5', 'CX-9', 'CX-30'],
  'ميتسوبيشي': ['أتراج', 'باجيرو', 'ASX', 'L200', 'إكسباندر'],
  'مرسيدس': ['C-Class', 'E-Class', 'S-Class', 'GLE', 'G-Class', 'GLC'],
  'بي إم دبليو': ['الفئة الثالثة', 'الفئة الخامسة', 'الفئة السابعة', 'X5', 'X3', 'X7'],
  'جيلي': ['إمجراند', 'كولراي', 'توجيلا', 'مونجارو'],
  'شانجان': ['CS35', 'CS75', 'CS85', 'إيدو', 'UNI-K'],
  'إم جي': ['MG5', 'MG ZS', 'MG RX5', 'MG GT', 'MG HS'],
  'دودج': ['تشارجر', 'دورانجو', 'رام'],
  'جيب': ['رانجلر', 'جراند شيروكي', 'كومباس'],
  'لاند روفر': ['رنج روفر', 'ديفندر', 'ديسكفري'],
  'أودي': ['A4', 'A6', 'Q5', 'Q7', 'Q8'],
  'بورش': ['كايين', 'ماكان', '911', 'باناميرا'],
};

// الحروف المعتمدة في اللوحات السعودية ومقابلها اللاتيني
export const PLATE_LETTERS: [string, string][] = [
  ['ا', 'A'], ['ب', 'B'], ['ح', 'J'], ['د', 'D'], ['ر', 'R'], ['س', 'S'], ['ص', 'X'], ['ط', 'T'],
  ['ع', 'E'], ['ق', 'G'], ['ك', 'K'], ['ل', 'L'], ['م', 'Z'], ['ن', 'N'], ['هـ', 'H'], ['و', 'U'], ['ى', 'V'],
];

// ───────────── الزيت ─────────────

/** فترات الزيت الشائعة في السوق (كم) ومدتها الزمنية المقابلة (شهر) */
export const OIL_INTERVALS: { km: number; months: number; label: string; hint: string }[] = [
  { km: 5000, months: 4, label: '5,000 كم', hint: 'زيت معدني عادة' },
  { km: 7500, months: 5, label: '7,500 كم', hint: 'نصف صناعي' },
  { km: 10000, months: 6, label: '10,000 كم', hint: 'صناعي' },
  { km: 15000, months: 9, label: '15,000 كم', hint: 'صناعي طويل المدى' },
  { km: 20000, months: 12, label: '20,000 كم', hint: 'صناعي ممتاز' },
];

export function oilMonthsFor(km: number): number {
  const exact = OIL_INTERVALS.find((o) => o.km === km);
  if (exact) return exact.months;
  return Math.max(3, Math.min(12, Math.round(km / 1700)));
}

export const OIL_BASE_LABELS: Record<OilBase, string> = {
  mineral: 'معدني',
  semi: 'نصف صناعي',
  synthetic: 'صناعي بالكامل',
};

export const OIL_VISCOSITIES = ['0W-16', '0W-20', '5W-20', '5W-30', '5W-40', '10W-30', '10W-40', '15W-40', '20W-50'];

/** خيارات الضمان الشائعة بالأشهر */
export const WARRANTY_OPTIONS = [6, 12, 18, 24, 36, 48, 60];
