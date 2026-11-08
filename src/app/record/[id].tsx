// S09 — تفاصيل العملية
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Modal, Pressable, View } from 'react-native';
import { Button, Card, Divider, EmptyState, Row, Screen, StatusPill, Txt } from '@/components/ui';
import { CATEGORY_LABELS, COMPONENT_LABELS, OIL_BASE_LABELS, RECORD_LABELS } from '@/lib/catalog';
import { fmtDate } from '@/lib/dates';
import { deleteFile } from '@/lib/files';
import { fmtKm, fmtNum, fmtSAR } from '@/lib/format';
import { radius, useTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

export default function RecordDetails() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useStore((s) => s.records.find((x) => x.id === id));
  const vehicle = useStore((s) => s.vehicles.find((v) => v.id === r?.vehicleId));
  const del = useStore((s) => s.deleteRecord);
  const calendar = useStore((s) => s.settings.calendar);
  const [zoom, setZoom] = useState(false);
  if (!r) return <Screen><EmptyState icon="receipt-outline" title="العملية غير موجودة" body="ربما حُذفت." /></Screen>;
  const sub = r.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <>
      <Stack.Screen options={{ title: RECORD_LABELS[r.type] }} />
      <Screen>
        <Card style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="display">{fmtSAR(r.total)}</Txt>
            <StatusPill severity={r.source === 'manual' ? 'info' : 'ok'} label={r.source === 'manual' ? 'يدوي' : r.source === 'qr' ? 'موثّق برمز QR' : 'موثّق بفاتورة'} icon={r.source === 'manual' ? 'create' : 'shield-checkmark'} />
          </Row>
          <Txt>
            {fmtDate(r.date, calendar)} · {fmtKm(r.km)}
          </Txt>
          {vehicle ? (
            <Txt color={c.muted}>
              {vehicle.make} {vehicle.model} · {vehicle.plateNumbers} {vehicle.plateLetters}
            </Txt>
          ) : null}
        </Card>

        {r.invoiceUri ? (
          <Pressable onPress={() => setZoom(true)}>
            <Image source={{ uri: r.invoiceUri }} style={{ width: '100%', height: 260, borderRadius: radius.md, backgroundColor: c.surfaceAlt }} resizeMode="contain" />
          </Pressable>
        ) : null}

        <Card style={{ gap: 8 }}>
          {r.shop ? <Line label="المركز" value={r.shop} /> : null}
          {r.vatNumber ? <Line label="الرقم الضريبي" value={r.vatNumber} /> : null}
          {r.doneBy ? <Line label="قام بالعملية" value={r.doneBy} /> : null}
          {r.tire?.size ? <Line label="مقاس الكفرات" value={`${r.tire.size}${r.tire.count ? ` × ${r.tire.count}` : ''}`} /> : null}
          {r.tire?.brand ? <Line label="العلامة" value={r.tire.brand} /> : null}
          {r.tire?.dot ? <Line label="تاريخ التصنيع (DOT)" value={r.tire.dot} /> : null}
          {r.oil ? <Line label="فترة الزيت" value={`${fmtKm(r.oil.intervalKm)} أو ${r.oil.intervalMonths} أشهر`} /> : null}
          {r.oil && (r.oil.viscosity || r.oil.base || r.oil.brand) ? (
            <Line label="نوع الزيت" value={[r.oil.viscosity, r.oil.base ? OIL_BASE_LABELS[r.oil.base] : '', r.oil.brand].filter(Boolean).join(' · ')} />
          ) : null}
          {r.oil ? <Line label="فلتر الزيت" value={r.oil.filterChanged ? 'تم تغييره' : 'لم يتغيّر'} /> : null}
          {r.warranty ? <Line label="الضمان" value={`${r.warranty.months} شهراً — حتى ${fmtDate(r.warranty.expiry, calendar)}`} /> : null}
          {r.resets.length ? <Line label="المكوّنات المُصفّرة" value={r.resets.map((x) => COMPONENT_LABELS[x]).join('، ')} /> : null}
        </Card>

        <Card style={{ gap: 8 }}>
          <Txt v="title2">التكلفة التفصيلية</Txt>
          {r.items.map((i) => (
            <Row key={i.id} style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Txt>{i.description}</Txt>
                <Txt v="caption" color={c.muted}>
                  {CATEGORY_LABELS[i.category]}
                  {i.qty !== 1 ? ` · ${fmtNum(i.qty)} × ${fmtSAR(i.price)}` : ''}
                </Txt>
              </View>
              <Txt v="bodyBold">{fmtSAR(i.price * i.qty)}</Txt>
            </Row>
          ))}
          <Divider />
          {r.vat ? <Line label="ضريبة القيمة المضافة" value={fmtSAR(r.vat)} /> : null}
          {Math.abs(sub + (r.vat ?? 0) - r.total) > 1 ? <Line label="المجموع الفرعي" value={fmtSAR(sub)} /> : null}
          <Line label="الإجمالي" value={fmtSAR(r.total)} bold />
        </Card>

        {r.notes ? (
          <Card>
            <Txt v="bodyBold">ملاحظات</Txt>
            <Txt>{r.notes}</Txt>
          </Card>
        ) : null}

        <Button title="تعديل" variant="secondary" icon="create-outline" onPress={() => router.push(`/record/new?editId=${r.id}`)} />
        <Button
          title="حذف العملية"
          variant="ghost"
          onPress={() =>
            Alert.alert('حذف العملية؟', 'ستُحذف العملية وصورة فاتورتها نهائياً.', [
              { text: 'إلغاء', style: 'cancel' },
              {
                text: 'حذف',
                style: 'destructive',
                onPress: () => {
                  deleteFile(r.invoiceUri);
                  del(r.id);
                  router.back();
                },
              },
            ])
          }
        />
      </Screen>
      <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#000E', justifyContent: 'center' }} onPress={() => setZoom(false)}>
          {r.invoiceUri ? <Image source={{ uri: r.invoiceUri }} style={{ width: '100%', height: '85%' }} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const { c } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between' }} gap={12}>
      <Txt color={c.muted}>{label}</Txt>
      <Txt v={bold ? 'title2' : 'bodyBold'} style={{ flexShrink: 1 }}>
        {value}
      </Txt>
    </Row>
  );
}
