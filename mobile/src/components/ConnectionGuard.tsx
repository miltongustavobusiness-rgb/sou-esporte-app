/**
 * ConnectionGuard - Wrapper que protege telas contra falhas de API
 * 
 * Funcionalidades:
 * 1. Verifica health-check antes de renderizar conteúdo
 * 2. Mostra tela de erro se API não estiver acessível
 * 3. Permite retry sem recarregar o app
 * 4. Redireciona para login se token expirado
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import ApiErrorScreen from './ApiErrorScreen';
import { 
  checkApiHealth, 
  ApiErrorType, 
  HealthCheckResult,
  validateApiConfig,
} from '../services/apiHealthCheck';

interface ConnectionGuardProps {
  children: React.ReactNode;
  skipHealthCheck?: boolean; // Para telas que não precisam de API (ex: Splash)
  onConnectionRestored?: () => void;
}

export default function ConnectionGuard({ 
  children, 
  skipHealthCheck = false,
  onConnectionRestored,
}: ConnectionGuardProps) {
  const navigation = useNavigation();
  const [isChecking, setIsChecking] = useState(!skipHealthCheck);
  const [isConnected, setIsConnected] = useState(skipHealthCheck);
  const [errorType, setErrorType] = useState<ApiErrorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Verificar conexão ao montar
  useEffect(() => {
    if (!skipHealthCheck) {
      performHealthCheck();
    }
  }, [skipHealthCheck]);

  const performHealthCheck = useCallback(async () => {
    console.log('[ConnectionGuard] Iniciando verificação de conexão...');
    setIsChecking(true);

    // Primeiro, validar configuração
    const configValidation = validateApiConfig();
    if (!configValidation.valid) {
      console.log('[ConnectionGuard] ❌ Configuração inválida');
      setIsConnected(false);
      setErrorType('CONFIG_ERROR');
      setErrorMessage(configValidation.error || 'Configuração de API inválida');
      setIsChecking(false);
      return;
    }

    // Fazer health check
    const result = await checkApiHealth();
    
    if (result.success) {
      console.log('[ConnectionGuard] ✅ API conectada');
      setIsConnected(true);
      setErrorType(null);
      setErrorMessage('');
      if (onConnectionRestored) {
        onConnectionRestored();
      }
    } else {
      console.log('[ConnectionGuard] ❌ Falha na conexão:', result.errorType);
      setIsConnected(false);
      setErrorType(result.errorType || 'UNKNOWN_ERROR');
      setErrorMessage(result.errorMessage || 'Erro desconhecido');
    }

    setIsChecking(false);
  }, [onConnectionRestored]);

  const handleRetry = useCallback(() => {
    performHealthCheck();
  }, [performHealthCheck]);

  const handleGoToLogin = useCallback(() => {
    // Resetar navegação para Login
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' as never }],
      })
    );
  }, [navigation]);

  // Mostrar loading enquanto verifica
  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Mostrar tela de erro se não conectado
  if (!isConnected && errorType) {
    return (
      <ApiErrorScreen
        errorType={errorType}
        errorMessage={errorMessage}
        onRetry={handleRetry}
        onGoToLogin={errorType === 'AUTH_ERROR' ? handleGoToLogin : undefined}
      />
    );
  }

  // Renderizar conteúdo normalmente
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
