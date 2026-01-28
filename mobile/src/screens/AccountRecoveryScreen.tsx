import React, { useState, useRef } from 'react';
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
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING } from '../constants/theme';
import { useToast } from '../contexts/ToastContext';
import { trpcCall } from '../config/api';

type AccountRecoveryScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountRecovery'>;
  route: RouteProp<RootStackParamList, 'AccountRecovery'>;
};

type RecoveryStep = 'info' | 'code';

export default function AccountRecoveryScreen({ navigation, route }: AccountRecoveryScreenProps) {
  const { showToast } = useToast();
  const email = route.params?.email || '';
  
  const [step, setStep] = useState<RecoveryStep>('info');
  const [recoveryCode, setRecoveryCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  const codeInputs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Enviar código de recuperação
  const handleSendRecoveryCode = async () => {
    setIsLoading(true);
    
    try {
      const result = await trpcCall<{ success: boolean; message: string }>(
        'mobile.requestAccountRecovery',
        { email }
      );
      
      if (result.success) {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setStep('code');
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
        
        showToast('Código de recuperação enviado para seu e-mail', 'success');
      } else {
        showToast(result.message || 'Erro ao enviar código', 'error');
      }
    } catch (error: any) {
      console.error('Erro ao enviar código de recuperação:', error);
      showToast(error.message || 'Erro ao enviar código', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar código e desbloquear conta
  const handleVerifyCode = async () => {
    const code = recoveryCode.join('');
    if (code.length !== 6) {
      showToast('Por favor, insira o código completo', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await trpcCall<{ success: boolean; message: string }>(
        'mobile.unlockAccount',
        { email, code }
      );
      
      if (result.success) {
        showToast('Conta desbloqueada com sucesso!', 'success');
        navigation.replace('Login');
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
    const newCode = [...recoveryCode];
    newCode[index] = text;
    setRecoveryCode(newCode);
    
    if (text && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }
  };

  // Voltar no input
  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !recoveryCode[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  // Reenviar código
  const handleResendCode = () => {
    if (resendTimer > 0) return;
    handleSendRecoveryCode();
  };

  // Abrir suporte
  const handleContactSupport = () => {
    Linking.openURL('mailto:suporte@souesporte.com.br?subject=Conta%20Bloqueada&body=Email%20da%20conta:%20' + email);
  };

  // Renderizar tela de informação
  const renderInfoStep = () => (
    <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={['#ef4444', '#dc2626']}
          style={styles.iconGradient}
        >
          <Ionicons name="lock-closed" size={50} color={COLORS.background} />
        </LinearGradient>
      </View>

      <Text style={styles.title}>Conta Bloqueada</Text>
      <Text style={styles.subtitle}>
        Sua conta foi temporariamente bloqueada por motivos de segurança após múltiplas tentativas de login incorretas.
      </Text>

      <View style={styles.emailContainer}>
        <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />
        <Text style={styles.emailText}>{email}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleSendRecoveryCode}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <>
            <Ionicons name="mail" size={20} color={COLORS.background} />
            <Text style={styles.buttonText}>Enviar E-mail de Desbloqueio</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={handleContactSupport}
      >
        <Ionicons name="chatbubbles-outline" size={20} color={COLORS.primary} />
        <Text style={styles.secondaryButtonText}>Entrar em Contato com Suporte</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.linkText}>Voltar ao Login</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // Renderizar tela de código
  const renderCodeStep = () => (
    <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('info')}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.iconContainer}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          style={styles.iconGradient}
        >
          <Ionicons name="key-outline" size={50} color={COLORS.background} />
        </LinearGradient>
      </View>

      <Text style={styles.title}>Código de Recuperação</Text>
      <Text style={styles.subtitle}>
        Digite o código de 6 dígitos enviado para{'\n'}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      <View style={styles.codeContainer}>
        {recoveryCode.map((digit, index) => (
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
          <Text style={styles.buttonText}>Desbloquear Conta</Text>
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
          {step === 'info' ? renderInfoStep() : renderCodeStep()}
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
  backButton: {
    position: 'absolute',
    top: -40,
    left: 0,
    padding: SPACING.sm,
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
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.xl,
  },
  emailText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  emailHighlight: {
    fontWeight: 'bold',
    color: COLORS.primary,
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
    gap: SPACING.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: SPACING.md,
  },
  linkText: {
    color: COLORS.textMuted,
    fontSize: 14,
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
});
