// اختبارات منطق الحساب — تُشغَّل بـ: npm test
import assert from 'node:assert/strict';
import { encodeZatcaQR, parseZatcaQR } from '../zatca';
import { parsePlateLetters, validatePlate } from '../plates';
import { componentLife, componentStatus, estimateOdometer, fuelStats, healthScore, vehicleNeeds, warrantyStatus, ALL_COMPONENTS } from '../engine';
import { sanitizeNumeric } from '../format';
import { suggestOil } from '../oil';
import { buildStages } from '../schedule';
import { normalizeSaudiMobile } from '../auth';
import type { Vehicle, OdometerPoint, MaintenanceRecord, FuelFillUp } from '../types';
import { toISODate, addDays } from '../dates';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('✓', name); };
const ago = (d: number) => toISODate(addDays(new Date(), -d));

t('ZATCA QR round-trip with Arabic seller', () => {
  const qr = encodeZatcaQR({ sellerName: 'مركز بترومين للصيانة', vatNumber: '310122393500003', timestamp: '2026-10-05T10:30:00Z', total: 287.5, vat: 37.5 });
  const inv = parseZatcaQR(qr)!;
  assert.equal(inv.sellerName, 'مركز بترومين للصيانة');
  assert.equal(inv.vatNumber, '310122393500003');
  assert.equal(inv.total, 287.5);
  assert.equal(inv.vat, 37.5);
});
t('ZATCA rejects non-invoice QR', () => {
  assert.equal(parseZatcaQR('https://example.com'), null);
});
t('plates: Arabic + Latin letters', () => {
  assert.deepEqual(parsePlateLetters('أ ب د'), ['ا', 'ب', 'د']);
  assert.deepEqual(parsePlateLetters('KSA'.slice(0, 2)), ['ك', 'س']);
  assert.deepEqual(parsePlateLetters('هـ و'), ['هـ', 'و']);
  assert.equal(validatePlate('1234', 'ا ب ح'), null);
  assert.ok(validatePlate('12345', 'ا'));
  assert.ok(validatePlate('12', 'ج'));
});
t('Saudi mobile normalization', () => {
  assert.equal(normalizeSaudiMobile('0551234567'), '+966551234567');
  assert.equal(normalizeSaudiMobile('+966 55 123 4567'), '+966551234567');
  assert.equal(normalizeSaudiMobile('٠٥٥١٢٣٤٥٦٧'), '+966551234567');
  assert.equal(normalizeSaudiMobile('0451234567'), null);
});

const v: Vehicle = { id: 'v1', make: 'تويوتا', model: 'كامري', year: 2021, plateNumbers: '1234', plateLetters: 'ا ب ح', source: 'manual', createdAt: new Date().toISOString(),
  documents: [{ id: 'd1', type: 'insurance', expiry: toISODate(addDays(new Date(), 12)), updatedAt: '' }], componentOverrides: {} };
const pts: OdometerPoint[] = [
  { id: 'p1', vehicleId: 'v1', km: 40000, date: ago(100), source: 'manual' },
  { id: 'p2', vehicleId: 'v1', km: 46000, date: ago(70), source: 'manual' },
];

t('odometer estimation uses ≥30-day window and flags confirm after 60 days', () => {
  const o = estimateOdometer(pts, 'v1', 50);
  assert.equal(o.rateSource, 'measured');
  assert.equal(Math.round(o.dailyRate), 200);
  assert.equal(o.km, 46000 + 200 * 70);
  assert.equal(o.needsConfirm, true);
  assert.equal(o.estimated, true);
});

const recs: MaintenanceRecord[] = [{ id: 'r1', vehicleId: 'v1', type: 'oil', date: ago(70), km: 46000, total: 250, items: [], source: 'qr', resets: ['oil'], createdAt: '' }];
t('component overdue by km', () => {
  const o = estimateOdometer(pts, 'v1', 50);
  const s = componentStatus(v, 'oil', recs, o);
  assert.equal(s.known, true);
  assert.equal(s.severity, 'danger'); // 14,000 km since change > 10,000
  assert.ok(s.remainingKm! < 0);
});
t('needs: insurance in 12 days is warning; oil overdue is danger first', () => {
  const o = estimateOdometer(pts, 'v1', 50);
  const comps = ALL_COMPONENTS.map((c) => componentStatus(v, c, recs, o));
  const needs = vehicleNeeds(v, comps, o, fuelStats([], 'v1'));
  assert.equal(needs[0].severity, 'danger');
  assert.ok(needs.some((x) => x.kind === 'document' && x.severity === 'warning'));
  const h = healthScore(v, comps, o, 1);
  assert.ok(h.score >= 0 && h.score <= 100);
  assert.equal(h.parts.reduce((s, p) => s + p.max, 0), 100);
});
t('fuel efficiency between full fill-ups and >15% drop alert', () => {
  const f = (km: number, l: number, full = true): FuelFillUp => ({ id: String(km), vehicleId: 'v1', date: ago(1), km, liters: l, total: l * 2.33, pricePerLiter: 2.33, full });
  const s = fuelStats([f(1000, 50), f(1600, 50), f(2200, 50), f(2800, 50), f(3200, 50)], 'v1');
  assert.equal(s.samples.length, 4);
  assert.equal(s.samples[0].kmPerL, 12);
  assert.equal(s.latest, 8);
  assert.equal(s.alert, true);
});
t('factory schedule stages', () => {
  const st = buildStages(37000, 50);
  assert.equal(st.find((x) => x.status === 'current')!.km, 40000);
  assert.ok(st.find((x) => x.km === 40000)!.services.some((s) => s.id === 'air_filter'));
});
t('numeric inputs accept digits only (Arabic-Indic converted)', () => {
  assert.equal(sanitizeNumeric('١٢٣abc٤', 'int'), '1234');
  assert.equal(sanitizeNumeric('12.5.3', 'int'), '1253');
  assert.equal(sanitizeNumeric('١٢٫٥٠ر.س', 'decimal'), '12.50');
  assert.equal(sanitizeNumeric('1.2.3', 'decimal'), '1.23');
  assert.equal(sanitizeNumeric('+966 5x0', 'phone'), '+96650');
});
t('oil interval from last record drives oil life; filter = every other change', () => {
  const o = estimateOdometer(pts, 'v1', 50);
  const r5k: MaintenanceRecord = { ...recs[0], id: 'o5', resets: ['oil', 'oil_filter'], oil: { intervalKm: 5000, intervalMonths: 4, filterChanged: true } };
  assert.equal(componentLife(v, 'oil', [r5k]).km, 5000);
  assert.equal(componentLife(v, 'oil_filter', [r5k]).km, 10000);
  const r15k: MaintenanceRecord = { ...r5k, id: 'o15', oil: { intervalKm: 15000, intervalMonths: 9, filterChanged: true } };
  assert.equal(componentLife(v, 'oil', [r15k]).km, 15000);
  assert.equal(componentStatus(v, 'oil', [r15k], o).severity, 'warning'); // 14,000 of 15,000
  // تبديلة بدون فلتر: الزيت يُصفَّر والفلتر يبقى محسوباً من التبديلة السابقة
  const older: MaintenanceRecord = { ...r5k, id: 'a', date: ago(200), km: 40000, oil: { intervalKm: 10000, intervalMonths: 6, filterChanged: true } };
  const newer: MaintenanceRecord = { ...r5k, id: 'b', date: ago(70), km: 46000, resets: ['oil'], oil: { intervalKm: 10000, intervalMonths: 6, filterChanged: false } };
  const f = componentStatus(v, 'oil_filter', [older, newer], o);
  assert.equal(f.lastKm, 40000);
  assert.equal(f.life.km, 20000);
});
t('battery warranty status and expiry reminder', () => {
  const b: MaintenanceRecord = { ...recs[0], id: 'bat', type: 'battery', resets: ['battery'], warranty: { months: 12, expiry: toISODate(addDays(new Date(), 20)) } };
  const w = warrantyStatus(v, 'battery', [b])!;
  assert.equal(w.active, true);
  assert.equal(w.severity, 'warning');
  const o = estimateOdometer(pts, 'v1', 50);
  const comps = ALL_COMPONENTS.map((c) => componentStatus(v, c, [b], o));
  const needs = vehicleNeeds(v, comps, o, fuelStats([], 'v1'), new Date(), [w]);
  assert.ok(needs.some((x) => x.kind === 'warranty'));
  // استُبدلت البطارية لاحقاً بدون ضمان: لا ضمان للقطعة الحالية
  const b2: MaintenanceRecord = { ...b, id: 'bat2', date: ago(1), warranty: undefined };
  assert.equal(warrantyStatus(v, 'battery', [b, b2]), null);
});
t('oil suggestion per car', () => {
  assert.equal(suggestOil('تويوتا', 'كامري', 2022).viscosity, '0W-20');
  assert.equal(suggestOil('تويوتا', 'هايلكس', 2020).viscosity, '5W-30');
  assert.equal(suggestOil('شيفروليه', 'تاهو', 2019).spec, 'dexos1');
  assert.equal(suggestOil('ماركة غير معروفة', '', 2001).intervalKm, 5000);
});
console.log(`\n${n} tests passed`);
