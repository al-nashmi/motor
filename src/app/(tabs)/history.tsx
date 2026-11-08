// S08 — سجل الصيانة الموحّد مع البحث النصي والفلاتر (7.5)
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { RecordRow } from '@/components/RecordRow';
import { Button, Card, Chip, ChipRow, EmptyState, Field, Row, Screen, Txt } from '@/components/ui';
import { CATEGORY_LABELS, RECORD_LABELS } from '@/lib/catalog';
import { addMonths, toISODate } from '@/lib/dates';
import { fmtNum, fmtSAR } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { RecordType } from '@/lib/types';
import { useStore } from '@/store/useStore';

type Period = '3m' | '1y' | 'all';

/** تطبيع عربي بسيط للبحث: الألف والتاء المربوطة والياء وأل التعريف */
function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ً-ْ]/g, '');
}

export default function History() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const records = useStore((s) => s.records);
  const vehicles = useStore((s) => s.vehicles);
  const [q, setQ] = useState('');
  const [vehicleId, setVehicleId] = useState<string | undefined>(params.vehicleId);
  const [type, setType] = useState<RecordType | undefined>();
  const [period, setPeriod] = useState<Period>('all');
  useEffect(() => {
    if (params.vehicleId) setVehicleId(params.vehicleId);
  }, [params.vehicleId]);

  const active = vehicles.filter((v) => !v.deletedAt);
  const vmap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const results = useMemo(() => {
    const terms = norm(q.trim())
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.replace(/^ال/, ''));
    const since = period === '3m' ? toISODate(addMonths(new Date(), -3)) : period === '1y' ? toISODate(addMonths(new Date(), -12)) : '';
    return records
      .filter((r) => {
        const v = vmap.get(r.vehicleId);
        if (!v || v.deletedAt) return false;
        if (vehicleId && r.vehicleId !== vehicleId) return false;
        if (type && r.type !== type) return false;
        if (since && r.date < since) return false;
        if (!terms.length) return true;
        const hay = norm(
          [RECORD_LABELS[r.type], r.shop, r.notes, r.doneBy, r.tire?.size, r.tire?.brand, v.make, v.model, v.nickname, ...r.items.map((i) => `${i.description} ${CATEGORY_LABELS[i.category]}`)]
            .filter(Boolean)
            .join(' '),
        );
        return terms.every((t) => hay.includes(t));
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.km - a.km);
  }, [records, vmap, q, vehicleId, type, period]);

  const total = results.reduce((s, r) => s + r.total, 0);

  return (
    <Screen edges={[]}>
      <Field label="ابحث في ذاكرتك" placeholder="مثلاً: زيت، كفرات، اسم الورشة…" value={q} onChangeText={setQ} returnKeyType="search" />
      {active.length > 1 ? (
        <ChipRow>
          <Chip label="كل المركبات" selected={!vehicleId} onPress={() => setVehicleId(undefined)} />
          {active.map((v) => (
            <Chip key={v.id} label={v.nickname || `${v.make} ${v.model}`} selected={vehicleId === v.id} onPress={() => setVehicleId(v.id)} />
          ))}
        </ChipRow>
      ) : null}
      <ChipRow>
        <Chip label="كل الأنواع" selected={!type} onPress={() => setType(undefined)} />
        {(Object.keys(RECORD_LABELS) as RecordType[]).map((t) => (
          <Chip key={t} label={RECORD_LABELS[t]} selected={type === t} onPress={() => setType(type === t ? undefined : t)} />
        ))}
      </ChipRow>
      <ChipRow>
        <Chip label="آخر 3 أشهر" selected={period === '3m'} onPress={() => setPeriod('3m')} />
        <Chip label="آخر سنة" selected={period === '1y'} onPress={() => setPeriod('1y')} />
        <Chip label="الكل" selected={period === 'all'} onPress={() => setPeriod('all')} />
      </ChipRow>

      {records.length > 0 ? (
        <Card style={{ backgroundColor: c.primary }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Txt v="caption" color={c.onPrimary}>
                إجمالي إنفاق الفترة
              </Txt>
              <Txt v="title1" color={c.onPrimary}>
                {fmtSAR(total)}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt v="caption" color={c.onPrimary}>
                عدد العمليات
              </Txt>
              <Txt v="title1" color={c.onPrimary}>
                {fmtNum(results.length)}
              </Txt>
            </View>
          </Row>
        </Card>
      ) : null}

      {records.length === 0 ? (
        <EmptyState icon="receipt-outline" title="لا توجد سجلات بعد" body="كل عملية صيانة تسجّلها تصبح ذاكرة قابلة للبحث: متى فعلت؟ وبكم؟" action="تسجيل عملية صيانة" onAction={() => router.push('/record/new')} />
      ) : results.length === 0 ? (
        <Txt center color={c.muted} style={{ padding: 20 }}>
          لا توجد نتائج مطابقة. جرّب كلمة أخرى أو وسّع الفترة.
        </Txt>
      ) : (
        results.map((r) => <RecordRow key={r.id} r={r} vehicle={active.length > 1 ? vmap.get(r.vehicleId) : undefined} />)
      )}
      {records.length > 0 ? <Button title="تسجيل عملية جديدة" icon="add" onPress={() => router.push(vehicleId ? `/record/new?vehicleId=${vehicleId}` : '/record/new')} /> : null}
    </Screen>
  );
}
