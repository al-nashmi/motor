// قراءة رمز QR في الفاتورة الضريبية المبسطة (ZATCA) — ترميز TLV مشفّر Base64
// الوسوم: 1 اسم البائع، 2 الرقم الضريبي، 3 الطابع الزمني، 4 الإجمالي شامل الضريبة، 5 مبلغ الضريبة

export interface ZatcaInvoice {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: number;
  vat: number;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(input: string): Uint8Array | null {
  const s = input.replace(/[\s]/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(s)) return null;
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of s) {
    buffer = (buffer << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b >= 0xc0 && b < 0xe0) out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (b >= 0xe0 && b < 0xf0) out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    else {
      const cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      out += String.fromCodePoint(cp);
    }
  }
  return out;
}

export function parseZatcaQR(data: string): ZatcaInvoice | null {
  const bytes = base64ToBytes(data);
  if (!bytes || bytes.length < 6) return null;
  const fields: Record<number, string> = {};
  let i = 0;
  while (i + 2 <= bytes.length) {
    const tag = bytes[i];
    const len = bytes[i + 1];
    const start = i + 2;
    if (start + len > bytes.length) break;
    if (tag >= 1 && tag <= 5) fields[tag] = utf8Decode(bytes.slice(start, start + len));
    i = start + len;
  }
  if (!fields[1] || !fields[4]) return null;
  const total = parseFloat(fields[4]);
  if (isNaN(total)) return null;
  return {
    sellerName: fields[1].trim(),
    vatNumber: (fields[2] ?? '').trim(),
    timestamp: (fields[3] ?? '').trim(),
    total,
    vat: parseFloat(fields[5] ?? '0') || 0,
  };
}

/** ترميز عكسي — يُستخدم في الاختبار وفي توليد بيانات تجريبية */
export function encodeZatcaQR(inv: ZatcaInvoice): string {
  const enc = (s: string) => Array.from(unescape(encodeURIComponent(s))).map((c) => c.charCodeAt(0));
  const parts: number[] = [];
  const add = (tag: number, value: string) => {
    const b = enc(value);
    parts.push(tag, b.length, ...b);
  };
  add(1, inv.sellerName);
  add(2, inv.vatNumber);
  add(3, inv.timestamp);
  add(4, inv.total.toFixed(2));
  add(5, inv.vat.toFixed(2));
  let out = '';
  for (let i = 0; i < parts.length; i += 3) {
    const [a, b = 0, c = 0] = parts.slice(i, i + 3);
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < parts.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < parts.length ? B64[n & 63] : '=');
  }
  return out;
}
