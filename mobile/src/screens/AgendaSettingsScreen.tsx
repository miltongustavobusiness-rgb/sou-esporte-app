import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function AgendaSettingsScreen() {
  const navigation = useNavigation();
  
  // Estados das configurações
  const [trainingReminder, setTrainingReminder] = useState(true);
  const [trainingReminderTime, setTrainingReminderTime] = useState('1h');
  const [eventReminder, setEventReminder] = useState(true);
  const [eventReminderTime, setEventReminderTime] = useState('1d');
  const [syncCalendar, setSyncCalendar] = useState(false);
  const [syncTrainings, setSyncTrainings] = useState(true);
  const [syncEvents, setSyncEvents] = useState(true);
  const [weekStartsOn, setWeekStartsOn] = useState('sunday');

  const reminderTimeOptions = [
    { value: '15m', label: '15 minutos antes' },
    { value: '30m', label: '30 minutos antes' },
    { value: '1h', label: '1 hora antes' },
    { value: '2h', label: '2 horas antes' },
    { value: '1d', label: '1 dia antes' },
  ];

  const eventReminderTimeOptions = [
    { value: '1h', label: '1 hora antes' },
    { value: '1d', label: '1 dia antes' },
    { value: '2d', label: '2 dias antes' },
    { value: '1w', label: '1 semana antes' },
  ];

  const handleSyncCalendar = async () => {
    if (!syncCalendar) {
      Alert.alert(
        'Sincronizar Calendário',
        'Deseja permitir que o Sou Esporte adicione treinos e eventos ao calendário do seu dispositivo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Permitir', 
            onPress: () => {
              setSyncCalendar(true);
              Alert.alert('Sucesso', 'Calendário sincronizado com sucesso!');
            }
          },
        ]
      );
    } else {
      setSyncCalendar(false);
    }
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderToggle = (
    icon: string,
    iconColor: string,
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#374151', true: '#84CC16' }}
        thumbColor={value ? '#fff' : '#9CA3AF'}
      />
    </View>
  );

  const renderSelector = (
    title: string,
    options: { value: string; label: string }[],
    selectedValue: string,
    onSelect: (value: string) => void,
    disabled?: boolean
  ) => (
    <View style={[styles.selectorContainer, disabled && styles.selectorDisabled]}>
      <Text style={[styles.selectorTitle, disabled && styles.selectorTitleDisabled]}>
        {title}
      </Text>
      <View style={styles.selectorOptions}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.selectorOption,
              selectedValue === option.value && styles.selectorOptionSelected,
              disabled && styles.selectorOptionDisabled,
            ]}
            onPress={() => !disabled && onSelect(option.value)}
            disabled={disabled}
          >
            <Text style={[
              styles.selectorOptionText,
              selectedValue === option.value && styles.selectorOptionTextSelected,
              disabled && styles.selectorOptionTextDisabled,
            ]}>
              {option.label}
            </Text>
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações da Agenda</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notificações de Treino */}
        {renderSection('Lembretes de Treino', (
          <>
            {renderToggle(
              'fitness',
              '#84CC16',
              'Lembrete de Treino',
              'Receber notificação antes dos treinos',
              trainingReminder,
              setTrainingReminder
            )}
            {renderSelector(
              'Quando notificar',
              reminderTimeOptions,
              trainingReminderTime,
              setTrainingReminderTime,
              !trainingReminder
            )}
          </>
        ))}

        {/* Notificações de Evento */}
        {renderSection('Lembretes de Evento Oficial', (
          <>
            {renderToggle(
              'trophy',
              '#F59E0B',
              'Lembrete de Evento',
              'Receber notificação antes dos eventos oficiais',
              eventReminder,
              setEventReminder
            )}
            {renderSelector(
              'Quando notificar',
              eventReminderTimeOptions,
              eventReminderTime,
              setEventReminderTime,
              !eventReminder
            )}
          </>
        ))}

        {/* Sincronização com Calendário */}
        {renderSection('Sincronização', (
          <>
            {renderToggle(
              'calendar',
              '#8B5CF6',
              'Sincronizar com Calendário',
              'Adicionar treinos e eventos ao calendário do dispositivo',
              syncCalendar,
              handleSyncCalendar
            )}
            
            {syncCalendar && (
              <View style={styles.syncOptions}>
                <View style={styles.syncOption}>
                  <Text style={styles.syncOptionText}>Sincronizar treinos</Text>
                  <Switch
                    value={syncTrainings}
                    onValueChange={setSyncTrainings}
                    trackColor={{ false: '#374151', true: '#84CC16' }}
                    thumbColor={syncTrainings ? '#fff' : '#9CA3AF'}
                  />
                </View>
                <View style={styles.syncOption}>
                  <Text style={styles.syncOptionText}>Sincronizar eventos oficiais</Text>
                  <Switch
                    value={syncEvents}
                    onValueChange={setSyncEvents}
                    trackColor={{ false: '#374151', true: '#84CC16' }}
                    thumbColor={syncEvents ? '#fff' : '#9CA3AF'}
                  />
                </View>
              </View>
            )}
          </>
        ))}

        {/* Preferências de Exibição */}
        {renderSection('Preferências de Exibição', (
          <View style={styles.displayPrefs}>
            <Text style={styles.displayPrefLabel}>Semana começa em</Text>
            <View style={styles.weekStartOptions}>
              <TouchableOpacity
                style={[
                  styles.weekStartOption,
                  weekStartsOn === 'sunday' && styles.weekStartOptionSelected,
                ]}
                onPress={() => setWeekStartsOn('sunday')}
              >
                <Text style={[
                  styles.weekStartOptionText,
                  weekStartsOn === 'sunday' && styles.weekStartOptionTextSelected,
                ]}>
                  Domingo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.weekStartOption,
                  weekStartsOn === 'monday' && styles.weekStartOptionSelected,
                ]}
                onPress={() => setWeekStartsOn('monday')}
              >
                <Text style={[
                  styles.weekStartOptionText,
                  weekStartsOn === 'monday' && styles.weekStartOptionTextSelected,
                ]}>
                  Segunda
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Informações */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#60A5FA" />
          <Text style={styles.infoText}>
            As configurações de notificação dependem das permissões do seu dispositivo. 
            Certifique-se de que as notificações estão habilitadas nas configurações do sistema.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  selectorContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  selectorTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  selectorTitleDisabled: {
    color: '#6B7280',
  },
  selectorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  selectorOptionSelected: {
    backgroundColor: '#84CC16',
  },
  selectorOptionDisabled: {
    backgroundColor: '#1E293B',
  },
  selectorOptionText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  selectorOptionTextSelected: {
    color: '#0F172A',
    fontWeight: '600',
  },
  selectorOptionTextDisabled: {
    color: '#4B5563',
  },
  syncOptions: {
    padding: 16,
    paddingTop: 0,
  },
  syncOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  syncOptionText: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  displayPrefs: {
    padding: 16,
  },
  displayPrefLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  weekStartOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  weekStartOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  weekStartOptionSelected: {
    backgroundColor: '#84CC16',
  },
  weekStartOptionText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  weekStartOptionTextSelected: {
    color: '#0F172A',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#60A5FA',
    lineHeight: 20,
  },
});
