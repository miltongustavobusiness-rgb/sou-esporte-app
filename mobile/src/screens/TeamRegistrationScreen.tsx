import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Team, TeamMemberWithUser, Event, EventCategory, EventKit } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import api from '../services/api';

import { useToast } from '../contexts/ToastContext';
type TeamRegistrationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TeamRegistration'>;
  route: RouteProp<RootStackParamList, 'TeamRegistration'>;
};

interface AthleteSelection {
  userId: number;
  name: string;
  photoUrl: string | null;
  selected: boolean;
  categoryId: number | null;
  kitId: number | null;
  kitSize: string | null;
}

const formatPrice = (price: string | number) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `R$ ${numPrice.toFixed(2).replace('.', ',')}`;
};

export default function TeamRegistrationScreen({ navigation, route }: TeamRegistrationScreenProps) {
  const { showToast } = useToast();
  const { teamId, eventId } = route.params;
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [kits, setKits] = useState<EventKit[]>([]);
  const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
  const [athletes, setAthletes] = useState<AthleteSelection[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [teamData, eventData, categoriesData, kitsData, membersData] = await Promise.all([
        api.getTeamById(teamId),
        api.getEventById(eventId),
        api.getEventCategories(eventId),
        api.getEventKits(eventId),
        api.getTeamMembers(teamId),
      ]);

      setTeam(teamData);
      setEvent(eventData);
      setCategories(categoriesData);
      setKits(kitsData);
      setMembers(membersData);

      // Initialize athlete selections
      const initialAthletes: AthleteSelection[] = membersData
        .filter((m: TeamMemberWithUser) => m.member.status === 'active')
        .map((m: TeamMemberWithUser) => ({
          userId: m.user.id,
          name: m.user.name || 'Atleta',
          photoUrl: m.user.photoUrl || null,
          selected: false,
          categoryId: categoriesData.length > 0 ? categoriesData[0].id : null,
          kitId: null,
          kitSize: null,
        }));
      setAthletes(initialAthletes);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Não foi possível carregar os dados.', 'info');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [teamId, eventId, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAthleteSelection = (userId: number) => {
    setAthletes(prev => prev.map(a => 
      a.userId === userId ? { ...a, selected: !a.selected } : a
    ));
  };

  const updateAthleteCategory = (userId: number, categoryId: number) => {
    setAthletes(prev => prev.map(a => 
      a.userId === userId ? { ...a, categoryId } : a
    ));
  };

  const updateAthleteKit = (userId: number, kitId: number | null) => {
    setAthletes(prev => prev.map(a => 
      a.userId === userId ? { ...a, kitId } : a
    ));
  };

  const getSelectedAthletes = () => athletes.filter(a => a.selected);

  const calculateTotal = () => {
    const selected = getSelectedAthletes();
    let total = 0;

    selected.forEach(athlete => {
      const category = categories.find(c => c.id === athlete.categoryId);
      const kit = kits.find(k => k.id === athlete.kitId);
      
      if (category) {
        total += parseFloat(category.price);
      }
      if (kit) {
        total += parseFloat(kit.additionalPrice);
      }
    });

    return total;
  };

  const handleSubmit = async () => {
    const selected = getSelectedAthletes();
    
    if (selected.length === 0) {
      showToast('Selecione pelo menos um atleta para inscrever.', 'info');
      return;
    }

    const invalidAthletes = selected.filter(a => !a.categoryId);
    if (invalidAthletes.length > 0) {
      showToast('Todos os atletas selecionados devem ter uma categoria.', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.registerTeamForEvent({
        teamId,
        eventId,
        athletes: selected.map(a => ({
          userId: a.userId,
          categoryId: a.categoryId!,
          kitId: a.kitId || undefined,
          kitSize: a.kitSize || undefined,
        })),
      });

      showToast(`${result.registrations.length} atleta(s) inscrito(s) com sucesso! Total: ${formatPrice(result.totalAmount)}`, 'success');
      // Abrir checkout se disponível
      if (result.checkoutUrl) {
        setTimeout(() => Linking.openURL(result.checkoutUrl), 1500);
      } else {
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (error: any) {
      showToast(error.message || 'Não foi possível realizar as inscrições.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  const selectedAthletes = getSelectedAthletes();
  const total = calculateTotal();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inscrição em Equipe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <View style={styles.eventCard}>
          <Text style={styles.eventName}>{event?.name}</Text>
          <View style={styles.eventMeta}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.eventMetaText}>
              {event?.eventDate ? new Date(event.eventDate).toLocaleDateString('pt-BR') : ''}
            </Text>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} style={{ marginLeft: 12 }} />
            <Text style={styles.eventMetaText}>{event?.city}, {event?.state}</Text>
          </View>
        </View>

        {/* Team Info */}
        <View style={styles.teamCard}>
          <View style={styles.teamHeader}>
            {team?.logoUrl ? (
              <Image source={{ uri: team.logoUrl }} style={styles.teamLogo} />
            ) : (
              <View style={[styles.teamLogoPlaceholder, { backgroundColor: team?.primaryColor || COLORS.primary }]}>
                <Text style={styles.teamLogoText}>{team?.name.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{team?.name}</Text>
              <Text style={styles.teamMembersCount}>{members.length} membros</Text>
            </View>
          </View>
        </View>

        {/* Athletes Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione os Atletas</Text>
          <Text style={styles.sectionSubtitle}>
            Marque os atletas que deseja inscrever neste evento
          </Text>

          {athletes.map((athlete) => (
            <View key={athlete.userId} style={styles.athleteCard}>
              <TouchableOpacity 
                style={styles.athleteHeader}
                onPress={() => toggleAthleteSelection(athlete.userId)}
              >
                <View style={styles.athleteInfo}>
                  <View style={[
                    styles.checkbox,
                    athlete.selected && styles.checkboxSelected
                  ]}>
                    {athlete.selected && (
                      <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    )}
                  </View>
                  {athlete.photoUrl ? (
                    <Image source={{ uri: athlete.photoUrl }} style={styles.athleteAvatar} />
                  ) : (
                    <View style={styles.athleteAvatarPlaceholder}>
                      <Text style={styles.athleteAvatarText}>{athlete.name.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.athleteName}>{athlete.name}</Text>
                </View>
              </TouchableOpacity>

              {athlete.selected && (
                <View style={styles.athleteOptions}>
                  {/* Category Selection */}
                  <Text style={styles.optionLabel}>Categoria</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.optionChip,
                          athlete.categoryId === category.id && styles.optionChipSelected
                        ]}
                        onPress={() => updateAthleteCategory(athlete.userId, category.id)}
                      >
                        <Text style={[
                          styles.optionChipText,
                          athlete.categoryId === category.id && styles.optionChipTextSelected
                        ]}>
                          {category.name} - {formatPrice(category.price)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Kit Selection */}
                  {kits.length > 0 && (
                    <>
                      <Text style={styles.optionLabel}>Kit (opcional)</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                        <TouchableOpacity
                          style={[
                            styles.optionChip,
                            athlete.kitId === null && styles.optionChipSelected
                          ]}
                          onPress={() => updateAthleteKit(athlete.userId, null)}
                        >
                          <Text style={[
                            styles.optionChipText,
                            athlete.kitId === null && styles.optionChipTextSelected
                          ]}>
                            Sem Kit
                          </Text>
                        </TouchableOpacity>
                        {kits.filter(k => k.available).map((kit) => (
                          <TouchableOpacity
                            key={kit.id}
                            style={[
                              styles.optionChip,
                              athlete.kitId === kit.id && styles.optionChipSelected
                            ]}
                            onPress={() => updateAthleteKit(athlete.userId, kit.id)}
                          >
                            <Text style={[
                              styles.optionChipText,
                              athlete.kitId === kit.id && styles.optionChipTextSelected
                            ]}>
                              {kit.name} +{formatPrice(kit.additionalPrice)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 150 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {selectedAthletes.length} atleta(s) selecionado(s)
          </Text>
          <Text style={styles.summaryTotal}>{formatPrice(total)}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.submitButton, selectedAthletes.length === 0 && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || selectedAthletes.length === 0}
        >
          <LinearGradient
            colors={selectedAthletes.length > 0 ? [COLORS.primary, COLORS.primaryDark] : [COLORS.border, COLORS.border]}
            style={styles.submitButtonGradient}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="people" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Inscrever Equipe</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.light,
  },
  eventName: {
    ...FONTS.body2,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventMetaText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  teamCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.light,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  teamLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamLogoText: {
    ...FONTS.h3,
    color: COLORS.white,
  },
  teamInfo: {
    marginLeft: SPACING.md,
  },
  teamName: {
    ...FONTS.body2,
    color: COLORS.text,
    fontWeight: '600',
  },
  teamMembersCount: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  athleteCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.light,
  },
  athleteHeader: {
    padding: SPACING.md,
  },
  athleteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  athleteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  athleteAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  athleteAvatarText: {
    ...FONTS.body2,
    color: COLORS.white,
    fontWeight: '600',
  },
  athleteName: {
    ...FONTS.body3,
    color: COLORS.text,
    fontWeight: '500',
    marginLeft: SPACING.md,
  },
  athleteOptions: {
    padding: SPACING.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  optionLabel: {
    ...FONTS.body4,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  optionsScroll: {
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  optionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionChipText: {
    ...FONTS.body4,
    color: COLORS.text,
  },
  optionChipTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryLabel: {
    ...FONTS.body3,
    color: COLORS.textSecondary,
  },
  summaryTotal: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  submitButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  submitButtonText: {
    ...FONTS.body2,
    color: COLORS.white,
    fontWeight: '600',
  },
});
