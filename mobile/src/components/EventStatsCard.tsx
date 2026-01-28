import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CountdownClock } from './CountdownClock';

interface EventStatsCardProps {
  serverTimeBrasilia: string;
  eventStartAtBrasilia: string | null;
  startTimeLabel: string;
  categoriesCount: number;
  subscribersCount: number;
  onRefreshSubscribers?: () => void;
}

let globalTickerInterval: NodeJS.Timeout | null = null;
let globalTickerListeners: Set<() => void> = new Set();

function subscribeToGlobalTicker(callback: () => void) {
  globalTickerListeners.add(callback);
  if (globalTickerListeners.size === 1 && !globalTickerInterval) {
    globalTickerInterval = setInterval(() => {
      globalTickerListeners.forEach(listener => listener());
    }, 1000);
  }
  return () => {
    globalTickerListeners.delete(callback);
    if (globalTickerListeners.size === 0 && globalTickerInterval) {
      clearInterval(globalTickerInterval);
      globalTickerInterval = null;
    }
  };
}

export function EventStatsCard({
  serverTimeBrasilia,
  eventStartAtBrasilia,
  startTimeLabel,
  categoriesCount,
  subscribersCount,
}: EventStatsCardProps) {
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [eventStarted, setEventStarted] = useState(false);
  const [offsetMs, setOffsetMs] = useState<number>(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (serverTimeBrasilia) {
      const serverTime = new Date(serverTimeBrasilia).getTime();
      const clientTime = Date.now();
      setOffsetMs(serverTime - clientTime);
    }
  }, [serverTimeBrasilia]);

  const updateRemainingTime = useCallback(() => {
    if (!eventStartAtBrasilia) {
      setRemainingMs(0);
      return;
    }
    const eventTime = new Date(eventStartAtBrasilia).getTime();
    const nowMs = Date.now() + offsetMs;
    const remaining = eventTime - nowMs;
    if (remaining <= 0) {
      setRemainingMs(0);
      setEventStarted(true);
    } else {
      setRemainingMs(remaining);
      setEventStarted(false);
    }
  }, [eventStartAtBrasilia, offsetMs]);

  useEffect(() => {
    updateRemainingTime();
    const unsubscribe = subscribeToGlobalTicker(updateRemainingTime);
    return unsubscribe;
  }, [updateRemainingTime]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const formatCountdown = () => {
    if (!eventStartAtBrasilia) {
      return { days: '--', time: '--:--:--', label: 'Data não definida' };
    }
    if (eventStarted) {
      return { days: '00', time: '00:00:00', label: 'Evento iniciado' };
    }
    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      days: String(days).padStart(2, '0'),
      time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      label: 'Para a largada',
    };
  };

  const countdown = formatCountdown();

  const accessibilityLabel = eventStarted
    ? 'Evento já iniciado'
    : eventStartAtBrasilia
    ? `Faltam ${countdown.days} dias e ${countdown.time} horas para a largada. ${subscribersCount} inscritos.`
    : 'Data do evento não definida';

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.countdownSection}>
        <CountdownClock remainingMs={remainingMs} size={80} eventStarted={eventStarted} />
        <View style={styles.countdownText}>
          <Text style={styles.faltamLabel}>FALTAM</Text>
          <View style={styles.countdownRow}>
            <Text style={styles.daysNumber}>{countdown.days}</Text>
            <Text style={styles.daysLabel}> dias, </Text>
            <Text style={styles.timeNumber}>{countdown.time}</Text>
            <Text style={styles.timeLabel}> hrs</Text>
          </View>
          <Text style={styles.paraLabel}>{countdown.label}</Text>
        </View>
      </View>
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={24} color="#84CC16" />
          <Text style={styles.statLabel}>Largada</Text>
          <Text style={styles.statValue}>{startTimeLabel}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={24} color="#84CC16" />
          <Text style={styles.statLabel}>Categorias</Text>
          <Text style={styles.statValue}>{categoriesCount}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="person-outline" size={24} color="#84CC16" />
          <Text style={styles.statLabel}>Inscritos</Text>
          <Text style={styles.statValue}>{subscribersCount}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  countdownSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  countdownText: {
    marginLeft: 16,
    alignItems: 'flex-start',
  },
  faltamLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  daysNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#84CC16',
  },
  daysLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  timeNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#84CC16',
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  paraLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#334155',
  },
});

export default EventStatsCard;
