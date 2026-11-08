// S03 — إضافة أول مركبة (تدفق موجّه) + الإعداد السريع للتذكيرات (الرحلة الأولى)
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Banner, Button, Card, Screen, SwitchRow, Txt } from '@/components/ui';
import { VehicleForm } from '@/components/VehicleForm';
import { ensurePermission } from '@/lib/notifications';
import { useTheme } from '@/lib/theme';
import type { DocType } from '@/lib/types';
import { useStore } from '@/store/useStore';

export default function Onboarding() {
  const { c } = useTheme();
  const user = useStore((s) => s.user);
  const addVehicle = useStore((s) => s.addVehicle);
  const upsertDocument = useStore((s) => s.upsertDocument);
  const updateSettings = useStore((s) => s.updateSettings);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const [step, setStep] = useState<'vehicle' | 'notify'>('vehicle');
  const [notify, setNotify] = useState(true);
  const [denied, setDenied] = useState(false);

  const finish = async () => {
    if (notify) {
      const ok = await ensurePermission();
      if (!ok) {
        setDenied(true);
        updateSettings({ notifications: false });
        return;
      }
    }
    updateSettings({ notifications: notify });
    setOnboarded(true);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        {step === 'vehicle' ? (
          <>
            <Txt v="title1">أهلاً {user?.name ?? ''}، لنضف مركبتك الأولى</Txt>
            <Txt color={c.muted}>تستغرق دقيقة واحدة. يمكنك إضافة باقي مركباتك لاحقاً من الكراج.</Txt>
            <VehicleForm
              mode="guided"
              submitLabel="أضف المركبة"
              onSubmit={(vals) => {
                const id = addVehicle({ make: vals.make, model: vals.model, year: vals.year, plateNumbers: vals.plateNumbers, plateLetters: vals.plateLetters }, vals.km);
                (Object.entries(vals.docs) as [DocType, string | undefined][]).forEach(([type, expiry]) => {
                  if (expiry) upsertDocument(id, { type, expiry });
                });
                setStep('notify');
              }}
            />
            <Button
              title="تخطَّ الآن"
              variant="ghost"
              onPress={() => {
                setStep('notify');
              }}
            />
          </>
        ) : (
          <>
            <Txt v="title1">الإعداد السريع للتذكيرات</Txt>
            <Txt color={c.muted}>نذكّرك قبل انتهاء الوثائق بـ 30 و15 و7 أيام، وبتحديث العداد كل 3 أشهر، وبمواعيد الزيت والكفرات والبطارية. تُرسل التذكيرات الصباحية الساعة 9.</Txt>
            <Card>
              <SwitchRow icon="notifications" label="تفعيل التذكيرات" hint="يمكنك تغيير ذلك من الإعدادات في أي وقت" value={notify} onChange={setNotify} />
            </Card>
            {denied ? (
              <Banner
                severity="warning"
                title="الإشعارات غير مفعّلة"
                body="بدون إذن الإشعارات لن تصلك تنبيهات انتهاء الوثائق. يمكنك تفعيلها من إعدادات الجهاز، وستظل التذكيرات ظاهرة داخل التطبيق."
                action="متابعة بدون إشعارات"
                onAction={() => {
                  setOnboarded(true);
                  router.replace('/(tabs)');
                }}
              />
            ) : null}
            <Button title="ابدأ استخدام موتر" onPress={finish} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
