// S10 — تسجيل عملية جديدة (الرحلة الثانية) + شاشة المراجعة (جدول 16 و17)
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { Banner, Button, Card, Chip, ChipRow, DateField, Field, IconButton, Row, Screen, SectionTitle, SwitchRow, Txt } from '@/components/ui';
import { COMPONENT_LABELS, OIL_BASE_LABELS, OIL_INTERVALS, OIL_VISCOSITIES, oilMonthsFor, RECORD_CATEGORY, RECORD_DEFAULT_RESETS, RECORD_ICONS, RECORD_LABELS, WARRANTY_OPTIONS } from '@/lib/catalog';
import { addMonths, fmtDate, parseDate, todayISO, toISODate } from '@/lib/dates';
import { ALL_COMPONENTS, componentLife, lastReset } from '@/lib/engine';
import { OIL_DISCLAIMER, suggestOil } from '@/lib/oil';
import { persistImage } from '@/lib/files';
import { fmtKm, fmtNum, fmtSAR, parseNum, uid } from '@/lib/format';
import { extractInvoice, ocrConfigured, type OcrResult } from '@/lib/ocr';
import { radius, useTheme } from '@/lib/theme';
import type { ComponentType, LineItem, OilBase, RecordType } from '@/lib/types';
import type { ZatcaInvoice } from '@/lib/zatca';
import { useDraft, useInsights } from '@/store/useInsights';
import { activeVehicles, useStore } from '@/store/useStore';

type Step = 'type' | 'capture' | 'processing' | 'review' | 'done';
type Conf = 'exact' | 'review' | 'required' | undefined;
type FieldKey = 'shop' | 'date' | 'total' | 'vat';

const COMPONENT_TO_TYPE: Record<ComponentType, RecordType> = {
  oil: 'oil',
  oil_filter: 'oil',
  tires: 'tires',
  battery: 'battery',
  brake_fluid: 'brakes',
  air_filter: 'filters',
  ac_filter: 'filters',
};

function confOf(score: number | undefined): Conf {
  if (score == null) return 'required';
  if (score >= 0.9) return 'exact';
  if (score >= 0.7) return 'review';
  return 'required';
}

export default function NewRecord() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ vehicleId?: string; type?: RecordType; component?: ComponentType; editId?: string }>();
  const vehicles = useStore((s) => s.vehicles);
  const addRecord = useStore((s) => s.addRecord);
  const updateRecord = useStore((s) => s.updateRecord);
  const editing = useStore((s) => s.records.find((r) => r.id === params.editId));
  const allRecords = useStore((s) => s.records);
  const calendar = useStore((s) => s.settings.calendar);
  const active = activeVehicles(vehicles);

  const initialType: RecordType | undefined = editing?.type ?? params.type ?? (params.component ? COMPONENT_TO_TYPE[params.component] : undefined);
  const [vehicleId, setVehicleId] = useState<string | undefined>(editing?.vehicleId ?? params.vehicleId ?? (active.length === 1 ? active[0].id : undefined));
  const [type, setType] = useState<RecordType | undefined>(initialType);
  const [step, setStep] = useState<Step>(editing ? 'review' : vehicleId && initialType ? 'capture' : 'type');
  const ins = useInsights(vehicleId);

  // حقول المراجعة
  const [imageUri, setImageUri] = useState<string | undefined>(editing?.invoiceUri);
  const [source, setSource] = useState<'manual' | 'qr' | 'ocr'>(editing?.source ?? 'manual');
  const [shop, setShop] = useState(editing?.shop ?? '');
  const [vatNumber, setVatNumber] = useState(editing?.vatNumber ?? '');
  const [date, setDate] = useState<string | undefined>(editing?.date ?? todayISO());
  const [total, setTotal] = useState(editing ? String(editing.total) : '');
  const [vat, setVat] = useState(editing?.vat ? String(editing.vat) : '');
  const [km, setKm] = useState(editing ? String(editing.km) : '');
  const [items, setItems] = useState<{ id: string; description: string; price: string; qty: string }[]>(
    editing?.items.filter((i) => i.description !== 'إجمالي الفاتورة').map((i) => ({ id: i.id, description: i.description, price: String(i.price), qty: String(i.qty) })) ?? [],
  );
  // آخر تبديل زيت سابق: لاقتراح الفترة، وهل يُغيّر الفلتر هذه المرة (المعتاد: مرة نعم ومرة لا)
  const prevOil = useMemo(
    () => (vehicleId ? lastReset(allRecords.filter((r) => r.id !== editing?.id), vehicleId, 'oil') : undefined),
    [allRecords, vehicleId, editing?.id],
  );
  const filterDueNow = !prevOil || !prevOil.resets.includes('oil_filter');
  const defaultResets = (t: RecordType): ComponentType[] => {
    const base = RECORD_DEFAULT_RESETS[t];
    // لو تغيّر الفلتر في التبديلة السابقة فالغالب أنه لا يحتاج تغييراً الآن
    return params.component === 'oil_filter' || filterDueNow ? base : base.filter((x) => x !== 'oil_filter');
  };
  const [resets, setResets] = useState<ComponentType[]>(editing?.resets ?? (initialType ? defaultResets(initialType) : []));
  // تفاصيل الزيت
  const [oilKm, setOilKm] = useState<number | null>(editing?.oil?.intervalKm ?? null);
  const [oilCustom, setOilCustom] = useState(editing?.oil && !OIL_INTERVALS.some((o) => o.km === editing.oil!.intervalKm) ? String(editing.oil.intervalKm) : '');
  const [viscosity, setViscosity] = useState<string | undefined>(editing?.oil?.viscosity);
  const [oilBase, setOilBase] = useState<OilBase | undefined>(editing?.oil?.base);
  const [oilBrand, setOilBrand] = useState(editing?.oil?.brand ?? '');
  // الضمان
  const [warrantyMonths, setWarrantyMonths] = useState<number | null>(editing?.warranty?.months ?? null);
  const [warrantyCustom, setWarrantyCustom] = useState(editing?.warranty && !WARRANTY_OPTIONS.includes(editing.warranty.months) ? String(editing.warranty.months) : '');
  const [doneBy, setDoneBy] = useState(editing?.doneBy ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [tireSize, setTireSize] = useState(editing?.tire?.size ?? '');
  const [tireCount, setTireCount] = useState(editing?.tire?.count ? String(editing.tire.count) : '4');
  const [tireDot, setTireDot] = useState(editing?.tire?.dot ?? '');
  const [tireBrand, setTireBrand] = useState(editing?.tire?.brand ?? '');
  const [conf, setConf] = useState<Partial<Record<FieldKey, Conf>>>({});
  const [ocrFailed, setOcrFailed] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [kmError, setKmError] = useState<string | null>(null);

  const chooseType = (t: RecordType) => {
    setType(t);
    setResets(defaultResets(t));
    if (vehicleId) setStep('capture');
  };

  const applyQr = useCallback((qr: ZatcaInvoice) => {
    setSource('qr');
    setShop(qr.sellerName);
    setVatNumber(qr.vatNumber);
    setTotal(String(qr.total));
    setVat(qr.vat ? String(qr.vat) : '');
    const ts = new Date(qr.timestamp);
    const hasDate = !isNaN(ts.getTime());
    if (hasDate) setDate(toISODate(ts));
    setConf({ shop: 'exact', total: 'exact', vat: qr.vat ? 'exact' : undefined, date: hasDate ? 'exact' : 'review' });
  }, []);

  const applyOcr = useCallback((r: OcrResult) => {
    setSource('ocr');
    const cf: Partial<Record<FieldKey, Conf>> = {};
    const take = <T,>(f: { value: T; confidence: number } | undefined, setter: (v: T) => void, key: FieldKey) => {
      const cv = confOf(f?.confidence);
      cf[key] = cv;
      if (f && cv !== 'required') setter(f.value);
    };
    take(r.shop, setShop, 'shop');
    take(r.date, (v) => setDate(v), 'date');
    take(r.total, (v) => setTotal(String(v)), 'total');
    take(r.vat, (v) => setVat(String(v)), 'vat');
    if (r.vatNumber && r.vatNumber.confidence >= 0.7) setVatNumber(r.vatNumber.value);
    if (r.items?.length) setItems(r.items.map((i) => ({ id: uid(), description: i.description, price: String(i.price), qty: String(i.qty ?? 1) })));
    setConf((prev) => ({ ...cf, ...Object.fromEntries(Object.entries(prev).filter(([, v]) => v === 'exact')) }));
  }, []);

  const processImage = useCallback(
    async (uri: string) => {
      setImageUri(uri);
      if (!ocrConfigured() || !type) {
        setOcrFailed(true);
        setStep('review');
        return;
      }
      setStep('processing');
      const r = await extractInvoice(uri, type);
      if (r) {
        applyOcr(r);
        setOcrFailed(false);
      } else setOcrFailed(true);
      setStep('review');
    },
    [type, applyOcr],
  );

  // استلام نتيجة شاشة الماسح
  useFocusEffect(
    useCallback(() => {
      const d = useDraft.getState();
      if (!d.qr && !d.imageUri) return;
      const { qr, imageUri: img } = d;
      d.clear();
      if (qr) {
        applyQr(qr);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      if (img) {
        const persisted = persistImage(img, 'invoices');
        if (qr) {
          setImageUri(persisted);
          setStep('review');
        } else processImage(persisted);
      } else if (qr) setStep('review');
    }, [applyQr, processImage]),
  );

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('الإذن مطلوب', 'نحتاج الوصول للصور لاختيار صورة الفاتورة. يمكنك تفعيله من إعدادات الجهاز.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) processImage(persistImage(res.assets[0].uri, 'invoices'));
  };

  // التحقق المنطقي
  const totalN = parseNum(total);
  const vatN = vat.trim() ? parseNum(vat) : 0;
  const itemsSum = items.reduce((s, i) => s + (parseNum(i.price) || 0) * (parseNum(i.qty) || 1), 0);
  const mismatch = items.length > 0 && !isNaN(totalN) && Math.abs(itemsSum + (isNaN(vatN) ? 0 : vatN) - totalN) > 1;
  const requiredMissing = (Object.entries(conf) as [FieldKey, Conf][]).some(([k, v]) => v === 'required' && !({ shop, date, total, vat } as Record<FieldKey, string | undefined>)[k]?.toString().trim());
  const oilVehicle = ins?.vehicle;
  const oilSuggestion = useMemo(() => (oilVehicle ? suggestOil(oilVehicle.make, oilVehicle.model, oilVehicle.year) : null), [oilVehicle]);
  const hasOil = resets.includes('oil');
  const customOilN = oilCustom.trim() ? parseNum(oilCustom) : NaN;
  // الفترة الفعلية: المختارة ← المخصصة ← فترة الزيت السابق ← المقترحة لهذه السيارة
  const effOilKm = oilKm ?? (!isNaN(customOilN) && customOilN >= 1000 ? customOilN : null) ?? prevOil?.oil?.intervalKm ?? oilSuggestion?.intervalKm ?? 10000;
  const filterChanged = resets.includes('oil_filter');
  const setFilterChanged = (on: boolean) => setResets((p) => (on ? [...p.filter((x) => x !== 'oil_filter'), 'oil_filter'] : p.filter((x) => x !== 'oil_filter')));
  const hasWarrantyPart = resets.includes('tires') || resets.includes('battery') || type === 'tires' || type === 'battery';
  const customWarrantyN = warrantyCustom.trim() ? parseNum(warrantyCustom) : NaN;
  const effWarranty = warrantyMonths ?? (!isNaN(customWarrantyN) && customWarrantyN > 0 ? Math.round(customWarrantyN) : null);
  const warrantyExpiry = effWarranty && date ? toISODate(addMonths(parseDate(date), effWarranty)) : null;

  const canSave = !!vehicleId && !!type && !!date && !isNaN(totalN) && totalN >= 0 && !!km.trim() && !requiredMissing;

  const save = () => {
    if (!vehicleId || !type || !date) return;
    const k = parseNum(km);
    if (isNaN(k) || k < 0) {
      setKmError('قراءة العداد مطلوبة');
      return;
    }
    const doSave = () => {
      const lineItems: LineItem[] = items
        .filter((i) => i.description.trim())
        .map((i) => ({ id: i.id, description: i.description.trim(), category: /يد|أجور|اجور|عمال/.test(i.description) ? 'labor' : RECORD_CATEGORY[type], qty: parseNum(i.qty) || 1, price: parseNum(i.price) || 0 }));
      const payload = {
        vehicleId,
        type,
        date,
        km: k,
        shop: shop.trim() || undefined,
        vatNumber: vatNumber.trim() || undefined,
        total: totalN,
        vat: vat.trim() && !isNaN(vatN) ? vatN : undefined,
        items: lineItems,
        notes: notes.trim() || undefined,
        doneBy: doneBy.trim() || undefined,
        source,
        invoiceUri: imageUri,
        resets,
        oil: hasOil
          ? { intervalKm: effOilKm, intervalMonths: oilMonthsFor(effOilKm), viscosity, base: oilBase, brand: oilBrand.trim() || undefined, filterChanged }
          : undefined,
        warranty: hasWarrantyPart && effWarranty && warrantyExpiry ? { months: effWarranty, expiry: warrantyExpiry } : undefined,
        tire: type === 'tires' ? { size: tireSize.trim() || undefined, count: parseNum(tireCount) || undefined, dot: tireDot.trim() || undefined, brand: tireBrand.trim() || undefined } : undefined,
      };
      if (editing) {
        updateRecord(editing.id, payload);
        router.back();
        return;
      }
      const id = addRecord(payload);
      setSavedId(id);
      setStep('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    };
    const last = ins?.odo.lastKm;
    if (!editing && last != null && k < last && date >= (ins?.odo.lastDate ?? '').slice(0, 10)) {
      Alert.alert('القراءة أقل من السابقة', `القراءة الجديدة أقل من السابقة (${fmtNum(last)}). هل هي صحيحة (استبدال عداد مثلاً)؟`, [
        { text: 'تصحيح', style: 'cancel' },
        { text: 'نعم، صحيحة', onPress: doSave },
      ]);
    } else doSave();
  };

  const nextSuggestion = useMemo(() => {
    if (!ins || !resets.length) return null;
    const t = resets[0];
    const life = t === 'oil' ? { km: effOilKm, months: oilMonthsFor(effOilKm) } : componentLife(ins.vehicle, t, allRecords);
    const k = parseNum(km);
    if (life.km && !isNaN(k)) return `${COMPONENT_LABELS[t]} التالي عند ${fmtKm(k + life.km)}${life.months ? ` أو بعد ${life.months} أشهر` : ''}`;
    if (life.months) return `${COMPONENT_LABELS[t]} التالي بعد نحو ${life.months} شهراً`;
    return null;
  }, [ins, resets, km, effOilKm, allRecords]);

  const vehicleLabel = ins ? `${ins.vehicle.nickname || `${ins.vehicle.make} ${ins.vehicle.model}`} · ${ins.vehicle.plateNumbers} ${ins.vehicle.plateLetters}` : '';

  // ───────── الخطوات ─────────
  if (active.length === 0 && !editing)
    return (
      <Screen>
        <Banner severity="info" title="أضف مركبة أولاً" body="سجلات الصيانة ترتبط بمركبة." action="إضافة مركبة" onAction={() => router.replace('/vehicle/edit')} />
      </Screen>
    );

  if (step === 'done')
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 30 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.successBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={56} color={c.successText} />
          </View>
          <Txt v="title1">تم الحفظ</Txt>
          <Txt center color={c.muted}>
            أُضيفت العملية لسجل {vehicleLabel}، وحُدّثت حالة المكوّنات والتذكيرات.
          </Txt>
        </View>
        {nextSuggestion ? (
          <Card style={{ gap: 4 }}>
            <Txt v="caption" color={c.muted}>
              ما التالي لهذه المركبة
            </Txt>
            <Txt v="title2">{nextSuggestion}</Txt>
            {hasOil ? (
              <Txt v="caption" color={c.muted}>
                {filterChanged ? 'فلتر الزيت تغيّر الآن — المعتاد ألا يحتاج تغييراً في التبديلة القادمة.' : 'فلتر الزيت لم يتغيّر — تذكّر تغييره مع التبديلة القادمة.'}
              </Txt>
            ) : null}
            {warrantyExpiry ? (
              <Txt v="caption" color={c.muted}>
                الضمان ساري حتى {fmtDate(warrantyExpiry, calendar)} وسنذكّرك قبل انتهائه.
              </Txt>
            ) : null}
          </Card>
        ) : null}
        <Button title="تم" onPress={() => router.back()} />
        {savedId ? <Button title="عرض العملية" variant="secondary" onPress={() => router.replace(`/record/${savedId}`)} /> : null}
      </Screen>
    );

  if (step === 'processing')
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          {imageUri ? <Image source={{ uri: imageUri }} style={{ width: 160, height: 220, borderRadius: radius.md, opacity: 0.6 }} /> : null}
          <ActivityIndicator size="large" color={c.success} />
          <Txt v="title2">نستخرج الخدمات والأسعار…</Txt>
          <Txt color={c.muted}>ثوانٍ قليلة. يمكنك المراجعة والتعديل بعدها.</Txt>
        </View>
      </Screen>
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editing ? 'تعديل العملية' : 'تسجيل عملية صيانة' }} />
      <Screen
        footer={
          step === 'review' ? (
            <Button title={editing ? 'حفظ التعديلات' : 'حفظ العملية'} icon="checkmark" onPress={save} disabled={!canSave} />
          ) : undefined
        }
      >
        {/* المركبة */}
        {!editing && (step === 'type' || !params.vehicleId) && active.length > 1 ? (
          <>
            <Txt v="bodyBold">المركبة</Txt>
            <ChipRow>
              {active.map((v) => (
                <Chip key={v.id} label={v.nickname || `${v.make} ${v.model}`} selected={vehicleId === v.id} onPress={() => setVehicleId(v.id)} icon="car" />
              ))}
            </ChipRow>
          </>
        ) : vehicleLabel ? (
          <Txt color={c.muted}>{vehicleLabel}</Txt>
        ) : null}

        {/* النوع */}
        {step === 'type' || step === 'capture' || step === 'review' ? (
          <>
            <Txt v="bodyBold">نوع العملية</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(Object.keys(RECORD_LABELS) as RecordType[]).map((t) => (
                <Chip key={t} label={RECORD_LABELS[t]} icon={RECORD_ICONS[t] as never} selected={type === t} onPress={() => (step === 'review' ? (setType(t), setResets(defaultResets(t))) : chooseType(t))} />
              ))}
            </View>
          </>
        ) : null}
        {step === 'type' && type && !vehicleId ? <Txt color={c.warningText}>اختر المركبة للمتابعة</Txt> : null}
        {step === 'type' && type && vehicleId ? <Button title="متابعة" onPress={() => setStep('capture')} /> : null}

        {/* الالتقاط */}
        {step === 'capture' && type && vehicleId ? (
          <>
            <SectionTitle title="الفاتورة" />
            <Card onPress={() => router.push('/record/scan?mode=qr')}>
              <Row gap={12}>
                <Ionicons name="qr-code" size={30} color={c.successText} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyBold">امسح رمز QR الضريبي</Txt>
                  <Txt v="caption" color={c.muted}>
                    الأدق والأسرع: اسم المركز والرقم الضريبي والتاريخ والإجمالي والضريبة
                  </Txt>
                </View>
              </Row>
            </Card>
            <Card onPress={() => router.push('/record/scan?mode=photo')}>
              <Row gap={12}>
                <Ionicons name="camera" size={30} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyBold">صوّر الفاتورة</Txt>
                  <Txt v="caption" color={c.muted}>
                    {ocrConfigured() ? 'نستخرج البنود والأسعار بالذكاء الاصطناعي' : 'تُحفظ الصورة مع السجل وتُدخل البيانات يدوياً'}
                  </Txt>
                </View>
              </Row>
            </Card>
            <Card onPress={pickFromGallery}>
              <Row gap={12}>
                <Ionicons name="images" size={30} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyBold">اختر من المعرض</Txt>
                  <Txt v="caption" color={c.muted}>
                    صورة فاتورة محفوظة مسبقاً
                  </Txt>
                </View>
              </Row>
            </Card>
            <Button
              title="إدخال يدوي بدون فاتورة"
              variant="ghost"
              onPress={() => {
                setSource('manual');
                setStep('review');
              }}
            />
          </>
        ) : null}

        {/* المراجعة */}
        {step === 'review' ? (
          <>
            {imageUri ? (
              <Pressable onPress={() => setZoom(true)} accessibilityLabel="عرض صورة الفاتورة مكبرة">
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: 180, borderRadius: radius.md, backgroundColor: c.surfaceAlt }} resizeMode="contain" />
                <Txt v="caption" center color={c.muted}>
                  اضغط لتكبير الفاتورة ومطابقة الحقول
                </Txt>
              </Pressable>
            ) : null}
            {source === 'qr' ? <Banner severity="ok" title="قُرئ رمز QR الضريبي بنجاح" body="الحقول المعلَّمة «دقيق» مأخوذة من الرمز مباشرة." /> : null}
            {ocrFailed && imageUri ? (
              <Banner
                severity="info"
                title={ocrConfigured() ? 'تعذّر الاستخراج التلقائي' : 'الاستخراج الآلي غير مفعّل بعد'}
                body="أكمل الحقول يدوياً — صورة الفاتورة محفوظة مع السجل. إن كانت الصورة ضبابية يمكنك إعادة التصوير."
                action="إعادة التصوير"
                onAction={() => router.push('/record/scan?mode=photo')}
              />
            ) : null}
            {!imageUri && source !== 'qr' && !editing ? (
              <Row gap={8}>
                <Button title="مسح QR" icon="qr-code" variant="secondary" small style={{ flex: 1 }} onPress={() => router.push('/record/scan?mode=qr')} />
                <Button title="إرفاق صورة" icon="camera" variant="secondary" small style={{ flex: 1 }} onPress={() => router.push('/record/scan?mode=photo')} />
              </Row>
            ) : null}

            <Field
              label="قراءة العداد الحالية"
              suffix="كم"
              keyboardType="number-pad"
              value={km}
              onChangeText={(t) => {
                setKm(t);
                setKmError(null);
              }}
              placeholder={ins?.odo.km != null ? `نحو ${ins.odo.km}` : 'إلزامي'}
              error={kmError}
              confidence={km.trim() ? undefined : 'required'}
              hint="إلزامي — أساس التذكيرات المبنية على المسافة"
            />
            <DateField label="تاريخ العملية" value={date} onChange={(d) => { setDate(d); setConf((p) => ({ ...p, date: undefined })); }} maximumDate={new Date()} confidence={conf.date} />
            <Field label="اسم الورشة / المركز" value={shop} onChangeText={(t) => { setShop(t); }} placeholder="مثلاً: مركز بترومين" confidence={conf.shop} />
            <Row gap={10} style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Field label="الإجمالي" suffix="ر.س" keyboardType="decimal-pad" value={total} onChangeText={setTotal} confidence={conf.total ?? (total ? undefined : 'required')} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="الضريبة (VAT)" suffix="ر.س" keyboardType="decimal-pad" value={vat} onChangeText={setVat} confidence={conf.vat} />
              </View>
            </Row>
            {vatNumber ? (
              <Txt v="caption" color={c.muted}>
                الرقم الضريبي للمركز: {vatNumber}
              </Txt>
            ) : null}

            {type === 'tires' ? (
              <Card style={{ gap: 10 }}>
                <Txt v="bodyBold">بيانات الكفرات</Txt>
                <Row gap={10} style={{ alignItems: 'flex-start' }}>
                  <View style={{ flex: 2 }}>
                    <Field label="المقاس" placeholder="225/65R17" value={tireSize} onChangeText={setTireSize} autoCapitalize="characters" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="العدد" keyboardType="number-pad" value={tireCount} onChangeText={setTireCount} />
                  </View>
                </Row>
                <Row gap={10} style={{ alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Field label="العلامة" value={tireBrand} onChangeText={setTireBrand} placeholder="ميشلان" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="تاريخ التصنيع DOT" value={tireDot} onChangeText={setTireDot} placeholder="2425" keyboardType="number-pad" maxLength={4} hint="أسبوع+سنة" />
                  </View>
                </Row>
              </Card>
            ) : null}

            {hasOil ? (
              <Card style={{ gap: 10 }}>
                <Txt v="bodyBold">الزيت</Txt>
                {oilSuggestion ? (
                  <View style={{ backgroundColor: c.successBg, borderRadius: radius.md, padding: 10, gap: 4 }}>
                    <Txt v="bodyBold" color={c.successText}>
                      المقترح لسيارتك: {oilSuggestion.viscosity}
                      {oilSuggestion.alt ? ` (أو ${oilSuggestion.alt})` : ''} · {OIL_BASE_LABELS[oilSuggestion.base]}
                    </Txt>
                    {oilSuggestion.spec || oilSuggestion.note ? (
                      <Txt v="caption" color={c.successText}>
                        {[oilSuggestion.spec ? `المواصفة: ${oilSuggestion.spec}` : '', oilSuggestion.note ?? ''].filter(Boolean).join(' — ')}
                      </Txt>
                    ) : null}
                    <Txt v="caption" color={c.muted}>
                      {OIL_DISCLAIMER}
                    </Txt>
                    {viscosity !== oilSuggestion.viscosity ? (
                      <Button
                        title="استخدم المقترح"
                        variant="ghost"
                        small
                        onPress={() => {
                          setViscosity(oilSuggestion.viscosity);
                          setOilBase(oilSuggestion.base);
                          if (oilKm == null && !oilCustom) setOilKm(oilSuggestion.intervalKm);
                        }}
                      />
                    ) : null}
                  </View>
                ) : null}
                <Txt v="caption" color={c.muted}>
                  فترة الزيت (المكتوبة على العبوة أو حسب الورشة)
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {OIL_INTERVALS.map((o) => (
                    <Chip
                      key={o.km}
                      label={o.label}
                      selected={effOilKm === o.km && !oilCustom}
                      onPress={() => {
                        setOilKm(o.km);
                        setOilCustom('');
                      }}
                    />
                  ))}
                </View>
                <Field
                  label="أو فترة أخرى"
                  suffix="كم"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={oilCustom}
                  onChangeText={(t) => {
                    setOilCustom(t);
                    setOilKm(null);
                  }}
                  placeholder="مثلاً: 12000"
                  hint={`التذكير القادم بعد ${fmtKm(effOilKm)} أو ${oilMonthsFor(effOilKm)} أشهر — أيهما أقرب`}
                />
                <Txt v="caption" color={c.muted}>
                  اللزوجة ونوع الزيت
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {OIL_VISCOSITIES.map((x) => (
                    <Chip key={x} label={x} selected={viscosity === x} onPress={() => setViscosity(viscosity === x ? undefined : x)} />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(Object.keys(OIL_BASE_LABELS) as OilBase[]).map((b) => (
                    <Chip key={b} label={OIL_BASE_LABELS[b]} selected={oilBase === b} onPress={() => setOilBase(oilBase === b ? undefined : b)} />
                  ))}
                </View>
                <Field label="العلامة التجارية (اختياري)" value={oilBrand} onChangeText={setOilBrand} placeholder="مثلاً: موبيل 1، بترومين، توتال" />
                <SwitchRow
                  label="تم تغيير فلتر الزيت؟"
                  hint={
                    !prevOil
                      ? 'لا يوجد تبديل زيت سابق مسجّل'
                      : prevOil.resets.includes('oil_filter')
                        ? 'تغيّر الفلتر في التبديلة السابقة — المعتاد تغييره مرة كل تبديلتين'
                        : 'لم يتغيّر الفلتر في التبديلة السابقة — يُنصح بتغييره الآن'
                  }
                  value={filterChanged}
                  onChange={setFilterChanged}
                />
              </Card>
            ) : null}

            {hasWarrantyPart ? (
              <Card style={{ gap: 10 }}>
                <Txt v="bodyBold">
                  الضمان ({[resets.includes('tires') || type === 'tires' ? 'الكفرات' : '', resets.includes('battery') || type === 'battery' ? 'البطارية' : ''].filter(Boolean).join(' و')})
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip
                    label="بدون ضمان"
                    selected={effWarranty == null}
                    onPress={() => {
                      setWarrantyMonths(null);
                      setWarrantyCustom('');
                    }}
                  />
                  {WARRANTY_OPTIONS.map((m) => (
                    <Chip
                      key={m}
                      label={m === 12 ? 'سنة' : m === 24 ? 'سنتان' : m % 12 === 0 ? `${m / 12} سنوات` : `${m} شهراً`}
                      selected={effWarranty === m && !warrantyCustom}
                      onPress={() => {
                        setWarrantyMonths(m);
                        setWarrantyCustom('');
                      }}
                    />
                  ))}
                </View>
                <Field
                  label="أو مدة أخرى"
                  suffix="شهر"
                  keyboardType="number-pad"
                  maxLength={3}
                  value={warrantyCustom}
                  onChangeText={(t) => {
                    setWarrantyCustom(t);
                    setWarrantyMonths(null);
                  }}
                  hint={warrantyExpiry ? `ينتهي الضمان ${fmtDate(warrantyExpiry, calendar)} — احتفظ بالفاتورة فهي إثبات الضمان` : 'سنذكّرك قبل انتهاء الضمان بشهر وبأسبوع'}
                />
              </Card>
            ) : null}

            <SectionTitle title="البنود (اختياري)" action="+ بند" onAction={() => setItems((p) => [...p, { id: uid(), description: '', price: '', qty: '1' }])} />
            {items.map((it, idx) => (
              <Row key={it.id} gap={6} style={{ alignItems: 'flex-end' }}>
                <View style={{ flex: 3 }}>
                  <Field label={`بند ${idx + 1}`} value={it.description} onChangeText={(t) => setItems((p) => p.map((x) => (x.id === it.id ? { ...x, description: t } : x)))} placeholder="زيت 5W-30 / أجور يد" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="كمية" keyboardType="decimal-pad" value={it.qty} onChangeText={(t) => setItems((p) => p.map((x) => (x.id === it.id ? { ...x, qty: t } : x)))} />
                </View>
                <View style={{ flex: 1.4 }}>
                  <Field label="السعر" keyboardType="decimal-pad" value={it.price} onChangeText={(t) => setItems((p) => p.map((x) => (x.id === it.id ? { ...x, price: t } : x)))} />
                </View>
                <IconButton icon="trash-outline" label="حذف البند" color={c.danger} onPress={() => setItems((p) => p.filter((x) => x.id !== it.id))} />
              </Row>
            ))}
            {mismatch ? (
              <Banner severity="warning" title="المجموع لا يطابق الإجمالي" body={`مجموع البنود ${fmtSAR(itemsSum)} + الضريبة ${fmtSAR(isNaN(vatN) ? 0 : vatN)} ≠ الإجمالي ${fmtSAR(totalN)}. راجِع الأرقام.`} />
            ) : null}

            <Txt v="bodyBold">المكوّنات التي تم تغييرها</Txt>
            <Txt v="caption" color={c.muted}>
              يُصفَّر عمر المكوّن المختار ويبدأ عدّه من هذه العملية
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ALL_COMPONENTS.map((t) => (
                <Chip
                  key={t}
                  label={COMPONENT_LABELS[t]}
                  selected={resets.includes(t)}
                  icon={resets.includes(t) ? 'checkmark' : undefined}
                  onPress={() => setResets((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))}
                />
              ))}
            </View>

            <Field label="قام بالعملية (اختياري)" value={doneBy} onChangeText={setDoneBy} placeholder="مثلاً: خالد" />
            <Field label="ملاحظات" value={notes} onChangeText={setNotes} multiline placeholder="أي تفاصيل تريد تذكّرها" />
            {requiredMissing ? <Txt color={c.dangerText}>أكمل الحقول المعلَّمة «مطلوب» لتفعيل الحفظ.</Txt> : null}
          </>
        ) : null}
      </Screen>

      <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#000E', justifyContent: 'center' }} onPress={() => setZoom(false)}>
          {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : null}
          <Txt center color="#fff">
            اضغط للإغلاق
          </Txt>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
