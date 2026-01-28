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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import api from '../services/api';

import { useToast } from '../contexts/ToastContext';
type ResetPasswordScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
  route: RouteProp<RootStackParamList, 'ResetPassword'>;
};

export default function ResetPasswordScreen({ navigation, route }: ResetPasswordScreenProps) {
  const { showToast } = useToast();
  const { email } = route.params;
  
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('');
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + pastedCode.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      showToast('Por favor, insira o código completo de 6 dígitos.', 'info');
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.verifyResetCode(email, fullCode);
      
      if (result.success && result.token) {
        setToken(result.token);
        setStep('password');
      } else {
        showToast(result.message || 'Código inválido ou expirado', 'error');
      }
    } catch (error) {
      showToast('Não foi possível verificar o código. Tente novamente.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showToast('Por favor, preencha todos os campos.', 'info');
      return;
    }

    if (newPassword.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres.', 'info');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem.', 'info');
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.resetPassword(token, newPassword);
      
      if (result.success) {
        showToast('Sua senha foi alterada com sucesso!', 'success');
        setTimeout(() => navigation.navigate('Login'), 1500);
      } else {
        showToast(result.message || 'Não foi possível alterar a senha', 'error');
      }
    } catch (error) {
      showToast('Não foi possível alterar a senha. Tente novamente.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    try {
      const result = await api.requestPasswordReset(email);
      if (result.success) {
        setResendCooldown(60);
        showToast('Novo código enviado para seu e-mail.', 'info');
      } else {
        showToast(result.message || 'Não foi possível reenviar o código', 'error');
      }
    } catch (error) {
      showToast('Não foi possível reenviar o código.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <LinearGradient
        colors={[COLORS.background, '#1a2744']}
        style={styles.backgroundGradient}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            {step === 'code' ? (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="keypad" size={40} color={COLORS.primary} />
                </View>

                <Text style={styles.title}>Digite o Código</Text>
                <Text style={styles.subtitle}>
                  Enviamos um código de 6 dígitos para{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>

                <View style={styles.codeContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (inputRefs.current[index] = ref)}
                      style={[
                        styles.codeInput,
                        digit && styles.codeInputFilled,
                      ]}
                      value={digit}
                      onChangeText={(value) => handleCodeChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={6}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyCode}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.buttonText}>Verificar Código</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                >
                  <Text style={[
                    styles.resendButtonText,
                    resendCooldown > 0 && styles.resendButtonTextDisabled
                  ]}>
                    {resendCooldown > 0 
                      ? `Reenviar código em ${resendCooldown}s`
                      : 'Reenviar código'
                    }
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="lock-open" size={40} color={COLORS.primary} />
                </View>

                <Text style={styles.title}>Nova Senha</Text>
                <Text style={styles.subtitle}>
                  Crie uma nova senha segura para sua conta.
                </Text>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nova senha"
                    placeholderTextColor={COLORS.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={COLORS.textMuted} 
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar nova senha"
                    placeholderTextColor={COLORS.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={COLORS.textMuted} 
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordHints}>
                  <View style={styles.hintItem}>
                    <Ionicons 
                      name={newPassword.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={newPassword.length >= 6 ? COLORS.primary : COLORS.textMuted} 
                    />
                    <Text style={[
                      styles.hintText,
                      newPassword.length >= 6 && styles.hintTextValid
                    ]}>
                      Mínimo 6 caracteres
                    </Text>
                  </View>
                  <View style={styles.hintItem}>
                    <Ionicons 
                      name={newPassword === confirmPassword && newPassword.length > 0 ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={newPassword === confirmPassword && newPassword.length > 0 ? COLORS.primary : COLORS.textMuted} 
                    />
                    <Text style={[
                      styles.hintText,
                      newPassword === confirmPassword && newPassword.length > 0 && styles.hintTextValid
                    ]}>
                      Senhas coincidem
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>Alterar Senha</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
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
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius * 2,
    padding: SPACING.xl,
    marginTop: SPACING.xl,
    ...SHADOWS.medium,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: SIZES.body4,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  emailHighlight: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderRadius: SIZES.radius,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    textAlign: 'center',
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.text,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  codeInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.radius,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: SIZES.body3,
    color: COLORS.text,
  },
  passwordHints: {
    marginBottom: SPACING.lg,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  hintText: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },
  hintTextValid: {
    color: COLORS.primary,
  },
  primaryButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: SIZES.body1,
    fontWeight: 'bold',
  },
  resendButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  resendButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.body3,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: COLORS.textMuted,
  },
});
