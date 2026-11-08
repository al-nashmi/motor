// نموذج المركبة — S03 (موجّه) وS04 (كامل)
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { DOC_LABELS, MAIN_DOCS, MAKES } from '@/lib/catalog';
import { parseNum } from '@/lib/format';
import { normalizePlate, plateKey, validatePlate } from '@/lib/plates';
import { useTheme } from '@/lib/theme';
import type { DocType, Vehicle } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { Button, Chip, ChipRow, DateField, Field, Plate, Row, Txt } from './ui';

export interface VehicleFormValues {
  make: string;
  model: string;
  year: string;
  plateNumbers: string;
  plateLetters: string;
  km: string;
  nickname: string;
  vin: string;
  docs: Partial<Record<DocType, string>>;
}

export function VehicleForm({
  initial,
  mode,
  onSubmit,
  submitLabel,
}: {
  initial?: Vehicle;
  mode: 'guided' | 'full' | 'edit';
  submitLabel: string;
  onSubmit: (values: { make: string; model: string; year: number; plateNumbers: string; plateLetters: string; km?: number; nickname?: string; vin?: string; docs: Partial<Record<DocType, string>> }) => void;
}) {
  const { c } = useTheme();
  const vehicles = useStore((s) => s.vehicles);
  const [v, setV] = useState<VehicleFormValues>({
    make: initial?.make ?? '',
    model: initial?.model ?? '',
    year: initial ? String(initial.year) : '',
    plateNumbers: initial?.plateNumbers ?? '',
    plateLetters: initial?.plateLetters ?? '',
    km: '',
    nickname: initial?.nickname ?? '',
    vin: initial?.vin ?? '',
    docs: Object.fromEntries((initial?.documents ?? []).filter((d) => d.type !== 'other').map((d) => [d.type, d.expiry])),
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const set = (k: keyof VehicleFormValues, val: string) => setV((p) => ({ ...p, [k]: val }));

  const makeSuggestions = useMemo(() => {
    const q = v.make.trim();
    const all = Object.keys(MAKES);
    if (!q) return all;
    return all.filter((m) => m.includes(q) && m !== q);
  }, [v.make]);
  const modelSuggestions = useMemo(() => {
    const list = MAKES[v.make.trim()] ?? [];
    const q = v.model.trim();
    return q ? list.filter((m) => m.includes(q) && m !== q) : list;
  }, [v.make, v.model]);

  const thisYear = new Date().getFullYear();
  const plate = normalizePlate(v.plateNumbers, v.plateLetters);
  const plateValid = !validatePlate(v.plateNumbers, v.plateLetters);

  const submit = () => {
    const e: Record<string, string | null> = {};
    if (!v.make.trim()) e.make = 'اختر الشركة المصنعة';
    if (!v.model.trim()) e.model = 'أدخل الموديل';
    const year = parseNum(v.year);
    if (!year || year < 1970 || year > thisYear + 1) e.year = `سنة الصنع بين 1970 و${thisYear + 1}`;
    const pErr = validatePlate(v.plateNumbers, v.plateLetters);
    if (pErr) e.plate = pErr;
    const km = v.km.trim() ? parseNum(v.km) : undefined;
    if (km != null && (isNaN(km) || km < 0 || km > 2_000_000)) e.km = 'قراءة غير منطقية';
    if (mode !== 'edit' || v.vin) {
      if (v.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(v.vin.trim())) e.vin = 'رقم الهيكل 17 خانة (حروف لاتينية وأرقام)';
    }
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;

    const key = plateKey(plate.plateNumbers, plate.plateLetters);
    const dup = vehicles.find((x) => x.id !== initial?.id && !x.deletedAt && plateKey(x.plateNumbers, x.plateLetters) === key);
    const go = () =>
      onSubmit({
        make: v.make.trim(),
        model: v.model.trim(),
        year: year!,
        plateNumbers: plate.plateNumbers,
        plateLetters: plate.plateLetters,
        km,
        nickname: v.nickname.trim() || undefined,
        vin: v.vin.trim().toUpperCase() || undefined,
        docs: v.docs,
      });
    if (dup) {
      Alert.alert('مركبة مكررة؟', `توجد مركبة بنفس رقم اللوحة (${dup.make} ${dup.model}). هل تريد المتابعة على أي حال؟`, [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'متابعة', onPress: go },
      ]);
    } else go();
  };

  return (
    <View style={{ gap: 14 }}>
      <Field label="الشركة المصنعة" placeholder="مثلاً: تويوتا" value={v.make} onChangeText={(t) => set('make', t)} error={errors.make} />
      {makeSuggestions.length > 0 && (
        <ChipRow>
          {makeSuggestions.slice(0, 20).map((m) => (
            <Chip key={m} label={m} onPress={() => setV((p) => ({ ...p, make: m, model: '' }))} />
          ))}
        </ChipRow>
      )}
      <Field label="الموديل" placeholder="مثلاً: كامري" value={v.model} onChangeText={(t) => set('model', t)} error={errors.model} />
      {modelSuggestions.length > 0 && (
        <ChipRow>
          {modelSuggestions.map((m) => (
            <Chip key={m} label={m} onPress={() => set('model', m)} />
          ))}
        </ChipRow>
      )}
      <Field label="سنة الصنع" placeholder={String(thisYear)} keyboardType="number-pad" maxLength={4} value={v.year} onChangeText={(t) => set('year', t)} error={errors.year} />

      <Txt v="bodyBold">رقم اللوحة</Txt>
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field label="الأرقام" placeholder="1234" keyboardType="number-pad" maxLength={4} value={v.plateNumbers} onChangeText={(t) => set('plateNumbers', t)} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="الحروف" placeholder="أ ب ج" value={v.plateLetters} onChangeText={(t) => set('plateLetters', t)} maxLength={8} autoCapitalize="characters" />
        </View>
      </Row>
      {errors.plate ? (
        <Txt v="caption" color={c.dangerText}>
          {errors.plate}
        </Txt>
      ) : (
        <Txt v="caption" color={c.muted}>
          الحروف المعتمدة: ا ب ح د ر س ص ط ع ق ك ل م ن هـ و ى (أو مقابلها اللاتيني)
        </Txt>
      )}
      {plateValid ? <Plate numbers={plate.plateNumbers} letters={plate.plateLetters} /> : null}

      {mode !== 'edit' && (
        <Field
          label="قراءة العداد الحالية (اختياري الآن)"
          placeholder="مثلاً: 85000"
          keyboardType="number-pad"
          suffix="كم"
          value={v.km}
          onChangeText={(t) => set('km', t)}
          error={errors.km}
          hint="نقطة الأساس لتذكيرات الصيانة المبنية على المسافة"
        />
      )}

      {mode !== 'guided' && (
        <>
          <Field label="اسم مختصر للمركبة (اختياري)" placeholder="مثلاً: سيارة العائلة" value={v.nickname} onChangeText={(t) => set('nickname', t)} maxLength={30} />
          <Field label="رقم الهيكل VIN (اختياري)" placeholder="17 خانة" autoCapitalize="characters" maxLength={17} value={v.vin} onChangeText={(t) => set('vin', t)} error={errors.vin} />
        </>
      )}

      {mode !== 'edit' && (
        <>
          <Txt v="title2" style={{ marginTop: 6 }}>
            تواريخ انتهاء الوثائق
          </Txt>
          <Txt color={c.muted}>أدخل ما تعرفه الآن أو تخطَّ — نذكّرك قبل الانتهاء بـ 30 و15 و7 أيام.</Txt>
          {MAIN_DOCS.map((t) => (
            <DateField
              key={t}
              label={DOC_LABELS[t]}
              optional
              value={v.docs[t]}
              minimumDate={new Date(2000, 0, 1)}
              onChange={(iso) => setV((p) => ({ ...p, docs: { ...p.docs, [t]: iso } }))}
            />
          ))}
        </>
      )}

      <Button title={submitLabel} onPress={submit} style={{ marginTop: 8 }} />
      {mode === 'guided' ? (
        <Txt v="caption" center color={c.muted}>
          الشركة والموديل والسنة ورقم اللوحة تكفي للبدء.
        </Txt>
      ) : null}
    </View>
  );
}
