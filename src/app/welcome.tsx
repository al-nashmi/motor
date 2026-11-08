// S01 — شاشة الترحيب
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Txt, type IconName } from '@/components/ui';
import { useTheme } from '@/lib/theme';

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'car-sport', title: 'كل مركباتك في مكان واحد', body: 'كراج رقمي يجيب خلال ثوانٍ: ما الذي تحتاجه كل مركبة الآن؟' },
  { icon: 'scan', title: 'سجّل الصيانة في دقيقة', body: 'امسح رمز QR في الفاتورة الضريبية أو صوّرها — ونحفظ ماذا ومتى وبكم.' },
  { icon: 'notifications', title: 'لا غرامات ولا مفاجآت', body: 'تذكيرات قبل انتهاء التأمين والفحص والاستمارة، ومتابعة عمر الزيت والكفرات والبطارية.' },
];

export default function Welcome() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ alignItems: 'center', paddingTop: 24 }}>
        <Txt v="display" color={c.successText}>
          موتر
        </Txt>
        <Txt color={c.muted}>رفيق العناية بمركباتك</Txt>
      </View>
      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.title}
        onMomentumScrollEnd={(e) => setIndex(Math.round(Math.abs(e.nativeEvent.contentOffset.x) / width))}
        renderItem={({ item }) => (
          <View style={{ width, padding: 32, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: c.successBg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.icon} size={72} color={c.successText} />
            </View>
            <Txt v="title1" center>
              {item.title}
            </Txt>
            <Txt center color={c.muted} style={{ fontSize: 16, lineHeight: 26 }}>
              {item.body}
            </Txt>
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        {SLIDES.map((s, i) => (
          <View key={s.title} style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === index ? c.success : c.border }} />
        ))}
      </View>
      <View style={{ padding: 20, gap: 10 }}>
        <Button title="ابدأ برقم جوالك" icon="phone-portrait" onPress={() => router.push('/login')} />
        <Button title="لدي حساب — تسجيل الدخول" variant="ghost" onPress={() => router.push('/login?mode=signin')} />
      </View>
    </SafeAreaView>
  );
}
