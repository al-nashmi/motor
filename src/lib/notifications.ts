// جدولة التذكيرات المحلية — جدول 19
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { computeInsights } from '@/store/useInsights';
import type { State } from '@/store/useStore';
import { COMPONENT_LABELS, DOC_LABELS } from './catalog';
import { addDays, addMonths, parseDate } from './dates';

const MAX_SCHEDULED = 60; // حد iOS = 64 إشعاراً مجدولاً

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'تذكيرات موتر',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

interface Planned {
  date: Date;
  title: string;
  body: string;
  url: string;
}

/** الإرسال خلال فترة النشاط الافتراضية: 9 صباحاً */
function atMorning(d: Date) {
  const r = new Date(d);
  r.setHours(9, 0, 0, 0);
  return r;
}

export function planReminders(s: State, now = new Date()): Planned[] {
  const out: Planned[] = [];
  const vehicles = s.vehicles.filter((v) => !v.deletedAt && !v.archivedAt);
  for (const v of vehicles) {
    const name = `${v.make} ${v.model}`;
    // الوثائق: 30 و15 و7 أيام قبل، يوم الانتهاء، ثم أسبوعياً بعده (4 أسابيع)
    for (const d of v.documents) {
      const exp = parseDate(d.expiry);
      const label = d.type === 'other' && d.title ? d.title : DOC_LABELS[d.type];
      const url = `/vehicle/document?vehicleId=${v.id}&docId=${d.id}`;
      for (const lead of s.settings.docLeadDays) {
        out.push({ date: atMorning(addDays(exp, -lead)), title: `${label} — ${name}`, body: `تنتهي بعد ${lead} يوماً. جهّز التجديد الآن.`, url });
      }
      out.push({ date: atMorning(exp), title: `${label} تنتهي اليوم`, body: `${name} — جدّد وحدّث التاريخ في موتر.`, url });
      for (let w = 1; w <= 4; w++) {
        out.push({ date: atMorning(addDays(exp, 7 * w)), title: `${label} منتهية`, body: `${name} — لا تُقَد المركبة حتى التجديد.`, url });
      }
    }
    const ins = computeInsights(v, s.odometer, s.records, s.fuel, s.settings.defaultDailyKm);
    // تذكير العداد الدوري
    if (ins.odo.lastDate) {
      out.push({
        date: atMorning(addMonths(parseDate(ins.odo.lastDate), s.settings.odometerReminderMonths)),
        title: 'حدّث قراءة العداد',
        body: `${name} — قراءة حديثة تحافظ على دقة التذكيرات.`,
        url: `/vehicle/odometer?vehicleId=${v.id}`,
      });
    }
    // المكوّنات: عند الاستحقاق المتوقع
    for (const c of ins.comps) {
      if (!c.known || !c.dueDate) continue;
      out.push({
        date: atMorning(c.dueDate),
        title: `${COMPONENT_LABELS[c.type]} — ${name}`,
        body: 'حان الموعد المتوقع للاستبدال. سجّل العملية بعد تنفيذها.',
        url: `/vehicle/${v.id}`,
      });
    }
    // الضمان: قبل الانتهاء بـ 30 و7 أيام
    for (const w of ins.warranties) {
      const exp = parseDate(w.expiry);
      for (const lead of [30, 7]) {
        out.push({
          date: atMorning(addDays(exp, -lead)),
          title: `ضمان ${COMPONENT_LABELS[w.type]} — ${name}`,
          body: `ينتهي بعد ${lead} يوماً. إن لاحظت مشكلة فافحصها قبل انتهاء الضمان.`,
          url: `/vehicle/component?vehicleId=${v.id}&type=${w.type}`,
        });
      }
    }
  }
  return out.filter((p) => p.date.getTime() > now.getTime() + 60000).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function rescheduleAll(s: State) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!s.settings.notifications || !s.user) return;
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return;
    // دمج تذكيرات اليوم الواحد في إشعار واحد (الحد الأقصى للضجيج)
    const byDay = new Map<string, Planned[]>();
    for (const p of planReminders(s)) {
      const k = p.date.toDateString();
      byDay.set(k, [...(byDay.get(k) ?? []), p]);
    }
    let n = 0;
    for (const group of byDay.values()) {
      if (n >= MAX_SCHEDULED) break;
      const first = group[0];
      const content =
        group.length === 1
          ? { title: first.title, body: first.body, data: { url: first.url } }
          : { title: `لديك ${group.length} تذكيرات اليوم`, body: group.map((g) => `• ${g.title}`).join('\n'), data: { url: '/reminders' } };
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: first.date, channelId: 'reminders' },
      });
      n++;
    }
  } catch (e) {
    console.warn('reschedule failed', e);
  }
}
