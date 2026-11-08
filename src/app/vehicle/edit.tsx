// S04 — الإدخال اليدوي الكامل للمركبة (إضافة / تعديل)
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Screen } from '@/components/ui';
import { VehicleForm } from '@/components/VehicleForm';
import type { DocType } from '@/lib/types';
import { useStore } from '@/store/useStore';

export default function EditVehicle() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const vehicle = useStore((s) => s.vehicles.find((v) => v.id === id));
  const addVehicle = useStore((s) => s.addVehicle);
  const updateVehicle = useStore((s) => s.updateVehicle);
  const upsertDocument = useStore((s) => s.upsertDocument);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: vehicle ? 'تعديل المركبة' : 'إضافة مركبة' }} />
      <Screen>
        <VehicleForm
          initial={vehicle}
          mode={vehicle ? 'edit' : 'full'}
          submitLabel={vehicle ? 'حفظ التعديلات' : 'أضف المركبة'}
          onSubmit={(vals) => {
            if (vehicle) {
              updateVehicle(vehicle.id, { make: vals.make, model: vals.model, year: vals.year, plateNumbers: vals.plateNumbers, plateLetters: vals.plateLetters, nickname: vals.nickname, vin: vals.vin });
              router.back();
              return;
            }
            const newId = addVehicle(
              { make: vals.make, model: vals.model, year: vals.year, plateNumbers: vals.plateNumbers, plateLetters: vals.plateLetters, nickname: vals.nickname, vin: vals.vin },
              vals.km,
            );
            (Object.entries(vals.docs) as [DocType, string | undefined][]).forEach(([type, expiry]) => {
              if (expiry) upsertDocument(newId, { type, expiry });
            });
            router.replace(`/vehicle/${newId}`);
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
