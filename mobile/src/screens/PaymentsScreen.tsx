import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';

type PaymentsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Payments'>;
};

interface Payment {
  id: number;
  eventName: string;
  amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  date: string;
  method?: string;
}

export default function PaymentsScreen({ navigation }: PaymentsScreenProps) {
  const { isAuthenticated } = useApp();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      // Load payments from registrations
      const registrations = await api.getMyRegistrations();
      const paymentsList: Payment[] = registrations.map((reg: any) => ({
        id: reg.id,
        eventName: reg.eventName || 'Evento',
        amount: parseFloat(reg.totalPrice || '0'),
        status: reg.paymentStatus || 'pending',
        date: reg.createdAt,
        method: reg.paymentMethod || 'Não informado',
      }));
      setPayments(paymentsList);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadPayments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadPayments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'refunded': return '#2196F3';
      case 'cancelled': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'refunded': return 'Reembolsado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'refunded': return 'refresh-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pagamentos</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={60} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Faça login para ver seus pagamentos</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando pagamentos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamentos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(139, 195, 74, 0.1)' }]}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.summaryValue}>
              {payments.filter(p => p.status === 'paid').length}
            </Text>
            <Text style={styles.summaryLabel}>Pagos</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
              <Ionicons name="time" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.summaryValue}>
              {payments.filter(p => p.status === 'pending').length}
            </Text>
            <Text style={styles.summaryLabel}>Pendentes</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
              <Ionicons name="wallet" size={24} color="#2196F3" />
            </View>
            <Text style={styles.summaryValue}>
              {formatPrice(payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0))}
            </Text>
            <Text style={styles.summaryLabel}>Total Pago</Text>
          </View>
        </View>

        {/* Payments List */}
        {payments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum pagamento encontrado</Text>
            <Text style={styles.emptyText}>
              Seus pagamentos de inscrições aparecerão aqui
            </Text>
          </View>
        ) : (
          <View style={styles.paymentsList}>
            <Text style={styles.sectionTitle}>Histórico de Pagamentos</Text>
            {payments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentEvent}>{payment.eventName}</Text>
                    <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
                  </View>
                  <Text style={styles.paymentAmount}>{formatPrice(payment.amount)}</Text>
                </View>
                <View style={styles.paymentFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(payment.status)}20` }]}>
                    <Ionicons name={getStatusIcon(payment.status) as any} size={14} color={getStatusColor(payment.status)} />
                    <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                      {getStatusLabel(payment.status)}
                    </Text>
                  </View>
                  {payment.method && (
                    <Text style={styles.paymentMethod}>{payment.method}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    ...FONTS.body4,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
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
  summaryContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  summaryLabel: {
    ...FONTS.body5,
    color: COLORS.textMuted,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  paymentsList: {
    marginBottom: SPACING.lg,
  },
  paymentCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentEvent: {
    ...FONTS.body3,
    color: COLORS.text,
    fontWeight: '600',
  },
  paymentDate: {
    ...FONTS.body5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  paymentAmount: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    ...FONTS.body5,
    fontWeight: '600',
  },
  paymentMethod: {
    ...FONTS.body5,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    ...FONTS.body4,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  loginButtonText: {
    ...FONTS.body3,
    color: COLORS.background,
    fontWeight: '600',
  },
});
