import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType?: 'post' | 'comment' | 'user' | 'group';
  targetId?: number;
  // Aliases for compatibility
  contentType?: 'post' | 'comment' | 'user' | 'group';
  contentId?: number;
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam', icon: 'mail-unread-outline' },
  { id: 'harassment', label: 'Assédio ou bullying', icon: 'sad-outline' },
  { id: 'hate_speech', label: 'Discurso de ódio', icon: 'warning-outline' },
  { id: 'violence', label: 'Violência', icon: 'skull-outline' },
  { id: 'nudity', label: 'Nudez ou conteúdo sexual', icon: 'eye-off-outline' },
  { id: 'false_information', label: 'Informação falsa', icon: 'alert-circle-outline' },
  { id: 'copyright', label: 'Violação de direitos autorais', icon: 'document-outline' },
  { id: 'other', label: 'Outro', icon: 'ellipsis-horizontal-outline' },
] as const;

type ReportReason = typeof REPORT_REASONS[number]['id'];

export default function ReportModal({ visible, onClose, targetType, targetId, contentType, contentId }: ReportModalProps) {
  // Support both naming conventions
  const finalTargetType = targetType || contentType || 'post';
  const finalTargetId = targetId || contentId || 0;
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'reason' | 'description' | 'success' | 'already_reported'>('reason');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const { showToast } = useToast();

  // Listener para teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Fechar teclado ao tocar fora
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleSelectReason = (reason: ReportReason) => {
    setSelectedReason(reason);
    if (reason === 'other') {
      setStep('description');
    } else {
      handleSubmit(reason);
    }
  };

  const handleSubmit = async (reason?: ReportReason) => {
    const finalReason = reason || selectedReason;
    if (!finalReason) return;

    // Fechar teclado antes de enviar
    Keyboard.dismiss();
    setLoading(true);
    
    try {
      // Get userId from stored user data
      const userData = await AsyncStorage.getItem('@souesporte_user');
      const user = userData ? JSON.parse(userData) : null;
      const userId = user?.id;
      
      if (!userId) {
        showToast('Você precisa estar logado para denunciar', 'error');
        setLoading(false);
        return;
      }

      console.log('[ReportModal] Sending report:', {
        userId,
        targetType: finalTargetType,
        targetId: finalTargetId,
        reason: finalReason,
      });

      // Call API directly with correct endpoint
      const result = await api.trpcMutation<{ 
        success: boolean; 
        reportId?: number;
        status?: string;
        message?: string;
      }>('mobileSocial.socialReportContent', {
        userId,
        targetType: finalTargetType,
        targetId: finalTargetId,
        reason: finalReason,
        description: description.trim() || undefined,
      });

      console.log('[ReportModal] Report result:', result);

      if (result.success) {
        setStep('success');
        showToast('Denúncia enviada com sucesso!', 'success');
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        showToast('Erro ao enviar denúncia. Tente novamente.', 'error');
      }
    } catch (error: any) {
      console.error('[ReportModal] Error:', error);
      
      // Check for specific error messages
      const errorMessage = error?.message || error?.toString() || '';
      
      if (errorMessage.includes('já denunciou') || errorMessage.includes('CONFLICT')) {
        setStep('already_reported');
      } else if (errorMessage.includes('não encontrado') || errorMessage.includes('NOT_FOUND')) {
        showToast('Conteúdo não encontrado', 'error');
      } else {
        showToast('Erro ao enviar denúncia. Tente novamente.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setSelectedReason(null);
    setDescription('');
    setStep('reason');
    setLoading(false);
    onClose();
  };

  const getTargetLabel = () => {
    switch (finalTargetType) {
      case 'post': return 'publicação';
      case 'comment': return 'comentário';
      case 'user': return 'usuário';
      case 'group': return 'grupo';
      default: return 'conteúdo';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[
                styles.container,
                keyboardVisible && styles.containerWithKeyboard
              ]}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.handle} />
                  <Text style={styles.title}>
                    {step === 'success' ? 'Denúncia enviada' : 
                     step === 'already_reported' ? 'Já denunciado' :
                     `Denunciar ${getTargetLabel()}`}
                  </Text>
                  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                {step === 'reason' && (
                  <ScrollView 
                    style={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.subtitle}>Por que você está denunciando {finalTargetType === 'user' ? 'este usuário' : `esta ${getTargetLabel()}`}?</Text>
                    {REPORT_REASONS.map((reason) => (
                      <TouchableOpacity
                        key={reason.id}
                        style={styles.reasonItem}
                        onPress={() => handleSelectReason(reason.id)}
                        disabled={loading}
                      >
                        <View style={styles.reasonIcon}>
                          <Ionicons name={reason.icon as any} size={20} color={COLORS.text} />
                        </View>
                        <Text style={styles.reasonLabel}>{reason.label}</Text>
                        {loading && selectedReason === reason.id ? (
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                        )}
                      </TouchableOpacity>
                    ))}
                    {/* Espaço extra para scroll quando teclado está aberto */}
                    <View style={{ height: keyboardVisible ? 150 : 20 }} />
                  </ScrollView>
                )}

                {step === 'description' && (
                  <ScrollView 
                    style={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.subtitle}>Descreva o problema (opcional)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Adicione mais detalhes sobre o problema..."
                      placeholderTextColor={COLORS.textMuted}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      maxLength={500}
                      textAlignVertical="top"
                      autoFocus={true}
                    />
                    <View style={styles.buttonRow}>
                      <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => {
                          Keyboard.dismiss();
                          setStep('reason');
                        }}
                      >
                        <Text style={styles.backButtonText}>Voltar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={() => handleSubmit()}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color={COLORS.background} />
                        ) : (
                          <Text style={styles.submitButtonText}>Enviar</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    {/* Espaço extra para scroll quando teclado está aberto */}
                    <View style={{ height: keyboardVisible ? 150 : 20 }} />
                  </ScrollView>
                )}

                {step === 'success' && (
                  <View style={styles.successContent}>
                    <View style={styles.successIcon}>
                      <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
                    </View>
                    <Text style={styles.successTitle}>Obrigado por denunciar</Text>
                    <Text style={styles.successText}>
                      Nossa equipe irá analisar {finalTargetType === 'user' ? 'este usuário' : `esta ${getTargetLabel()}`} e tomar as medidas necessárias.
                    </Text>
                  </View>
                )}

                {step === 'already_reported' && (
                  <View style={styles.successContent}>
                    <View style={styles.successIcon}>
                      <Ionicons name="information-circle" size={64} color={COLORS.warning} />
                    </View>
                    <Text style={styles.successTitle}>Você já denunciou este conteúdo</Text>
                    <Text style={styles.successText}>
                      Sua denúncia anterior já está sendo analisada pela nossa equipe de moderação.
                    </Text>
                    <TouchableOpacity 
                      style={[styles.submitButton, { marginTop: 20 }]}
                      onPress={handleClose}
                    >
                      <Text style={styles.submitButtonText}>Entendi</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  containerWithKeyboard: {
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  content: {
    padding: 16,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.background,
  },
  successContent: {
    padding: 32,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
