// طبقة تكيّف (Adapter) لخدمة استخراج الفواتير بالذكاء الاصطناعي — القسم 9.1 و9.2
// يتصل التطبيق بخادم الاستخراج عبر EXPO_PUBLIC_OCR_URL. بدون إعداد الخادم يعود null
// فينتقل المستخدم مباشرة إلى المراجعة اليدوية مع بقاء صورة الفاتورة ظاهرة (جدول 12: فشل الاستخراج كلياً).
import { File } from 'expo-file-system';
import type { RecordType } from './types';

export interface ExtractedField<T> {
  value: T;
  confidence: number; // 0..1
}

export interface OcrResult {
  shop?: ExtractedField<string>;
  date?: ExtractedField<string>; // YYYY-MM-DD
  total?: ExtractedField<number>;
  vat?: ExtractedField<number>;
  vatNumber?: ExtractedField<string>;
  items?: { description: string; price: number; qty?: number; confidence: number }[];
}

export const OCR_URL = process.env.EXPO_PUBLIC_OCR_URL;

export function ocrConfigured() {
  return !!OCR_URL;
}

export async function extractInvoice(imageUri: string, type: RecordType, timeoutMs = 15000): Promise<OcrResult | null> {
  if (!OCR_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const base64 = await new File(imageUri).base64();
    const res = await fetch(OCR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, type, locale: 'ar-SA' }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as OcrResult;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
