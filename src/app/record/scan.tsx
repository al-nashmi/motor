// S11 — ماسح الفاتورة: رمز QR الضريبي (على الجهاز) + تصوير الفاتورة بإطار توجيه
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Txt } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { parseZatcaQR } from '@/lib/zatca';
import { useDraft } from '@/store/useInsights';

export default function Scan() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ mode?: 'qr' | 'photo' }>();
  const [mode, setMode] = useState<'qr' | 'photo'>(params.mode ?? 'qr');
  const [permission, requestPermission] = useCameraPermissions();
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const handled = useRef(false);
  const cam = useRef<CameraView>(null);
  const setDraft = useDraft((s) => s.set);

  const onBarcode = (r: BarcodeScanningResult) => {
    if (handled.current || mode !== 'qr') return;
    const inv = parseZatcaQR(r.data);
    if (!inv) {
      setHint('هذا الرمز ليس رمز فاتورة ضريبية. وجّه الكاميرا إلى رمز QR أسفل الفاتورة.');
      return;
    }
    handled.current = true;
    setDraft({ qr: inv });
    // بعد قراءة الرمز نقترح تصوير الفاتورة للبنود والحفظ
    setMode('photo');
    setHint('تمت قراءة الرمز ✓ صوّر الفاتورة كاملة لحفظها مع السجل، أو اضغط «تخطَّ».');
  };

  const takePhoto = async () => {
    if (!cam.current || busy) return;
    setBusy(true);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.75 });
      if (pic?.uri) {
        setDraft({ imageUri: pic.uri });
        router.back();
      }
    } finally {
      setBusy(false);
    }
  };

  const pickGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      setDraft({ imageUri: res.assets[0].uri });
      router.back();
    }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 14 }}>
        <Ionicons name="camera-outline" size={64} color={c.muted} style={{ alignSelf: 'center' }} />
        <Txt v="title2" center>
          نحتاج الكاميرا لمسح الفاتورة
        </Txt>
        <Txt center color={c.muted}>
          نستخدمها فقط لقراءة رمز QR الضريبي وتصوير الفاتورة. يمكنك بدلاً من ذلك رفع صورة الفاتورة من المعرض.
        </Txt>
        {permission.canAskAgain ? <Button title="السماح بالكاميرا" onPress={requestPermission} /> : <Button title="فتح إعدادات الجهاز" onPress={() => Linking.openSettings()} />}
        <Button title="رفع من المعرض" variant="secondary" icon="images" onPress={pickGallery} />
        <Button title="إلغاء" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        ref={cam}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={mode === 'qr' ? onBarcode : undefined}
      />
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
          <Pressable onPress={() => router.back()} accessibilityLabel="إغلاق" style={styles.round}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <Pressable onPress={() => setTorch((t) => !t)} accessibilityLabel="الإضاءة" style={styles.round}>
            <Ionicons name={torch ? 'flash' : 'flash-off'} size={22} color="#fff" />
          </Pressable>
        </View>

        {/* إطار التوجيه */}
        <View style={{ alignItems: 'center' }}>
          <View style={mode === 'qr' ? styles.qrFrame : styles.docFrame} />
          <View style={styles.hintBox}>
            <Txt center color="#fff" v="bodyBold">
              {hint ?? (mode === 'qr' ? 'وجّه الكاميرا إلى رمز QR في الفاتورة الضريبية' : 'ضع الفاتورة كاملة داخل الإطار في إضاءة جيدة')}
            </Txt>
          </View>
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#0008', borderRadius: 14, padding: 4 }}>
            {(['qr', 'photo'] as const).map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} style={{ flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: mode === m ? '#ffffff22' : 'transparent' }}>
                <Txt color="#fff" v="bodyBold">
                  {m === 'qr' ? 'رمز QR' : 'تصوير الفاتورة'}
                </Txt>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            <Pressable onPress={pickGallery} accessibilityLabel="من المعرض" style={styles.round}>
              <Ionicons name="images" size={24} color="#fff" />
            </Pressable>
            {mode === 'photo' ? (
              <Pressable onPress={takePhoto} accessibilityLabel="التقاط" style={styles.shutter}>
                {busy ? <ActivityIndicator color="#000" /> : <View style={styles.shutterInner} />}
              </Pressable>
            ) : (
              <View style={{ width: 76 }} />
            )}
            <Pressable onPress={() => router.back()} accessibilityLabel="تخطَّ" style={styles.round}>
              <Txt color="#fff" v="badge">
                تخطَّ
              </Txt>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center' },
  qrFrame: { width: 240, height: 240, borderWidth: 3, borderColor: '#10B981', borderRadius: 20 },
  docFrame: { width: '82%', aspectRatio: 0.7, borderWidth: 3, borderColor: '#10B981', borderRadius: 14, borderStyle: 'dashed' },
  hintBox: { marginTop: 16, backgroundColor: '#000A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, maxWidth: '90%' },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: '#000' },
});
