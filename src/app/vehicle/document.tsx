// خزنة الوثائق + الرحلة الثالثة: تجديد وثيقة
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { Banner, Button, Card, Chip, ChipRow, DateField, Field, Row, Screen, StatusPill, Txt } from '@/components/ui';
import { DOC_LABELS, DOC_RENEWAL } from '@/lib/catalog';
import { addMonths, daysUntil, fmtGregorian, fmtHijri, parseDate, relativeDays, toISODate } from '@/lib/dates';
import { docSeverity, docStatusText } from '@/lib/engine';
import { deleteFile, persistImage } from '@/lib/files';
import { radius, useTheme } from '@/lib/theme';
import type { DocType } from '@/lib/types';
import { useStore } from '@/store/useStore';

const EXTRA_TYPES: DocType[] = ['driver_auth', 'warranty', 'other'];

export default function DocumentScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ vehicleId: string; docId?: string; type?: DocType }>();
  const vehicle = useStore((s) => s.vehicles.find((v) => v.id === params.vehicleId));
  const upsert = useStore((s) => s.upsertDocument);
  const remove = useStore((s) => s.removeDocument);
  const doc = vehicle?.documents.find((d) => d.id === params.docId);
  const [type, setType] = useState<DocType>(doc?.type ?? params.type ?? 'insurance');
  const [title, setTitle] = useState(doc?.title ?? '');
  const [expiry, setExpiry] = useState<string | undefined>(doc?.expiry);
  const [imageUri, setImageUri] = useState<string | undefined>(doc?.imageUri);
  const [renewing, setRenewing] = useState(false);

  if (!vehicle) return <Screen><Txt>المركبة غير موجودة</Txt></Screen>;
  const isExtra = EXTRA_TYPES.includes(type);
  const label = type === 'other' && title ? title : DOC_LABELS[type];
  const days = doc ? daysUntil(doc.expiry) : null;

  const pickImage = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('الإذن مطلوب', camera ? 'نحتاج الكاميرا لتصوير الوثيقة. يمكنك اختيار صورة من المعرض بدلاً من ذلك.' : 'نحتاج الوصول للصور لاختيار صورة الوثيقة.');
      return;
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, mediaTypes: ['images'] });
    if (!res.canceled && res.assets[0]) setImageUri(persistImage(res.assets[0].uri, 'documents'));
  };

  const save = () => {
    if (!expiry) {
      Alert.alert('تاريخ الانتهاء مطلوب', 'اختر تاريخ انتهاء الوثيقة.');
      return;
    }
    if (type === 'other' && !title.trim()) {
      Alert.alert('اسم الوثيقة', 'أدخل اسماً للوثيقة.');
      return;
    }
    if (doc?.imageUri && doc.imageUri !== imageUri) deleteFile(doc.imageUri);
    upsert(vehicle.id, { id: doc?.id, type, title: type === 'other' ? title.trim() : undefined, expiry, imageUri });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: doc ? label : 'إضافة وثيقة' }} />
      <Screen>
        <Txt color={c.muted}>
          {vehicle.make} {vehicle.model} · {vehicle.plateNumbers} {vehicle.plateLetters}
        </Txt>

        {!doc && isExtra && (
          <ChipRow>
            {EXTRA_TYPES.map((t) => (
              <Chip key={t} label={DOC_LABELS[t]} selected={type === t} onPress={() => setType(t)} />
            ))}
          </ChipRow>
        )}

        {doc && !renewing ? (
          <>
            <Card style={{ gap: 8 }}>
              <StatusPill severity={docSeverity(doc.expiry)} label={docStatusText(doc.expiry)} />
              <Txt v="display">{days! < 0 ? `منتهية ${relativeDays(days!)}` : `تنتهي ${relativeDays(days!)}`}</Txt>
              <Txt>تاريخ الانتهاء: {fmtGregorian(doc.expiry)}</Txt>
              {fmtHijri(doc.expiry) ? <Txt color={c.muted}>الموافق: {fmtHijri(doc.expiry)}</Txt> : null}
            </Card>
            {days! <= 30 ? (
              <Banner severity={days! <= 7 ? 'danger' : 'warning'} title="ماذا يحدث عند التجديد الآن؟" body={DOC_RENEWAL[doc.type]} />
            ) : (
              <Card>
                <Txt v="bodyBold">قناة التجديد</Txt>
                <Txt color={c.muted}>{DOC_RENEWAL[doc.type]}</Txt>
              </Card>
            )}
            <Txt v="caption" color={c.muted}>
              التطبيق لا يستبدل الجهة الحكومية أو مزود التأمين — بعد التجديد عُد وحدّث التاريخ.
            </Txt>
            {doc.imageUri ? <Image source={{ uri: doc.imageUri }} style={{ width: '100%', height: 220, borderRadius: radius.md }} resizeMode="cover" /> : null}
            <Button
              title="جدّدتها — حدّث التاريخ"
              icon="refresh"
              onPress={() => {
                // اقتراح: نفس مدة السريان السابقة (سنة افتراضياً)
                setExpiry(toISODate(addMonths(parseDate(doc.expiry) > new Date() ? parseDate(doc.expiry) : new Date(), 12)));
                setRenewing(true);
              }}
            />
            <Button title="تعديل" variant="secondary" onPress={() => setRenewing(true)} />
            <Button
              title="حذف الوثيقة"
              variant="ghost"
              onPress={() =>
                Alert.alert('حذف الوثيقة؟', 'ستتوقف تذكيرات هذه الوثيقة.', [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: () => {
                      deleteFile(doc.imageUri);
                      remove(vehicle.id, doc.id);
                      router.back();
                    },
                  },
                ])
              }
            />
          </>
        ) : (
          <>
            {type === 'other' ? <Field label="اسم الوثيقة" value={title} onChangeText={setTitle} placeholder="مثلاً: بطاقة تشغيل" /> : <Txt v="title2">{label}</Txt>}
            <DateField label="تاريخ الانتهاء الجديد" value={expiry} onChange={setExpiry} minimumDate={new Date(2000, 0, 1)} />
            {expiry && fmtHijri(expiry) ? (
              <Txt v="caption" color={c.muted}>
                {fmtGregorian(expiry)} · {fmtHijri(expiry)}
              </Txt>
            ) : null}
            <Row gap={8}>
              {[6, 12, 24].map((m) => (
                <Chip key={m} label={`+${m === 6 ? '6 أشهر' : m === 12 ? 'سنة' : 'سنتان'}`} onPress={() => setExpiry(toISODate(addMonths(new Date(), m)))} />
              ))}
            </Row>
            <Txt v="bodyBold">صورة الوثيقة (اختياري)</Txt>
            {imageUri ? (
              <Pressable onPress={() => setImageUri(undefined)}>
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: 200, borderRadius: radius.md }} />
                <Txt v="caption" center color={c.muted}>
                  اضغط لإزالة الصورة
                </Txt>
              </Pressable>
            ) : (
              <Row gap={8}>
                <Button title="تصوير" icon="camera" variant="secondary" small style={{ flex: 1 }} onPress={() => pickImage(true)} />
                <Button title="من المعرض" icon="images" variant="secondary" small style={{ flex: 1 }} onPress={() => pickImage(false)} />
              </Row>
            )}
            <View style={{ height: 6 }} />
            <Button title="حفظ" icon="checkmark" onPress={save} />
            <Txt v="caption" center color={c.muted}>
              تُعاد دورة التذكير (30/15/7 أيام) تلقائياً بعد الحفظ.
            </Txt>
          </>
        )}
      </Screen>
    </>
  );
}
