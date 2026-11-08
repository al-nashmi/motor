import { useColorScheme } from 'react-native';

// رموز الألوان — جدول 20
export const light = {
  primary: '#1E293B',
  onPrimary: '#FFFFFF',
  success: '#10B981',
  successText: '#047857',
  successBg: '#D1FAE5',
  warning: '#F59E0B',
  warningText: '#B45309',
  warningBg: '#FEF3C7',
  danger: '#EF4444',
  dangerText: '#B91C1C',
  dangerBg: '#FEE2E2',
  info: '#3B82F6',
  infoBg: '#DBEAFE',
  bg: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
};

export const dark: typeof light = {
  primary: '#F1F5F9',
  onPrimary: '#0F172A',
  success: '#34D399',
  successText: '#6EE7B7',
  successBg: '#064E3B',
  warning: '#FBBF24',
  warningText: '#FCD34D',
  warningBg: '#78350F',
  danger: '#F87171',
  dangerText: '#FCA5A5',
  dangerBg: '#7F1D1D',
  info: '#60A5FA',
  infoBg: '#1E3A8A',
  bg: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#273449',
  border: '#334155',
  text: '#E2E8F0',
  muted: '#94A3B8',
};

export type Colors = typeof light;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { c: isDark ? dark : light, isDark };
}

// مقياس الطباعة — جدول 21
export const fonts = {
  display: 'Tajawal_700Bold',
  bold: 'Tajawal_700Bold',
  medium: 'Tajawal_500Medium',
  body: 'IBMPlexSansArabic_400Regular',
  bodyBold: 'IBMPlexSansArabic_600SemiBold',
};

export const type = {
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 38 },
  title1: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 32 },
  title2: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 22 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  badge: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 },
} as const;

export type TypeVariant = keyof typeof type;

export function severityColors(c: Colors, s: 'danger' | 'warning' | 'info' | 'ok') {
  switch (s) {
    case 'danger':
      return { fg: c.danger, text: c.dangerText, bg: c.dangerBg };
    case 'warning':
      return { fg: c.warning, text: c.warningText, bg: c.warningBg };
    case 'info':
      return { fg: c.info, text: c.info, bg: c.infoBg };
    default:
      return { fg: c.success, text: c.successText, bg: c.successBg };
  }
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };
