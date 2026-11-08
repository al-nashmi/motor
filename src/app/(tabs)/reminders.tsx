// S12 — مركز التذكيرات
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, ChipRow, EmptyState, Row, Screen, Txt } from '@/components/ui';
import type { NeedItem } from '@/lib/engine';
import { severityColors, useTheme } from '@/lib/theme';
import { useAllInsights } from '@/store/useInsights';
import { useStore } from '@/store/useStore';

const KIND_ICON = { document: 'document-text', component: 'construct', odometer: 'speedometer', fuel: 'flame', warranty: 'shield-checkmark' } as const;

export default function Reminders() {
  const { c } = useTheme();
  const insights = useAllInsights();
  const snoozes = useStore((s) => s.snoozes);
  const snooze = useStore((s) => s.snooze);
  const [filter, setFilter] = useState<'active' | 'snoozed'>('active');

  const vname = useMemo(() => new Map(insights.map((i) => [i.vehicle.id, i.vehicle.nickname || `${i.vehicle.make} ${i.vehicle.model}`])), [insights]);
  const { active, snoozed } = useMemo(() => {
    const now = Date.now();
    const all = insights.flatMap((i) => i.needs);
    const isSnoozed = (n: NeedItem) => !!snoozes[n.key] && new Date(snoozes[n.key]).getTime() > now;
    const rank = { danger: 0, warning: 1, info: 2, ok: 3 };
    const sorter = (a: NeedItem, b: NeedItem) => rank[a.severity] - rank[b.severity] || a.sort - b.sort;
    return { active: all.filter((n) => !isSnoozed(n)).sort(sorter), snoozed: all.filter(isSnoozed).sort(sorter) };
  }, [insights, snoozes]);

  const list = filter === 'active' ? active : snoozed;

  return (
    <Screen edges={[]}>
      <ChipRow>
        <Chip label={`نشطة (${active.length})`} selected={filter === 'active'} onPress={() => setFilter('active')} />
        <Chip label={`مؤجلة (${snoozed.length})`} selected={filter === 'snoozed'} onPress={() => setFilter('snoozed')} />
      </ChipRow>
      {insights.length === 0 ? (
        <EmptyState icon="notifications-outline" title="لا توجد تذكيرات" body="أضف مركبة وتواريخ وثائقها لتبدأ التذكيرات." action="أضف مركبة" onAction={() => router.push('/vehicle/edit')} />
      ) : list.length === 0 ? (
        <EmptyState icon="checkmark-done-circle-outline" title={filter === 'active' ? 'لا شيء يحتاج انتباهك الآن' : 'لا توجد تذكيرات مؤجلة'} body="سنخبرك فور اقتراب أي موعد." />
      ) : (
        list.map((n) => {
          const sc = severityColors(c, n.severity);
          return (
            <Card key={n.key} accent={sc.fg}>
              <View style={{ gap: 8 }}>
                <Row gap={10} style={{ alignItems: 'flex-start' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: sc.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={KIND_ICON[n.kind]} size={18} color={sc.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="bodyBold">{n.title}</Txt>
                    <Txt v="caption" color={c.muted}>
                      {vname.get(n.vehicleId)} · {n.subtitle}
                    </Txt>
                    {filter === 'snoozed' && snoozes[n.key] ? (
                      <Txt v="caption" color={c.muted}>
                        مؤجل حتى {new Date(snoozes[n.key]).toLocaleDateString('ar-SA-u-nu-latn')}
                      </Txt>
                    ) : null}
                  </View>
                </Row>
                <Row gap={8}>
                  <Button title={n.action.label} small style={{ flex: 1 }} onPress={() => router.push(n.action.href as never)} />
                  {filter === 'active' && n.severity !== 'danger' ? (
                    <Button title="أجّل أسبوعاً" small variant="secondary" onPress={() => snooze(n.key, 7)} />
                  ) : filter === 'active' ? (
                    <Button title="أجّل يوماً" small variant="secondary" onPress={() => snooze(n.key, 1)} />
                  ) : (
                    <Button title="إلغاء التأجيل" small variant="secondary" onPress={() => snooze(n.key, 0)} />
                  )}
                </Row>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
