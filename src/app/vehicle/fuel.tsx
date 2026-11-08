// تتبع الوقود وكفاءة الاستهلاك (7.7) — جدول 18
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Banner, Button, Card, DateField, Field, Row, Screen, SectionTitle, StatusPill, SwitchRow, Txt } from '@/components/ui';
import { fmtDate, todayISO } from '@/lib/dates';
import { fmtKm, fmtNum, fmtSAR, parseNum } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { useInsights } from '@/store/useInsights';
import { useStore } from '@/store/useStore';

export default function Fuel() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ vehicleId: string; add?: string }>();
  const ins = useInsights(params.vehicleId);
  const fills = useStore((s) => s.fuel);
  const addFuel = useStore((s) => s.addFuel);
  const deleteFuel = useStore((s) => s.deleteFuel);
  const calendar = useStore((s) => s.settings.calendar);
  const mine = useMemo(() => fills.filter((f) => f.vehicleId === params.vehicleId).sort((a, b) => b.km - a.km), [fills, params.vehicleId]);
  const lastPrice = mine[0]?.pricePerLiter;

  const [adding, setAdding] = useState(params.add === '1');
  const [date, setDate] = useState<string | undefined>(todayISO());
  const [km, setKm] = useState('');
  const [liters, setLiters] = useState('');
  const [total, setTotal] = useState('');
  const [price, setPrice] = useState(lastPrice ? String(lastPrice) : '2.33');
  const [full, setFull] = useState(true);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!ins) return null;
  const { fuel, odo, vehicle } = ins;

  // في التعبئة الكاملة يكفي الإجمالي وسعر اللتر وتُحسب الكمية
  const p = parseNum(price);
  const t = parseNum(total);
  const l = parseNum(liters);
  const computedLiters = !isNaN(l) && l > 0 ? l : !isNaN(t) && !isNaN(p) && p > 0 ? t / p : NaN;
  const computedTotal = !isNaN(t) && t > 0 ? t : !isNaN(l) && !isNaN(p) ? l * p : NaN;

  const save = () => {
    const k = parseNum(km);
    if (isNaN(k) || k <= 0) return setError('قراءة العداد مطلوبة');
    if (isNaN(computedLiters) || computedLiters <= 0) return setError('أدخل الكمية أو الإجمالي مع سعر اللتر');
    if (odo.lastKm != null && k < odo.lastKm - 1 && date === todayISO()) {
      return setError(`القراءة أقل من آخر قراءة مسجلة (${fmtNum(odo.lastKm)})`);
    }
    addFuel({
      vehicleId: vehicle.id,
      date: date ?? todayISO(),
      km: k,
      liters: Math.round(computedLiters * 100) / 100,
      total: Math.round(computedTotal * 100) / 100,
      pricePerLiter: isNaN(p) ? computedTotal / computedLiters : p,
      full,
      note: note.trim() || undefined,
    });
    setAdding(false);
    setKm('');
    setLiters('');
    setTotal('');
    setNote('');
    setError(null);
  };

  const maxEff = Math.max(...fuel.samples.map((s) => s.kmPerL), 1);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Txt v="title2">
          {vehicle.make} {vehicle.model}
        </Txt>
        <Row gap={10}>
          <Card style={{ flex: 1 }}>
            <Txt v="caption" color={c.muted}>
              متوسط الكفاءة
            </Txt>
            <Txt v="title1">{fuel.average != null ? `${fmtNum(fuel.average, 1)}` : '—'}</Txt>
            <Txt v="caption" color={c.muted}>
              كم/لتر
            </Txt>
          </Card>
          <Card style={{ flex: 1 }}>
            <Txt v="caption" color={c.muted}>
              آخر تعبئة
            </Txt>
            <Txt v="title1">{fuel.latest != null ? fmtNum(fuel.latest, 1) : '—'}</Txt>
            <Txt v="caption" color={c.muted}>
              كم/لتر
            </Txt>
          </Card>
          <Card style={{ flex: 1 }}>
            <Txt v="caption" color={c.muted}>
              إنفاق الوقود
            </Txt>
            <Txt v="title2">{fmtSAR(fuel.totalSpend)}</Txt>
            <Txt v="caption" color={c.muted}>
              {fmtNum(fuel.totalLiters)} لتر
            </Txt>
          </Card>
        </Row>

        {fuel.alert && fuel.dropPct != null ? (
          <Banner
            severity="warning"
            title={`انخفضت الكفاءة ${fmtNum(fuel.dropPct)}% عن متوسط مركبتك`}
            body="احتمالات عملية: ضغط الكفرات، فلتر الهواء، أو حاجة لصيانة المحرك. إن كان السبب طرقاً وعرة أو حمولة ثقيلة فأضف ملاحظة للتعبئة."
          />
        ) : null}

        {fuel.samples.length >= 2 ? (
          <Card style={{ gap: 8 }}>
            <Txt v="bodyBold">اتجاه الكفاءة (كم/لتر)</Txt>
            <Row style={{ alignItems: 'flex-end', height: 110 }} gap={6}>
              {fuel.samples.slice(-10).map((s, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Txt v="badge" color={c.muted}>
                    {fmtNum(s.kmPerL, 1)}
                  </Txt>
                  <View style={{ width: '100%', height: Math.max(6, (s.kmPerL / maxEff) * 80), backgroundColor: c.success, borderRadius: 4 }} />
                </View>
              ))}
            </Row>
          </Card>
        ) : (
          <Txt v="caption" color={c.muted}>
            سجّل تعبئتين كاملتين على الأقل لحساب كفاءة الاستهلاك بين التعبئتين — دون أي جهاز إضافي.
          </Txt>
        )}

        {!adding ? (
          <Button title="تسجيل تعبئة" icon="add-circle" onPress={() => setAdding(true)} />
        ) : (
          <Card style={{ gap: 12 }}>
            <Txt v="title2">تعبئة جديدة</Txt>
            <DateField label="التاريخ" value={date} onChange={setDate} maximumDate={new Date()} />
            <Field label="قراءة العداد" suffix="كم" keyboardType="number-pad" value={km} onChangeText={setKm} placeholder={odo.km != null ? `نحو ${odo.km}` : ''} />
            <Row gap={10} style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Field label="الإجمالي" suffix="ر.س" keyboardType="decimal-pad" value={total} onChangeText={setTotal} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="سعر اللتر" suffix="ر.س" keyboardType="decimal-pad" value={price} onChangeText={setPrice} hint="من آخر قيمة" />
              </View>
            </Row>
            <Field
              label="الكمية (اختياري)"
              suffix="لتر"
              keyboardType="decimal-pad"
              value={liters}
              onChangeText={setLiters}
              hint={!liters && !isNaN(computedLiters) ? `محسوبة: ${fmtNum(computedLiters, 2)} لتر` : undefined}
            />
            <SwitchRow label="التعبئة كاملة؟" hint="ضرورية لدقة حساب الكفاءة؛ الجزئية تُسجّل للتكلفة فقط" value={full} onChange={setFull} />
            <Field label="ملاحظة" value={note} onChangeText={setNote} placeholder="مثلاً: طرق جبلية، حمل ثقيل" />
            {error ? <Txt color={c.dangerText}>{error}</Txt> : null}
            <Row gap={10}>
              <Button title="حفظ" style={{ flex: 1 }} onPress={save} />
              <Button title="إلغاء" variant="secondary" onPress={() => setAdding(false)} />
            </Row>
          </Card>
        )}

        {mine.length > 0 && <SectionTitle title="سجل التعبئات" />}
        {mine.map((f) => (
          <Pressable
            key={f.id}
            onLongPress={() =>
              Alert.alert('حذف التعبئة؟', undefined, [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'حذف', style: 'destructive', onPress: () => deleteFuel(f.id) },
              ])
            }
          >
            <Card style={{ paddingVertical: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View>
                  <Txt v="bodyBold">
                    {fmtNum(f.liters, 1)} لتر · {fmtSAR(f.total)}
                  </Txt>
                  <Txt v="caption" color={c.muted}>
                    {fmtDate(f.date, calendar)} · {fmtKm(f.km)}
                    {f.note ? ` · ${f.note}` : ''}
                  </Txt>
                </View>
                {!f.full ? <StatusPill severity="info" label="جزئية" /> : null}
              </Row>
            </Card>
          </Pressable>
        ))}
        {mine.length > 0 ? (
          <Txt v="caption" center color={c.muted}>
            اضغط مطولاً على تعبئة لحذفها
          </Txt>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
