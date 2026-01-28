import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Team, TeamMemberWithUser } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import api from '../services/api';

import { useToast } from '../contexts/ToastContext';
type TeamDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TeamDetail'>;
  route: RouteProp<RootStackParamList, 'TeamDetail'>;
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

export default function TeamDetailScreen({ navigation, route }: TeamDetailScreenProps) {
  const { showToast } = useToast();
  const { teamId } = route.params;
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const teamData = await api.getTeamById(teamId);
      setTeam(teamData);

      const membersData = await api.getTeamMembers(teamId);
      setMembers(membersData);

      // Find my role in this team
      const myMembership = membersData.find((m: TeamMemberWithUser) => m.user.id === user?.id);
      setMyRole(myMembership?.member.role || null);
    } catch (error) {
      console.error('Error loading team:', error);
      showToast('Não foi possível carregar os dados da equipe.', 'info');
    } finally {
      setLoading(false);
    }
  }, [teamId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const canManageTeam = myRole === 'owner' || myRole === 'admin';

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      showToast('Informe o e-mail do atleta.', 'info');
      return;
    }

    setInviting(true);
    try {
      await api.inviteTeamMember({ teamId, email: inviteEmail.trim(), role: inviteRole });
      showToast('Convite enviado com sucesso!', 'info');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
    } catch (error: any) {
      showToast(error.message || 'Não foi possível enviar o convite.', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (memberId: number, memberName: string) => {
    Alert.alert(
      'Remover Membro',
      `Tem certeza que deseja remover ${memberName} da equipe?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeTeamMember(teamId, memberId);
              await loadData();
              showToast('Membro removido da equipe.', 'info');
            } catch (error: any) {
              showToast(error.message || 'Não foi possível remover o membro.', 'error');
            }
          }
        }
      ]
    );
  };

  const handleTeamRegistration = () => {
    navigation.navigate('EventsList');
    // In a real app, this would navigate to a team registration flow
    Alert.alert(
      'Inscrição em Equipe',
      'Selecione um evento para inscrever membros da sua equipe.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando equipe...</Text>
        </View>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Equipe</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>Equipe não encontrada</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={team.primaryColor || COLORS.primary} />

      {/* Header with Team Banner */}
      <LinearGradient
        colors={[team.primaryColor || COLORS.primary, COLORS.background]}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          {canManageTeam && (
            <TouchableOpacity style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.teamHeader}>
          {team.logoUrl ? (
            <Image source={{ uri: team.logoUrl }} style={styles.teamLogo} />
          ) : (
            <View style={[styles.teamLogoPlaceholder, { backgroundColor: COLORS.white }]}>
              <Text style={[styles.teamLogoText, { color: team.primaryColor || COLORS.primary }]}>
                {team.name.charAt(0)}
              </Text>
            </View>
          )}
          <Text style={styles.teamName}>{team.name}</Text>
          {team.city && team.state && (
            <View style={styles.teamLocation}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.teamLocationText}>{team.city}, {team.state}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{members.length}</Text>
            <Text style={styles.statLabel}>Membros</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Eventos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Medalhas</Text>
          </View>
        </View>

        {/* Description */}
        {team.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre</Text>
            <Text style={styles.description}>{team.description}</Text>
          </View>
        )}

        {/* Actions */}
        {canManageTeam && (
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowInviteModal(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="person-add" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>Convidar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleTeamRegistration}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '20' }]}>
                <Ionicons name="ticket" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.actionLabel}>Inscrever Equipe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.info + '20' }]}>
                <Ionicons name="share-social" size={20} color={COLORS.info} />
              </View>
              <Text style={styles.actionLabel}>Compartilhar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Membros ({members.length})</Text>
            {canManageTeam && (
              <TouchableOpacity onPress={() => setShowInviteModal(true)}>
                <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>

          {members.map((item) => (
            <View key={item.member.id} style={styles.memberCard}>
              <View style={styles.memberInfo}>
                {item.user.photoUrl ? (
                  <Image source={{ uri: item.user.photoUrl }} style={styles.memberAvatar} />
                ) : (
                  <View style={styles.memberAvatarPlaceholder}>
                    <Text style={styles.memberAvatarText}>
                      {item.user.name?.charAt(0) || '?'}
                    </Text>
                  </View>
                )}
                <View style={styles.memberDetails}>
                  <Text style={styles.memberName}>{item.user.name || 'Atleta'}</Text>
                  <View style={[styles.memberRoleBadge, { backgroundColor: getRoleColor(item.member.role) + '20' }]}>
                    <Text style={[styles.memberRoleText, { color: getRoleColor(item.member.role) }]}>
                      {getRoleLabel(item.member.role)}
                    </Text>
                  </View>
                </View>
              </View>
              {canManageTeam && item.member.role !== 'owner' && item.user.id !== user?.id && (
                <TouchableOpacity 
                  style={styles.memberAction}
                  onPress={() => handleRemoveMember(item.member.id, item.user.name || 'Atleta')}
                >
                  <Ionicons name="close-circle-outline" size={24} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Contact Info */}
        {(team.email || team.phone || team.website) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contato</Text>
            <View style={styles.contactCard}>
              {team.email && (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.contactText}>{team.email}</Text>
                </View>
              )}
              {team.phone && (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.contactText}>{team.phone}</Text>
                </View>
              )}
              {team.website && (
                <View style={styles.contactRow}>
                  <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.contactText}>{team.website}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Convidar Membro</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>E-mail do Atleta</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="atleta@exemplo.com"
                placeholderTextColor={COLORS.textMuted}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Função</Text>
              <View style={styles.roleOptions}>
                <TouchableOpacity
                  style={[styles.roleOption, inviteRole === 'member' && styles.roleOptionSelected]}
                  onPress={() => setInviteRole('member')}
                >
                  <Text style={[styles.roleOptionText, inviteRole === 'member' && styles.roleOptionTextSelected]}>
                    Membro
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, inviteRole === 'admin' && styles.roleOptionSelected]}
                  onPress={() => setInviteRole('admin')}
                >
                  <Text style={[styles.roleOptionText, inviteRole === 'admin' && styles.roleOptionTextSelected]}>
                    Administrador
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.modalButton}
              onPress={handleInviteMember}
              disabled={inviting}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.modalButtonGradient}
              >
                {inviting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Enviar Convite</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: SPACING.md,
    color: COLORS.error,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.md,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  teamHeader: {
    alignItems: 'center',
  },
  teamLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  teamLogoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  teamLogoText: {
    ...FONTS.h1,
  },
  teamName: {
    ...FONTS.h2,
    color: COLORS.white,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  teamLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  teamLocationText: {
    ...FONTS.body4,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
    marginTop: -SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    borderRadius: SIZES.radius,
    padding: SPACING.lg,
    ...SHADOWS.light,
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
  },
  statLabel: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  description: {
    ...FONTS.body3,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  actionLabel: {
    ...FONTS.body5,
    color: COLORS.text,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.light,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    ...FONTS.h4,
    color: COLORS.white,
  },
  memberDetails: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  memberName: {
    ...FONTS.body3,
    color: COLORS.text,
    fontWeight: '600',
  },
  memberRoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radius,
    marginTop: 4,
  },
  memberRoleText: {
    ...FONTS.body5,
    fontWeight: '600',
  },
  memberAction: {
    padding: SPACING.xs,
  },
  contactCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    ...SHADOWS.light,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactText: {
    ...FONTS.body3,
    color: COLORS.text,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  modalBody: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...FONTS.body4,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...FONTS.body3,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  roleOption: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleOptionText: {
    ...FONTS.body3,
    color: COLORS.text,
  },
  roleOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  modalButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  modalButtonText: {
    ...FONTS.body2,
    color: COLORS.white,
    fontWeight: '600',
  },
});
