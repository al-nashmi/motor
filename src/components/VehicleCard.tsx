// بطاقة المركبة — جدول 13
import { router } from 'expo-router';
import { View } from 'react-native';
import { DOC_LABELS, MAIN_DOCS, RECORD_LABELS } from '@/lib/catalog';
import { daysUntil, fmtDate, relativeDays } from '@/lib/dates';
import { findDoc } from '@/lib/engine';
import { fmtKm } from '@/lib/format';
import { severityColors, useTheme } from '@/lib/theme';
import type { VehicleInsights } from '@/store/useInsights';
import { useStore } from '@/store/useStore';
import { Button, Card, DocBadge, HealthRing, Plate, Row, StatusPill, Txt } from './ui';

export function VehicleCard({ ins }: { ins: VehicleInsights }) {
  const { c } = useTheme();
  const calendar = useStore((s) => s.settings.calendar);
  const v = ins.vehicle;
  const sc = severityColors(c, ins.severity);
  const top = ins.needs.find((n) => n.severity === 'danger' || n.severity === 'warning');
  const odoStale = ins.odo.daysSinceReading != null && ins.odo.daysSinceReading > 90;
  const allExpired = MAIN_DOCS.every((t) => {
    const d = findDoc(v, t);
    return d && daysUntil(d.expiry) < 0;
  });

  return (
    <Card accent={sc.fg} onPress={() => router.push(`/vehicle/${v.id}`)}>
      <View style={{ gap: 12 }}>
        <Row style={{ alignItems: 'flex-start' }} gap={12}>
          <View style={{ flex: 1, gap: 6 }}>
            <Plate numbers={v.plateNumbers} letters={v.plateLetters} size="sm" />
            <Txt v="title2">
              {v.nickname ? `${v.nickname} · ` : ''}
              {v.make} {v.model} {v.year}
            </Txt>
            {allExpired ? (
              <StatusPill severity="danger" label="لا تُقَد هذه المركبة حتى تجديد الوثائق" />
            ) : top ? (
              <StatusPill severity={top.severity} label={top.title} />
            ) : (
              <StatusPill severity="ok" label="كل شيء سليم" />
            )}
          </View>
          <HealthRing score={ins.health.score} size={50} />
        </Row>

        <Row style={{ justifyContent: 'space-around' }}>
          {MAIN_DOCS.map((t) => {
            const d = findDoc(v, t);
            return (
              <DocBadge
                key={t}
                label={DOC_LABELS[t]}
                days={d ? daysUntil(d.expiry) : null}
                onPress={() => router.push(d ? `/vehicle/document?vehicleId=${v.id}&docId=${d.id}` : `/vehicle/document?vehicleId=${v.id}&type=${t}`)}
              />
            );
          })}
        </Row>

        <View style={{ gap: 4 }}>
          <Row>
            <Txt v="caption" color={c.muted}>
              العداد:
            </Txt>
            {ins.odo.km != null ? (
              <Txt v="bodyBold" color={odoStale ? c.warningText : c.muted}>
                {fmtKm(ins.odo.km)}
                {ins.odo.estimated ? ' (مقدَّر)' : ''}
                {ins.odo.lastDate ? ` · آخر قراءة ${relativeDays(-(ins.odo.daysSinceReading ?? 0))}` : ''}
              </Txt>
            ) : (
              <Txt v="caption" color={c.muted}>
                غير مُدخل
              </Txt>
            )}
          </Row>
          <Row>
            <Txt v="caption" color={c.muted}>
              آخر صيانة:
            </Txt>
            <Txt v="caption" color={c.text} numberOfLines={1} style={{ flex: 1 }}>
              {ins.lastRecord ? `${RECORD_LABELS[ins.lastRecord.type]} · ${fmtKm(ins.lastRecord.km)} · ${fmtDate(ins.lastRecord.date, calendar)}` : 'لا يوجد بعد'}
            </Txt>
          </Row>
        </View>

        <Row gap={10}>
          <Button title="تسجيل صيانة" icon="add-circle" small style={{ flex: 1 }} onPress={() => router.push(`/record/new?vehicleId=${v.id}`)} />
          <Button title="تفاصيل" variant="secondary" small style={{ flex: 1 }} onPress={() => router.push(`/vehicle/${v.id}`)} />
        </Row>
      </View>
    </Card>
  );
}
