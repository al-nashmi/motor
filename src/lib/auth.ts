// طبقة تكيّف للتحقق برقم الجوال (OTP) — القسم 7.1 و9.2
// عند ضبط EXPO_PUBLIC_AUTH_URL يُرسل الرمز عبر خادم المصادقة (مزود SMS محلي + مزود بديل).
// بدونه يعمل التطبيق في «وضع التطوير»: يُولَّد الرمز محلياً ويُعرض على الشاشة.

export const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL;
export const isDevAuth = !AUTH_URL;

export const OTP_TTL_SEC = 300;
export const RESEND_COOLDOWN_SEC = 60;
export const MAX_SENDS = 3;
export const LOCKOUT_SEC = 600;
export const MAX_VERIFY_ATTEMPTS = 5;

/** يقبل 05xxxxxxxx أو 5xxxxxxxx أو +9665xxxxxxxx ويعيد +9665xxxxxxxx */
export function normalizeSaudiMobile(input: string): string | null {
  const d = input.replace(/[٠-٩]/g, (x) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/[^\d+]/g, '');
  let m = d.match(/^(?:\+?966|00966)?0?(5\d{8})$/);
  if (!m) return null;
  return `+966${m[1]}`;
}

let devCode: { phone: string; code: string; expires: number } | null = null;

export async function requestOtp(phone: string): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  if (AUTH_URL) {
    try {
      const res = await fetch(`${AUTH_URL}/otp/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      if (!res.ok) return { ok: false, error: 'تعذر إرسال الرمز، أعد المحاولة بعد لحظات' };
      return { ok: true };
    } catch {
      return { ok: false, error: 'تعذر الاتصال. تحقق من الشبكة وأعد المحاولة' };
    }
  }
  const code = String(Math.floor(1000 + Math.random() * 9000));
  devCode = { phone, code, expires: Date.now() + OTP_TTL_SEC * 1000 };
  return { ok: true, devCode: code };
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (AUTH_URL) {
    try {
      const res = await fetch(`${AUTH_URL}/otp/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code }) });
      if (!res.ok) return { ok: false, error: 'الرمز غير صحيح أو منتهي الصلاحية' };
      return { ok: true };
    } catch {
      return { ok: false, error: 'تعذر الاتصال. تحقق من الشبكة وأعد المحاولة' };
    }
  }
  if (!devCode || devCode.phone !== phone) return { ok: false, error: 'اطلب رمزاً جديداً' };
  if (Date.now() > devCode.expires) return { ok: false, error: 'انتهت صلاحية الرمز، اطلب رمزاً جديداً' };
  if (devCode.code !== code) return { ok: false, error: 'الرمز غير صحيح' };
  devCode = null;
  return { ok: true };
}
