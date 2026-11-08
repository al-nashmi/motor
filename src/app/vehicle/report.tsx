// الرحلة الرابعة: تصدير تقرير العناية PDF
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Card, Chip, ChipRow, Field, Screen, SwitchRow, Txt } from '@/components/ui';
import { addMonths, toISODate } from '@/lib/dates';
import { fmtNum, fmtSAR } from '@/lib/format';
import { generateAndShareReport, printReport, type ReportOptions } from '@/lib/report';
import { useTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

type Range = 'all' | '1y' | '2y';

export default function Report() {
  const { c } = useTheme();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicle = useStore((s) => s.vehicles.find((v) => v.id === vehicleId));
  const records = useStore((s) => s.records);
  const points = useStore((s) => s.odometer);
  const user = useStore((s) => s.user);
  const calendar = useStore((s) => s.settings.calendar);
  const archive = useStore((s) => s.archiveVehicle);
  const [range, setRange] = useState<Range>('all');
  const [includeItems, setIncludeItems] = useState(true);
  const [includeOdometer, setIncludeOdometer] = useState(true);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [withOwner, setWithOwner] = useState(false);
  const [ownerName, setOwnerName] = useState(user?.name ?? '');
  const [ownerPhone, setOwnerPhone] = useState(user?.phone.replace('+966', '0') ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!vehicle) return null;
  const fromDate = range === '1y' ? toISODate(addMonths(new Date(), -12)) : range === '2y' ? toISODate(addMonths(new Date(), -24)) : undefined;
  const selected = records.filter((r) => r.vehicleId === vehicle.id && (!fromDate || r.date >= fromDate));
  const opts: ReportOptions = { fromDate, includeItems, includeOdometer, includeDocs, ownerName: withOwner ? ownerName : undefined, ownerPhone: withOwner ? ownerPhone : undefined, calendar };

  const generate = async () => {
    setBusy(true);
    try {
      await generateAndShareReport(vehicle, records, points, opts);
      setDone(true);
    } catch {
      Alert.alert('تعذر إنشاء التقرير', 'حاول مرة أخرى بعد لحظات.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Txt v="title2">
        {vehicle.make} {vehicle.model} {vehicle.year}
      </Txt>
      <Txt color={c.muted}>تقرير موحّد برقم مرجعي وتاريخ توليد ثابت — يجيب عن سؤال المشتري الأول: ما دليل العناية؟</Txt>

      <Txt v="bodyBold">الفترة</Txt>
      <ChipRow>
        <Chip label="كامل السجل" selected={range === 'all'} onPress={() => setRange('all')} />
        <Chip label="آخر سنتين" selected={range === '2y'} onPress={() => setRange('2y')} />
        <Chip label="آخر سنة" selected={range === '1y'} onPress={() => setRange('1y')} />
      </ChipRow>

      <Card>
        <Txt v="bodyBold">معاينة المحتوى</Txt>
        <Txt color={c.muted}>
          {fmtNum(selected.length)} عملية · إجمالي {fmtSAR(selected.reduce((s, r) => s + r.total, 0))} · {fmtNum(selected.filter((r) => r.source !== 'manual').length)} موثّقة بفاتورة
        </Txt>
      </Card>

      <Card>
        <SwitchRow label="تفاصيل البنود" hint="القطع وأجور اليد والضريبة لكل عملية" value={includeItems} onChange={setIncludeItems} />
        <SwitchRow label="سجل قراءات العداد" value={includeOdometer} onChange={setIncludeOdometer} />
        <SwitchRow label="حالة الوثائق" value={includeDocs} onChange={setIncludeDocs} />
        <SwitchRow label="بيانات المالك" hint="اختياري بالكامل" value={withOwner} onChange={setWithOwner} />
        {withOwner && (
          <>
            <Field label="الاسم" value={ownerName} onChangeText={setOwnerName} />
            <Field label="رقم التواصل" value={ownerPhone} onChangeText={setOwnerPhone} keyboardType="phone-pad" />
          </>
        )}
      </Card>

      <Button title="إنشاء التقرير ومشاركته" icon="share-outline" loading={busy} onPress={generate} />
      <Button title="طباعة" icon="print-outline" variant="secondary" onPress={() => printReport(vehicle, records, points, opts)} />

      {done && !vehicle.archivedAt ? (
        <Card style={{ gap: 8 }}>
          <Txt v="bodyBold">هل بعت المركبة؟</Txt>
          <Txt color={c.muted}>الأرشفة تحفظ السجل للأغراض الشخصية دون إقحامه في الكراج النشط والتذكيرات.</Txt>
          <Button
            title="أرشفة المركبة"
            variant="secondary"
            small
            onPress={() => {
              archive(vehicle.id, true);
              router.dismissTo('/(tabs)');
            }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
