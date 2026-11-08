// تحديث/تأكيد العداد (7.8)
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Banner, Button, Card, Field, Screen, Txt } from '@/components/ui';
import { relativeDays } from '@/lib/dates';
import { fmtKm, fmtNum, parseNum } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { useInsights } from '@/store/useInsights';
import { useStore } from '@/store/useStore';

export default function Odometer() {
  const { c } = useTheme();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const ins = useInsights(vehicleId);
  const addOdometer = useStore((s) => s.addOdometer);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!ins) return null;
  const { odo, vehicle } = ins;

  const save = (km: number, source: 'manual' | 'confirm') => {
    if (isNaN(km) || km < 0 || km > 2_000_000) {
      setError('أدخل قراءة صحيحة');
      return;
    }
    if (odo.lastKm != null && km < odo.lastKm && source === 'manual') {
      Alert.alert(
        'القراءة أقل من السابقة',
        `القراءة الجديدة أقل من السابقة (${fmtNum(odo.lastKm)}). هل هي تصحيح لخطأ، أم حالة استبدال عداد؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'استبدال عداد',
            onPress: () => {
              addOdometer(vehicle.id, km, 'manual', undefined, note || 'استبدال عداد');
              router.back();
            },
          },
        ],
      );
      return;
    }
    addOdometer(vehicle.id, km, source, undefined, note || undefined);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Txt v="title2">
          {vehicle.make} {vehicle.model}
        </Txt>
        {odo.km != null && odo.estimated ? (
          <Card style={{ gap: 8 }}>
            <Txt v="caption" color={c.muted}>
              تقديرنا الحالي (مقدَّر)
            </Txt>
            <Txt v="display">العداد نحو {fmtKm(odo.km)} — صحيح؟</Txt>
            <Txt v="caption" color={c.muted}>
              الأساس: آخر قراءة {fmtKm(odo.lastKm!)} {relativeDays(-(odo.daysSinceReading ?? 0))} + {fmtNum(odo.dailyRate)} كم/يوم
              {odo.rateSource === 'default' ? ' (معدل افتراضي — يتحسّن مع القراءات)' : ' (من قراءاتك الفعلية)'}
            </Txt>
            <Button title="نعم، صحيح تقريباً" icon="checkmark" onPress={() => save(odo.km!, 'confirm')} />
          </Card>
        ) : null}
        {odo.needsConfirm ? <Banner severity="info" title="مرّ أكثر من 60 يوماً على آخر قراءة" body="تأكيد بلمسة واحدة يحدّث كل التذكيرات والتوقعات فوراً." /> : null}
        <Field
          label={odo.estimated ? 'أو أدخل القراءة الفعلية' : 'القراءة الحالية'}
          placeholder={odo.km != null ? String(odo.km) : 'مثلاً: 85000'}
          keyboardType="number-pad"
          suffix="كم"
          value={value}
          onChangeText={(t) => {
            setValue(t);
            setError(null);
          }}
          error={error}
          autoFocus={!odo.estimated}
        />
        <Field label="ملاحظة (اختياري)" value={note} onChangeText={setNote} placeholder="مثلاً: استبدال عداد" />
        <Button title="حفظ القراءة" onPress={() => save(parseNum(value), 'manual')} disabled={!value.trim()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
