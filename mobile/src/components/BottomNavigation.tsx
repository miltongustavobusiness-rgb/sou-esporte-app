import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../constants/theme';

type TabName = 'home' | 'events' | 'ranking' | 'tickets' | 'profile';

interface BottomNavigationProps {
  activeTab: TabName;
  onNavigate: (screen: string) => void;
  mode?: 'athlete' | 'organizer';
}

const athleteTabs = [
  { name: 'home' as TabName, label: 'Feed', icon: 'newspaper', iconOutline: 'newspaper-outline', screen: 'Feed' },
  { name: 'events' as TabName, label: 'Competições', icon: 'trophy', iconOutline: 'trophy-outline', screen: 'AthleteHome' },
  { name: 'ranking' as TabName, label: 'Ranking', icon: 'podium', iconOutline: 'podium-outline', screen: 'Ranking' },
  { name: 'tickets' as TabName, label: 'Inscrições', icon: 'document-text', iconOutline: 'document-text-outline', screen: 'MyRegistrations' },
  { name: 'profile' as TabName, label: 'Perfil', icon: 'person', iconOutline: 'person-outline', screen: 'Profile' },
];

const organizerTabs = [
  { name: 'home' as TabName, label: 'Início', icon: 'home', iconOutline: 'home-outline', screen: 'OrganizerHome' },
  { name: 'events' as TabName, label: 'Eventos', icon: 'calendar', iconOutline: 'calendar-outline', screen: 'OrganizerEvents' },
  { name: 'ranking' as TabName, label: 'Resultados', icon: 'trophy', iconOutline: 'trophy-outline', screen: 'PublishResults' },
  { name: 'tickets' as TabName, label: 'Check-in', icon: 'qr-code', iconOutline: 'qr-code-outline', screen: 'CheckIn' },
  { name: 'profile' as TabName, label: 'Perfil', icon: 'person', iconOutline: 'person-outline', screen: 'Profile' },
];

export default function BottomNavigation({ activeTab, onNavigate, mode = 'athlete' }: BottomNavigationProps) {
  const tabs = mode === 'organizer' ? organizerTabs : athleteTabs;

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        const iconName = isActive ? tab.icon : tab.iconOutline;
        
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => onNavigate(tab.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <Ionicons
                name={iconName as any}
                size={22}
                color={isActive ? COLORS.primary : COLORS.textMuted}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 20,
    paddingTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
  },
  iconContainer: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconContainerActive: {
    backgroundColor: COLORS.primary + '20',
  },
  label: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
