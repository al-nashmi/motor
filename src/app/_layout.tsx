import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold } from '@expo-google-fonts/tajawal';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, DevSettings, I18nManager, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { rescheduleAll } from '@/lib/notifications';
import { session } from '@/lib/session';
import { fonts, useTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

// الاتجاه من اليمين لليسار قاعدة معمارية (8.4). في البناء الإنتاجي يفرضه إعداد expo-localization؛
// وفي بيئة التطوير نفرضه هنا مرة واحدة ثم نعيد التحميل.
if (!I18nManager.isRTL && Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  if (__DEV__) setTimeout(() => DevSettings.reload(), 100);
}
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar';
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

export default function RootLayout() {
  const { c, isDark } = useTheme();
  const [fontsLoaded] = useFonts({ Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_600SemiBold });
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    const s = useStore.getState();
    session.previousOpenedAt = s.lastOpenedAt;
    s.touchOpened();
    s.purgeTrash();
    rescheduleAll(useStore.getState());
    // إعادة جدولة التذكيرات عند أي تغيير في البيانات (مع تأخير بسيط لدمج التغييرات)
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((state, prev) => {
      if (state.vehicles === prev.vehicles && state.records === prev.records && state.odometer === prev.odometer && state.settings === prev.settings && state.user === prev.user) return;
      clearTimeout(timer);
      timer = setTimeout(() => rescheduleAll(useStore.getState()), 1500);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const url = resp.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    });
    return () => {
      unsub();
      sub.remove();
      clearTimeout(timer);
    };
  }, [hydrated]);

  if (!fontsLoaded || !hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.success} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18, color: c.text },
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.primary,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'الدخول برقم الجوال' }} />
        <Stack.Screen name="onboarding" options={{ title: 'أضف مركبتك الأولى', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="vehicle/[id]" options={{ title: 'تفاصيل المركبة' }} />
        <Stack.Screen name="vehicle/edit" options={{ title: 'بيانات المركبة', presentation: 'modal' }} />
        <Stack.Screen name="vehicle/document" options={{ title: 'الوثيقة' }} />
        <Stack.Screen name="vehicle/odometer" options={{ title: 'قراءة العداد', presentation: 'modal' }} />
        <Stack.Screen name="vehicle/component" options={{ title: 'تفاصيل المكوّن' }} />
        <Stack.Screen name="vehicle/fuel" options={{ title: 'الوقود والكفاءة' }} />
        <Stack.Screen name="vehicle/report" options={{ title: 'تقرير العناية' }} />
        <Stack.Screen name="record/new" options={{ title: 'تسجيل عملية صيانة' }} />
        <Stack.Screen name="record/scan" options={{ title: 'ماسح الفاتورة', headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="record/[id]" options={{ title: 'تفاصيل العملية' }} />
        <Stack.Screen name="analytics" options={{ title: 'المصروفات والتقارير' }} />
        <Stack.Screen name="trash" options={{ title: 'المركبات المؤرشفة والمحذوفة' }} />
        <Stack.Screen name="privacy" options={{ title: 'الخصوصية وبياناتك' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
