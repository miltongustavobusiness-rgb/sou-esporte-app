import React, { createContext, useContext, useCallback, ReactNode, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  // ALL STATE IS ANIMATED VALUES - NO BOOLEAN ANYWHERE
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  
  // Toast content stored in refs (not state) to avoid re-renders
  const messageRef = useRef('');
  const typeRef = useRef<ToastType>('info');
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Force update mechanism without boolean
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Update refs
    messageRef.current = message || '';
    typeRef.current = type || 'info';
    
    // Force component to read new refs
    forceUpdate();

    // Animate in - opacity goes from 0 to 1
    Animated.parallel([
      Animated.timing(opacity, {
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

    // Auto-hide after 3 seconds
    hideTimeoutRef.current = setTimeout(() => {
      hideToast();
    }, 3000);
  }, [opacity, translateY, hideToast]);

  const getBackgroundColor = (type: ToastType): string => {
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

  const getTextColor = (type: ToastType): string => {
    switch (type) {
      case 'success':
        return COLORS.textOnPrimary;
      case 'warning':
        return COLORS.textOnPrimary;
      default:
        return COLORS.white;
    }
  };

  const getIcon = (type: ToastType): keyof typeof Ionicons.glyphMap => {
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

  const currentType = typeRef.current;
  const currentMessage = messageRef.current;
  const backgroundColor = getBackgroundColor(currentType);
  const textColor = getTextColor(currentType);
  const iconName = getIcon(currentType);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast is ALWAYS mounted - visibility controlled ONLY by opacity animation */}
      {/* pointerEvents controlled by interpolated opacity value */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.container,
          {
            backgroundColor: backgroundColor,
            opacity: opacity,
            transform: [{ translateY: translateY }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.content} 
          onPress={hideToast}
          activeOpacity={0.9}
        >
          <Ionicons name={iconName} size={24} color={textColor} />
          <Text style={[styles.message, { color: textColor }]} numberOfLines={3}>
            {currentMessage}
          </Text>
          <Ionicons name="close" size={20} color={textColor} />
        </TouchableOpacity>
      </Animated.View>
    </ToastContext.Provider>
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

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
