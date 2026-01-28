import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, SIZES, SHADOWS, RADIUS } from '../constants/theme';
import { api, Event, EventResult } from '../services/api';

import { useToast } from '../contexts/ToastContext';
type PublishResultsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PublishResults'>;
  route: RouteProp<RootStackParamList, 'PublishResults'>;
};

interface AthleteResult {
  id: number;
  position: number;
  athleteName: string;
  registrationNumber: string;
  category: string;
  chipTime: string;
  gunTime: string;
  pace: string;
}

export default function PublishResultsScreen({ navigation, route }: PublishResultsScreenProps) {
  const { showToast } = useToast();
  const eventId = route.params?.eventId;
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(eventId ? Number(eventId) : null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [results, setResults] = useState<AthleteResult[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todos']);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [editingResult, setEditingResult] = useState<AthleteResult | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResult, setNewResult] = useState({
    athleteName: '',
    registrationNumber: '',
    category: '',
    chipTime: '',
    gunTime: '',
  });

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      const data = await api.getMobileEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }, [selectedEventId]);

  // Load results for selected event
  const loadResults = useCallback(async () => {
    if (!selectedEventId) return;
    
    try {
      // Load event details
      const eventData = await api.getEventById(selectedEventId);
      setSelectedEvent(eventData);
      
      // Load categories
      const eventCategories = await api.getEventCategories(selectedEventId);
      const categoryNames = ['Todos', ...eventCategories.map(c => c.name)];
      setCategories(categoryNames);
      if (newResult.category === '' && eventCategories.length > 0) {
        setNewResult(prev => ({ ...prev, category: eventCategories[0].name }));
      }
      
      // Load results
      const resultsData = await api.getEventResults(selectedEventId);
      const formattedResults: AthleteResult[] = resultsData.map((r, index) => ({
        id: r.id,
        position: r.position || index + 1,
        athleteName: r.athleteName || 'Atleta',
        registrationNumber: r.bibNumber || `#${r.id}`,
        category: r.categoryName || 'Geral',
        chipTime: r.chipTime || '--:--:--',
        gunTime: r.gunTime || r.chipTime || '--:--:--',
        pace: r.pace || '--:--/km',
      }));
      setResults(formattedResults);
      setIsPublished(eventData.resultsPublished || false);
    } catch (error) {
      console.error('Error loading results:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (selectedEventId) {
      setLoading(true);
      loadResults();
    }
  }, [selectedEventId, loadResults]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResults();
    setRefreshing(false);
  };

  const filteredResults = results.filter(result => {
    const matchesCategory = selectedCategory === 'Todos' || result.category === selectedCategory;
    const matchesSearch = 
      result.athleteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePublish = () => {
    Alert.alert(
      'Publicar Resultados',
      'Tem certeza que deseja publicar os resultados? Os atletas serão notificados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Publicar',
          onPress: async () => {
            setIsPublishing(true);
            try {
              await api.publishResults(selectedEventId!);
              setIsPublished(true);
              showToast('Resultados publicados com sucesso. Os atletas foram notificados.', 'info');
            } catch (error: any) {
              showToast(error.message || 'Não foi possível publicar os resultados', 'error');
            } finally {
              setIsPublishing(false);
            }
          },
        },
      ]
    );
  };

  const handleEditResult = (result: AthleteResult) => {
    setEditingResult({ ...result });
  };

  const handleSaveEdit = async () => {
    if (!editingResult) return;
    
    try {
      await api.updateResult(editingResult.id, {
        chipTime: editingResult.chipTime,
        gunTime: editingResult.gunTime,
        position: editingResult.position,
      });
      
      setResults(prev => prev.map(r => 
        r.id === editingResult.id ? editingResult : r
      ));
      setEditingResult(null);
      showToast('Resultado atualizado com sucesso.', 'info');
    } catch (error: any) {
      showToast(error.message || 'Não foi possível salvar o resultado', 'error');
    }
  };

  const handleDeleteResult = (id: number) => {
    Alert.alert(
      'Excluir Resultado',
      'Tem certeza que deseja excluir este resultado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteResult(id);
              setResults(prev => prev.filter(r => r.id !== id));
            } catch (error: any) {
              showToast(error.message || 'Não foi possível excluir o resultado', 'error');
            }
          },
        },
      ]
    );
  };

  const handleAddResult = async () => {
    if (!newResult.athleteName || !newResult.chipTime) {
      showToast('Preencha pelo menos o nome do atleta e o tempo chip.', 'info');
      return;
    }

    try {
      const pace = calculatePace(newResult.chipTime, newResult.category);
      
      const resultData = await api.addResult(selectedEventId!, {
        athleteName: newResult.athleteName,
        bibNumber: newResult.registrationNumber,
        categoryName: newResult.category,
        chipTime: newResult.chipTime,
        gunTime: newResult.gunTime || newResult.chipTime,
        pace,
      });

      const newResultFormatted: AthleteResult = {
        id: resultData.id,
        position: results.length + 1,
        athleteName: newResult.athleteName,
        registrationNumber: newResult.registrationNumber || `#${resultData.id}`,
        category: newResult.category,
        chipTime: newResult.chipTime,
        gunTime: newResult.gunTime || newResult.chipTime,
        pace,
      };

      setResults(prev => [...prev, newResultFormatted]);
      setShowAddModal(false);
      setNewResult({
        athleteName: '',
        registrationNumber: '',
        category: categories[1] || '',
        chipTime: '',
        gunTime: '',
      });
    } catch (error: any) {
      showToast(error.message || 'Não foi possível adicionar o resultado', 'error');
    }
  };

  const calculatePace = (time: string, category: string) => {
    const distanceMap: { [key: string]: number } = { 
      '42K': 42, '21K': 21, '10K': 10, '5K': 5,
      'Maratona': 42, 'Meia Maratona': 21
    };
    const distance = distanceMap[category] || 10;
    const parts = time.split(':');
    if (parts.length < 2) return '--:--/km';
    const totalMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    const paceMinutes = Math.floor(totalMinutes / distance);
    const paceSeconds = Math.round((totalMinutes / distance - paceMinutes) * 60);
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
  };

  const renderResultCard = (result: AthleteResult) => (
    <View key={result.id} style={styles.resultCard}>
      <View style={styles.positionContainer}>
        <Text style={[
          styles.positionText,
          result.position <= 3 && styles.topPositionText
        ]}>
          {result.position}º
        </Text>
        {result.position <= 3 && (
          <Ionicons 
            name="medal" 
            size={16} 
            color={result.position === 1 ? '#FFD700' : result.position === 2 ? '#C0C0C0' : '#CD7F32'} 
          />
        )}
      </View>

      <View style={styles.resultInfo}>
        <Text style={styles.athleteName}>{result.athleteName}</Text>
        <Text style={styles.registrationNumber}>{result.registrationNumber}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{result.category}</Text>
        </View>
      </View>

      <View style={styles.timeInfo}>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Chip:</Text>
          <Text style={styles.timeValue}>{result.chipTime}</Text>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Gun:</Text>
          <Text style={styles.timeValueSecondary}>{result.gunTime}</Text>
        </View>
        <Text style={styles.paceText}>{result.pace}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.cardAction}
          onPress={() => handleEditResult(result)}
        >
          <Ionicons name="pencil" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.cardAction}
          onPress={() => handleDeleteResult(result.id)}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !events.length) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Resultados</Text>
          <Text style={styles.headerSubtitle}>{selectedEvent?.name || 'Selecione um evento'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Event Selector */}
      {events.length > 1 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.eventSelector}
          contentContainerStyle={styles.eventSelectorContent}
        >
          {events.map(ev => (
            <TouchableOpacity
              key={ev.id}
              style={[
                styles.eventChip,
                selectedEventId === ev.id && styles.eventChipSelected
              ]}
              onPress={() => setSelectedEventId(ev.id)}
            >
              <Text style={[
                styles.eventChipText,
                selectedEventId === ev.id && styles.eventChipTextSelected
              ]}>
                {ev.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Status Banner */}
      <View style={[styles.statusBanner, isPublished && styles.statusBannerPublished]}>
        <Ionicons 
          name={isPublished ? 'checkmark-circle' : 'time-outline'} 
          size={20} 
          color={isPublished ? COLORS.success : COLORS.warning} 
        />
        <Text style={[styles.statusText, isPublished && styles.statusTextPublished]}>
          {isPublished ? 'Resultados publicados' : 'Resultados não publicados'}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar atleta..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterButton,
              selectedCategory === category && styles.filterButtonActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.filterText,
              selectedCategory === category && styles.filterTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyStateTitle}>Nenhum resultado</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Tente buscar com outros termos' : 'Adicione resultados para este evento'}
            </Text>
            <TouchableOpacity 
              style={styles.addResultButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addResultButtonText}>Adicionar Resultado</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredResults.map(renderResultCard)
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Publish Button */}
      {results.length > 0 && !isPublished && (
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.publishButton}
            onPress={handlePublish}
            disabled={isPublishing}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.publishGradient}
            >
              {isPublishing ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="megaphone" size={20} color={COLORS.white} />
                  <Text style={styles.publishButtonText}>Publicar Resultados</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Modal */}
      <Modal
        visible={!!editingResult}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingResult(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Resultado</Text>
              <TouchableOpacity onPress={() => setEditingResult(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {editingResult && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>Atleta</Text>
                <Text style={styles.readOnlyText}>{editingResult.athleteName}</Text>

                <Text style={styles.inputLabel}>Posição</Text>
                <TextInput
                  style={styles.input}
                  value={String(editingResult.position)}
                  onChangeText={(text) => setEditingResult({
                    ...editingResult,
                    position: parseInt(text) || 0
                  })}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Tempo Chip</Text>
                <TextInput
                  style={styles.input}
                  value={editingResult.chipTime}
                  onChangeText={(text) => setEditingResult({
                    ...editingResult,
                    chipTime: text
                  })}
                  placeholder="HH:MM:SS"
                  placeholderTextColor={COLORS.textMuted}
                />

                <Text style={styles.inputLabel}>Tempo Gun</Text>
                <TextInput
                  style={styles.input}
                  value={editingResult.gunTime}
                  onChangeText={(text) => setEditingResult({
                    ...editingResult,
                    gunTime: text
                  })}
                  placeholder="HH:MM:SS"
                  placeholderTextColor={COLORS.textMuted}
                />

                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Resultado</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nome do Atleta *</Text>
              <TextInput
                style={styles.input}
                value={newResult.athleteName}
                onChangeText={(text) => setNewResult({ ...newResult, athleteName: text })}
                placeholder="Nome completo"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>Número de Inscrição</Text>
              <TextInput
                style={styles.input}
                value={newResult.registrationNumber}
                onChangeText={(text) => setNewResult({ ...newResult, registrationNumber: text })}
                placeholder="Ex: SP2026-12345"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                {categories.filter(c => c !== 'Todos').map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryOption,
                      newResult.category === category && styles.categoryOptionSelected
                    ]}
                    onPress={() => setNewResult({ ...newResult, category })}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      newResult.category === category && styles.categoryOptionTextSelected
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Tempo Chip *</Text>
              <TextInput
                style={styles.input}
                value={newResult.chipTime}
                onChangeText={(text) => setNewResult({ ...newResult, chipTime: text })}
                placeholder="HH:MM:SS"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>Tempo Gun</Text>
              <TextInput
                style={styles.input}
                value={newResult.gunTime}
                onChangeText={(text) => setNewResult({ ...newResult, gunTime: text })}
                placeholder="HH:MM:SS"
                placeholderTextColor={COLORS.textMuted}
              />

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleAddResult}
              >
                <Text style={styles.saveButtonText}>Adicionar Resultado</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventSelector: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventSelectorContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  eventChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    marginRight: SPACING.sm,
  },
  eventChipSelected: {
    backgroundColor: COLORS.primary,
  },
  eventChipText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  eventChipTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.warning + '20',
    gap: SPACING.xs,
  },
  statusBannerPublished: {
    backgroundColor: COLORS.success + '20',
  },
  statusText: {
    fontSize: SIZES.sm,
    color: COLORS.warning,
    fontWeight: '500',
  },
  statusTextPublished: {
    color: COLORS.success,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  filtersContainer: {
    maxHeight: 50,
    marginTop: SPACING.sm,
  },
  filtersContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    marginRight: SPACING.sm,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.light,
  },
  positionContainer: {
    alignItems: 'center',
    marginRight: SPACING.md,
    minWidth: 40,
  },
  positionText: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  topPositionText: {
    color: COLORS.primary,
  },
  resultInfo: {
    flex: 1,
  },
  athleteName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  registrationNumber: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary + '20',
    marginTop: 4,
  },
  categoryText: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  timeInfo: {
    alignItems: 'flex-end',
    marginRight: SPACING.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
  },
  timeValue: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  timeValueSecondary: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  paceText: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    marginTop: 2,
  },
  cardActions: {
    gap: SPACING.xs,
  },
  cardAction: {
    padding: SPACING.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyStateTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyStateText: {
    fontSize: SIZES.md,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  addResultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  addResultButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: SIZES.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: 30,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  publishButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  publishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  publishButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: SIZES.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  inputLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  readOnlyText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  categorySelector: {
    marginTop: SPACING.xs,
  },
  categoryOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryOptionText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  categoryOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: SIZES.md,
  },
});
