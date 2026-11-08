// S05 — قائمة الكراج
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Chip, ChipRow, EmptyState, Field, IconButton, Row, Screen, Txt } from '@/components/ui';
import { VehicleCard } from '@/components/VehicleCard';
import { DOC_LABELS } from '@/lib/catalog';
import { daysSince, daysUntil } from '@/lib/dates';
import { session } from '@/lib/session';
import { useTheme } from '@/lib/theme';
import { useAllInsights } from '@/store/useInsights';
import { useStore } from '@/store/useStore';

type Sort = 'priority' | 'name' | 'docs';
const RANK = { danger: 0, warning: 1, info: 2, ok: 3 } as const;

export default function Garage() {
  const { c } = useTheme();
  const insights = useAllInsights();
  const user = useStore((s) => s.user);
  const [sort, setSort] = useState<Sort>('priority');
  const [q, setQ] = useState('');
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const list = useMemo(() => {
    const query = q.trim();
    const filtered = query
      ? insights.filter((i) => `${i.vehicle.make} ${i.vehicle.model} ${i.vehicle.nickname ?? ''} ${i.vehicle.plateNumbers} ${i.vehicle.plateLetters}`.includes(query))
      : insights;
    const minDoc = (i: (typeof insights)[number]) => Math.min(...i.vehicle.documents.map((d) => daysUntil(d.expiry)), 99999);
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return `${a.vehicle.make}${a.vehicle.model}`.localeCompare(`${b.vehicle.make}${b.vehicle.model}`, 'ar');
      if (sort === 'docs') return minDoc(a) - minDoc(b);
      return RANK[a.severity] - RANK[b.severity] || minDoc(a) - minDoc(b) || a.health.score - b.health.score;
    });
  }, [insights, sort, q]);

  const staleCount = insights.filter((i) => i.odo.daysSinceReading != null && i.odo.daysSinceReading > 90).length;

  // أهلاً بعودتك — غياب 3 أشهر أو أكثر
  const away = session.previousOpenedAt ? daysSince(session.previousOpenedAt) : 0;
  const expiredWhileAway = useMemo(
    () =>
      away >= 90
        ? insights.flatMap((i) => i.vehicle.documents.filter((d) => daysUntil(d.expiry) < 0 && daysUntil(d.expiry) >= -away).map((d) => `${DOC_LABELS[d.type]} — ${i.vehicle.make} ${i.vehicle.model}`))
        : [],
    [away, insights],
  );

  return (
    <>
      <Screen edges={['top']}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt v="display">كراجي</Txt>
            <Txt color={c.muted}>
              {user ? `أهلاً ${user.name} · ` : ''}
              {insights.length} {insights.length === 1 ? 'مركبة' : 'مركبات'}
            </Txt>
          </View>
          <IconButton icon="stats-chart" label="المصروفات والتقارير" onPress={() => router.push('/analytics')} />
          <IconButton icon="add-circle" label="إضافة مركبة" color={c.successText} onPress={() => router.push('/vehicle/edit')} />
        </Row>

        {away >= 90 && !welcomeDismissed ? (
          <Banner
            severity="info"
            title="أهلاً بعودتك! 👋"
            body={
              expiredWhileAway.length
                ? `خلال غيابك انتهت: ${expiredWhileAway.join('، ')}. وهل قمت بصيانة لم تسجّلها؟ سجّلها بسرعة الآن.`
                : 'مرّ وقت منذ آخر زيارة. هل قمت بصيانة لم تسجّلها؟ حدّث العداد وسجّل ما فاتك بسرعة.'
            }
            action="حسناً"
            onAction={() => setWelcomeDismissed(true)}
          />
        ) : null}

        {staleCount > 0 ? (
          <Banner severity="warning" title={`${staleCount === 1 ? 'مركبة واحدة' : `${staleCount} مركبات`} دون تحديث عداد منذ أكثر من 90 يوماً`} body="القراءة الحديثة تحافظ على دقة تذكيرات الصيانة." />
        ) : null}

        {insights.length === 0 ? (
          <EmptyState
            icon="car-sport-outline"
            title="كراجك فارغ"
            body="أول مركبة تستغرق دقيقة واحدة — الشركة والموديل ورقم اللوحة تكفي للبدء."
            action="أضف مركبتك الأولى"
            onAction={() => router.push('/vehicle/edit')}
          />
        ) : (
          <>
            {insights.length > 2 ? <Field label="بحث" placeholder="ابحث باللوحة أو الموديل" value={q} onChangeText={setQ} /> : null}
            {insights.length > 1 ? (
              <ChipRow>
                <Chip label="بالأولوية" selected={sort === 'priority'} onPress={() => setSort('priority')} icon="flash" />
                <Chip label="بانتهاء الوثائق" selected={sort === 'docs'} onPress={() => setSort('docs')} icon="document-text" />
                <Chip label="بالاسم" selected={sort === 'name'} onPress={() => setSort('name')} icon="text" />
              </ChipRow>
            ) : null}
            {list.map((i) => (
              <VehicleCard key={i.vehicle.id} ins={i} />
            ))}
            {list.length === 0 ? <Txt center color={c.muted}>لا توجد نتائج مطابقة</Txt> : null}
            {insights.length === 1 && insights[0].recordsCount === 0 ? (
              <Banner severity="info" title="سجّل أول عملية صيانة" body="امسح رمز QR في فاتورة آخر تغيير زيت — تبدأ ذاكرة المكوّنات من هنا." action="تسجيل صيانة" onAction={() => router.push(`/record/new?vehicleId=${insights[0].vehicle.id}`)} />
            ) : null}
            <Button title="إضافة مركبة" icon="add" variant="secondary" onPress={() => router.push('/vehicle/edit')} />
          </>
        )}
      </Screen>
    </>
  );
}
