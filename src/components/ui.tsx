import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { fmtDate, parseDate, toISODate } from '@/lib/dates';
import { sanitizeNumeric, toHindiDigits } from '@/lib/format';
import { plateLatin } from '@/lib/plates';
import { radius, severityColors, type, useTheme, type TypeVariant } from '@/lib/theme';
import type { Severity } from '@/lib/types';
import { useStore } from '@/store/useStore';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const FWD: IconName = I18nManager.isRTL ? 'chevron-back' : 'chevron-forward';

// ───────── نص ─────────
interface TxtProps extends TextProps {
  v?: TypeVariant;
  color?: string;
  center?: boolean;
  children?: React.ReactNode;
}

function convertDigits(node: React.ReactNode): React.ReactNode {
  if (typeof node === 'string') return toHindiDigits(node);
  if (typeof node === 'number') return toHindiDigits(String(node));
  if (Array.isArray(node)) return node.map(convertDigits);
  return node;
}

export function Txt({ v = 'body', color, center, style, children, ...rest }: TxtProps) {
  const { c } = useTheme();
  const hindi = useStore((s) => s.settings.hindiDigits);
  return (
    <Text
      {...rest}
      style={[type[v], { color: color ?? c.text, writingDirection: 'rtl' }, center ? { textAlign: 'center' } : null, style]}
    >
      {hindi ? convertDigits(children) : children}
    </Text>
  );
}

// ───────── شاشة ─────────
export function Screen({
  children,
  scroll = true,
  edges = ['bottom'],
  padded = true,
  footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  footer?: React.ReactNode;
}) {
  const { c } = useTheme();
  const inner = padded ? { padding: 16, gap: 14 } : undefined;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[inner, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
      {footer ? <View style={{ padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border, backgroundColor: c.surface }}>{footer}</View> : null}
    </SafeAreaView>
  );
}

// ───────── بطاقة ─────────
export function Card({ children, style, onPress, accent }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accent?: string }) {
  const { c } = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  };
  const content = (
    <>
      {accent ? <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, width: 5, backgroundColor: accent }} /> : null}
      {children}
    </>
  );
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, accent ? { paddingStart: 18 } : null, { opacity: pressed ? 0.85 : 1 }, style]}>
        {content}
      </Pressable>
    );
  return <View style={[base, accent ? { paddingStart: 18 } : null, style]}>{content}</View>;
}

export function Row({ children, style, gap = 8 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

// ───────── أزرار ─────────
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  small,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, isDark } = useTheme();
  const bg = variant === 'primary' ? c.successText : variant === 'danger' ? c.danger : 'transparent';
  const primaryBg = isDark ? '#059669' : c.successText;
  const fg = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : variant === 'secondary' ? c.primary : c.successText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        {
          minHeight: small ? 38 : 48,
          paddingHorizontal: small ? 12 : 18,
          borderRadius: radius.md,
          backgroundColor: variant === 'primary' ? primaryBg : bg,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          borderColor: c.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 19} color={fg} /> : null}
      <Txt v={small ? 'bodyBold' : 'title2'} color={fg} style={small ? undefined : { fontSize: 16 }}>
        {title}
      </Txt>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color }: { icon: IconName; onPress: () => void; label: string; color?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityLabel={label} hitSlop={8} onPress={onPress} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={22} color={color ?? c.primary} />
    </Pressable>
  );
}

// ───────── رقائق ─────────
export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        minHeight: 38,
        borderRadius: 19,
        backgroundColor: selected ? c.primary : c.surface,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.border,
      }}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? c.onPrimary : c.muted} /> : null}
      <Txt v="bodyBold" color={selected ? c.onPrimary : c.text}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {children}
    </ScrollView>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: c.border }}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: value === o.value ? c.surface : 'transparent' }}
        >
          <Txt v="bodyBold" color={value === o.value ? c.text : c.muted}>
            {o.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

// ───────── حقول ─────────
type Confidence = 'exact' | 'review' | 'required' | undefined;

export function Field({
  label,
  hint,
  error,
  confidence,
  suffix,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string | null; confidence?: Confidence; suffix?: string }) {
  const { c } = useTheme();
  const confColor = confidence === 'exact' ? c.success : confidence === 'review' ? c.warning : confidence === 'required' ? c.danger : undefined;
  const confText = confidence === 'exact' ? 'دقيق' : confidence === 'review' ? 'راجِع' : confidence === 'required' ? 'مطلوب' : null;
  // خانات الأرقام تقبل أرقاماً فقط (حتى عند اللصق أو لوحة مفاتيح عربية)
  const kb = props.keyboardType;
  const numMode = kb === 'number-pad' || kb === 'numeric' ? 'int' : kb === 'decimal-pad' ? 'decimal' : kb === 'phone-pad' ? 'phone' : null;
  const onChangeText = numMode && props.onChangeText ? (t: string) => props.onChangeText!(sanitizeNumeric(t, numMode)) : props.onChangeText;
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="bodyBold">{label}</Txt>
        {confText ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: confColor + '22' }}>
            <Txt v="badge" color={confColor}>
              {confText}
            </Txt>
          </View>
        ) : null}
      </Row>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.surface,
          borderRadius: radius.md,
          borderWidth: confColor || error ? 1.5 : 1,
          borderColor: error ? c.danger : confColor ?? c.border,
          paddingHorizontal: 12,
        }}
      >
        <TextInput
          placeholderTextColor={c.muted}
          {...props}
          onChangeText={onChangeText}
          style={[type.body, { flex: 1, minWidth: 0, minHeight: 48, color: c.text, writingDirection: 'rtl' }, props.multiline ? { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' } : null]}
        />
        {suffix ? <Txt color={c.muted}>{suffix}</Txt> : null}
      </View>
      {error ? (
        <Txt v="caption" color={c.dangerText}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt v="caption" color={c.muted}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  optional,
  confidence,
  minimumDate,
  maximumDate,
}: {
  label: string;
  value?: string;
  onChange: (iso: string | undefined) => void;
  optional?: boolean;
  confidence?: Confidence;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { c } = useTheme();
  const calendar = useStore((s) => s.settings.calendar);
  const [iosOpen, setIosOpen] = useState(false);
  const [temp, setTemp] = useState<Date>(value ? parseDate(value) : new Date());
  const open = () => {
    const current = value ? parseDate(value) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(toISODate(d));
        },
      });
    } else {
      setTemp(current);
      setIosOpen(true);
    }
  };
  const confColor = confidence === 'exact' ? c.success : confidence === 'review' ? c.warning : confidence === 'required' ? c.danger : undefined;
  return (
    <View style={{ gap: 4 }}>
      <Txt v="bodyBold">{label}</Txt>
      <Row>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? fmtDate(value, calendar) : 'غير محدد'}`}
          style={{
            flex: 1,
            minHeight: 48,
            borderRadius: radius.md,
            borderWidth: confColor ? 1.5 : 1,
            borderColor: confColor ?? c.border,
            backgroundColor: c.surface,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="calendar-outline" size={18} color={c.muted} />
          <Txt color={value ? c.text : c.muted} style={{ flex: 1 }}>
            {value ? fmtDate(value, calendar) : 'اختر التاريخ'}
          </Txt>
        </Pressable>
        {optional && value ? <IconButton icon="close-circle" label="مسح التاريخ" color={c.muted} onPress={() => onChange(undefined)} /> : null}
      </Row>
      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: '#0006' }} onPress={() => setIosOpen(false)} />
          <View style={{ backgroundColor: c.surface, padding: 16, paddingBottom: 36, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <DateTimePicker value={temp} mode="date" display="inline" locale="ar" minimumDate={minimumDate} maximumDate={maximumDate} onChange={(_, d) => d && setTemp(d)} />
            <Button
              title="تم"
              onPress={() => {
                onChange(toISODate(temp));
                setIosOpen(false);
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

export function SwitchRow({ label, hint, value, onChange, icon }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Row style={{ minHeight: 52, paddingVertical: 6 }} gap={12}>
      {icon ? <Ionicons name={icon} size={20} color={c.muted} /> : null}
      <View style={{ flex: 1 }}>
        <Txt v="bodyBold">{label}</Txt>
        {hint ? (
          <Txt v="caption" color={c.muted}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.success, false: c.border }} accessibilityLabel={label} />
    </Row>
  );
}

export function ListRow({ icon, label, value, onPress, color, danger }: { icon?: IconName; label: string; value?: string; onPress?: () => void; color?: string; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
      {icon ? <Ionicons name={icon} size={20} color={danger ? c.danger : color ?? c.muted} /> : null}
      <Txt v="bodyBold" color={danger ? c.dangerText : undefined} style={{ flex: 1 }}>
        {label}
      </Txt>
      {value ? <Txt color={c.muted}>{value}</Txt> : null}
      {onPress ? <Ionicons name={FWD} size={18} color={c.muted} /> : null}
    </Pressable>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
      <Txt v="title2">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Txt v="bodyBold" color={c.successText}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

// ───────── حالات وشارات ─────────
export function StatusPill({ severity, label, icon }: { severity: Severity; label: string; icon?: IconName }) {
  const { c } = useTheme();
  const sc = severityColors(c, severity);
  const ic: IconName = icon ?? (severity === 'danger' ? 'alert-circle' : severity === 'warning' ? 'time' : severity === 'info' ? 'information-circle' : 'checkmark-circle');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: sc.bg }}>
      <Ionicons name={ic} size={13} color={sc.text} />
      <Txt v="badge" color={sc.text}>
        {label}
      </Txt>
    </View>
  );
}

/** شارة الوثيقة الدائرية — الأيام المتبقية مع لون + أيقونة + نص (لا اعتماد على اللون وحده) */
export function DocBadge({ label, days, onPress }: { label: string; days: number | null; onPress?: () => void }) {
  const { c } = useTheme();
  const sev: Severity = days == null ? 'info' : days <= 7 ? 'danger' : days <= 30 ? 'warning' : 'ok';
  const sc = days == null ? { fg: c.border, text: c.muted, bg: c.surfaceAlt } : severityColors(c, sev);
  const a11y = days == null ? `${label}: غير مُدخل` : days < 0 ? `${label}: منتهية منذ ${-days} يوماً` : `${label}: تبقى ${days} يوماً`;
  const big = days == null ? '—' : days < 0 ? '!' : days > 999 ? '+999' : String(days);
  return (
    <Pressable onPress={onPress} accessibilityLabel={a11y} accessibilityRole="button" style={{ alignItems: 'center', gap: 4, minWidth: 64 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: sc.fg, backgroundColor: sc.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt v="title2" color={sc.text} style={{ lineHeight: 22 }}>
          {big}
        </Txt>
        {days != null && days >= 0 ? (
          <Txt v="badge" color={sc.text} style={{ fontSize: 9, lineHeight: 11 }}>
            يوم
          </Txt>
        ) : null}
      </View>
      <Txt v="caption" color={c.muted}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** لوحة سعودية منمقة */
export function Plate({ numbers, letters, size = 'md' }: { numbers: string; letters: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 0.8 : 1;
  const latin = plateLatin(letters);
  return (
    <View
      accessibilityLabel={`لوحة ${numbers} ${letters}`}
      style={{ flexDirection: 'row', borderWidth: 1.5, borderColor: '#0F172A', borderRadius: 6, backgroundColor: '#FFFFFF', overflow: 'hidden', alignSelf: 'flex-start' }}
    >
      <View style={{ paddingHorizontal: 8 * s, paddingVertical: 2 * s, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Tajawal_700Bold', fontSize: 15 * s, color: '#0F172A', lineHeight: 18 * s }}>{letters}</Text>
        <Text style={{ fontFamily: 'Tajawal_700Bold', fontSize: 11 * s, color: '#0F172A', letterSpacing: 2, lineHeight: 14 * s }}>{latin}</Text>
      </View>
      <View style={{ width: 1.5, backgroundColor: '#0F172A' }} />
      <View style={{ paddingHorizontal: 8 * s, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Tajawal_700Bold', fontSize: 15 * s, color: '#0F172A', lineHeight: 18 * s }}>{toHindiDigits(numbers)}</Text>
        <Text style={{ fontFamily: 'Tajawal_700Bold', fontSize: 11 * s, color: '#0F172A', letterSpacing: 1, lineHeight: 14 * s }}>{numbers}</Text>
      </View>
      <View style={{ width: 16 * s, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 6 * s, fontFamily: 'Tajawal_700Bold' }}>KSA</Text>
      </View>
    </View>
  );
}

export function ProgressBar({ ratio, severity }: { ratio: number; severity: Severity }) {
  const { c } = useTheme();
  const sc = severityColors(c, severity === 'info' ? 'ok' : severity);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }}>
      <View style={{ width: `${Math.min(100, Math.max(3, ratio * 100))}%`, height: '100%', backgroundColor: sc.fg, borderRadius: 4 }} />
    </View>
  );
}

export function HealthRing({ score, size = 54, onPress }: { score: number; size?: number; onPress?: () => void }) {
  const { c } = useTheme();
  const sev: Severity = score >= 80 ? 'ok' : score >= 55 ? 'warning' : 'danger';
  const sc = severityColors(c, sev);
  return (
    <Pressable onPress={onPress} accessibilityLabel={`درجة صحة المركبة ${score} من 100`} style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: sc.fg, alignItems: 'center', justifyContent: 'center', backgroundColor: sc.bg }}>
        <Txt v="title2" color={sc.text} style={{ lineHeight: 22 }}>
          {score}
        </Txt>
      </View>
      <Txt v="caption" color={c.muted}>
        درجة الصحة
      </Txt>
    </Pressable>
  );
}

export function EmptyState({ icon, title, body, action, onAction }: { icon: IconName; title: string; body: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 10 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.successBg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={46} color={c.successText} />
      </View>
      <Txt v="title2" center>
        {title}
      </Txt>
      <Txt center color={c.muted}>
        {body}
      </Txt>
      {action ? <Button title={action} onPress={onAction} icon="add" style={{ alignSelf: 'stretch', marginTop: 6 }} /> : null}
    </View>
  );
}

export function Banner({ severity, title, body, action, onAction }: { severity: Severity; title: string; body?: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  const sc = severityColors(c, severity);
  return (
    <View style={{ backgroundColor: sc.bg, borderRadius: radius.md, padding: 12, gap: 6, borderWidth: 1, borderColor: sc.fg + '55' }}>
      <Row>
        <Ionicons name={severity === 'danger' ? 'alert-circle' : severity === 'warning' ? 'warning' : 'information-circle'} size={18} color={sc.text} />
        <Txt v="bodyBold" color={sc.text} style={{ flex: 1 }}>
          {title}
        </Txt>
      </Row>
      {body ? <Txt color={c.text}>{body}</Txt> : null}
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Txt v="bodyBold" color={sc.text} style={{ textDecorationLine: 'underline' }}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
