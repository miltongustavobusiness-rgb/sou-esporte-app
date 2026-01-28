import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING } from '../constants/theme';
import { useToast } from '../contexts/ToastContext';
import { trpcCall } from '../config/api';

type EmailVerificationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmailVerification'>;
  route: RouteProp<RootStackParamList, 'EmailVerification'>;
};

export default function EmailVerificationScreen({ navigation, route }: EmailVerificationScreenProps) {
  const { showToast } = useToast();
  const { email, userId } = route.params;
  
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(email);
  
  const codeInputs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Iniciar timer de reenvio ao montar
  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Enviar código de verificação
  const handleSendVerificationCode = async (emailToUse: string = email) => {
    setIsLoading(true);
    
    try {
      const result = await trpcCall<{ success: boolean; message: string }>(
        'mobile.sendVerificationEmail',
        { email: emailToUse, userId }
      );
      
      if (result.success) {
        // Reiniciar timer
        setResendTimer(60);
        const timer = setInterval(() => {
          setResendTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        showToast('Código enviado para seu e-mail', 'success');
      } else {
        showToast(result.message || 'Erro ao enviar código', 'error');
      }
    } catch (error: any) {
      console.error('Erro ao enviar código de verificação:', error);
      showToast(error.message || 'Erro ao enviar código', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar código
  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      showToast('Por favor, insira o código completo', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await trpcCall<{ success: boolean; message: string }>(
        'mobile.verifyEmail',
        { email: newEmail, code }
      );
      
      if (result.success) {
        showToast('E-mail verificado com sucesso!', 'success');
        // Navegar para ModeSelection após verificação
        navigation.replace('ModeSelection');
      } else {
        showToast(result.message || 'Código inválido', 'error');
      }
    } catch (error: any) {
      console.error('Erro ao verificar código:', error);
      showToast(error.message || 'Código inválido ou expirado', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar código
  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);
    
    if (text && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }
  };

  // Voltar no input
  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  // Reenviar código
  const handleResendCode = () => {
    if (resendTimer > 0) return;
    handleSendVerificationCode(newEmail);
  };

  // Salvar novo e-mail
  const handleSaveEmail = () => {
    if (!newEmail || !newEmail.includes('@')) {
      showToast('Por favor, insira um e-mail válido', 'warning');
      return;
    }
    setEditingEmail(false);
    handleSendVerificationCode(newEmail);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.iconGradient}
              >
                <Ionicons name="mail-open-outline" size={50} color={COLORS.background} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Verifique seu E-mail</Text>
            <Text style={styles.subtitle}>
              Para completar seu cadastro, digite o código de 6 dígitos enviado para:
            </Text>

            {editingEmail ? (
              <View style={styles.emailEditContainer}>
                <TextInput
                  style={styles.emailInput}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="seu@email.com"
                  placeholderTextColor={COLORS.textMuted}
                />
                <TouchableOpacity style={styles.saveEmailButton} onPress={handleSaveEmail}>
                  <Ionicons name="checkmark" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelEmailButton} onPress={() => {
                  setEditingEmail(false);
                  setNewEmail(email);
                }}>
                  <Ionicons name="close" size={24} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.emailContainer}
                onPress={() => setEditingEmail(true)}
              >
                <Text style={styles.emailText}>{newEmail}</Text>
                <Ionicons name="pencil" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}

            <View style={styles.codeContainer}>
              {verificationCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (codeInputs.current[index] = ref)}
                  style={[styles.codeInput, digit && styles.codeInputFilled]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text.slice(-1), index)}
                  onKeyPress={(e) => handleCodeKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity 
              style={styles.resendButton} 
              onPress={handleResendCode}
              disabled={resendTimer > 0}
            >
              <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
                {resendTimer > 0 
                  ? `Reenviar código em ${resendTimer}s` 
                  : 'Reenviar código'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.buttonText}>Verificar E-mail</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.replace('Login')}
            >
              <Text style={styles.linkText}>Voltar ao Login</Text>
            </TouchableOpacity>

            <View style={styles.helpContainer}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.helpText}>
                Verifique sua caixa de entrada e spam. O código é válido por 15 minutos.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 24,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  emailText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emailEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  emailInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  saveEmailButton: {
    padding: SPACING.sm,
  },
  cancelEmailButton: {
    padding: SPACING.sm,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  codeInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  resendButton: {
    marginBottom: SPACING.lg,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: COLORS.textMuted,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    width: '100%',
    marginBottom: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: SPACING.sm,
  },
  linkText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
});
