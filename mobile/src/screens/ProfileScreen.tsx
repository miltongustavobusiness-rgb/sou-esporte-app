import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { api, User } from '../services/api';
import BottomNavigation from '../components/BottomNavigation';

import { useToast } from '../contexts/ToastContext';
type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
};

const MENU_ITEMS = [
  { id: 'personal', icon: 'person-outline', label: 'Dados Pessoais', screen: 'EditProfile' },
  { id: 'saved', icon: 'bookmark-outline', label: 'Posts Salvos', screen: 'SavedPosts' },
  { id: 'registrations', icon: 'ticket-outline', label: 'Minhas Inscrições', screen: 'MyRegistrations' },
  { id: 'results', icon: 'trophy-outline', label: 'Meus Resultados', screen: 'Results' },
  { id: 'teams', icon: 'people-outline', label: 'Minhas Equipes', screen: 'Teams' },
  { id: 'certificates', icon: 'ribbon-outline', label: 'Certificados', screen: 'Certificates' },
  { id: 'payments', icon: 'card-outline', label: 'Pagamentos', screen: 'Payments' },
  { id: 'notifications', icon: 'notifications-outline', label: 'Notificações', screen: 'Notifications' },
  { id: 'settings', icon: 'settings-outline', label: 'Configurações', screen: 'Settings' },
  { id: 'support', icon: 'chatbubble-ellipses-outline', label: 'Suporte', screen: 'Support' },
  { id: 'help', icon: 'help-circle-outline', label: 'Ajuda', screen: 'Help' },
];

const formatPace = (seconds: number | null): string => {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

interface UserStats {
  totalRaces: number;
  totalDistance: string;
  bestTime5k: number | null;
  bestTime10k: number | null;
  bestTime21k: number | null;
  bestTime42k: number | null;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { showToast } = useToast();
  const { user, logout, mode, toggleMode, isAuthenticated, refreshUser } = useApp();
  const [profileData, setProfileData] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      // Load profile from API
      const profile = await api.getProfile();
      if (profile) {
        setProfileData(profile);
      }
      
      // Load stats from API
      try {
        const userStats = await api.getStats();
        setStats(userStats);
      } catch (e) {
        console.log('Could not load stats');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    await refreshUser();
    setRefreshing(false);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleMenuPress = (screen: string) => {
    const validScreens = ['EditProfile', 'MyRegistrations', 'Results', 'Teams', 'Certificates', 'Payments', 'Notifications', 'Settings', 'Support', 'Help'];
    if (validScreens.includes(screen)) {
      navigation.navigate(screen as any);
    } else {
      showToast('Esta funcionalidade está em desenvolvimento!', 'info');
    }
  };

  const handleModeSwitch = () => {
    toggleMode();
    navigation.reset({
      index: 0,
      routes: [{ name: mode === 'athlete' ? 'OrganizerHome' : 'AthleteHome' }],
    });
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.notLoggedContainer}>
          <Ionicons name="person-circle-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.notLoggedTitle}>Faça login para ver seu perfil</Text>
          <Text style={styles.notLoggedText}>
            Acesse sua conta para ver suas estatísticas, inscrições e muito mais
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Fazer Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <BottomNavigation
          activeTab="profile"
          onNavigate={(screen) => navigation.navigate(screen as any)}
          mode={mode}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  // Use profile data from API, fallback to context user
  const displayName = profileData?.name || user?.name || 'Usuário';
  const displayEmail = profileData?.email || user?.email || '';
  const displayPhotoUrl = profileData?.photoUrl || user?.avatar || null;

  const displayStats = stats || {
    totalRaces: 0,
    totalDistance: '0',
    bestTime5k: null,
  };

  // Generate initials for fallback avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.header}
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={() => navigation.navigate('MyGrid')}
              activeOpacity={0.8}
            >
              {displayPhotoUrl ? (
                <Image 
                  source={{ uri: displayPhotoUrl }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
                </View>
              )}
              <View style={styles.editAvatarButton}>
                <Ionicons name="camera" size={14} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{displayEmail}</Text>
            
            {/* Mode Toggle */}
            <TouchableOpacity style={styles.modeToggle} onPress={handleModeSwitch}>
              <Ionicons 
                name={mode === 'athlete' ? 'briefcase' : 'fitness'} 
                size={16} 
                color={COLORS.background} 
              />
              <Text style={styles.modeText}>
                Modo {mode === 'athlete' ? 'Organizador' : 'Atleta'}
              </Text>
              <Ionicons name="swap-horizontal" size={16} color={COLORS.background} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{displayStats.totalRaces}</Text>
            <Text style={styles.statLabel}>Corridas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="speedometer" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{displayStats.totalDistance}km</Text>
            <Text style={styles.statLabel}>Distância</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{formatPace(displayStats.bestTime5k)}</Text>
            <Text style={styles.statLabel}>Melhor 5K</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === MENU_ITEMS.length - 1 && styles.menuItemLast
              ]}
              onPress={() => handleMenuPress(item.screen)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name={item.icon as any} size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal de Logout */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.modalTitle}>Sair da Conta</Text>
            <Text style={styles.modalMessage}>
              Tem certeza que deseja sair da sua conta?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmLogout}
              >
                <Text style={styles.modalButtonConfirmText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="profile"
        onNavigate={(screen) => navigation.navigate(screen as any)}
        mode={mode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontSize: SIZES.md,
  },
  notLoggedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  notLoggedTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  notLoggedText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  loginButton: {
    marginTop: SPACING.xl,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    paddingHorizontal: SPACING.xl * 2,
    paddingVertical: SPACING.md,
  },
  loginButtonText: {
    ...FONTS.body3,
    color: COLORS.background,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userName: {
    ...FONTS.h2,
    color: COLORS.white,
    marginTop: SPACING.md,
  },
  userEmail: {
    ...FONTS.body4,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.xs,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  modeText: {
    ...FONTS.body4,
    color: COLORS.white,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    marginTop: -SPACING.lg,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    ...SHADOWS.medium,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statValue: {
    ...FONTS.h3,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuContainer: {
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    borderRadius: SIZES.radius,
    ...SHADOWS.light,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemLabel: {
    ...FONTS.body3,
    color: COLORS.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: SIZES.radius,
    gap: SPACING.sm,
  },
  logoutText: {
    ...FONTS.body3,
    color: COLORS.error,
    fontWeight: '600',
  },
  // Modal de Logout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius * 2,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    ...FONTS.body3,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.surfaceLight,
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.error,
  },
  modalButtonCancelText: {
    ...FONTS.body3,
    color: COLORS.text,
    fontWeight: '600',
  },
  modalButtonConfirmText: {
    ...FONTS.body3,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
