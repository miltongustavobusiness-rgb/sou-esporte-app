import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  onHide: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ 
  visible, 
  message, 
  type, 
  onHide, 
  duration = 3000 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible === true) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  // Ensure visible is strictly boolean
  if (visible !== true) return null;

  const getBackgroundColor = (): string => {
    switch (type) {
      case 'success':
        return COLORS.primary;
      case 'error':
        return COLORS.error;
      case 'warning':
        return COLORS.warning;
      case 'info':
        return COLORS.info;
      default:
        return COLORS.info;
    }
  };

  const getTextColor = (): string => {
    switch (type) {
      case 'success':
        return COLORS.textOnPrimary;
      case 'warning':
        return COLORS.textOnPrimary;
      default:
        return COLORS.white;
    }
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  };

  const textColor = getTextColor();
  const backgroundColor = getBackgroundColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor,
          opacity: fadeAnim,
          transform: [{ translateY: translateY }],
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.content} 
        onPress={hideToast}
        activeOpacity={0.9}
      >
        <Ionicons name={getIcon()} size={24} color={textColor} />
        <Text style={[styles.message, { color: textColor }]} numberOfLines={3}>
          {message}
        </Text>
        <Ionicons name="close" size={20} color={textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 20,
    marginHorizontal: 12,
  },
});

export default Toast;
