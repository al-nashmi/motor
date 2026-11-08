// توليد تقرير العناية PDF — القسم 7.9 والرحلة الرابعة
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CATEGORY_LABELS, DOC_LABELS, RECORD_LABELS } from './catalog';
import { fmtDate, parseDate } from './dates';
import { docStatusText } from './engine';
import { fmtKm, fmtNum, fmtSAR } from './format';
import type { MaintenanceRecord, OdometerPoint, Vehicle } from './types';

export interface ReportOptions {
  fromDate?: string;
  includeItems: boolean;
  includeOdometer: boolean;
  includeDocs: boolean;
  ownerName?: string;
  ownerPhone?: string;
  calendar: 'gregorian' | 'hijri';
}

function esc(s: string | undefined | null) {
  return (s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** رقم مرجعي ثابت مشتق من محتوى التقرير ووقت التوليد */
function reference(v: Vehicle, records: MaintenanceRecord[], at: Date) {
  const src = `${v.id}|${records.map((r) => `${r.id}:${r.total}:${r.km}`).join(',')}|${at.toISOString()}`;
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const ymd = at.toISOString().slice(0, 10).replace(/-/g, '');
  return `MTR-${ymd}-${hex}`;
}

export function buildReportHtml(v: Vehicle, allRecords: MaintenanceRecord[], points: OdometerPoint[], opts: ReportOptions) {
  const at = new Date();
  const cal = opts.calendar;
  const records = allRecords
    .filter((r) => r.vehicleId === v.id && (!opts.fromDate || r.date >= opts.fromDate))
    .sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km);
  const pts = points.filter((p) => p.vehicleId === v.id).sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const ref = reference(v, records, at);
  const total = records.reduce((s, r) => s + r.total, 0);
  const lastKm = pts.length ? pts[pts.length - 1].km : null;
  const verified = records.filter((r) => r.source !== 'manual').length;

  const rows = records
    .map((r) => {
      const items =
        opts.includeItems && r.items.length
          ? `<tr class="items"><td colspan="6">${r.items
              .map((i) => `${esc(i.description)} (${esc(CATEGORY_LABELS[i.category])}) — ${fmtNum(i.qty)} × ${fmtSAR(i.price)}`)
              .join('<br/>')}${r.vat ? `<br/>ضريبة القيمة المضافة: ${fmtSAR(r.vat)}` : ''}</td></tr>`
          : '';
      return `<tr>
        <td>${esc(fmtDate(r.date, cal))}</td>
        <td>${esc(RECORD_LABELS[r.type])}</td>
        <td class="num">${fmtKm(r.km)}</td>
        <td>${esc(r.shop) || '—'}</td>
        <td class="num">${fmtSAR(r.total)}</td>
        <td>${r.source === 'manual' ? 'يدوي' : 'موثّق بفاتورة'}</td>
      </tr>${items}`;
    })
    .join('');

  const odoRows = opts.includeOdometer
    ? pts.map((p) => `<tr><td>${esc(fmtDate(p.date, cal))}</td><td class="num">${fmtKm(p.km)}</td></tr>`).join('')
    : '';

  const docRows = opts.includeDocs
    ? v.documents
        .map((d) => `<tr><td>${esc(d.type === 'other' && d.title ? d.title : DOC_LABELS[d.type])}</td><td>${esc(fmtDate(d.expiry, cal))}</td><td>${docStatusText(d.expiry, at)}</td></tr>`)
        .join('')
    : '';

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap');
@page { size: A4; margin: 18mm 14mm; }
body { font-family: 'IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', Tahoma, sans-serif; color: #0F172A; font-size: 11pt; }
h1,h2 { font-family: 'Tajawal', sans-serif; color: #1E293B; margin: 0 0 6px; }
h1 { font-size: 22pt; } h2 { font-size: 14pt; margin-top: 22px; border-bottom: 2px solid #10B981; padding-bottom: 4px; }
.head { display:flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1E293B; padding-bottom: 12px; }
.brand { font-family: 'Tajawal'; font-weight: 700; font-size: 20pt; color: #10B981; }
.meta { color: #64748B; font-size: 9.5pt; line-height: 1.6; text-align: left; }
.plate { display:inline-block; border: 2px solid #1E293B; border-radius: 6px; padding: 2px 10px; font-weight: 700; letter-spacing: 2px; }
.summary { display:flex; gap: 10px; margin-top: 14px; }
.box { flex:1; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:10px; }
.box b { display:block; font-size: 14pt; color:#1E293B; }
.box span { color:#64748B; font-size: 9pt; }
table { width:100%; border-collapse: collapse; margin-top: 8px; }
th { background:#1E293B; color:#fff; font-weight:600; padding:7px; font-size:10pt; text-align: right; }
td { border-bottom:1px solid #E2E8F0; padding:6px 7px; font-size:10pt; vertical-align: top; }
td.num { direction: ltr; text-align: right; white-space: nowrap; }
tr.items td { background:#F8FAFC; color:#475569; font-size:9pt; }
.note { color:#64748B; font-size:9pt; margin-top: 18px; line-height:1.7; }
.final { page-break-before: always; text-align:center; padding-top: 120px; }
</style></head><body>
<div class="head">
  <div>
    <div class="brand">موتر</div>
    <h1>تقرير العناية بالمركبة</h1>
    <div>${esc(v.make)} ${esc(v.model)} ${v.year} · <span class="plate">${esc(v.plateNumbers)} ${esc(v.plateLetters)}</span></div>
    ${v.vin ? `<div class="meta" style="text-align:right">رقم الهيكل: ${esc(v.vin)}</div>` : ''}
  </div>
  <div class="meta">
    الرقم المرجعي: <b>${ref}</b><br/>
    تاريخ التوليد: ${esc(fmtDate(at, cal))} ${at.toTimeString().slice(0, 5)}<br/>
    ${opts.fromDate ? `الفترة: من ${esc(fmtDate(opts.fromDate, cal))}` : 'الفترة: كامل السجل'}
    ${opts.ownerName ? `<br/>المالك: ${esc(opts.ownerName)}` : ''}${opts.ownerPhone ? `<br/>التواصل: <span dir="ltr">${esc(opts.ownerPhone)}</span>` : ''}
  </div>
</div>

<h2>الملخص</h2>
<div class="summary">
  <div class="box"><b>${fmtSAR(total)}</b><span>إجمالي التكاليف</span></div>
  <div class="box"><b>${fmtNum(records.length)}</b><span>عدد العمليات (${fmtNum(verified)} موثّقة بفاتورة)</span></div>
  <div class="box"><b>${records[0] ? esc(fmtDate(records[0].date, cal)) : '—'}</b><span>أقدم سجل</span></div>
  <div class="box"><b>${lastKm != null ? fmtKm(lastKm) : '—'}</b><span>آخر قراءة عداد</span></div>
</div>

<h2>الخط الزمني للعمليات</h2>
${records.length ? `<table><thead><tr><th>التاريخ</th><th>النوع</th><th>العداد</th><th>مركز الصيانة</th><th>الإجمالي</th><th>المصدر</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>لا توجد عمليات في الفترة المختارة.</p>'}

${opts.includeOdometer && odoRows ? `<h2>سجل قراءات العداد</h2><table><thead><tr><th>التاريخ</th><th>القراءة</th></tr></thead><tbody>${odoRows}</tbody></table>` : ''}

${opts.includeDocs && docRows ? `<h2>حالة الوثائق عند التوليد</h2><table><thead><tr><th>الوثيقة</th><th>تاريخ الانتهاء</th><th>الحالة</th></tr></thead><tbody>${docRows}</tbody></table>` : ''}

<p class="note">إخلاء مسؤولية: هذا التقرير مُعدّ من بيانات أدخلها المالك في تطبيق موتر، وليس شهادة رسمية أو تقرير فحص فني. يُميَّز كل سجل بمصدره (موثّق بفاتورة / يدوي). الرقم المرجعي وتاريخ التوليد ثابتان ولا يتغيران بعد إنشاء التقرير.</p>

<div class="final">
  <div class="brand" style="font-size:32pt">موتر</div>
  <h2 style="border:none">أُنشئ بواسطة تطبيق موتر — رفيق العناية بمركباتك</h2>
  <p class="note">يُبنى هذا التقرير من سجل صيانة رقمي يوثّق كل عملية بتاريخها وقراءة عدادها وتكلفتها، مع صور الفواتير المخزنة لدى المالك. الرقم المرجعي: ${ref}</p>
</div>
</body></html>`;
}

export async function generateAndShareReport(v: Vehicle, records: MaintenanceRecord[], points: OdometerPoint[], opts: ReportOptions) {
  const html = buildReportHtml(v, records, points, opts);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'مشاركة تقرير العناية' });
  }
  return uri;
}

export async function printReport(v: Vehicle, records: MaintenanceRecord[], points: OdometerPoint[], opts: ReportOptions) {
  await Print.printAsync({ html: buildReportHtml(v, records, points, opts) });
}
