/**
 * ApiErrorScreen - Tela de erro de conexão com API
 * 
 * Exibida quando:
 * - API_URL não está configurada
 * - Servidor não está acessível
 * - Falha de rede
 * 
 * Nunca renderiza telas vazias - sempre mostra feedback ao usuário
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SPACING, RADIUS } from '../constants/theme';
import { ApiErrorType, checkApiHealth, getConnectionState } from '../services/apiHealthCheck';
import { API_URL } from '../config/api';

interface ApiErrorScreenProps {
  errorType: ApiErrorType;
  errorMessage: string;
  onRetry: () => void;
  onGoToLogin?: () => void;
  showLogs?: boolean;
}

export default function ApiErrorScreen({
  errorType,
  errorMessage,
  onRetry,
  onGoToLogin,
  showLogs = __DEV__, // Mostrar logs apenas em desenvolvimento
}: ApiErrorScreenProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRetryResult, setLastRetryResult] = useState<string | null>(null);

  // Ícone e título baseado no tipo de erro
  const getErrorConfig = () => {
    switch (errorType) {
      case 'CONFIG_ERROR':
        return {
          icon: 'settings-outline' as const,
          title: 'Configuração Inválida',
          color: '#f59e0b',
        };
      case 'NETWORK_ERROR':
        return {
          icon: 'wifi-outline' as const,
          title: 'Sem Conexão',
          color: '#ef4444',
        };
      case 'SERVER_ERROR':
        return {
          icon: 'server-outline' as const,
          title: 'Erro no Servidor',
          color: '#ef4444',
        };
      case 'TIMEOUT_ERROR':
        return {
          icon: 'time-outline' as const,
          title: 'Tempo Esgotado',
          color: '#f59e0b',
        };
      case 'AUTH_ERROR':
        return {
          icon: 'key-outline' as const,
          title: 'Sessão Expirada',
          color: '#8b5cf6',
        };
      default:
        return {
          icon: 'alert-circle-outline' as const,
          title: 'Erro de Conexão',
          color: '#ef4444',
        };
    }
  };

  const config = getErrorConfig();

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    console.log(`[ApiErrorScreen] Tentativa ${retryCount + 1} de reconexão...`);

    try {
      const result = await checkApiHealth();
      
      if (result.success) {
        console.log('[ApiErrorScreen] ✅ Reconexão bem-sucedida!');
        setLastRetryResult(`✅ Conectado! (${result.responseTime}ms)`);
        // Aguardar um pouco para mostrar o sucesso antes de chamar onRetry
        setTimeout(() => {
          onRetry();
        }, 500);
      } else {
        console.log('[ApiErrorScreen] ❌ Falha na reconexão:', result.errorMessage);
        setLastRetryResult(`❌ ${result.errorMessage}`);
      }
    } catch (error: any) {
      console.log('[ApiErrorScreen] ❌ Erro na tentativa:', error.message);
      setLastRetryResult(`❌ ${error.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Ícone de erro */}
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon} size={60} color={config.color} />
        </View>

        {/* Título */}
        <Text style={styles.title}>{config.title}</Text>

        {/* Mensagem de erro */}
        <Text style={styles.message}>{errorMessage}</Text>

        {/* Dicas baseadas no tipo de erro */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>O que fazer:</Text>
          
          {errorType === 'NETWORK_ERROR' && (
            <>
              <Text style={styles.tipItem}>• Verifique sua conexão com a internet</Text>
              <Text style={styles.tipItem}>• Verifique se o servidor está rodando</Text>
              <Text style={styles.tipItem}>• Verifique se o IP está correto no .env</Text>
            </>
          )}
          
          {errorType === 'CONFIG_ERROR' && (
            <>
              <Text style={styles.tipItem}>• Verifique o arquivo .env no mobile</Text>
              <Text style={styles.tipItem}>• Configure EXPO_PUBLIC_API_URL</Text>
              <Text style={styles.tipItem}>• Reinicie o Expo com --clear</Text>
            </>
          )}
          
          {errorType === 'SERVER_ERROR' && (
            <>
              <Text style={styles.tipItem}>• Verifique se a API está rodando</Text>
              <Text style={styles.tipItem}>• Verifique os logs do servidor</Text>
              <Text style={styles.tipItem}>• Tente reiniciar a API</Text>
            </>
          )}
          
          {errorType === 'TIMEOUT_ERROR' && (
            <>
              <Text style={styles.tipItem}>• O servidor pode estar sobrecarregado</Text>
              <Text style={styles.tipItem}>• Verifique sua conexão de rede</Text>
              <Text style={styles.tipItem}>• Tente novamente em alguns segundos</Text>
            </>
          )}
          
          {errorType === 'AUTH_ERROR' && (
            <>
              <Text style={styles.tipItem}>• Sua sessão expirou</Text>
              <Text style={styles.tipItem}>• Faça login novamente</Text>
            </>
          )}
        </View>

        {/* Botão de tentar novamente */}
        <TouchableOpacity
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={handleRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color={COLORS.white} />
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Botão de ir para login (se erro de auth) */}
        {errorType === 'AUTH_ERROR' && onGoToLogin && (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={onGoToLogin}
          >
            <Ionicons name="log-in-outline" size={20} color={COLORS.primary} />
            <Text style={styles.loginButtonText}>Ir para Login</Text>
          </TouchableOpacity>
        )}

        {/* Resultado da última tentativa */}
        {lastRetryResult && (
          <Text style={styles.retryResult}>{lastRetryResult}</Text>
        )}

        {/* Logs de debug (apenas em desenvolvimento) */}
        {showLogs && (
          <View style={styles.logsContainer}>
            <Text style={styles.logsTitle}>Debug Info:</Text>
            <Text style={styles.logItem}>API_URL: {API_URL || 'não definida'}</Text>
            <Text style={styles.logItem}>EXPO_PUBLIC_API_URL: {process.env.EXPO_PUBLIC_API_URL || 'não definida'}</Text>
            <Text style={styles.logItem}>Tipo de erro: {errorType}</Text>
            <Text style={styles.logItem}>Tentativas: {retryCount}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  tipsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: '100%',
    marginBottom: SPACING.xl,
  },
  tipsTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  tipItem: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    width: '100%',
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryButtonText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    width: '100%',
    marginTop: SPACING.md,
  },
  loginButtonText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  retryResult: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  logsContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: '100%',
    marginTop: SPACING.xl,
  },
  logsTitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: SPACING.sm,
  },
  logItem: {
    fontSize: SIZES.xs,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
});
