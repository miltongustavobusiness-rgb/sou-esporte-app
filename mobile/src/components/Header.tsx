import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/theme';

interface HeaderProps {
  showModeSwitch?: boolean;
  showNotifications?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
}

export default function Header({
  showModeSwitch = true,
  showNotifications = true,
  showBack = false,
  onBack,
  title,
}: HeaderProps) {
  const { mode, toggleMode } = useApp();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <View style={styles.content}>
        {/* Left side */}
        <View style={styles.leftSection}>
          {showBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
          ) : (
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
          {title && <Text style={styles.title}>{title}</Text>}
        </View>

        {/* Right side */}
        <View style={styles.rightSection}>
          {/* Mode Switch Button */}
          {showModeSwitch && (
            <TouchableOpacity
              style={styles.modeSwitchButton}
              onPress={toggleMode}
            >
              <View style={styles.modeSwitchContent}>
                <Ionicons
                  name={mode === 'athlete' ? 'fitness' : 'briefcase'}
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.modeSwitchText}>
                  {mode === 'athlete' ? 'Atleta' : 'Organizador'}
                </Text>
                <Ionicons
                  name="swap-horizontal"
                  size={14}
                  color={COLORS.primary}
                />
              </View>
            </TouchableOpacity>
          )}

          {/* Notifications */}
          {showNotifications && (
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
    paddingHorizontal: SIZES.padding,
    paddingBottom: 12,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 120,
    height: 36,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    ...FONTS.h3,
    color: COLORS.white,
    marginLeft: 8,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeSwitchButton: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  modeSwitchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeSwitchText: {
    ...FONTS.body4,
    color: COLORS.primary,
    fontWeight: '600',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
