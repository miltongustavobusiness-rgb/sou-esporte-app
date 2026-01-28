import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
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
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { sendOTP, verifyOTP } from '../config/api';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

type LoginMethod = 'email' | 'phone';
type LoginStep = 'input' | 'otp';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useApp();
  const { showToast } = useToast();
  
  // Estados
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [loginStep, setLoginStep] = useState<LoginStep>('input');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+55');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isNewAccount, setIsNewAccount] = useState(false); // true se for novo cadastro
  
  // Refs para inputs OTP
  const otpInputs = useRef<(TextInput | null)[]>([]);
  
  // Animação
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Formatar telefone
  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  // Validar email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validar telefone
  const isValidPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  // Enviar código OTP
  const handleSendOTP = async () => {
    if (loginMethod === 'email' && !isValidEmail(email)) {
      showToast('Por favor, insira um e-mail válido.', 'warning');
      return;
    }
    
    if (loginMethod === 'phone' && !isValidPhone(phone)) {
      showToast('Por favor, insira um telefone válido.', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      // Chamar API real para enviar OTP
      if (loginMethod === 'email') {
        const result = await sendOTP(email, isNewAccount);
        
        // Verificar se email já está cadastrado (para novos cadastros)
        if (result.isExistingUser) {
          showToast('Este e-mail já está cadastrado. Faça login ou use outro e-mail.', 'warning');
          setIsLoading(false);
          return;
        }
        
        if (result.success) {
          // Transição animada
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setLoginStep('otp');
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          });
          
          // Iniciar timer de reenvio
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
          
          showToast(`Código enviado para ${email}`, 'success');
        } else {
          showToast(result.message || 'Erro ao enviar código.', 'error');
        }
      } else {
        // Para telefone, ainda não implementado no backend
        showToast('Login por telefone ainda não disponível. Use e-mail.', 'warning');
      }
    } catch (error: any) {
      console.error('Erro ao enviar OTP:', error);
      showToast(error.message || 'Erro ao enviar código. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar código OTP
  const handleVerifyOTP = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      showToast('Por favor, insira o código completo.', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      // Chamar API real para verificar OTP
      const result = await verifyOTP(email, code);
      
      if (result.success && result.user) {
        // Login bem-sucedido - salvar dados do usuário
        await login(result.user.email, 'otp_verified', result.user);
        
        showToast('Login realizado com sucesso!', 'success');
        
        // Verificar se precisa de onboarding (nome não preenchido)
        if (!result.user.name) {
          navigation.replace('Onboarding' as any, { email: email, userId: result.user.id });
        } else {
          navigation.replace('Feed');
        }
      } else {
        showToast('Código inválido. Tente novamente.', 'error');
      }
    } catch (error: any) {
      console.error('Erro ao verificar OTP:', error);
      // Extract friendly message without Error: prefix
      let errorMsg = error.message || 'Código inválido ou expirado.';
      errorMsg = errorMsg.replace(/^Error:\s*/i, '').trim();
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar código OTP
  const handleOTPChange = (text: string, index: number) => {
    const newOTP = [...otpCode];
    newOTP[index] = text;
    setOtpCode(newOTP);
    
    // Auto-avançar para próximo input
    if (text && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  // Voltar no input OTP
  const handleOTPKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  // Reenviar código
  const handleResendOTP = () => {
    if (resendTimer > 0) return;
    handleSendOTP();
  };

  // Login Social (Google/Apple/Facebook)
  const handleSocialLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    showToast(`Login com ${provider.charAt(0).toUpperCase() + provider.slice(1)} em breve!`, 'info');
    // TODO: Implementar integração com expo-auth-session
    // Por enquanto, apenas mostra mensagem informativa
    // A integração completa requer configuração de OAuth credentials
    // para cada provedor (Google, Apple, Facebook)
    console.log(`[Social Login] Provider: ${provider}`);
  };

  // Voltar para input
  const handleBack = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setLoginStep('input');
      setOtpCode(['', '', '', '', '', '']);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  // Renderizar tela de input
  const renderInputStep = () => (
    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
      {/* Tabs de método de login */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, loginMethod === 'email' && styles.tabActive]}
          onPress={() => setLoginMethod('email')}
        >
          <Ionicons 
            name="mail-outline" 
            size={20} 
            color={loginMethod === 'email' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabText, loginMethod === 'email' && styles.tabTextActive]}>
            E-mail
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, loginMethod === 'phone' && styles.tabActive]}
          onPress={() => setLoginMethod('phone')}
        >
          <Ionicons 
            name="phone-portrait-outline" 
            size={20} 
            color={loginMethod === 'phone' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabText, loginMethod === 'phone' && styles.tabTextActive]}>
            Telefone
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input de email ou telefone */}
      {loginMethod === 'email' ? (
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={22} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ) : (
        <View style={styles.phoneContainer}>
          <TouchableOpacity style={styles.countryCodeButton}>
            <Text style={styles.countryCodeText}>{countryCode}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <View style={[styles.inputContainer, styles.phoneInput]}>
            <TextInput
              style={styles.input}
              placeholder="(00) 00000-0000"
              placeholderTextColor={COLORS.textMuted}
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>
        </View>
      )}

      {/* Botão de continuar */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSendOTP}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <>
            <Text style={styles.buttonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
          </>
        )}
      </TouchableOpacity>

      {/* Termos */}
      <Text style={styles.termsText}>
        Ao continuar, você concorda com nossos{' '}
        <Text style={styles.termsLink}>Termos de Uso</Text> e{' '}
        <Text style={styles.termsLink}>Política de Privacidade</Text>
      </Text>

      {/* Divisor */}
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>ou continue com</Text>
        <View style={styles.divider} />
      </View>

      {/* Botões de Login Social */}
      <View style={styles.socialButtonsContainer}>
        <TouchableOpacity 
          style={styles.socialButton}
          onPress={() => handleSocialLogin('google')}
        >
          <Ionicons name="logo-google" size={24} color="#DB4437" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.socialButton}
          onPress={() => handleSocialLogin('apple')}
        >
          <Ionicons name="logo-apple" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.socialButton}
          onPress={() => handleSocialLogin('facebook')}
        >
          <Ionicons name="logo-facebook" size={24} color="#1877F2" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Renderizar tela de OTP
  const renderOTPStep = () => (
    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
      {/* Botão voltar */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      {/* Ícone de verificação */}
      <View style={styles.otpIconContainer}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          style={styles.otpIconGradient}
        >
          <Ionicons name="mail-open-outline" size={40} color={COLORS.background} />
        </LinearGradient>
      </View>

      <Text style={styles.otpTitle}>Verificação</Text>
      <Text style={styles.otpSubtitle}>
        Digite o código de 6 dígitos enviado para{'\n'}
        <Text style={styles.otpDestination}>
          {loginMethod === 'email' ? email : `${countryCode} ${phone}`}
        </Text>
      </Text>

      {/* Inputs OTP */}
      <View style={styles.otpContainer}>
        {otpCode.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (otpInputs.current[index] = ref)}
            style={[styles.otpInput, digit && styles.otpInputFilled]}
            value={digit}
            onChangeText={(text) => handleOTPChange(text.slice(-1), index)}
            onKeyPress={(e) => handleOTPKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      {/* Timer de reenvio */}
      <TouchableOpacity 
        style={styles.resendButton} 
        onPress={handleResendOTP}
        disabled={resendTimer > 0}
      >
        <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
          {resendTimer > 0 
            ? `Reenviar código em ${resendTimer}s` 
            : 'Reenviar código'}
        </Text>
      </TouchableOpacity>

      {/* Botão verificar */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.buttonText}>Verificar</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo-souesporte.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Conectando atletas em movimento.</Text>
          </View>

          {/* Formulário */}
          {loginStep === 'input' ? renderInputStep() : renderOTPStep()}
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logo: {
    width: 576,
    height: 227,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  formContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.card,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.text,
    paddingVertical: 14,
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  countryCodeText: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    color: COLORS.background,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
  },
  backButton: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    zIndex: 1,
  },
  otpIconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  otpIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpTitle: {
    ...FONTS.h2,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  otpSubtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  otpDestination: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  otpInput: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 50,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: COLORS.border,
    textAlign: 'center',
    ...FONTS.h3,
    color: COLORS.text,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
  },
  resendButton: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  resendText: {
    ...FONTS.body,
    color: COLORS.primary,
  },
  resendTextDisabled: {
    color: COLORS.textMuted,
  },
  // Estilos para toggle Login/Criar Conta
  formTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  accountToggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.radius,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  accountToggle: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius - 2,
    alignItems: 'center',
  },
  accountToggleActive: {
    backgroundColor: COLORS.primary,
  },
  accountToggleText: {
    ...FONTS.body,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  accountToggleTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  // Estilos para Login Social
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.md,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
