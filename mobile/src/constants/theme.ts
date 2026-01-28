// Sou Esporte - Design System
// Cores baseadas no logo verde lime - Dark Mode

export const COLORS = {
  // Primary - Verde lime do logo
  primary: '#84CC16',
  primaryDark: '#65A30D',
  primaryLight: '#A3E635',
  
  // Secondary
  secondary: '#22C55E',
  secondaryDark: '#16A34A',
  
  // Background - Azul marinho escuro (dark mode)
  background: '#0F172A',
  backgroundDark: '#0A0F1A',
  backgroundLight: '#1E293B',
  backgroundLighter: '#334155',
  
  // Cards
  card: '#1E293B',
  cardLight: '#334155',
  
  // Text
  text: '#F8FAFC',
  textWhite: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textOnPrimary: '#1a1a1a', // Texto escuro para backgrounds lime
  
  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Others
  white: '#FFFFFF',
  black: '#000000',
  border: '#334155',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Surface (for cards and inputs)
  surface: '#1E293B',
  inputBackground: '#1E293B',
  
  // Gradients (para referência)
  gradientStart: '#84CC16',
  gradientEnd: '#22C55E',
};

export const SIZES = {
  // Global sizes
  base: 8,
  font: 14,
  radius: 12,
  padding: 16,
  margin: 16,

  // Font sizes
  largeTitle: 40,
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  body1: 16,
  body2: 15,
  body3: 14,
  body4: 13,
  body5: 12,
  body6: 10,
  small: 11,
  
  // Additional sizes (used in screens)
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const FONTS = {
  largeTitle: {
    fontSize: SIZES.largeTitle,
    fontWeight: '700' as const,
    lineHeight: 48,
  },
  h1: {
    fontSize: SIZES.h1,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: SIZES.h2,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: SIZES.h3,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: SIZES.h4,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  h5: {
    fontSize: SIZES.h5,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  body1: {
    fontSize: SIZES.body1,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  body2: {
    fontSize: SIZES.body2,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  body3: {
    fontSize: SIZES.body3,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  body4: {
    fontSize: SIZES.body4,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  body5: {
    fontSize: SIZES.body5,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  small: {
    fontSize: SIZES.small,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
};

export const SHADOWS = {
  // Aliases for convenience
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  light: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Espaçamentos padronizados
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius padronizados (Figma: 8px padrão)
export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,  // Padrão do Figma
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Theme object with colors property (for compatibility)
export const theme = {
  colors: {
    primary: COLORS.primary,
    primaryDark: COLORS.primaryDark,
    primaryLight: COLORS.primaryLight,
    secondary: COLORS.secondary,
    background: COLORS.background,
    backgroundDark: COLORS.backgroundDark,
    backgroundLight: COLORS.backgroundLight,
    card: COLORS.card,
    text: COLORS.text,
    textSecondary: COLORS.textSecondary,
    textMuted: COLORS.textMuted,
    textOnPrimary: COLORS.textOnPrimary,
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    info: COLORS.info,
    white: COLORS.white,
    black: COLORS.black,
    border: COLORS.border,
    surface: COLORS.surface,
    inputBackground: COLORS.inputBackground,
  },
  sizes: SIZES,
  fonts: FONTS,
  shadows: SHADOWS,
  spacing: SPACING,
  radius: RADIUS,
};

export default {
  COLORS,
  SIZES,
  FONTS,
  SHADOWS,
  SPACING,
  RADIUS,
  theme,
};
