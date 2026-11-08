// تفاصيل المكوّن وتعديل العمر الافتراضي (7.3)
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Card, Button, Field, ProgressBar, Row, Screen, StatusPill, Txt } from '@/components/ui';
import { componentLife, lastReset } from '@/lib/engine';
import { OIL_DISCLAIMER, suggestOil } from '@/lib/oil';
import { COMPONENT_LABELS, COMPONENT_TIPS, OIL_BASE_LABELS } from '@/lib/catalog';
import { fmtDate, relativeDays } from '@/lib/dates';
import { fmtKm, fmtNum, parseNum } from '@/lib/format';
import { radius, useTheme } from '@/lib/theme';
import type { ComponentType } from '@/lib/types';
import { useInsights } from '@/store/useInsights';
import { useStore } from '@/store/useStore';

export default function ComponentScreen() {
  const { c } = useTheme();
  const { vehicleId, type } = useLocalSearchParams<{ vehicleId: string; type: ComponentType }>();
  const ins = useInsights(vehicleId);
  const update = useStore((s) => s.updateVehicle);
  const calendar = useStore((s) => s.settings.calendar);
  const records = useStore((s) => s.records);
  const cs = ins?.comps.find((x) => x.type === type);
  const [km, setKm] = useState(cs?.life.km ? String(cs.life.km) : '');
  const [months, setMonths] = useState(cs?.life.months ? String(cs.life.months) : '');
  if (!ins || !cs) return null;
  // الافتراضي المحسوب بدون تعديلات المستخدم (للفلتر: ضعف فترة الزيت)
  const def = componentLife({ ...ins.vehicle, componentOverrides: {} }, type, records);
  const lastOil = type === 'oil' || type === 'oil_filter' ? lastReset(records, ins.vehicle.id, 'oil') : undefined;
  const oilFromRecord = !!lastOil?.oil?.intervalKm;
  const oilTip = type === 'oil' ? suggestOil(ins.vehicle.make, ins.vehicle.model, ins.vehicle.year) : null;
  const warranty = ins.warranties.find((w) => w.type === type);
  const canWarranty = type === 'tires' || type === 'battery';

  const saveLife = () => {
    const k = km.trim() ? parseNum(km) : undefined;
    const m = months.trim() ? parseNum(months) : undefined;
    update(ins.vehicle.id, { componentOverrides: { ...ins.vehicle.componentOverrides, [type]: { km: k && k > 0 ? k : undefined, months: m && m > 0 ? m : undefined } } });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: COMPONENT_LABELS[type] }} />
      <Screen>
        <Card style={{ gap: 8 }}>
          {cs.known ? (
            <>
              <StatusPill severity={cs.severity} label={cs.severity === 'danger' ? 'متجاوز الموعد' : cs.severity === 'warning' ? 'يقترب من الانتهاء' : 'سليم'} />
              <Txt v="display">{fmtNum(Math.round(cs.ratio * 100))}% من العمر</Txt>
              <ProgressBar ratio={cs.ratio} severity={cs.severity} />
              <Txt>
                آخر استبدال: {fmtDate(cs.lastDate!, calendar)} عند {fmtKm(cs.lastKm!)}
              </Txt>
              {cs.dueDate ? <Txt>الموعد المتوقع: {fmtDate(cs.dueDate, calendar)}</Txt> : null}
              <Txt v="caption" color={c.muted}>
                أساس الحساب: {cs.basis}
                {ins.odo.estimated ? ' — العداد مقدَّر' : ''}
              </Txt>
            </>
          ) : (
            <>
              <Txt v="title2">لم يُسجَّل أي استبدال بعد</Txt>
              <Txt color={c.muted}>سجّل آخر عملية (حتى لو قديمة) ليبدأ تتبع عمر المكوّن.</Txt>
            </>
          )}
        </Card>
        {lastOil?.oil ? (
          <Card style={{ gap: 4 }}>
            <Txt v="bodyBold">آخر زيت مسجّل</Txt>
            <Txt>
              {[lastOil.oil.viscosity, lastOil.oil.base ? OIL_BASE_LABELS[lastOil.oil.base] : '', lastOil.oil.brand].filter(Boolean).join(' · ') || 'النوع غير مسجّل'}
            </Txt>
            <Txt color={c.muted}>
              فترة الزيت: {fmtKm(lastOil.oil.intervalKm)} أو {lastOil.oil.intervalMonths} أشهر · الفلتر {lastOil.oil.filterChanged ? 'تغيّر' : 'لم يتغيّر'} في هذه العملية
            </Txt>
          </Card>
        ) : null}
        {type === 'oil_filter' ? (
          <Card style={{ gap: 4 }}>
            <Txt v="bodyBold">مرة نعم ومرة لا</Txt>
            <Txt color={c.muted}>
              نحسب موعد الفلتر بضعف فترة الزيت ({def.km ? fmtKm(def.km) : ''}) — أي يُغيّر مع كل تبديلة زيت ثانية. عند تسجيل تبديل الزيت حدّد هل تغيّر الفلتر.
            </Txt>
          </Card>
        ) : null}
        {oilTip ? (
          <View style={{ backgroundColor: c.successBg, borderRadius: radius.md, padding: 12, gap: 4 }}>
            <Txt v="bodyBold" color={c.successText}>
              الزيت المقترح لـ {ins.vehicle.make} {ins.vehicle.model} {ins.vehicle.year}
            </Txt>
            <Txt color={c.successText}>
              {oilTip.viscosity}
              {oilTip.alt ? ` (أو ${oilTip.alt})` : ''} · {OIL_BASE_LABELS[oilTip.base]} · كل {fmtKm(oilTip.intervalKm)}
            </Txt>
            {oilTip.spec || oilTip.note ? (
              <Txt v="caption" color={c.successText}>
                {[oilTip.spec ? `المواصفة: ${oilTip.spec}` : '', oilTip.note ?? ''].filter(Boolean).join(' — ')}
              </Txt>
            ) : null}
            <Txt v="caption" color={c.muted}>
              {OIL_DISCLAIMER}
            </Txt>
          </View>
        ) : null}
        {canWarranty ? (
          <Card accent={warranty ? (warranty.active ? (warranty.severity === 'warning' ? c.warning : c.success) : c.muted) : undefined} style={{ gap: 4 }}>
            <Txt v="bodyBold">🛡️ الضمان</Txt>
            {warranty ? (
              <>
                <StatusPill severity={warranty.active ? warranty.severity : 'info'} label={warranty.active ? 'ساري' : 'منتهٍ'} />
                <Txt>
                  {warranty.active ? 'ينتهي' : 'انتهى'} {fmtDate(warranty.expiry, calendar)} ({relativeDays(warranty.daysLeft)}) · مدة الضمان {warranty.months} شهراً
                </Txt>
                <Txt v="caption" color={c.muted}>
                  {warranty.active ? 'احتفظ بفاتورة الشراء — هي إثبات الضمان عند المطالبة.' : 'سجّل الضمان مع القطعة القادمة لنذكّرك قبل انتهائه.'}
                </Txt>
                <Button title="عرض الفاتورة/العملية" variant="ghost" small onPress={() => router.push(`/record/${warranty.recordId}`)} />
              </>
            ) : (
              <Txt color={c.muted}>لا يوجد ضمان مسجّل لآخر {COMPONENT_LABELS[type]}. أضفه من تعديل العملية أو مع الاستبدال القادم.</Txt>
            )}
          </Card>
        ) : null}
        <Button title="سجّل استبدالاً" icon="add-circle" onPress={() => router.push(`/record/new?vehicleId=${ins.vehicle.id}&component=${type}`)} />
        <Card>
          <Txt v="bodyBold">💡 نصيحة</Txt>
          <Txt color={c.muted}>{COMPONENT_TIPS[type]}</Txt>
        </Card>

        <Txt v="title2">العمر الافتراضي لهذه المركبة</Txt>
        <Txt color={c.muted}>
          الافتراضي: {def.km ? fmtKm(def.km) : ''}
          {def.km && def.months ? ' أو ' : ''}
          {def.months ? `${def.months} شهراً` : ''} (أيّهما أقرب). عدّله إن كان استخدامك خاصاً (قيادة صحراوية شاقة مثلاً).
          {type === 'oil' && oilFromRecord ? ' ملاحظة: فترة الزيت تُؤخذ من آخر تبديل مسجّل، وتتقدّم على هذا الإعداد.' : ''}
        </Txt>
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Field label="بالمسافة" suffix="كم" keyboardType="number-pad" value={km} onChangeText={setKm} placeholder="—" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="بالزمن" suffix="شهر" keyboardType="number-pad" value={months} onChangeText={setMonths} placeholder="—" />
          </View>
        </Row>
        <Button title="حفظ العمر الافتراضي" variant="secondary" onPress={saveLife} />
        <Button
          title="استعادة الافتراضي"
          variant="ghost"
          onPress={() => {
            const o = { ...ins.vehicle.componentOverrides };
            delete o[type];
            update(ins.vehicle.id, { componentOverrides: o });
            router.back();
          }}
        />
      </Screen>
    </>
  );
}
