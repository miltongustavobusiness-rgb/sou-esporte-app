/**
 * API Health Check Service
 * 
 * Responsável por:
 * 1. Validar configuração de API_URL ao iniciar
 * 2. Verificar conectividade com o backend
 * 3. Fornecer logs claros para diagnóstico
 * 4. Gerenciar estado de conexão global
 */

import { API_URL } from '../config/api';

// Tipos de erro para diagnóstico
export type ApiErrorType = 
  | 'CONFIG_ERROR'      // API_URL não configurada ou inválida
  | 'NETWORK_ERROR'     // Falha de rede/conexão
  | 'SERVER_ERROR'      // Servidor retornou erro (500, etc)
  | 'TIMEOUT_ERROR'     // Timeout na requisição
  | 'AUTH_ERROR'        // Token expirado ou inválido
  | 'NO_DATA'           // Requisição OK mas sem dados
  | 'UNKNOWN_ERROR';    // Erro desconhecido

export interface HealthCheckResult {
  success: boolean;
  errorType?: ApiErrorType;
  errorMessage?: string;
  apiUrl?: string;
  responseTime?: number;
  serverStatus?: string;
}

// Estado global de conexão
let connectionState: {
  isConnected: boolean;
  lastCheck: Date | null;
  lastError: ApiErrorType | null;
  lastErrorMessage: string | null;
} = {
  isConnected: false,
  lastCheck: null,
  lastError: null,
  lastErrorMessage: null,
};

/**
 * Valida se a API_URL está configurada corretamente
 */
export function validateApiConfig(): { valid: boolean; error?: string } {
  console.log('[HealthCheck] Validando configuração de API...');
  console.log('[HealthCheck] API_URL:', API_URL);
  console.log('[HealthCheck] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);

  if (!API_URL) {
    console.error('[HealthCheck] ❌ API_URL não definida');
    return { 
      valid: false, 
      error: 'API_URL não está configurada. Verifique o arquivo .env' 
    };
  }

  // Verificar se é uma URL válida
  try {
    const url = new URL(API_URL);
    console.log('[HealthCheck] ✅ URL válida:', url.origin);
    
    // Verificar se não é URL do Manus em ambiente local
    if (API_URL.includes('manus.computer')) {
      console.warn('[HealthCheck] ⚠️ Usando URL do Manus. Para ambiente local, configure EXPO_PUBLIC_API_URL');
    }
    
    return { valid: true };
  } catch (e) {
    console.error('[HealthCheck] ❌ URL inválida:', API_URL);
    return { 
      valid: false, 
      error: `URL inválida: ${API_URL}` 
    };
  }
}

/**
 * Verifica conectividade com o backend
 */
export async function checkApiHealth(timeout: number = 10000): Promise<HealthCheckResult> {
  const startTime = Date.now();
  console.log('[HealthCheck] Iniciando verificação de saúde da API...');
  
  // Primeiro, validar configuração
  const configValidation = validateApiConfig();
  if (!configValidation.valid) {
    connectionState = {
      isConnected: false,
      lastCheck: new Date(),
      lastError: 'CONFIG_ERROR',
      lastErrorMessage: configValidation.error || 'Configuração inválida',
    };
    return {
      success: false,
      errorType: 'CONFIG_ERROR',
      errorMessage: configValidation.error,
      apiUrl: API_URL,
    };
  }

  // Tentar conectar ao endpoint /health
  const healthUrl = `${API_URL}/health`;
  console.log('[HealthCheck] Verificando:', healthUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      console.error('[HealthCheck] ❌ Servidor retornou erro:', response.status);
      connectionState = {
        isConnected: false,
        lastCheck: new Date(),
        lastError: 'SERVER_ERROR',
        lastErrorMessage: `Servidor retornou status ${response.status}`,
      };
      return {
        success: false,
        errorType: 'SERVER_ERROR',
        errorMessage: `Servidor retornou status ${response.status}`,
        apiUrl: API_URL,
        responseTime,
      };
    }

    const data = await response.json();
    console.log('[HealthCheck] ✅ API respondeu:', data);
    console.log('[HealthCheck] ✅ Tempo de resposta:', responseTime, 'ms');

    connectionState = {
      isConnected: true,
      lastCheck: new Date(),
      lastError: null,
      lastErrorMessage: null,
    };

    return {
      success: true,
      apiUrl: API_URL,
      responseTime,
      serverStatus: data.status || 'ok',
    };

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Identificar tipo de erro
    let errorType: ApiErrorType = 'UNKNOWN_ERROR';
    let errorMessage = 'Erro desconhecido';

    if (error.name === 'AbortError') {
      errorType = 'TIMEOUT_ERROR';
      errorMessage = `Timeout após ${timeout}ms. Verifique se o servidor está rodando.`;
      console.error('[HealthCheck] ❌ Timeout:', errorMessage);
    } else if (error.message?.includes('Network request failed') || 
               error.message?.includes('Failed to fetch') ||
               error.message?.includes('Network Error')) {
      errorType = 'NETWORK_ERROR';
      errorMessage = 'Falha de rede. Verifique sua conexão e se o servidor está acessível.';
      console.error('[HealthCheck] ❌ Erro de rede:', error.message);
    } else {
      console.error('[HealthCheck] ❌ Erro desconhecido:', error);
      errorMessage = error.message || 'Erro desconhecido ao conectar com a API';
    }

    connectionState = {
      isConnected: false,
      lastCheck: new Date(),
      lastError: errorType,
      lastErrorMessage: errorMessage,
    };

    return {
      success: false,
      errorType,
      errorMessage,
      apiUrl: API_URL,
      responseTime,
    };
  }
}

/**
 * Retorna o estado atual de conexão
 */
export function getConnectionState() {
  return { ...connectionState };
}

/**
 * Verifica se está conectado
 */
export function isConnected(): boolean {
  return connectionState.isConnected;
}

/**
 * Classifica erro de requisição para logs claros
 */
export function classifyError(error: any): { type: ApiErrorType; message: string } {
  // Token expirado ou inválido
  if (error.message?.includes('token') || 
      error.message?.includes('unauthorized') ||
      error.message?.includes('401')) {
    console.log('[API Error] 🔑 Token expirado ou inválido');
    return {
      type: 'AUTH_ERROR',
      message: 'Sessão expirada. Faça login novamente.',
    };
  }

  // Erro de rede
  if (error.message?.includes('Network request failed') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Network Error') ||
      error.message?.includes('ECONNREFUSED')) {
    console.log('[API Error] 🌐 Falha de rede');
    return {
      type: 'NETWORK_ERROR',
      message: 'Sem conexão com o servidor. Verifique sua internet.',
    };
  }

  // Timeout
  if (error.message?.includes('timeout') || error.name === 'AbortError') {
    console.log('[API Error] ⏱️ Timeout');
    return {
      type: 'TIMEOUT_ERROR',
      message: 'Servidor demorou para responder. Tente novamente.',
    };
  }

  // Erro do servidor
  if (error.message?.includes('500') || 
      error.message?.includes('502') ||
      error.message?.includes('503')) {
    console.log('[API Error] 🖥️ Erro do servidor');
    return {
      type: 'SERVER_ERROR',
      message: 'Erro no servidor. Tente novamente em alguns minutos.',
    };
  }

  // Erro desconhecido
  console.log('[API Error] ❓ Erro desconhecido:', error.message);
  return {
    type: 'UNKNOWN_ERROR',
    message: error.message || 'Erro desconhecido. Tente novamente.',
  };
}

/**
 * Log formatado para debug
 */
export function logApiCall(
  procedure: string, 
  status: 'start' | 'success' | 'error', 
  details?: any
) {
  const timestamp = new Date().toISOString();
  const prefix = status === 'start' ? '🚀' : status === 'success' ? '✅' : '❌';
  
  console.log(`[API ${timestamp}] ${prefix} ${procedure}`, details || '');
}
