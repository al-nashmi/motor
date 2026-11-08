// S02 — التحقق برقم الجوال (OTP)
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Banner, Button, Field, Screen, Txt } from '@/components/ui';
import {
  isDevAuth,
  LOCKOUT_SEC,
  MAX_SENDS,
  MAX_VERIFY_ATTEMPTS,
  normalizeSaudiMobile,
  requestOtp,
  RESEND_COOLDOWN_SEC,
  verifyOtp,
} from '@/lib/auth';
import { radius, type, useTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

export default function Login() {
  const { c } = useTheme();
  const signIn = useStore((s) => s.signIn);
  const onboarded = useStore((s) => s.onboarded);
  const [step, setStep] = useState<'phone' | 'code' | 'name'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sends, setSends] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const codeRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const send = async () => {
    setError(null);
    const p = normalizeSaudiMobile(phoneInput);
    if (!p) {
      setError('أدخل رقم جوال سعودي صحيح يبدأ بـ 05');
      return;
    }
    if (cooldown > 0) return;
    setLoading(true);
    const res = await requestOtp(p);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const n = sends + 1;
    setSends(n);
    setAttempts(0);
    setCooldownUntil(Date.now() + (n >= MAX_SENDS ? LOCKOUT_SEC : RESEND_COOLDOWN_SEC) * 1000);
    if (n >= MAX_SENDS) setSends(0);
    setPhone(p);
    setDevCode(res.devCode ?? null);
    setCode('');
    setStep('code');
    setTimeout(() => codeRef.current?.focus(), 300);
  };

  const verify = async (value = code) => {
    if (value.length < 4) return;
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      setError('تجاوزت عدد المحاولات. اطلب رمزاً جديداً');
      return;
    }
    setLoading(true);
    const res = await verifyOtp(phone, value);
    setLoading(false);
    if (!res.ok) {
      setAttempts((a) => a + 1);
      setError(res.error);
      setCode('');
      return;
    }
    setError(null);
    const existing = useStore.getState().user;
    if (existing && existing.phone === phone && existing.name) {
      signIn(phone, existing.name);
      router.replace(onboarded ? '/(tabs)' : '/onboarding');
    } else setStep('name');
  };

  const finish = () => {
    const n = name.trim();
    if (n.length < 2) {
      setError('أدخل اسمك المختصر (حرفان على الأقل)');
      return;
    }
    signIn(phone, n);
    router.replace(onboarded ? '/(tabs)' : '/onboarding');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        {step === 'phone' && (
          <>
            <Txt v="title1">أدخل رقم جوالك</Txt>
            <Txt color={c.muted}>سنرسل لك رمز تحقق برسالة نصية. لا نحتاج أي بيانات أخرى للبدء.</Txt>
            <Field
              label="رقم الجوال"
              placeholder="05xxxxxxxx"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              value={phoneInput}
              onChangeText={setPhoneInput}
              maxLength={14}
              error={error}
              onSubmitEditing={send}
            />
            <Button title={cooldown > 0 ? `أعد المحاولة بعد ${cooldown} ث` : 'أرسل رمز التحقق'} onPress={send} loading={loading} disabled={cooldown > 0} />
          </>
        )}

        {step === 'code' && (
          <>
            <Txt v="title1">أدخل رمز التحقق</Txt>
            <Txt color={c.muted}>
              أرسلنا رمزاً من 4 أرقام إلى <Txt v="bodyBold">{phone.replace('+966', '0')}</Txt>
            </Txt>
            {isDevAuth && devCode ? (
              <Banner severity="info" title={`وضع التطوير — رمزك: ${devCode}`} body="لم يُضبط خادم الرسائل بعد (EXPO_PUBLIC_AUTH_URL)، لذلك يظهر الرمز هنا." />
            ) : null}
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(t) => {
                const v = t.replace(/[٠-٩]/g, (x) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/\D/g, '').slice(0, 4);
                setCode(v);
                if (v.length === 4) verify(v);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={4}
              accessibilityLabel="رمز التحقق"
              style={[type.display, { textAlign: 'center', letterSpacing: 18, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: error ? c.danger : c.border, height: 70, color: c.text }]}
            />
            {error ? <Txt color={c.dangerText}>{error}</Txt> : null}
            <Button title="تحقق" onPress={() => verify()} loading={loading} disabled={code.length < 4} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button title="تغيير الرقم" variant="ghost" small onPress={() => setStep('phone')} />
              <Button title={cooldown > 0 ? `إعادة الإرسال بعد ${cooldown} ث` : 'إعادة إرسال الرمز'} variant="ghost" small disabled={cooldown > 0} onPress={send} />
            </View>
          </>
        )}

        {step === 'name' && (
          <>
            <Txt v="title1">أهلاً بك في موتر 👋</Txt>
            <Txt color={c.muted}>بماذا نناديك؟</Txt>
            <Field label="الاسم المختصر" placeholder="مثلاً: أبو خالد" value={name} onChangeText={setName} autoFocus error={error} onSubmitEditing={finish} maxLength={30} />
            <Button title="متابعة" onPress={finish} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
