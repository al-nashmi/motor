// الأرشيف ومهلة التراجع 14 يوماً للمركبات المحذوفة
import { Alert, View } from 'react-native';
import { Button, Card, EmptyState, Plate, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { daysSince } from '@/lib/dates';
import { useTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

export default function Trash() {
  const { c } = useTheme();
  const vehicles = useStore((s) => s.vehicles);
  const archive = useStore((s) => s.archiveVehicle);
  const restore = useStore((s) => s.restoreVehicle);
  const archived = vehicles.filter((v) => v.archivedAt && !v.deletedAt);
  const deleted = vehicles.filter((v) => v.deletedAt);

  if (!archived.length && !deleted.length) return <Screen><EmptyState icon="archive-outline" title="لا شيء هنا" body="المركبات المؤرشفة (بعد البيع مثلاً) والمحذوفة تظهر هنا." /></Screen>;

  return (
    <Screen>
      {archived.length > 0 && <SectionTitle title="مؤرشفة" />}
      {archived.map((v) => (
        <Card key={v.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ gap: 4, flex: 1 }}>
              <Plate numbers={v.plateNumbers} letters={v.plateLetters} size="sm" />
              <Txt v="bodyBold">
                {v.make} {v.model} {v.year}
              </Txt>
              <Txt v="caption" color={c.muted}>
                السجل محفوظ للأغراض الشخصية — خارج الكراج النشط
              </Txt>
            </View>
            <Button title="إعادة للكراج" small variant="secondary" onPress={() => archive(v.id, false)} />
          </Row>
        </Card>
      ))}
      {deleted.length > 0 && <SectionTitle title="محذوفة (قابلة للاستعادة)" />}
      {deleted.map((v) => {
        const left = Math.max(0, 14 - daysSince(v.deletedAt!));
        return (
          <Card key={v.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ gap: 4, flex: 1 }}>
                <Txt v="bodyBold">
                  {v.make} {v.model} {v.year}
                </Txt>
                <Txt v="caption" color={c.warningText}>
                  تُحذف نهائياً بعد {left} {left === 1 ? 'يوم' : 'أيام'}
                </Txt>
              </View>
              <Button
                title="استعادة"
                small
                onPress={() => {
                  restore(v.id);
                  Alert.alert('تمت الاستعادة', 'عادت المركبة بكامل سجلها وفواتيرها.');
                }}
              />
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
