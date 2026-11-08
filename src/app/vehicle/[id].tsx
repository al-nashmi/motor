// S06 + S07 — تفاصيل المركبة و«ما تحتاجه الآن»
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, View } from 'react-native';
import { RecordRow } from '@/components/RecordRow';
import {
  Banner,
  Button,
  Card,
  DocBadge,
  EmptyState,
  FWD,
  HealthRing,
  IconButton,
  Plate,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
  StatusPill,
  Txt,
} from '@/components/ui';
import { COMPONENT_ICONS, COMPONENT_LABELS, DOC_LABELS, MAIN_DOCS, OIL_BASE_LABELS } from '@/lib/catalog';
import { suggestOil } from '@/lib/oil';
import { daysUntil, fmtDate, relativeDays } from '@/lib/dates';
import { findDoc } from '@/lib/engine';
import { fmtKm, fmtNum } from '@/lib/format';
import { buildStages, GENERIC_TEMPLATE } from '@/lib/schedule';
import { severityColors, useTheme } from '@/lib/theme';
import { useInsights } from '@/store/useInsights';
import { useStore } from '@/store/useStore';

export default function VehicleDetails() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ins = useInsights(id);
  const records = useStore((s) => s.records);
  const calendar = useStore((s) => s.settings.calendar);
  const archive = useStore((s) => s.archiveVehicle);
  const del = useStore((s) => s.deleteVehicle);
  const [showHealth, setShowHealth] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  if (!ins) return <Screen><EmptyState icon="car-outline" title="المركبة غير موجودة" body="ربما حُذفت. يمكنك استعادتها من الإعدادات خلال 14 يوماً." /></Screen>;
  const v = ins.vehicle;
  const oilTip = suggestOil(v.make, v.model, v.year);
  const recent = records
    .filter((r) => r.vehicleId === v.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.km - a.km)
    .slice(0, 3);
  const otherDocs = v.documents.filter((d) => !MAIN_DOCS.includes(d.type));
  const stages = ins.odo.km != null ? buildStages(ins.odo.km, ins.odo.dailyRate, v.disabledScheduleItems) : [];

  const menu = () => {
    const options = ['تعديل البيانات', v.archivedAt ? 'إعادة للكراج' : 'أرشفة (بعد البيع)', 'حذف المركبة', 'إلغاء'];
    const handle = (i: number) => {
      if (i === 0) router.push(`/vehicle/edit?id=${v.id}`);
      if (i === 1) {
        archive(v.id, !v.archivedAt);
        if (!v.archivedAt) router.back();
      }
      if (i === 2)
        Alert.alert('حذف المركبة؟', 'يمكنك استعادتها مع كامل السجل والفواتير خلال 14 يوماً من الإعدادات.', [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'حذف',
            style: 'destructive',
            onPress: () => {
              del(v.id);
              router.back();
            },
          },
        ]);
    };
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 3, destructiveButtonIndex: 2 }, handle);
    else
      Alert.alert('خيارات المركبة', undefined, [
        { text: options[0], onPress: () => handle(0) },
        { text: options[1], onPress: () => handle(1) },
        { text: options[2], style: 'destructive', onPress: () => handle(2) },
        { text: 'إلغاء', style: 'cancel' },
      ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: v.nickname || `${v.make} ${v.model}`, headerRight: () => <IconButton icon="ellipsis-horizontal-circle" label="خيارات المركبة" onPress={menu} /> }} />
      <Screen>
        {v.archivedAt ? <Banner severity="info" title="مركبة مؤرشفة" body="السجل محفوظ لكنها خارج الكراج النشط والتذكيرات." /> : null}

        {/* رأس المركبة */}
        <Card>
          <Row style={{ alignItems: 'flex-start' }} gap={12}>
            <View style={{ flex: 1, gap: 6 }}>
              <Plate numbers={v.plateNumbers} letters={v.plateLetters} />
              <Txt v="title1">
                {v.make} {v.model}
              </Txt>
              <Txt color={c.muted}>
                موديل {v.year}
                {v.vin ? ` · VIN ${v.vin}` : ''}
              </Txt>
            </View>
            <HealthRing score={ins.health.score} size={62} onPress={() => setShowHealth((s) => !s)} />
          </Row>
          {showHealth && (
            <View style={{ marginTop: 12, gap: 10 }}>
              <Txt v="caption" color={c.muted}>
                الدرجة مؤشر للالتزام بالمواعيد واكتمال البيانات، ولا تدّعي تشخيصاً ميكانيكياً.
              </Txt>
              {ins.health.parts.map((p) => (
                <View key={p.label} style={{ gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt v="bodyBold">{p.label}</Txt>
                    <Txt v="bodyBold">
                      {fmtNum(p.score)} / {p.max}
                    </Txt>
                  </Row>
                  <ProgressBar ratio={p.score / p.max} severity={p.score / p.max >= 0.8 ? 'ok' : p.score / p.max >= 0.5 ? 'warning' : 'danger'} />
                  {p.reasons.map((r) => (
                    <Txt key={r} v="caption" color={c.muted}>
                      • {r}
                    </Txt>
                  ))}
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* العداد */}
        <Card onPress={() => router.push(`/vehicle/odometer?vehicleId=${v.id}`)}>
          <Row gap={12}>
            <Ionicons name="speedometer" size={28} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Txt v="caption" color={c.muted}>
                {ins.odo.estimated ? 'العداد المقدَّر الآن' : 'قراءة العداد'}
              </Txt>
              <Txt v="title1">{ins.odo.km != null ? fmtKm(ins.odo.km) : 'غير مُدخل'}</Txt>
              {ins.odo.lastKm != null ? (
                <Txt v="caption" color={ins.odo.stale ? c.warningText : c.muted}>
                  آخر قراءة فعلية {fmtKm(ins.odo.lastKm)} {relativeDays(-(ins.odo.daysSinceReading ?? 0))} · معدل {fmtNum(ins.odo.dailyRate)} كم/يوم
                  {ins.odo.rateSource === 'default' ? ' (افتراضي)' : ''}
                </Txt>
              ) : null}
            </View>
            {ins.odo.estimated ? <StatusPill severity="info" label="مقدَّر" /> : null}
            <Ionicons name={FWD} size={18} color={c.muted} />
          </Row>
        </Card>

        {/* الوثائق */}
        <SectionTitle title="الوثائق" action="+ وثيقة" onAction={() => router.push(`/vehicle/document?vehicleId=${v.id}&type=other`)} />
        <Card>
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
          {otherDocs.map((d) => (
            <Pressable key={d.id} onPress={() => router.push(`/vehicle/document?vehicleId=${v.id}&docId=${d.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <Ionicons name="document-text-outline" size={18} color={c.muted} />
              <Txt v="bodyBold" style={{ flex: 1 }}>
                {d.title || DOC_LABELS[d.type]}
              </Txt>
              <StatusPill
                severity={daysUntil(d.expiry) <= 7 ? 'danger' : daysUntil(d.expiry) <= 30 ? 'warning' : 'ok'}
                label={daysUntil(d.expiry) < 0 ? 'منتهية' : `${fmtDate(d.expiry, calendar)}`}
              />
            </Pressable>
          ))}
        </Card>

        {/* ما تحتاجه الآن */}
        <SectionTitle title="ما تحتاجه الآن" />
        {ins.needs.length === 0 ? (
          <Card>
            <Row>
              <Ionicons name="checkmark-circle" size={22} color={c.success} />
              <Txt v="bodyBold">لا شيء عاجل — مركبتك في وضع ممتاز</Txt>
            </Row>
          </Card>
        ) : (
          ins.needs.map((n) => {
            const sc = severityColors(c, n.severity);
            return (
              <Card key={n.key} accent={sc.fg} onPress={() => router.push(n.action.href as never)}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <Txt v="bodyBold">{n.title}</Txt>
                    <Txt v="caption" color={c.muted}>
                      {n.subtitle}
                    </Txt>
                  </View>
                  <Txt v="bodyBold" color={c.successText}>
                    {n.action.label}
                  </Txt>
                </Row>
              </Card>
            );
          })
        )}

        <Row gap={10}>
          <Button title="تسجيل صيانة" icon="add-circle" style={{ flex: 1 }} onPress={() => router.push(`/record/new?vehicleId=${v.id}`)} />
          <Button title="تعبئة وقود" icon="flame" variant="secondary" style={{ flex: 1 }} onPress={() => router.push(`/vehicle/fuel?vehicleId=${v.id}&add=1`)} />
        </Row>

        {/* المكوّنات */}
        <SectionTitle title="المكوّنات الحرجة" />
        <Card style={{ gap: 14 }}>
          {ins.comps.map((cs) => (
            <Pressable key={cs.type} onPress={() => router.push(`/vehicle/component?vehicleId=${v.id}&type=${cs.type}`)} style={{ gap: 6 }} accessibilityRole="button">
              <Row>
                <Ionicons name={COMPONENT_ICONS[cs.type] as never} size={18} color={c.muted} />
                <Txt v="bodyBold" style={{ flex: 1 }}>
                  {COMPONENT_LABELS[cs.type]}
                </Txt>
                {cs.known ? (
                  <StatusPill severity={cs.severity} label={cs.severity === 'danger' ? 'متجاوز' : cs.severity === 'warning' ? 'يقترب' : 'سليم'} />
                ) : (
                  <Txt v="caption" color={c.muted}>
                    غير مسجّل
                  </Txt>
                )}
              </Row>
              {cs.known ? (
                <>
                  <ProgressBar ratio={cs.ratio} severity={cs.severity} />
                  <Txt v="caption" color={c.muted}>
                    {cs.remainingKm != null && cs.life.km
                      ? cs.remainingKm >= 0
                        ? `متبقٍ نحو ${fmtKm(cs.remainingKm)}`
                        : `متجاوز بـ ${fmtKm(-cs.remainingKm)}`
                      : ''}
                    {cs.dueDate ? `${cs.remainingKm != null && cs.life.km ? ' · ' : ''}الموعد المتوقع ${fmtDate(cs.dueDate, calendar)}` : ''}
                  </Txt>
                </>
              ) : null}
              {cs.type === 'oil' ? (
                <Txt v="caption" color={c.successText}>
                  المقترح لسيارتك: {oilTip.viscosity}
                  {oilTip.alt ? ` أو ${oilTip.alt}` : ''} · {OIL_BASE_LABELS[oilTip.base]}
                </Txt>
              ) : null}
              {(() => {
                const w = ins.warranties.find((x) => x.type === cs.type);
                if (!w) return null;
                return (
                  <Txt v="caption" color={w.active ? (w.severity === 'warning' ? c.warningText : c.successText) : c.muted}>
                    🛡️ {w.active ? `ضمان ساري حتى ${fmtDate(w.expiry, calendar)}` : 'الضمان منتهٍ'}
                  </Txt>
                );
              })()}
            </Pressable>
          ))}
        </Card>

        {/* الوقود */}
        <Card onPress={() => router.push(`/vehicle/fuel?vehicleId=${v.id}`)}>
          <Row gap={12}>
            <Ionicons name="flame" size={24} color={c.warning} />
            <View style={{ flex: 1 }}>
              <Txt v="bodyBold">الوقود وكفاءة الاستهلاك</Txt>
              <Txt v="caption" color={c.muted}>
                {ins.fuel.average != null
                  ? `متوسط ${fmtNum(ins.fuel.average, 1)} كم/لتر · آخر ${fmtNum(ins.fuel.latest ?? 0, 1)} كم/لتر`
                  : 'سجّل تعبئتين كاملتين لحساب الكفاءة'}
              </Txt>
            </View>
            {ins.fuel.alert ? <StatusPill severity="warning" label="انخفاض" /> : null}
            <Ionicons name={FWD} size={18} color={c.muted} />
          </Row>
        </Card>

        {/* آخر العمليات */}
        <SectionTitle title="آخر العمليات" action={ins.recordsCount > 3 ? 'عرض الكل' : undefined} onAction={() => router.push(`/(tabs)/history?vehicleId=${v.id}`)} />
        {recent.length === 0 ? (
          <Txt color={c.muted}>لا توجد عمليات مسجلة بعد.</Txt>
        ) : (
          recent.map((r) => <RecordRow key={r.id} r={r} />)
        )}

        {/* جدول المصنع */}
        <SectionTitle title="جدول الصيانة الدورية" action={showSchedule ? 'إخفاء' : 'عرض'} onAction={() => setShowSchedule((s) => !s)} />
        {showSchedule &&
          (stages.length === 0 ? (
            <Txt color={c.muted}>أدخل قراءة العداد لعرض المراحل القادمة.</Txt>
          ) : (
            <Card style={{ gap: 12 }}>
              <Txt v="caption" color={c.warningText}>
                {GENERIC_TEMPLATE.source} · مراجعة {GENERIC_TEMPLATE.reviewedAt}
              </Txt>
              {stages.map((s) => (
                <View key={s.km} style={{ gap: 4, opacity: s.status === 'done' ? 0.55 : 1 }}>
                  <Row>
                    <Ionicons name={s.status === 'done' ? 'checkmark-circle' : s.status === 'current' ? 'radio-button-on' : 'ellipse-outline'} size={18} color={s.status === 'current' ? c.warning : c.muted} />
                    <Txt v="bodyBold" style={{ flex: 1 }}>
                      {fmtKm(s.km)}
                    </Txt>
                    {s.expectedDate ? (
                      <Txt v="caption" color={c.muted}>
                        غالباً {fmtDate(s.expectedDate, calendar)}
                      </Txt>
                    ) : null}
                  </Row>
                  <Txt v="caption" color={c.muted} style={{ paddingStart: 26 }}>
                    {s.services.map((x) => x.label).join(' · ')}
                  </Txt>
                </View>
              ))}
            </Card>
          ))}

        <Button title="تصدير تقرير العناية (PDF)" icon="document-text" variant="secondary" onPress={() => router.push(`/vehicle/report?vehicleId=${v.id}`)} />
        <Button title="المصروفات والتحليلات" icon="stats-chart" variant="ghost" onPress={() => router.push(`/analytics?vehicleId=${v.id}`)} />
      </Screen>
    </>
  );
}
