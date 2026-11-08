// مخزن محلي (Offline-First) — كل البيانات على الجهاز وتُحفظ تلقائياً
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { RECORD_CATEGORY } from '@/lib/catalog';
import { todayISO } from '@/lib/dates';
import { uid } from '@/lib/format';
import type {
  FuelFillUp,
  MaintenanceRecord,
  OdometerPoint,
  OdometerSource,
  Settings,
  User,
  Vehicle,
  VehicleDocument,
} from '@/lib/types';

const TRASH_DAYS = 14;

export interface State {
  user: User | null;
  vehicles: Vehicle[];
  odometer: OdometerPoint[];
  records: MaintenanceRecord[];
  fuel: FuelFillUp[];
  snoozes: Record<string, string>; // مفتاح التذكير ← مؤجل حتى (ISO)
  settings: Settings;
  lastOpenedAt: string | null;
  onboarded: boolean;

  signIn: (phone: string, name: string) => void;
  signOut: () => void;
  wipeAll: () => void;
  setOnboarded: (v: boolean) => void;
  touchOpened: () => void;

  addVehicle: (v: Omit<Vehicle, 'id' | 'createdAt' | 'documents' | 'componentOverrides' | 'source'> & { documents?: VehicleDocument[] }, km?: number) => string;
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void;
  archiveVehicle: (id: string, archived: boolean) => void;
  deleteVehicle: (id: string) => void;
  restoreVehicle: (id: string) => void;
  purgeTrash: () => void;

  upsertDocument: (vehicleId: string, doc: Omit<VehicleDocument, 'id' | 'updatedAt'> & { id?: string }) => void;
  removeDocument: (vehicleId: string, docId: string) => void;

  addOdometer: (vehicleId: string, km: number, source: OdometerSource, date?: string, note?: string) => void;

  addRecord: (r: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => string;
  updateRecord: (id: string, patch: Partial<MaintenanceRecord>) => void;
  deleteRecord: (id: string) => void;

  addFuel: (f: Omit<FuelFillUp, 'id'>) => void;
  deleteFuel: (id: string) => void;

  snooze: (key: string, days: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  notifications: true,
  docLeadDays: [30, 15, 7],
  odometerReminderMonths: 3,
  hindiDigits: false,
  calendar: 'gregorian',
  defaultDailyKm: 50,
};

const initial = {
  user: null,
  vehicles: [],
  odometer: [],
  records: [],
  fuel: [],
  snoozes: {},
  settings: defaultSettings,
  lastOpenedAt: null,
  onboarded: false,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,

      signIn: (phone, name) => set({ user: { phone, name, createdAt: new Date().toISOString() } }),
      signOut: () => set({ user: null }),
      wipeAll: () => set({ ...initial, settings: defaultSettings }),
      setOnboarded: (v) => set({ onboarded: v }),
      touchOpened: () => set({ lastOpenedAt: new Date().toISOString() }),

      addVehicle: (v, km) => {
        const id = uid();
        const vehicle: Vehicle = {
          ...v,
          id,
          source: 'manual',
          createdAt: new Date().toISOString(),
          documents: v.documents ?? [],
          componentOverrides: {},
        };
        set((s) => ({ vehicles: [...s.vehicles, vehicle] }));
        if (km != null && !isNaN(km)) get().addOdometer(id, km, 'onboarding');
        return id;
      },
      updateVehicle: (id, patch) => set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
      archiveVehicle: (id, archived) =>
        set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, archivedAt: archived ? new Date().toISOString() : undefined } : v)) })),
      deleteVehicle: (id) => set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, deletedAt: new Date().toISOString() } : v)) })),
      restoreVehicle: (id) => set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, deletedAt: undefined } : v)) })),
      purgeTrash: () => {
        const cutoff = Date.now() - TRASH_DAYS * 86400000;
        const s = get();
        const purge = new Set(s.vehicles.filter((v) => v.deletedAt && new Date(v.deletedAt).getTime() < cutoff).map((v) => v.id));
        if (!purge.size) return;
        set({
          vehicles: s.vehicles.filter((v) => !purge.has(v.id)),
          odometer: s.odometer.filter((p) => !purge.has(p.vehicleId)),
          records: s.records.filter((r) => !purge.has(r.vehicleId)),
          fuel: s.fuel.filter((f) => !purge.has(f.vehicleId)),
        });
      },

      upsertDocument: (vehicleId, doc) =>
        set((s) => ({
          vehicles: s.vehicles.map((v) => {
            if (v.id !== vehicleId) return v;
            const now = new Date().toISOString();
            const existing = doc.id ? v.documents.find((d) => d.id === doc.id) : doc.type !== 'other' ? v.documents.find((d) => d.type === doc.type) : undefined;
            if (existing) {
              return { ...v, documents: v.documents.map((d) => (d.id === existing.id ? { ...d, ...doc, id: existing.id, updatedAt: now } : d)) };
            }
            return { ...v, documents: [...v.documents, { ...doc, id: uid(), updatedAt: now }] };
          }),
        })),
      removeDocument: (vehicleId, docId) =>
        set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === vehicleId ? { ...v, documents: v.documents.filter((d) => d.id !== docId) } : v)) })),

      addOdometer: (vehicleId, km, source, date, note) =>
        set((s) => ({
          odometer: [...s.odometer, { id: uid(), vehicleId, km, source, date: date ?? new Date().toISOString(), note }],
        })),

      addRecord: (r) => {
        const id = uid();
        const items = r.items.length
          ? r.items
          : [{ id: uid(), description: 'إجمالي الفاتورة', category: RECORD_CATEGORY[r.type], qty: 1, price: r.total - (r.vat ?? 0) }];
        set((s) => ({ records: [...s.records, { ...r, items, id, createdAt: new Date().toISOString() }] }));
        get().addOdometer(r.vehicleId, r.km, 'record', r.date === todayISO() ? undefined : r.date);
        return id;
      },
      updateRecord: (id, patch) => set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),

      addFuel: (f) => {
        set((s) => ({ fuel: [...s.fuel, { ...f, id: uid() }] }));
        get().addOdometer(f.vehicleId, f.km, 'fuel', f.date === todayISO() ? undefined : f.date);
      },
      deleteFuel: (id) => set((s) => ({ fuel: s.fuel.filter((f) => f.id !== id) })),

      snooze: (key, days) => set((s) => ({ snoozes: { ...s.snoozes, [key]: new Date(Date.now() + days * 86400000).toISOString() } })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'motor-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // v2: فصل فلتر الزيت كمكوّن مستقل — العمليات القديمة كانت تعني "زيت + فلتر"
      migrate: (state: any, version) => {
        if (version < 2 && state?.records) {
          state.records = state.records.map((r: any) =>
            Array.isArray(r.resets) && r.resets.includes('oil') && !r.resets.includes('oil_filter') ? { ...r, resets: [...r.resets, 'oil_filter'] } : r,
          );
        }
        return state;
      },
    },
  ),
);

export const activeVehicles = (vs: Vehicle[]) => vs.filter((v) => !v.deletedAt && !v.archivedAt);
