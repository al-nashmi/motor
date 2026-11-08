import { useMemo } from 'react';
import { create } from 'zustand';
import {
  ALL_COMPONENTS,
  componentStatus,
  estimateOdometer,
  fuelStats,
  healthScore,
  vehicleNeeds,
  warrantyStatus,
  WARRANTY_COMPONENTS,
  worstSeverity,
  type WarrantyStatus,
  type ComponentStatus,
  type FuelStats,
  type HealthBreakdown,
  type NeedItem,
  type OdometerEstimate,
} from '@/lib/engine';
import type { FuelFillUp, MaintenanceRecord, OdometerPoint, Severity, Vehicle } from '@/lib/types';
import type { ZatcaInvoice } from '@/lib/zatca';
import { useStore } from './useStore';

export interface VehicleInsights {
  vehicle: Vehicle;
  odo: OdometerEstimate;
  comps: ComponentStatus[];
  warranties: WarrantyStatus[];
  fuel: FuelStats;
  needs: NeedItem[];
  health: HealthBreakdown;
  severity: Severity;
  lastRecord?: MaintenanceRecord;
  recordsCount: number;
}

export function computeInsights(
  v: Vehicle,
  points: OdometerPoint[],
  records: MaintenanceRecord[],
  fills: FuelFillUp[],
  defaultDailyKm: number,
): VehicleInsights {
  const odo = estimateOdometer(points, v.id, defaultDailyKm);
  const comps = ALL_COMPONENTS.map((t) => componentStatus(v, t, records, odo));
  const fuel = fuelStats(fills, v.id);
  const warranties = WARRANTY_COMPONENTS.map((t) => warrantyStatus(v, t, records)).filter((w): w is WarrantyStatus => !!w);
  const needs = vehicleNeeds(v, comps, odo, fuel, new Date(), warranties);
  const mine = records.filter((r) => r.vehicleId === v.id);
  const lastRecord = mine.sort((a, b) => b.date.localeCompare(a.date) || b.km - a.km)[0];
  const health = healthScore(v, comps, odo, mine.length);
  return { vehicle: v, odo, comps, warranties, fuel, needs, health, severity: worstSeverity(needs), lastRecord, recordsCount: mine.length };
}

export function useAllInsights(includeArchived = false): VehicleInsights[] {
  const vehicles = useStore((s) => s.vehicles);
  const points = useStore((s) => s.odometer);
  const records = useStore((s) => s.records);
  const fills = useStore((s) => s.fuel);
  const rate = useStore((s) => s.settings.defaultDailyKm);
  return useMemo(
    () =>
      vehicles
        .filter((v) => !v.deletedAt && (includeArchived || !v.archivedAt))
        .map((v) => computeInsights(v, points, records, fills, rate)),
    [vehicles, points, records, fills, rate, includeArchived],
  );
}

export function useInsights(vehicleId: string | undefined): VehicleInsights | null {
  const all = useAllInsights(true);
  return all.find((i) => i.vehicle.id === vehicleId) ?? null;
}

// مسودة الفاتورة الملتقطة من شاشة الماسح (غير محفوظة)
interface DraftState {
  qr: ZatcaInvoice | null;
  imageUri: string | null;
  set: (p: Partial<Pick<DraftState, 'qr' | 'imageUri'>>) => void;
  clear: () => void;
}

export const useDraft = create<DraftState>((set) => ({
  qr: null,
  imageUri: null,
  set: (p) => set(p),
  clear: () => set({ qr: null, imageUri: null }),
}));
