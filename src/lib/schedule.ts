// جدول صيانة المصنع (7.6) — كيان ServiceTemplate
// تنبيه: القالب أدناه مثال توضيحي عام مبني على ملحق الوثيقة، وليس مرجعاً لأي طراز بعينه.
import { addDays } from './dates';

export interface ServiceItem {
  id: string;
  label: string;
  everyKm?: number;
  everyMonths?: number;
  harsh?: boolean;
}

export interface ServiceTemplate {
  source: string;
  reviewedAt: string;
  items: ServiceItem[];
}

export const GENERIC_TEMPLATE: ServiceTemplate = {
  source: 'قالب توضيحي عام (ملحق وثيقة موتر) — راجع دليل المالك لطرازك',
  reviewedAt: '2026-10',
  items: [
    { id: 'oil', label: 'تغيير زيت المحرك والفلتر', everyKm: 10000, everyMonths: 6, harsh: true },
    { id: 'rotate', label: 'تدوير الإطارات', everyKm: 10000 },
    { id: 'ac_filter', label: 'فلتر المكيّف', everyKm: 20000, harsh: true },
    { id: 'air_filter', label: 'فلتر هواء المحرك', everyKm: 40000, harsh: true },
    { id: 'brake_fluid', label: 'زيت الفرامل', everyKm: 40000, everyMonths: 24 },
    { id: 'coolant', label: 'سائل التبريد (حسب دليل الشركة)', everyKm: 80000, harsh: true },
    { id: 'plugs', label: 'البواجي (الشمعات)', everyKm: 80000 },
    { id: 'belt', label: 'فحص السير / السلسلة', everyKm: 80000 },
  ],
};

export interface Stage {
  km: number;
  services: ServiceItem[];
  status: 'done' | 'current' | 'upcoming';
  expectedDate?: Date;
}

export function buildStages(currentKm: number, dailyRate: number, disabled: string[] = [], count = 6, step = 10000): Stage[] {
  const items = GENERIC_TEMPLATE.items.filter((i) => i.everyKm && !disabled.includes(i.id));
  const currentStage = Math.max(step, Math.ceil(Math.max(currentKm, 1) / step) * step);
  const first = Math.max(step, currentStage - step * 2);
  const stages: Stage[] = [];
  for (let k = first; stages.length < count; k += step) {
    const services = items.filter((i) => k % i.everyKm! === 0);
    if (!services.length) continue;
    const status: Stage['status'] = k < currentStage ? 'done' : k === currentStage ? 'current' : 'upcoming';
    const expectedDate = k > currentKm && dailyRate > 0 ? addDays(new Date(), (k - currentKm) / dailyRate) : undefined;
    stages.push({ km: k, services, status, expectedDate });
  }
  return stages;
}
