// S13 — المصروفات والتقارير (7.9)
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Chip, ChipRow, EmptyState, Row, Screen, Segmented, SectionTitle, Txt } from '@/components/ui';
import { CATEGORY_LABELS, COMPONENT_LABELS, RECORD_DEFAULT_RESETS } from '@/lib/catalog';
import { addMonths, fmtMonthShort, toISODate } from '@/lib/dates';
import { fmtNum, fmtSAR } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { Category, ComponentType, RecordType } from '@/lib/types';
import { useAllInsights } from '@/store/useInsights';
import { useStore } from '@/store/useStore';

type Period = '3' | '6' | '12' | 'all';
const CAT_COLORS: Record<Category, string> = {
  oil: '#0EA5E9',
  tires: '#8B5CF6',
  parts: '#F97316',
  periodic: '#10B981',
  labor: '#64748B',
  documents: '#EAB308',
  fuel: '#EF4444',
  other: '#94A3B8',
};
// متوسط تكلفة افتراضي عند غياب بيانات سابقة لنفس النوع (تقديري)
const FALLBACK_COST: Partial<Record<ComponentType, number>> = { oil: 250, oil_filter: 40, tires: 1600, battery: 450, air_filter: 80, ac_filter: 90, brake_fluid: 150 };

export default function Analytics() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const records = useStore((s) => s.records);
  const fills = useStore((s) => s.fuel);
  const insights = useAllInsights();
  const [period, setPeriod] = useState<Period>('12');
  const [vehicleId, setVehicleId] = useState<string | undefined>(params.vehicleId);
  const [showBasis, setShowBasis] = useState(false);

  const data = useMemo(() => {
    const months = period === 'all' ? null : Number(period);
    const since = months ? toISODate(addMonths(new Date(), -months)) : '';
    const ids = new Set(insights.map((i) => i.vehicle.id));
    const recs = records.filter((r) => ids.has(r.vehicleId) && (!vehicleId || r.vehicleId === vehicleId) && (!since || r.date >= since));
    const fuel = fills.filter((f) => ids.has(f.vehicleId) && (!vehicleId || f.vehicleId === vehicleId) && (!since || f.date >= since));

    const byCat = new Map<Category, number>();
    for (const r of recs) {
      for (const i of r.items) byCat.set(i.category, (byCat.get(i.category) ?? 0) + i.price * i.qty);
      if (r.vat) byCat.set('other', (byCat.get('other') ?? 0) + r.vat);
      const diff = r.total - r.items.reduce((s, i) => s + i.price * i.qty, 0) - (r.vat ?? 0);
      if (Math.abs(diff) > 1) byCat.set('other', (byCat.get('other') ?? 0) + diff);
    }
    const fuelTotal = fuel.reduce((s, f) => s + f.total, 0);
    if (fuelTotal) byCat.set('fuel', fuelTotal);
    const total = [...byCat.values()].reduce((s, v) => s + v, 0);
    const cats = [...byCat.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

    // الاتجاه الشهري
    const span = months ?? 12;
    const trend: { label: string; key: string; value: number }[] = [];
    for (let i = span - 1; i >= 0; i--) {
      const d = addMonths(new Date(new Date().getFullYear(), new Date().getMonth(), 1), -i);
      const key = toISODate(d).slice(0, 7);
      trend.push({ label: fmtMonthShort(d), key, value: 0 });
    }
    const tmap = new Map(trend.map((t) => [t.key, t]));
    for (const r of recs) {
      const t = tmap.get(r.date.slice(0, 7));
      if (t) t.value += r.total;
    }
    for (const f of fuel) {
      const t = tmap.get(f.date.slice(0, 7));
      if (t) t.value += f.total;
    }
    const activeMonths = months ?? Math.max(1, trend.filter((t) => t.value > 0).length);

    // التوقعات: مكوّنات مستحقة خلال 30 يوماً × متوسط تكلفتها السابقة + متوسط الوقود الشهري
    const scope = insights.filter((i) => !vehicleId || i.vehicle.id === vehicleId);
    const due: { label: string; cost: number; basis: string }[] = [];
    for (const ins of scope) {
      for (const cs of ins.comps) {
        if (!cs.known || cs.remainingDays == null || cs.remainingDays > 30) continue;
        const types = (Object.keys(RECORD_DEFAULT_RESETS) as RecordType[]).filter((t) => RECORD_DEFAULT_RESETS[t].includes(cs.type));
        const past = records.filter((r) => r.resets.includes(cs.type) && types.includes(r.type));
        const avg = past.length ? past.reduce((s, r) => s + r.total, 0) / past.length : FALLBACK_COST[cs.type] ?? 0;
        due.push({ label: `${COMPONENT_LABELS[cs.type]} — ${ins.vehicle.nickname || ins.vehicle.model}`, cost: avg, basis: past.length ? `متوسط ${past.length} عملية سابقة` : 'تقدير عام (لا توجد عمليات سابقة)' });
      }
    }
    const fuelMonths = new Set(fills.filter((f) => !vehicleId || f.vehicleId === vehicleId).map((f) => f.date.slice(0, 7))).size;
    const fuelMonthly = fuelMonths ? fills.filter((f) => !vehicleId || f.vehicleId === vehicleId).reduce((s, f) => s + f.total, 0) / fuelMonths : 0;
    const forecast = due.reduce((s, d) => s + d.cost, 0) + fuelMonthly;

    return { total, cats, trend, monthly: total / activeMonths, count: recs.length, forecast, due, fuelMonthly };
  }, [records, fills, insights, period, vehicleId]);

  const maxTrend = Math.max(...data.trend.map((t) => t.value), 1);
  const showTrend = data.trend.length <= 12 ? data.trend : data.trend.slice(-12);

  if (insights.length === 0) return <Screen><EmptyState icon="stats-chart-outline" title="لا توجد بيانات بعد" body="أضف مركبة وسجّل عملياتك لتظهر التحليلات." /></Screen>;

  return (
    <Screen>
      <Segmented
        options={[
          { value: '3', label: '3 أشهر' },
          { value: '6', label: '6 أشهر' },
          { value: '12', label: 'سنة' },
          { value: 'all', label: 'الكل' },
        ]}
        value={period}
        onChange={setPeriod}
      />
      {insights.length > 1 ? (
        <ChipRow>
          <Chip label="كل المركبات" selected={!vehicleId} onPress={() => setVehicleId(undefined)} />
          {insights.map((i) => (
            <Chip key={i.vehicle.id} label={i.vehicle.nickname || `${i.vehicle.make} ${i.vehicle.model}`} selected={vehicleId === i.vehicle.id} onPress={() => setVehicleId(i.vehicle.id)} />
          ))}
        </ChipRow>
      ) : null}

      <Row gap={10}>
        <Card style={{ flex: 1.3, backgroundColor: c.primary }}>
          <Txt v="caption" color={c.onPrimary}>
            إجمالي الإنفاق
          </Txt>
          <Txt v="title1" color={c.onPrimary}>
            {fmtSAR(data.total)}
          </Txt>
          <Txt v="caption" color={c.onPrimary}>
            {fmtNum(data.count)} عملية صيانة + الوقود
          </Txt>
        </Card>
        <Card style={{ flex: 1 }}>
          <Txt v="caption" color={c.muted}>
            المتوسط الشهري
          </Txt>
          <Txt v="title1">{fmtSAR(Math.round(data.monthly))}</Txt>
        </Card>
      </Row>

      <Card style={{ gap: 8 }}>
        <Txt v="caption" color={c.muted}>
          التكلفة المتوقعة للشهر القادم
        </Txt>
        <Txt v="title1">نحو {fmtSAR(Math.round(data.forecast))}</Txt>
        <Pressable onPress={() => setShowBasis((s) => !s)} hitSlop={8}>
          <Txt v="bodyBold" color={c.successText}>
            {showBasis ? 'إخفاء الأساس' : 'كيف حسبنا هذا؟'}
          </Txt>
        </Pressable>
        {showBasis ? (
          <View style={{ gap: 4 }}>
            <Txt v="caption" color={c.muted}>
              الأساس: المكوّنات المتوقع استحقاقها خلال 30 يوماً (من معدل استخدامك الفعلي وقراءات العداد) × متوسط تكلفتها السابقة، + متوسط إنفاقك الشهري على الوقود.
            </Txt>
            {data.due.map((d) => (
              <Txt key={d.label} v="caption">
                • {d.label}: {fmtSAR(Math.round(d.cost))} ({d.basis})
              </Txt>
            ))}
            {data.fuelMonthly ? <Txt v="caption">• الوقود: {fmtSAR(Math.round(data.fuelMonthly))} شهرياً</Txt> : null}
            {!data.due.length && !data.fuelMonthly ? <Txt v="caption">لا توجد مستحقات متوقعة خلال الشهر القادم.</Txt> : null}
          </View>
        ) : null}
      </Card>

      <SectionTitle title="توزيع الفئات" />
      <Card style={{ gap: 10 }}>
        {data.cats.length === 0 ? (
          <Txt color={c.muted}>لا يوجد إنفاق في هذه الفترة.</Txt>
        ) : (
          <>
            <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' }}>
              {data.cats.map(([cat, v]) => (
                <View key={cat} style={{ flex: v, backgroundColor: CAT_COLORS[cat] }} />
              ))}
            </View>
            {data.cats.map(([cat, v]) => (
              <Row key={cat}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: CAT_COLORS[cat] }} />
                <Txt style={{ flex: 1 }}>{CATEGORY_LABELS[cat]}</Txt>
                <Txt v="caption" color={c.muted}>
                  {fmtNum((v / data.total) * 100)}%
                </Txt>
                <Txt v="bodyBold" style={{ minWidth: 90, textAlign: 'right' }}>
                  {fmtSAR(Math.round(v))}
                </Txt>
              </Row>
            ))}
          </>
        )}
      </Card>

      <SectionTitle title="اتجاه الإنفاق الشهري" />
      <Card>
        <Row style={{ alignItems: 'flex-end', height: 140 }} gap={4}>
          {showTrend.map((t) => (
            <View key={t.key} style={{ flex: 1, alignItems: 'center', gap: 4 }} accessibilityLabel={`${t.label}: ${Math.round(t.value)} ريال`}>
              <View style={{ width: '80%', height: Math.max(3, (t.value / maxTrend) * 110), backgroundColor: t.value ? c.success : c.border, borderRadius: 4 }} />
              <Txt v="badge" color={c.muted} style={{ fontSize: 9 }} numberOfLines={1}>
                {t.label.slice(0, 3)}
              </Txt>
            </View>
          ))}
        </Row>
      </Card>

      {vehicleId ? <Button title="تصدير تقرير العناية (PDF)" icon="document-text" onPress={() => router.push(`/vehicle/report?vehicleId=${vehicleId}`)} /> : null}
    </Screen>
  );
}
