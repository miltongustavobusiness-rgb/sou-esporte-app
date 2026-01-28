import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TeamWithMembership } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import api from '../services/api';

import { useToast } from '../contexts/ToastContext';
type TeamsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Teams'>;
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'owner':
      return 'Proprietário';
    case 'admin':
      return 'Administrador';
    case 'member':
      return 'Membro';
    default:
      return role;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'owner':
      return COLORS.primary;
    case 'admin':
      return COLORS.info;
    case 'member':
      return COLORS.textSecondary;
    default:
      return COLORS.textSecondary;
  }
};

export default function TeamsScreen({ navigation }: TeamsScreenProps) {
  const { showToast } = useToast();
  const { isAuthenticated, openLogin, teams, refreshTeams } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      await refreshTeams();
      
      // Load pending invitations
      try {
        const pendingInvitations = await api.getMyTeamInvitations();
        setInvitations(pendingInvitations);
      } catch (e) {
        console.log('Could not load invitations:', e);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, refreshTeams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleAcceptInvitation = async (token: string) => {
    try {
      await api.acceptTeamInvitation(token);
      showToast('Você agora faz parte da equipe!', 'info');
      await loadData();
    } catch (error: any) {
      showToast(error.message || 'Não foi possível aceitar o convite.', 'error');
    }
  };

  const handleTeamPress = (teamId: number) => {
    navigation.navigate('TeamDetail', { teamId });
  };

  const renderInvitationCard = ({ item }: { item: any }) => (
    <View style={styles.invitationCard}>
      <View style={styles.invitationHeader}>
        <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
        <View style={styles.invitationInfo}>
          <Text style={styles.invitationTitle}>Convite para {item.team.name}</Text>
          <Text style={styles.invitationSubtitle}>
            Função: {getRoleLabel(item.invitation.role)}
          </Text>
        </View>
      </View>
      <View style={styles.invitationActions}>
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={() => handleAcceptInvitation(item.invitation.token)}
        >
          <Text style={styles.acceptButtonText}>Aceitar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton}>
          <Text style={styles.declineButtonText}>Recusar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTeamCard = ({ item }: { item: TeamWithMembership }) => (
    <TouchableOpacity 
      style={styles.teamCard}
      onPress={() => handleTeamPress(item.team.id)}
      activeOpacity={0.9}
    >
      <View style={styles.teamHeader}>
        {item.team.logoUrl ? (
          <Image source={{ uri: item.team.logoUrl }} style={styles.teamLogo} />
        ) : (
          <View style={[styles.teamLogoPlaceholder, { backgroundColor: item.team.primaryColor || COLORS.primary }]}>
            <Text style={styles.teamLogoText}>{item.team.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.teamInfo}>
          <Text style={styles.teamName} numberOfLines={1}>{item.team.name}</Text>
          {item.team.city && item.team.state && (
            <View style={styles.teamLocation}>
              <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.teamLocationText}>{item.team.city}, {item.team.state}</Text>
            </View>
          )}
        </View>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.membership.role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(item.membership.role) }]}>
            {getRoleLabel(item.membership.role)}
          </Text>
        </View>
      </View>
      
      {item.team.description && (
        <Text style={styles.teamDescription} numberOfLines={2}>
          {item.team.description}
        </Text>
      )}
      
      <View style={styles.teamFooter}>
        <View style={styles.teamStats}>
          <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.teamStatsText}>Equipe</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Minhas Equipes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loginPrompt}>
          <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.loginPromptTitle}>Faça login para ver suas equipes</Text>
          <Text style={styles.loginPromptText}>
            Você precisa estar logado para acessar suas equipes
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={openLogin}>
            <Text style={styles.loginButtonText}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Equipes</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateTeam')}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando equipes...</Text>
        </View>
      ) : (
        <FlatList
          data={teams}
          renderItem={renderTeamCard}
          keyExtractor={item => item.team.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            invitations.length > 0 ? (
              <View style={styles.invitationsSection}>
                <Text style={styles.sectionTitle}>Convites Pendentes</Text>
                {invitations.map((inv, index) => (
                  <View key={index}>
                    {renderInvitationCard({ item: inv })}
                  </View>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhuma equipe</Text>
              <Text style={styles.emptyText}>
                Você ainda não faz parte de nenhuma equipe
              </Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateTeam')}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.createButtonGradient}
                >
                  <Ionicons name="add" size={20} color={COLORS.white} />
                  <Text style={styles.createButtonText}>Criar Equipe</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  invitationsSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  invitationCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.light,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  invitationInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  invitationTitle: {
    ...FONTS.body2,
    color: COLORS.text,
    fontWeight: '600',
  },
  invitationSubtitle: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  acceptButtonText: {
    ...FONTS.body4,
    color: COLORS.white,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  declineButtonText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  teamCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.light,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  teamLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamLogoText: {
    ...FONTS.h3,
    color: COLORS.white,
  },
  teamInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  teamName: {
    ...FONTS.body2,
    color: COLORS.text,
    fontWeight: '600',
  },
  teamLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  teamLocationText: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SIZES.radius,
  },
  roleText: {
    ...FONTS.body5,
    fontWeight: '600',
  },
  teamDescription: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  teamFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  teamStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamStatsText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  createButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  createButtonText: {
    ...FONTS.body3,
    color: COLORS.white,
    fontWeight: '600',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loginPromptTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  loginPromptText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius,
  },
  loginButtonText: {
    ...FONTS.body3,
    color: COLORS.white,
    fontWeight: '600',
  },
});
