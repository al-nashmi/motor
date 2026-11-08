// نموذج البيانات المبسّط — القسم 9.3 من وثيقة التصميم

export type DocType = 'insurance' | 'inspection' | 'registration' | 'driver_auth' | 'warranty' | 'other';

export interface VehicleDocument {
  id: string;
  type: DocType;
  title?: string;
  /** تاريخ الانتهاء بصيغة YYYY-MM-DD */
  expiry: string;
  imageUri?: string;
  updatedAt: string;
}

export type ComponentType = 'oil' | 'oil_filter' | 'tires' | 'battery' | 'air_filter' | 'ac_filter' | 'brake_fluid';

export interface ComponentLife {
  km?: number;
  months?: number;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumbers: string;
  plateLetters: string;
  nickname?: string;
  vin?: string;
  color?: string;
  source: 'manual';
  createdAt: string;
  archivedAt?: string;
  deletedAt?: string;
  documents: VehicleDocument[];
  componentOverrides: Partial<Record<ComponentType, ComponentLife>>;
  disabledScheduleItems?: string[];
}

export type OdometerSource = 'onboarding' | 'manual' | 'record' | 'fuel' | 'confirm';

export interface OdometerPoint {
  id: string;
  vehicleId: string;
  km: number;
  date: string; // ISO
  source: OdometerSource;
  note?: string;
}

export type RecordType = 'oil' | 'tires' | 'battery' | 'brakes' | 'periodic' | 'filters' | 'other';

export type Category = 'oil' | 'tires' | 'parts' | 'periodic' | 'labor' | 'documents' | 'fuel' | 'other';

export interface LineItem {
  id: string;
  description: string;
  category: Category;
  qty: number;
  price: number;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: RecordType;
  date: string; // YYYY-MM-DD
  km: number;
  shop?: string;
  vatNumber?: string;
  total: number;
  vat?: number;
  items: LineItem[];
  notes?: string;
  doneBy?: string;
  source: 'manual' | 'qr' | 'ocr';
  invoiceUri?: string;
  resets: ComponentType[];
  tire?: { size?: string; count?: number; dot?: string; brand?: string };
  /** تفاصيل تبديل الزيت: فترة الزيت (5000/10000/…) واللزوجة ونوعه، وهل تغيّر الفلتر */
  oil?: OilDetails;
  /** ضمان القطعة (الكفرات/البطارية) */
  warranty?: { months: number; expiry: string; note?: string };
  createdAt: string;
}

export type OilBase = 'mineral' | 'semi' | 'synthetic';

export interface OilDetails {
  intervalKm: number;
  intervalMonths: number;
  viscosity?: string;
  base?: OilBase;
  brand?: string;
  filterChanged: boolean;
}

export interface FuelFillUp {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  km: number;
  liters: number;
  total: number;
  pricePerLiter: number;
  full: boolean;
  note?: string;
}

export interface Settings {
  notifications: boolean;
  docLeadDays: number[];
  odometerReminderMonths: number;
  hindiDigits: boolean;
  calendar: 'gregorian' | 'hijri';
  defaultDailyKm: number;
}

export interface User {
  phone: string;
  name: string;
  createdAt: string;
}

export type Severity = 'danger' | 'warning' | 'info' | 'ok';
