import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { RECORD_ICONS, RECORD_LABELS } from '@/lib/catalog';
import { fmtDate } from '@/lib/dates';
import { fmtKm, fmtSAR } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { MaintenanceRecord, Vehicle } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { Card, Row, Txt } from './ui';

export function RecordRow({ r, vehicle }: { r: MaintenanceRecord; vehicle?: Vehicle }) {
  const { c } = useTheme();
  const calendar = useStore((s) => s.settings.calendar);
  return (
    <Card onPress={() => router.push(`/record/${r.id}`)} style={{ paddingVertical: 12 }}>
      <Row gap={12}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.successBg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={RECORD_ICONS[r.type] as never} size={20} color={c.successText} />
        </View>
        <View style={{ flex: 1 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="bodyBold">{RECORD_LABELS[r.type]}</Txt>
            <Txt v="bodyBold">{fmtSAR(r.total)}</Txt>
          </Row>
          <Txt v="caption" color={c.muted} numberOfLines={1}>
            {fmtDate(r.date, calendar)} · {fmtKm(r.km)}
            {r.shop ? ` · ${r.shop}` : ''}
          </Txt>
          {vehicle ? (
            <Txt v="caption" color={c.muted}>
              {vehicle.nickname || `${vehicle.make} ${vehicle.model}`} · {vehicle.plateNumbers} {vehicle.plateLetters}
              {r.source === 'manual' ? ' · يدوي' : ' · موثّق بفاتورة'}
            </Txt>
          ) : null}
        </View>
      </Row>
    </Card>
  );
}
