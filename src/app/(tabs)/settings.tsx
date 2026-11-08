// S14 — الملف والخصوصية (7.10)
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import { Button, Card, Divider, ListRow, Row, Screen, Segmented, SectionTitle, SwitchRow, Txt } from '@/components/ui';
import { fmtHijri } from '@/lib/dates';
import { shareJson, wipeFiles } from '@/lib/files';
import { ensurePermission } from '@/lib/notifications';
import { useTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

export default function SettingsScreen() {
  const { c } = useTheme();
  const user = useStore((s) => s.user);
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const vehicles = useStore((s) => s.vehicles);
  const signOut = useStore((s) => s.signOut);
  const wipeAll = useStore((s) => s.wipeAll);
  const hijriAvailable = !!fmtHijri(new Date());
  const archivedCount = vehicles.filter((v) => v.archivedAt || v.deletedAt).length;

  const exportData = async () => {
    const s = useStore.getState();
    await shareJson(`motor-export-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      app: 'motor',
      version: Constants.expoConfig?.version,
      user: s.user,
      vehicles: s.vehicles,
      odometer: s.odometer,
      records: s.records,
      fuel: s.fuel,
      settings: s.settings,
    });
  };

  const deleteAll = () => {
    Alert.alert('حذف كل البيانات نهائياً؟', 'سيُحذف حسابك وكل المركبات والسجلات وصور الفواتير من هذا الجهاز. لا يمكن التراجع عن هذه الخطوة.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'احذف نهائياً',
        style: 'destructive',
        onPress: () => {
          wipeFiles();
          wipeAll();
          router.replace('/welcome');
        },
      },
    ]);
  };

  return (
    <Screen edges={[]}>
      <Card>
        <Row gap={12}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.successBg, alignItems: 'center', justifyContent: 'center' }}>
            <Txt v="title1" color={c.successText}>
              {user?.name?.[0] ?? '؟'}
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="title2">{user?.name}</Txt>
            <Txt color={c.muted}>{user?.phone.replace('+966', '0')}</Txt>
          </View>
        </Row>
      </Card>

      <SectionTitle title="المركبات" />
      <Card>
        <ListRow icon="add-circle-outline" label="إضافة مركبة" onPress={() => router.push('/vehicle/edit')} />
        <Divider />
        <ListRow icon="archive-outline" label="المؤرشفة والمحذوفة" value={archivedCount ? String(archivedCount) : undefined} onPress={() => router.push('/trash')} />
        <Divider />
        <ListRow icon="stats-chart-outline" label="المصروفات والتقارير" onPress={() => router.push('/analytics')} />
      </Card>

      <SectionTitle title="التذكيرات" />
      <Card>
        <SwitchRow
          icon="notifications-outline"
          label="إشعارات التذكير"
          hint="الوثائق قبل 30 و15 و7 أيام · المكوّنات · العداد"
          value={settings.notifications}
          onChange={async (v) => {
            if (v && !(await ensurePermission())) {
              Alert.alert('الإشعارات غير مسموحة', 'فعّل إذن الإشعارات لموتر من إعدادات الجهاز، ثم عُد وفعّلها هنا.');
              return;
            }
            update({ notifications: v });
          }}
        />
        <Divider />
        <View style={{ paddingVertical: 10, gap: 8 }}>
          <Txt v="bodyBold">تذكير تحديث العداد كل</Txt>
          <Segmented
            options={[1, 2, 3, 4, 6].map((m) => ({ value: String(m), label: `${m} ${m === 1 ? 'شهر' : m === 2 ? 'شهرين' : 'أشهر'}` }))}
            value={String(settings.odometerReminderMonths)}
            onChange={(v) => update({ odometerReminderMonths: Number(v) })}
          />
        </View>
        <Divider />
        <View style={{ paddingVertical: 10, gap: 8 }}>
          <Txt v="bodyBold">متوسط الاستخدام اليومي الافتراضي</Txt>
          <Txt v="caption" color={c.muted}>
            يُستخدم لتقدير العداد قبل توفر قراءات كافية (30 يوماً على الأقل)
          </Txt>
          <Segmented options={[30, 50, 80, 120].map((k) => ({ value: String(k), label: `${k} كم` }))} value={String(settings.defaultDailyKm)} onChange={(v) => update({ defaultDailyKm: Number(v) })} />
        </View>
      </Card>

      <SectionTitle title="العرض" />
      <Card>
        <View style={{ paddingVertical: 8, gap: 8 }}>
          <Txt v="bodyBold">التقويم المفضّل للتواريخ</Txt>
          <Segmented
            options={[
              { value: 'gregorian', label: 'ميلادي' },
              { value: 'hijri', label: 'هجري' },
            ]}
            value={settings.calendar}
            onChange={(v) => {
              if (v === 'hijri' && !hijriAvailable) {
                Alert.alert('غير متاح', 'التقويم الهجري غير مدعوم على هذا الجهاز.');
                return;
              }
              update({ calendar: v as 'gregorian' | 'hijri' });
            }}
          />
        </View>
        <Divider />
        <SwitchRow icon="text-outline" label="الأرقام الهندية (١٢٣)" hint="بدلاً من الأرقام اللاتينية (123) في كامل الواجهة" value={settings.hindiDigits} onChange={(v) => update({ hindiDigits: v })} />
      </Card>

      <SectionTitle title="الخصوصية وبياناتك" />
      <Card>
        <ListRow icon="shield-checkmark-outline" label="ما الذي نجمعه ولماذا" onPress={() => router.push('/privacy')} />
        <Divider />
        <ListRow icon="download-outline" label="تصدير كل بياناتي (JSON)" onPress={exportData} />
        <Divider />
        <ListRow icon="trash-outline" label="حذف كل البيانات نهائياً" danger onPress={deleteAll} />
      </Card>

      <Button
        title="تسجيل الخروج"
        variant="secondary"
        icon="log-out-outline"
        onPress={() =>
          Alert.alert('تسجيل الخروج', 'ستبقى بياناتك محفوظة على هذا الجهاز وتعود عند الدخول بنفس الرقم.', [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'خروج',
              onPress: () => {
                signOut();
                router.replace('/welcome');
              },
            },
          ])
        }
      />
      <Txt v="caption" center color={c.muted}>
        موتر · الإصدار {Constants.expoConfig?.version ?? '1.0.0'}
      </Txt>
    </Screen>
  );
}
