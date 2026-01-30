import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToastProps } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

// Custom Toast component matching app design
const CustomToast = ({ 
  text1, 
  text2, 
  type 
}: BaseToastProps & { type: 'success' | 'error' | 'info' }) => {
  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: COLORS.card,
          borderColor: COLORS.success,
          iconName: 'checkmark-circle' as const,
          iconColor: COLORS.success,
        };
      case 'error':
        return {
          backgroundColor: COLORS.card,
          borderColor: COLORS.error,
          iconName: 'close-circle' as const,
          iconColor: COLORS.error,
        };
      case 'info':
      default:
        return {
          backgroundColor: COLORS.card,
          borderColor: COLORS.info,
          iconName: 'information-circle' as const,
          iconColor: COLORS.info,
        };
    }
  };

  const config = getConfig();

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: config.backgroundColor,
        borderLeftColor: config.borderColor,
      }
    ]}>
      <Ionicons 
        name={config.iconName} 
        size={24} 
        color={config.iconColor} 
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        {text1 && (
          <Text style={styles.title} numberOfLines={1}>
            {text1}
          </Text>
        )}
        {text2 && (
          <Text style={styles.message} numberOfLines={2}>
            {text2}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 20,
  },
});

// Toast configuration object
export const toastConfig = {
  success: (props: BaseToastProps) => <CustomToast {...props} type="success" />,
  error: (props: BaseToastProps) => <CustomToast {...props} type="error" />,
  info: (props: BaseToastProps) => <CustomToast {...props} type="info" />,
};

export default toastConfig;
