import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

// Mock data para treinos da comunidade
const MOCK_COMMUNITY_TRAININGS = [
  {
    id: '1',
    title: 'Corrida na Praia de Camburi',
    group: 'Lobos Corredores',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    time: '06:00',
    location: 'Praia de Camburi',
    distance: '10km',
    participants: 12,
    confirmed: true,
    type: 'community',
  },
  {
    id: '2',
    title: 'Treino de Velocidade',
    group: 'Trail Runners',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    time: '17:30',
    location: 'Pista de Atletismo UFES',
    distance: '5km',
    participants: 8,
    confirmed: true,
    type: 'community',
  },
  {
    id: '3',
    title: 'Long Run Domingo',
    group: 'Lobos Corredores',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    time: '06:30',
    location: 'Terceira Ponte',
    distance: '21km',
    participants: 15,
    confirmed: false,
    type: 'community',
  },
];

// Mock data para eventos oficiais (IDs correspondem ao banco de dados)
const MOCK_OFFICIAL_EVENTS = [
  {
    id: 120001, // ID do banco de dados - Corrida da fortuna de maré
    title: 'Corrida da Fortuna de Maré',
    date: new Date('2026-03-08'),
    time: '06:00',
    location: 'Vitória, ES',
    category: '21km',
    status: 'Inscrito',
    type: 'official',
  },
  {
    id: 150001, // ID do banco de dados - Triatlón Beneficente
    title: 'Triatlón Beneficente Santa María',
    date: new Date('2026-02-21'),
    time: '07:00',
    location: 'Domingos Martins, ES',
    category: '40km',
    status: 'Inscrito',
    type: 'official',
  },
];

// Mock data para sugestões
const MOCK_SUGGESTIONS = [
  {
    id: 's1',
    title: 'Pedal Matinal',
    group: 'Pedal ES',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    time: '06:00',
    location: 'Praça do Papa',
    distance: '30km',
    participants: 20,
    matchReason: 'Próximo de você',
    type: 'suggestion',
  },
  {
    id: 's2',
    title: 'Natação em Grupo',
    group: 'Triatletas ES',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    time: '18:00',
    location: 'Praia de Camburi',
    distance: '2km',
    participants: 6,
    matchReason: 'Sua modalidade',
    type: 'suggestion',
  },
];

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function AgendaScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'list'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());

  function getWeekStart(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  function getWeekDays(startDate: Date) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  }

  function getMonthDays(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Dias do mês anterior para preencher a primeira semana
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    // Dias do mês atual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Dias do próximo mês para completar a última semana
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  }

  function formatDate(date: Date) {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  function isSameDay(date1: Date, date2: Date) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  function isToday(date: Date) {
    return isSameDay(date, new Date());
  }

  function hasEventsOnDate(date: Date) {
    const allItems = [...MOCK_COMMUNITY_TRAININGS, ...MOCK_OFFICIAL_EVENTS, ...MOCK_SUGGESTIONS];
    return allItems.some(item => isSameDay(new Date(item.date), date));
  }

  function getItemsForDate(date: Date) {
    const trainings = MOCK_COMMUNITY_TRAININGS.filter(t => isSameDay(new Date(t.date), date));
    const events = MOCK_OFFICIAL_EVENTS.filter(e => isSameDay(new Date(e.date), date));
    const suggestions = MOCK_SUGGESTIONS.filter(s => isSameDay(new Date(s.date), date));
    return { trainings, events, suggestions };
  }

  function navigateToPreviousWeek() {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  }

  function navigateToNextWeek() {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  }

  function navigateToPreviousMonth() {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  }

  function navigateToNextMonth() {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  }

  function handleTrainingPress(training: any) {
    navigation.navigate('TrainingDetail', { trainingId: training.id });
  }

  function handleEventPress(event: any) {
    // Bridge para o AthleteStack - abre EventDetail
    navigation.navigate('EventDetail', { eventId: event.id });
  }

  function handleSuggestionPress(suggestion: any) {
    navigation.navigate('TrainingDetail', { trainingId: suggestion.id });
  }

  const renderTrainingCard = (training: any) => (
    <TouchableOpacity 
      key={training.id} 
      style={styles.itemCard}
      onPress={() => handleTrainingPress(training)}
    >
      <View style={styles.itemHeader}>
        <View style={[styles.itemBadge, { backgroundColor: '#84CC16' }]}>
          <Ionicons name="fitness" size={14} color="#fff" />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{training.title}</Text>
          <Text style={styles.itemSubtitle}>{training.group}</Text>
        </View>
        {training.confirmed && (
          <View style={styles.confirmedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#84CC16" />
            <Text style={styles.confirmedText}>Confirmado</Text>
          </View>
        )}
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.itemDetail}>
          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
          <Text style={styles.itemDetailText}>{training.time}</Text>
        </View>
        <View style={styles.itemDetail}>
          <Ionicons name="location-outline" size={14} color="#9CA3AF" />
          <Text style={styles.itemDetailText}>{training.location}</Text>
        </View>
        <View style={styles.itemDetail}>
          <Ionicons name="speedometer-outline" size={14} color="#9CA3AF" />
          <Text style={styles.itemDetailText}>{training.distance}</Text>
        </View>
        <View style={styles.itemDetail}>
          <Ionicons name="people-outline" size={14} color="#9CA3AF" />
          <Text style={styles.itemDetailText}>{training.participants}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEventCard = (event: any) => (
    <TouchableOpacity 
      key={event.id} 
      style={styles.itemCard}
      onPress={() => handleEventPress(event)}
    >
      <View style={styles.itemHeader}>
        <View style={[styles.itemBadge, { backgroundColor: '#F59E0B' }]}>
          <Ionicons name="trophy" size={14} color="#fff" />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{event.title}</Text>
          <Text style={styles.itemSubtitle}>Evento Oficial</Text>
        </View>
        <View style={[styles.confirmedBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
          <Ionicons name="ticket" size={14} color="#F59E0B" />
          <Text style={[styles.confirmedText, { color: '#F59E0B' }]}>{event.status}</Text>
        </View>
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.itemDetail}>
          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
          <Text style={styles.itemDetailText}>{event.time}</Text>
        </View>
        <View style={styles.itemDetail}>
          <Ionicons name="location-outline" size={14} color="#9CA3AF" />
          <Text style={styles.itemDetailText}>{event.location}</Text>
        </View>
        <View style={styles.itemDetail}>
          <Ionicons name="ribbon-outline" size={14} color="#9CA3AF" />
          <Text style={styles.itemDetailText}>{event.category}</Text>
        </View>
      </View>
      <View style={styles.officialBadge}>
        <Ionicons name="shield-checkmark" size={12} color="#F59E0B" />
        <Text style={styles.officialText}>Evento Oficial - Apenas Leitura</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSuggestionCard = (suggestion: any) => (
    <TouchableOpacity 
      key={suggestion.id} 
      style={[styles.itemCard, styles.suggestionCard]}
      onPress={() => handleSuggestionPress(suggestion)}
    >
      <View style={styles.itemHeader}>
        <View style={[styles.itemBadge, { backgroundColor: '#8B5CF6' }]}>
          <Ionicons name="sparkles" size={14} color="#fff" />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{suggestion.title}</Text>
          <Text style={styles.itemSubtitle}>{suggestion.group}</Text>
        </View>
        <View style={[styles.confirmedBadge, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
          <Ionicons name="bulb" size={14} color="#8B5CF6" />
          <Text style={[styles.confirmedText, { color: '#8B5CF6' }]}>{suggestion.matchReason}</Text>
        </View>
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.itemDetail}>
          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
          <Text style={styles.itemDetailText}>{suggestion.time}</Text>
        </View>
        <View style={styles.itemDetail}>
          <Ionicons name="location-outline" size={14} color="#9CA3AF" />
          <Text style={styles.itemDetailText}>{suggestion.location}</Text>
        </View>
        <View style={styles.itemDetail}>
          <Ionicons name="speedometer-outline" size={14} color="#9CA3AF" />
          <Text style={styles.itemDetailText}>{suggestion.distance}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.joinButton}>
        <Text style={styles.joinButtonText}>Participar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentWeekStart);
    const { trainings, events, suggestions } = getItemsForDate(selectedDate);

    return (
      <View style={styles.weekContainer}>
        {/* Navegação da Semana */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity onPress={navigateToPreviousWeek} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#84CC16" />
          </TouchableOpacity>
          <Text style={styles.weekTitle}>
            {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
          </Text>
          <TouchableOpacity onPress={navigateToNextWeek} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color="#84CC16" />
          </TouchableOpacity>
        </View>

        {/* Dias da Semana */}
        <View style={styles.weekDays}>
          {weekDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayButton,
                isSameDay(day, selectedDate) && styles.dayButtonSelected,
                isToday(day) && styles.dayButtonToday,
              ]}
              onPress={() => setSelectedDate(day)}
            >
              <Text style={[
                styles.dayName,
                isSameDay(day, selectedDate) && styles.dayNameSelected,
              ]}>
                {DAYS_OF_WEEK[day.getDay()]}
              </Text>
              <Text style={[
                styles.dayNumber,
                isSameDay(day, selectedDate) && styles.dayNumberSelected,
              ]}>
                {day.getDate()}
              </Text>
              {hasEventsOnDate(day) && (
                <View style={[
                  styles.dayDot,
                  isSameDay(day, selectedDate) && styles.dayDotSelected,
                ]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Conteúdo do Dia Selecionado */}
        <ScrollView style={styles.dayContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.selectedDateTitle}>
            {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
          </Text>

          {/* Treinos da Comunidade */}
          {trainings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="fitness" size={18} color="#84CC16" />
                <Text style={styles.sectionTitle}>Treinos da Comunidade</Text>
              </View>
              {trainings.map(renderTrainingCard)}
            </View>
          )}

          {/* Eventos Oficiais */}
          {events.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={18} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Eventos Oficiais</Text>
              </View>
              {events.map(renderEventCard)}
            </View>
          )}

          {/* Sugestões */}
          {suggestions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="sparkles" size={18} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Sugestões para Você</Text>
              </View>
              {suggestions.map(renderSuggestionCard)}
            </View>
          )}

          {trainings.length === 0 && events.length === 0 && suggestions.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#4B5563" />
              <Text style={styles.emptyText}>Nenhum evento neste dia</Text>
              <Text style={styles.emptySubtext}>Explore treinos ou inscreva-se em eventos</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  const renderMonthView = () => {
    const monthDays = getMonthDays(currentMonth);

    return (
      <View style={styles.monthContainer}>
        {/* Navegação do Mês */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={navigateToPreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#84CC16" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={navigateToNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color="#84CC16" />
          </TouchableOpacity>
        </View>

        {/* Cabeçalho dos Dias */}
        <View style={styles.monthHeader}>
          {DAYS_OF_WEEK.map((day, index) => (
            <Text key={index} style={styles.monthDayHeader}>{day}</Text>
          ))}
        </View>

        {/* Grid do Mês */}
        <View style={styles.monthGrid}>
          {monthDays.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.monthDay,
                !item.isCurrentMonth && styles.monthDayOther,
                isSameDay(item.date, selectedDate) && styles.monthDaySelected,
                isToday(item.date) && styles.monthDayToday,
              ]}
              onPress={() => {
                setSelectedDate(item.date);
                setActiveTab('week');
              }}
            >
              <Text style={[
                styles.monthDayText,
                !item.isCurrentMonth && styles.monthDayTextOther,
                isSameDay(item.date, selectedDate) && styles.monthDayTextSelected,
              ]}>
                {item.date.getDate()}
              </Text>
              {hasEventsOnDate(item.date) && item.isCurrentMonth && (
                <View style={styles.monthDayDot} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Legenda */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#84CC16' }]} />
            <Text style={styles.legendText}>Treinos</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Eventos</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.legendText}>Sugestões</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderListView = () => {
    const allTrainings = MOCK_COMMUNITY_TRAININGS.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const allEvents = MOCK_OFFICIAL_EVENTS.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const allSuggestions = MOCK_SUGGESTIONS.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {/* Próximos Treinos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="fitness" size={18} color="#84CC16" />
            <Text style={styles.sectionTitle}>Próximos Treinos</Text>
            <Text style={styles.sectionCount}>{allTrainings.length}</Text>
          </View>
          {allTrainings.length > 0 ? (
            allTrainings.map(renderTrainingCard)
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Nenhum treino agendado</Text>
            </View>
          )}
        </View>

        {/* Próximos Eventos Oficiais */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Próximos Eventos Oficiais</Text>
            <Text style={styles.sectionCount}>{allEvents.length}</Text>
          </View>
          {allEvents.length > 0 ? (
            allEvents.map(renderEventCard)
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Nenhum evento inscrito</Text>
            </View>
          )}
        </View>

        {/* Sugestões */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={18} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Sugestões para Você</Text>
            <Text style={styles.sectionCount}>{allSuggestions.length}</Text>
          </View>
          {allSuggestions.length > 0 ? (
            allSuggestions.map(renderSuggestionCard)
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Nenhuma sugestão disponível</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agenda</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('AgendaSettings' as never)} 
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'week' && styles.tabActive]}
          onPress={() => setActiveTab('week')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={18} 
            color={activeTab === 'week' ? '#84CC16' : '#9CA3AF'} 
          />
          <Text style={[styles.tabText, activeTab === 'week' && styles.tabTextActive]}>
            Semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'month' && styles.tabActive]}
          onPress={() => setActiveTab('month')}
        >
          <Ionicons 
            name="grid-outline" 
            size={18} 
            color={activeTab === 'month' ? '#84CC16' : '#9CA3AF'} 
          />
          <Text style={[styles.tabText, activeTab === 'month' && styles.tabTextActive]}>
            Mês
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => setActiveTab('list')}
        >
          <Ionicons 
            name="list-outline" 
            size={18} 
            color={activeTab === 'list' ? '#84CC16' : '#9CA3AF'} 
          />
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
            Lista
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo */}
      {activeTab === 'week' && renderWeekView()}
      {activeTab === 'month' && renderMonthView()}
      {activeTab === 'list' && renderListView()}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(132, 204, 22, 0.2)',
    borderWidth: 1,
    borderColor: '#84CC16',
  },
  tabText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#84CC16',
  },
  // Week View
  weekContainer: {
    flex: 1,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    padding: 8,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  weekDays: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  dayButtonSelected: {
    backgroundColor: '#84CC16',
  },
  dayButtonToday: {
    borderWidth: 1,
    borderColor: '#84CC16',
  },
  dayName: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dayNameSelected: {
    color: '#0F172A',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dayNumberSelected: {
    color: '#0F172A',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#84CC16',
    marginTop: 4,
  },
  dayDotSelected: {
    backgroundColor: '#0F172A',
  },
  dayContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 12,
  },
  // Month View
  monthContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  monthHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthDay: {
    width: (width - 32) / 7,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDayOther: {
    opacity: 0.3,
  },
  monthDaySelected: {
    backgroundColor: '#84CC16',
    borderRadius: 22,
  },
  monthDayToday: {
    borderWidth: 1,
    borderColor: '#84CC16',
    borderRadius: 22,
  },
  monthDayText: {
    fontSize: 14,
    color: '#fff',
  },
  monthDayTextOther: {
    color: '#4B5563',
  },
  monthDayTextSelected: {
    color: '#0F172A',
    fontWeight: '600',
  },
  monthDayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#84CC16',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // List View
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Sections
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    color: '#9CA3AF',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  // Item Cards
  itemCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  suggestionCard: {
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(132, 204, 22, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  confirmedText: {
    fontSize: 11,
    color: '#84CC16',
    fontWeight: '500',
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemDetailText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 6,
  },
  officialText: {
    fontSize: 11,
    color: '#F59E0B',
  },
  joinButton: {
    backgroundColor: '#84CC16',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  // Empty States
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  emptySection: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
