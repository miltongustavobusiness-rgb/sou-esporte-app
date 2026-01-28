import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const getContainerStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.container, styles[`container_${size}`]];

    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }

    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.containerSecondary);
        break;
      case 'outline':
        baseStyle.push(styles.containerOutline);
        break;
      case 'ghost':
        baseStyle.push(styles.containerGhost);
        break;
      default:
        baseStyle.push(styles.containerPrimary);
    }

    if (disabled) {
      baseStyle.push(styles.containerDisabled);
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyle: TextStyle[] = [styles.text, styles[`text_${size}`]];

    switch (variant) {
      case 'outline':
      case 'ghost':
        baseStyle.push(styles.textOutline);
        break;
      default:
        baseStyle.push(styles.textPrimary);
    }

    if (disabled) {
      baseStyle.push(styles.textDisabled);
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[...getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? COLORS.primary : COLORS.white}
        />
      ) : (
        <>
          {icon}
          <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius,
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },

  // Sizes
  container_small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  container_medium: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  container_large: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },

  // Variants
  containerPrimary: {
    backgroundColor: COLORS.primary,
  },
  containerSecondary: {
    backgroundColor: COLORS.secondary,
  },
  containerOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  containerGhost: {
    backgroundColor: 'transparent',
  },
  containerDisabled: {
    backgroundColor: COLORS.backgroundLight,
    borderColor: COLORS.backgroundLight,
  },

  // Text
  text: {
    fontWeight: '600',
  },
  text_small: {
    ...FONTS.body4,
  },
  text_medium: {
    ...FONTS.body3,
  },
  text_large: {
    ...FONTS.h4,
  },
  textPrimary: {
    color: COLORS.white,
  },
  textOutline: {
    color: COLORS.primary,
  },
  textDisabled: {
    color: COLORS.textSecondary,
  },
});
