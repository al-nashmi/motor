import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { uid } from './format';

function dir(name: string) {
  const d = new Directory(Paths.document, name);
  if (!d.exists) d.create({ intermediates: true });
  return d;
}

/** ينسخ الصورة الملتقطة إلى مساحة التطبيق الدائمة (لا تضيع الفاتورة) */
export function persistImage(uri: string, folder: 'invoices' | 'documents'): string {
  try {
    const src = new File(uri);
    const ext = (uri.split('.').pop() || 'jpg').split('?')[0].slice(0, 4);
    const dest = new File(dir(folder), `${uid()}.${ext}`);
    src.copy(dest);
    return dest.uri;
  } catch (e) {
    console.warn('persistImage failed', e);
    return uri;
  }
}

export function deleteFile(uri?: string) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}

export function wipeFiles() {
  for (const name of ['invoices', 'documents']) {
    try {
      const d = new Directory(Paths.document, name);
      if (d.exists) d.delete();
    } catch {}
  }
}

export async function shareJson(filename: string, data: unknown) {
  const f = new File(Paths.cache, filename);
  if (f.exists) f.delete();
  f.create();
  f.write(JSON.stringify(data, null, 2));
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'تصدير بيانات موتر' });
}
