import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { Event } from '../services/api';

const { width } = Dimensions.get('window');

interface EventCardProps {
  event: Event;
  onPress: () => void;
  variant?: 'horizontal' | 'vertical' | 'featured';
}

export default function EventCard({ event, onPress, variant = 'vertical' }: EventCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Renderiza badge de preço
  const renderPriceBadge = (size: 'small' | 'normal' = 'normal') => {
    const iconSize = size === 'small' ? 10 : 12;
    const badgeStyle = size === 'small' ? styles.priceBadgeSmall : styles.priceBadge;
    const textStyle = size === 'small' ? styles.priceBadgeTextSmall : styles.priceBadgeText;
    
    if (event.isPaidEvent === false) {
      return (
        <View style={[badgeStyle, styles.freeBadge]}>
          <Ionicons name="gift" size={iconSize} color="#10b981" />
          <Text style={[textStyle, styles.freeBadgeText]}>Gratuito</Text>
        </View>
      );
    }
    return null; // Não mostra badge para eventos pagos (padrão)
  };

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        style={styles.featuredContainer}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Image
          source={{
            uri: event.bannerUrl || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800',
          }}
          style={styles.featuredImage}
        />
        <View style={styles.featuredOverlay}>
          <View style={styles.featuredContent}>
            <View style={styles.badgesRow}>
              {event.featured && (
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={12} color={COLORS.white} />
                  <Text style={styles.featuredBadgeText}>Destaque</Text>
                </View>
              )}
              {renderPriceBadge()}
            </View>
            <Text style={styles.featuredTitle} numberOfLines={2}>
              {event.name}
            </Text>
            <View style={styles.featuredInfo}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.white} />
                <Text style={styles.featuredInfoText}>{formatDate(event.eventDate)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={14} color={COLORS.white} />
                <Text style={styles.featuredInfoText}>
                  {event.city}, {event.state}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'horizontal') {
    return (
      <TouchableOpacity
        style={styles.horizontalContainer}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.horizontalImageContainer}>
          <Image
            source={{
              uri: event.bannerUrl || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400',
            }}
            style={styles.horizontalImage}
          />
          {event.isPaidEvent === false && (
            <View style={styles.horizontalBadgeContainer}>
              {renderPriceBadge('small')}
            </View>
          )}
        </View>
        <View style={styles.horizontalContent}>
          <Text style={styles.horizontalTitle} numberOfLines={2}>
            {event.name}
          </Text>
          <View style={styles.horizontalInfo}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.horizontalInfoText}>{formatDate(event.eventDate)}</Text>
          </View>
          <View style={styles.horizontalInfo}>
            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.horizontalInfoText} numberOfLines={1}>
              {event.city}, {event.state}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Vertical (default)
  return (
    <TouchableOpacity
      style={styles.verticalContainer}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.verticalImageContainer}>
        <Image
          source={{
            uri: event.bannerUrl || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600',
          }}
          style={styles.verticalImage}
        />
        {event.isPaidEvent === false && (
          <View style={styles.verticalBadgeContainer}>
            {renderPriceBadge()}
          </View>
        )}
      </View>
      <View style={styles.verticalContent}>
        <Text style={styles.verticalTitle} numberOfLines={2}>
          {event.name}
        </Text>
        <View style={styles.verticalInfoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.verticalInfoText}>{formatDate(event.eventDate)}</Text>
          </View>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.verticalInfoText} numberOfLines={1}>
            {event.city}, {event.state}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Featured variant
  featuredContainer: {
    width: width * 0.85,
    height: 220,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginRight: 16,
    ...SHADOWS.medium,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  featuredContent: {
    padding: 16,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  featuredBadgeText: {
    ...FONTS.body5,
    color: COLORS.white,
    fontWeight: '600',
  },
  featuredTitle: {
    ...FONTS.h3,
    color: COLORS.white,
    marginBottom: 8,
  },
  featuredInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  featuredInfoText: {
    ...FONTS.body4,
    color: COLORS.white,
    marginLeft: 4,
  },

  // Horizontal variant
  horizontalContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginBottom: 12,
    ...SHADOWS.light,
  },
  horizontalImage: {
    width: 100,
    height: 100,
  },
  horizontalContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  horizontalTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: 6,
  },
  horizontalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  horizontalInfoText: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },

  // Vertical variant
  verticalContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOWS.light,
  },
  verticalImage: {
    width: '100%',
    height: 160,
  },
  verticalContent: {
    padding: 12,
  },
  verticalTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: 8,
  },
  verticalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  verticalInfoText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },

  // Common
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Badges de preço
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  priceBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  priceBadgeText: {
    ...FONTS.body5,
    fontWeight: '600',
  },
  priceBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  freeBadgeText: {
    color: '#10b981',
  },
  
  // Containers para badges posicionados
  horizontalImageContainer: {
    position: 'relative',
  },
  horizontalBadgeContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  verticalImageContainer: {
    position: 'relative',
  },
  verticalBadgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
});
