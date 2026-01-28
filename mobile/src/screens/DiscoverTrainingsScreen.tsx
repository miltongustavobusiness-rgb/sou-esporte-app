import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock data for trainings
const MOCK_TRAININGS = [
  {
    id: '1',
    title: 'Treino de Rodagem',
    group: 'Lobos Corredores',
    groupAvatar: '🐺',
    date: 'Hoje',
    time: '18:00',
    location: 'Praia de Camburi',
    distance: '10km',
    level: 'Intermediário',
    participants: 12,
    maxParticipants: 20,
    type: 'rodagem',
    lat: -20.2821,
    lng: -40.2892,
  },
  {
    id: '2',
    title: 'Tiro na Pista',
    group: 'Trail Runners',
    groupAvatar: '🏃',
    date: 'Amanhã',
    time: '06:30',
    location: 'Pista de Atletismo UFES',
    distance: '8km',
    level: 'Forte',
    participants: 8,
    maxParticipants: 15,
    type: 'tiro',
    lat: -20.2756,
    lng: -40.3042,
  },
  {
    id: '3',
    title: 'Longão de Domingo',
    group: 'Lobos Corredores',
    groupAvatar: '🐺',
    date: 'Domingo',
    time: '06:00',
    location: 'Terceira Ponte',
    distance: '21km',
    level: 'Forte',
    participants: 18,
    maxParticipants: 30,
    type: 'longao',
    lat: -20.3012,
    lng: -40.2945,
  },
  {
    id: '4',
    title: 'Trilha Mestre Álvaro',
    group: 'Trail Runners',
    groupAvatar: '🏃',
    date: 'Sábado',
    time: '07:00',
    location: 'Serra - ES',
    distance: '15km',
    level: 'Intermediário',
    participants: 10,
    maxParticipants: 12,
    type: 'trilha',
    lat: -20.1892,
    lng: -40.2567,
  },
  {
    id: '5',
    title: 'Treino Iniciante',
    group: 'Corredores ES',
    groupAvatar: '👟',
    date: 'Hoje',
    time: '19:00',
    location: 'Parque Moscoso',
    distance: '5km',
    level: 'Iniciante',
    participants: 6,
    maxParticipants: 20,
    type: 'rodagem',
    lat: -20.3156,
    lng: -40.3378,
  },
];

const MODALITIES = ['Todas', 'Corrida', 'Triathlon', 'Bike', 'Natação'];
const LEVELS = ['Todos', 'Iniciante', 'Intermediário', 'Forte'];
const DATES = ['Qualquer', 'Hoje', 'Amanhã', 'Fim de semana'];

export default function DiscoverTrainingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedModality, setSelectedModality] = useState('Todas');
  const [selectedLevel, setSelectedLevel] = useState('Todos');
  const [selectedDate, setSelectedDate] = useState('Qualquer');

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Iniciante': return '#22C55E';
      case 'Intermediário': return '#F59E0B';
      case 'Forte': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'rodagem': return 'walk';
      case 'tiro': return 'flash';
      case 'longao': return 'trending-up';
      case 'trilha': return 'trail-sign';
      default: return 'fitness';
    }
  };

  const filteredTrainings = MOCK_TRAININGS.filter(training => {
    if (selectedLevel !== 'Todos' && training.level !== selectedLevel) return false;
    if (selectedDate !== 'Qualquer' && training.date !== selectedDate) return false;
    return true;
  });

  const renderTrainingCard = ({ item }: { item: typeof MOCK_TRAININGS[0] }) => (
    <TouchableOpacity 
      style={styles.trainingCard}
      onPress={() => navigation.navigate('TrainingDetail' as any, { trainingId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.groupInfo}>
          <View style={styles.groupAvatar}>
            <Text style={styles.groupAvatarText}>{item.groupAvatar}</Text>
          </View>
          <View>
            <Text style={styles.groupName}>{item.group}</Text>
            <Text style={styles.trainingTitle}>{item.title}</Text>
          </View>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.level) + '20' }]}>
          <Text style={[styles.levelText, { color: getLevelColor(item.level) }]}>{item.level}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>{item.date} às {item.time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name={getTypeIcon(item.type)} size={16} color="#94A3B8" />
          <Text style={styles.detailText}>{item.distance} • {item.type}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.participantsInfo}>
          <Ionicons name="people-outline" size={16} color="#84CC16" />
          <Text style={styles.participantsText}>
            {item.participants}/{item.maxParticipants} participantes
          </Text>
        </View>
        <View style={styles.rsvpButtons}>
          <TouchableOpacity style={[styles.rsvpButton, styles.rsvpGoing]}>
            <Text style={styles.rsvpButtonText}>Vou</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rsvpButton, styles.rsvpMaybe]}>
            <Text style={styles.rsvpButtonTextMaybe}>Talvez</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map" size={64} color="#94A3B8" />
        <Text style={styles.mapPlaceholderText}>Mapa de treinos</Text>
        <Text style={styles.mapPlaceholderSubtext}>
          {filteredTrainings.length} treinos encontrados na sua região
        </Text>
      </View>
      {/* Training markers would be rendered here */}
      <View style={styles.mapMarkers}>
        {filteredTrainings.map((training, index) => (
          <TouchableOpacity 
            key={training.id}
            style={[styles.mapMarker, { top: 100 + (index * 60), left: 50 + (index * 40) }]}
            onPress={() => navigation.navigate('TrainingDetail' as any, { trainingId: training.id })}
          >
            <View style={styles.markerContent}>
              <Text style={styles.markerEmoji}>{training.groupAvatar}</Text>
            </View>
            <View style={styles.markerLabel}>
              <Text style={styles.markerLabelText}>{training.title}</Text>
              <Text style={styles.markerLabelTime}>{training.time}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Descobrir Treinos</Text>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => setActiveTab('list')}
        >
          <Ionicons name="list" size={20} color={activeTab === 'list' ? '#84CC16' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>Lista</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'map' && styles.tabActive]}
          onPress={() => setActiveTab('map')}
        >
          <Ionicons name="map" size={20} color={activeTab === 'map' ? '#84CC16' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>Mapa</Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {(selectedModality !== 'Todas' || selectedLevel !== 'Todos' || selectedDate !== 'Qualquer') && (
        <View style={styles.activeFilters}>
          {selectedModality !== 'Todas' && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{selectedModality}</Text>
              <TouchableOpacity onPress={() => setSelectedModality('Todas')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}
          {selectedLevel !== 'Todos' && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{selectedLevel}</Text>
              <TouchableOpacity onPress={() => setSelectedLevel('Todos')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}
          {selectedDate !== 'Qualquer' && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{selectedDate}</Text>
              <TouchableOpacity onPress={() => setSelectedDate('Qualquer')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Content */}
      {activeTab === 'list' ? (
        <FlatList
          data={filteredTrainings}
          renderItem={renderTrainingCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>Nenhum treino encontrado</Text>
              <Text style={styles.emptySubtext}>Tente ajustar os filtros</Text>
            </View>
          }
        />
      ) : (
        renderMapView()
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Modality Filter */}
              <Text style={styles.filterLabel}>Modalidade</Text>
              <View style={styles.filterOptions}>
                {MODALITIES.map(modality => (
                  <TouchableOpacity
                    key={modality}
                    style={[
                      styles.filterOption,
                      selectedModality === modality && styles.filterOptionActive
                    ]}
                    onPress={() => setSelectedModality(modality)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedModality === modality && styles.filterOptionTextActive
                    ]}>{modality}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Level Filter */}
              <Text style={styles.filterLabel}>Nível</Text>
              <View style={styles.filterOptions}>
                {LEVELS.map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.filterOption,
                      selectedLevel === level && styles.filterOptionActive
                    ]}
                    onPress={() => setSelectedLevel(level)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedLevel === level && styles.filterOptionTextActive
                    ]}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date Filter */}
              <Text style={styles.filterLabel}>Data</Text>
              <View style={styles.filterOptions}>
                {DATES.map(date => (
                  <TouchableOpacity
                    key={date}
                    style={[
                      styles.filterOption,
                      selectedDate === date && styles.filterOptionActive
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedDate === date && styles.filterOptionTextActive
                    ]}>{date}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    gap: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#84CC16',
  },
  activeFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  filterChipText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  trainingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: {
    fontSize: 20,
  },
  groupName: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  trainingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantsText: {
    fontSize: 13,
    color: '#84CC16',
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rsvpGoing: {
    backgroundColor: '#84CC16',
  },
  rsvpMaybe: {
    backgroundColor: '#334155',
  },
  rsvpButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  rsvpButtonTextMaybe: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  mapMarkers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapMarker: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  markerContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#84CC16',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerEmoji: {
    fontSize: 16,
  },
  markerLabel: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 4,
  },
  markerLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  markerLabelTime: {
    fontSize: 10,
    color: '#84CC16',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#334155',
  },
  filterOptionActive: {
    backgroundColor: '#84CC16',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  filterOptionTextActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#84CC16',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
});
