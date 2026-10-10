// Light glass theme — matches the Muse demo look.
export const colors = {
  sky: '#E9F2FB',
  skyDeep: '#D8E9FA',
  glass: 'rgba(255,255,255,0.78)',
  glassStrong: 'rgba(255,255,255,0.92)',
  glassBorder: 'rgba(255,255,255,0.65)',
  primary: '#1D7FE0',
  primaryDark: '#0F5FB8',
  primarySoft: 'rgba(29,127,224,0.12)',
  teal: '#12B5A5',
  tealSoft: 'rgba(18,181,165,0.12)',
  orange: '#F59E0B',
  ink: '#12324F',
  inkSoft: '#3E6584',
  inkMuted: '#7FA0BB',
  success: '#16A34A',
  danger: '#DC2626',
  dangerSoft: 'rgba(220,38,38,0.10)',
  line: 'rgba(18,50,79,0.10)',
  white: '#FFFFFF',
};

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const shadow = {
  shadowColor: '#0F5FB8',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

export const glassCard = {
  backgroundColor: colors.glass,
  borderColor: colors.glassBorder,
  borderWidth: 1,
  borderRadius: radius.lg,
  ...shadow,
} as const;
