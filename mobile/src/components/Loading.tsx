import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message = 'Carregando...', fullScreen = false }: LoadingProps) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreenContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={COLORS.primary} />
      <Text style={styles.messageSmall}>{message}</Text>
    </View>
  );
}

// Skeleton components
export function SkeletonBox({ width: w, height, style }: { width: number | string; height: number; style?: any }) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: w, height, opacity },
        style,
      ]}
    />
  );
}

export function EventCardSkeleton({ variant = 'vertical' }: { variant?: 'horizontal' | 'vertical' | 'featured' }) {
  if (variant === 'featured') {
    return (
      <View style={styles.featuredSkeleton}>
        <SkeletonBox width="100%" height={220} />
      </View>
    );
  }

  if (variant === 'horizontal') {
    return (
      <View style={styles.horizontalSkeleton}>
        <SkeletonBox width={100} height={100} />
        <View style={styles.horizontalSkeletonContent}>
          <SkeletonBox width={60} height={20} style={{ marginBottom: 8 }} />
          <SkeletonBox width="80%" height={18} style={{ marginBottom: 6 }} />
          <SkeletonBox width="60%" height={14} style={{ marginBottom: 4 }} />
          <SkeletonBox width="50%" height={14} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.verticalSkeleton}>
      <SkeletonBox width="100%" height={160} />
      <View style={styles.verticalSkeletonContent}>
        <SkeletonBox width={60} height={20} style={{ marginBottom: 8 }} />
        <SkeletonBox width="90%" height={20} style={{ marginBottom: 8 }} />
        <SkeletonBox width="70%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonBox width="50%" height={16} />
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.profileSkeleton}>
      <SkeletonBox width={100} height={100} style={{ borderRadius: 50, marginBottom: 16 }} />
      <SkeletonBox width={150} height={24} style={{ marginBottom: 8 }} />
      <SkeletonBox width={200} height={16} style={{ marginBottom: 24 }} />
      <View style={styles.statsSkeleton}>
        <SkeletonBox width={80} height={60} style={{ borderRadius: 12 }} />
        <SkeletonBox width={80} height={60} style={{ borderRadius: 12 }} />
        <SkeletonBox width={80} height={60} style={{ borderRadius: 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  message: {
    ...FONTS.body3,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  messageSmall: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  skeleton: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
  },
  featuredSkeleton: {
    width: width * 0.85,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  horizontalSkeleton: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  horizontalSkeletonContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  verticalSkeleton: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  verticalSkeletonContent: {
    padding: 12,
  },
  profileSkeleton: {
    alignItems: 'center',
    padding: 24,
  },
  statsSkeleton: {
    flexDirection: 'row',
    gap: 16,
  },
});
