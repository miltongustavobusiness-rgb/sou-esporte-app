import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

interface PaymentGateProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionDescription?: string; // e.g., "inscrição no evento", "assinatura da comunidade"
  amount?: string; // e.g., "R$ 150,00"
}

/**
 * PaymentGate Component
 * 
 * Verifica se o usuário tem billing_status = COMPLETE antes de prosseguir com pagamento.
 * Se INCOMPLETE, redireciona para checkout web para coletar CPF e endereço.
 * 
 * Conformidade Apple/Google:
 * - CPF e endereço NUNCA são solicitados no app
 * - Dados sensíveis são coletados apenas no checkout web
 */
export default function PaymentGate({
  visible,
  onClose,
  onSuccess,
  actionDescription = 'esta ação',
  amount,
}: PaymentGateProps) {
  const { user } = useApp();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // URL do checkout web (configurar em produção)
  const CHECKOUT_WEB_URL = 'https://checkout.souesporte.com.br';

  // Verificar billing_status via API
  const checkBillingStatus = async (): Promise<boolean> => {
    setIsCheckingStatus(true);
    try {
      // Em produção, fazer chamada à API
      // const response = await api.get('/user/billing-status');
      // return response.data.billingStatus === 'COMPLETE';
      
      // Simular verificação
      await new Promise(resolve => setTimeout(resolve, 500));
      return user?.billingStatus === 'COMPLETE';
    } catch (error) {
      console.error('Error checking billing status:', error);
      return false;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Abrir checkout web para completar dados
  const openCheckoutWeb = async () => {
    setIsLoading(true);
    try {
      // Gerar token de sessão para o checkout
      // Em produção, chamar API para gerar token
      const sessionToken = `session_${Date.now()}`;
      
      // URL com parâmetros
      const checkoutUrl = `${CHECKOUT_WEB_URL}/complete-profile?token=${sessionToken}&userId=${user?.id}&returnUrl=souesporte://payment-complete`;
      
      // Abrir no browser
      const supported = await Linking.canOpenURL(checkoutUrl);
      if (supported) {
        await Linking.openURL(checkoutUrl);
        showToast('Complete seus dados no navegador para continuar.', 'info');
      } else {
        showToast('Não foi possível abrir o navegador.', 'error');
      }
    } catch (error) {
      showToast('Erro ao abrir checkout. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Prosseguir com pagamento
  const handleProceed = async () => {
    const hasCompleteBilling = await checkBillingStatus();
    
    if (hasCompleteBilling) {
      // Billing completo, prosseguir com pagamento
      onSuccess();
    } else {
      // Billing incompleto, mostrar opção de completar
      // O modal já está mostrando a opção
    }
  };

  // Verificar se billing está completo
  const isBillingComplete = user?.billingStatus === 'COMPLETE';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={isBillingComplete ? 'card' : 'document-text'}
                size={32}
                color={COLORS.primary}
              />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {isBillingComplete ? (
              // Billing completo - pode prosseguir
              <>
                <Text style={styles.title}>Confirmar Pagamento</Text>
                <Text style={styles.description}>
                  Você está prestes a realizar {actionDescription}.
                </Text>
                
                {amount && (
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Valor total</Text>
                    <Text style={styles.amountValue}>{amount}</Text>
                  </View>
                )}

                <View style={styles.checkItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.checkText}>Dados de pagamento completos</Text>
                </View>
              </>
            ) : (
              // Billing incompleto - precisa completar
              <>
                <Text style={styles.title}>Dados Necessários</Text>
                <Text style={styles.description}>
                  Para concluir {actionDescription}, precisamos de alguns dados obrigatórios para pagamento.
                </Text>

                <View style={styles.infoBox}>
                  <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>Seus dados estão seguros</Text>
                    <Text style={styles.infoText}>
                      CPF e endereço são necessários apenas para emissão de nota fiscal e entrega de kits.
                    </Text>
                  </View>
                </View>

                <View style={styles.dataList}>
                  <View style={styles.dataItem}>
                    <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.dataText}>CPF (para nota fiscal)</Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.dataText}>Endereço (para entrega)</Text>
                  </View>
                </View>

                {amount && (
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Valor</Text>
                    <Text style={styles.amountValue}>{amount}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {isBillingComplete ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleProceed}
                disabled={isCheckingStatus}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.primaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isCheckingStatus ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <>
                      <Ionicons name="card" size={20} color={COLORS.background} />
                      <Text style={styles.primaryButtonText}>Prosseguir para Pagamento</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={openCheckoutWeb}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.primaryButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={COLORS.background} />
                    ) : (
                      <>
                        <Ionicons name="open-outline" size={20} color={COLORS.background} />
                        <Text style={styles.primaryButtonText}>Completar Dados</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.webNote}>
                  Você será redirecionado para uma página segura
                </Text>
              </>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'relative',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.lg,
    top: SPACING.lg,
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    ...FONTS.h3,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...FONTS.body4,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  dataList: {
    marginBottom: SPACING.lg,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dataText: {
    ...FONTS.body4,
    color: COLORS.text,
  },
  amountContainer: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  amountLabel: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  amountValue: {
    ...FONTS.h2,
    color: COLORS.primary,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: SPACING.md,
    borderRadius: SIZES.radius,
  },
  checkText: {
    ...FONTS.body4,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actions: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  primaryButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  primaryButtonText: {
    ...FONTS.h4,
    color: COLORS.background,
  },
  webNote: {
    ...FONTS.body5,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  cancelButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
  },
});
