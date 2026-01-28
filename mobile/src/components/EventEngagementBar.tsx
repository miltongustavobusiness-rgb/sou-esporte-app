import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES } from '../constants/theme';

interface EventEngagementBarProps {
  viewCount?: number;
  likesCount?: number;
  sharesCount?: number;
  isLiked?: boolean;
  onLike?: () => void;
  onShare?: () => void;
  variant?: 'default' | 'compact' | 'light'; // light for dark backgrounds
  showLabels?: boolean;
}

// Format large numbers (1.2K, 35K, 1.1M)
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

export default function EventEngagementBar({
  viewCount = 0,
  likesCount = 0,
  sharesCount = 0,
  isLiked = false,
  onLike,
  onShare,
  variant = 'default',
  showLabels = false,
}: EventEngagementBarProps) {
  
  // Stop propagation to prevent opening event when clicking buttons
  const handleLikePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    onLike?.();
  };

  const handleSharePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    onShare?.();
  };

  // Prevent touch events from bubbling to parent TouchableOpacity
  const preventBubbling = () => true;

  const isLight = variant === 'light';
  const isCompact = variant === 'compact';
  
  const textColor = isLight ? 'rgba(255,255,255,0.9)' : COLORS.textMuted;
  const iconColor = isLight ? 'rgba(255,255,255,0.85)' : COLORS.textSecondary;
  const likeColor = isLiked ? '#EF4444' : iconColor;
  
  const iconSize = isCompact ? 16 : 20;
  const fontSize = isCompact ? 11 : 13;
  const containerGap = isCompact ? 12 : 16;
  const itemGap = isCompact ? 4 : 6;

  return (
    <View 
      style={[styles.container, { gap: containerGap }]}
      onStartShouldSetResponder={preventBubbling}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Views - não clicável */}
      <View style={[styles.metricItem, { gap: itemGap }]}>
        <Ionicons name="eye-outline" size={iconSize} color={iconColor} />
        <Text style={[styles.metricText, { color: textColor, fontSize }]}>
          {formatNumber(viewCount)}
        </Text>
        {showLabels && <Text style={[styles.labelText, { color: textColor }]}>views</Text>}
      </View>

      {/* Likes - clicável */}
      <TouchableOpacity
        style={styles.touchableMetric}
        onPress={handleLikePress}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      >
        <View style={[styles.metricItem, { gap: itemGap }]}>
          <Ionicons 
            name={isLiked ? 'heart' : 'heart-outline'} 
            size={iconSize} 
            color={likeColor} 
          />
          <Text style={[styles.metricText, { color: isLiked ? '#EF4444' : textColor, fontSize }]}>
            {formatNumber(likesCount)}
          </Text>
          {showLabels && <Text style={[styles.labelText, { color: textColor }]}>likes</Text>}
        </View>
      </TouchableOpacity>

      {/* Share - clicável */}
      <TouchableOpacity
        style={styles.touchableMetric}
        onPress={handleSharePress}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      >
        <View style={[styles.metricItem, { gap: itemGap }]}>
          <Ionicons name="share-social-outline" size={iconSize} color={iconColor} />
          <Text style={[styles.metricText, { color: textColor, fontSize }]}>
            {formatNumber(sharesCount)}
          </Text>
          {showLabels && <Text style={[styles.labelText, { color: textColor }]}>shares</Text>}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  touchableMetric: {
    // Minimum touch area 44x44 for iOS, 48x48 for Android
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricText: {
    fontWeight: '600',
  },
  labelText: {
    fontSize: 10,
    marginLeft: 2,
  },
});
