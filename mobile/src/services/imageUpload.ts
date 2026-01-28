import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api, MODERATION_REQUIRED } from './api';

export interface UploadResult {
  success: boolean;
  url?: string;
  uploadId?: number;
  status?: 'pending' | 'approved' | 'rejected';
  error?: string;
}

export interface ImagePickerResult {
  cancelled: boolean;
  uri?: string;
  width?: number;
  height?: number;
  type?: string;
}

// Configurações de upload
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 2048; // pixels
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Solicita permissão para acessar a galeria
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[ImageUpload] Erro ao solicitar permissão de galeria:', error);
    return false;
  }
}

/**
 * Solicita permissão para acessar a câmera
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[ImageUpload] Erro ao solicitar permissão de câmera:', error);
    return false;
  }
}

/**
 * Abre a galeria para selecionar uma imagem
 */
export async function pickImageFromGallery(): Promise<ImagePickerResult> {
  console.log('[ImageUpload] Abrindo galeria...');
  
  try {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      console.log('[ImageUpload] Permissão negada');
      return { cancelled: true };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('[ImageUpload] Seleção cancelada');
      return { cancelled: true };
    }

    const asset = result.assets[0];
    
    // Validação de propriedades
    if (!asset || !asset.uri) {
      console.error('[ImageUpload] Asset inválido:', asset);
      return { cancelled: true };
    }
    
    console.log('[ImageUpload] Imagem selecionada:', {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
    });

    return {
      cancelled: false,
      uri: asset.uri,
      width: asset.width || 0,
      height: asset.height || 0,
      type: asset.type || 'image',
    };
  } catch (error) {
    console.error('[ImageUpload] Erro ao selecionar imagem:', error);
    return { cancelled: true };
  }
}

/**
 * Abre a câmera para tirar uma foto
 */
export async function takePhoto(): Promise<ImagePickerResult> {
  console.log('[ImageUpload] Abrindo câmera...');
  
  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      console.log('[ImageUpload] Permissão de câmera negada');
      return { cancelled: true };
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('[ImageUpload] Captura cancelada');
      return { cancelled: true };
    }

    const asset = result.assets[0];
    
    // Validação de propriedades
    if (!asset || !asset.uri) {
      console.error('[ImageUpload] Asset inválido:', asset);
      return { cancelled: true };
    }
    
    console.log('[ImageUpload] Foto capturada:', {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
    });

    return {
      cancelled: false,
      uri: asset.uri,
      width: asset.width || 0,
      height: asset.height || 0,
      type: asset.type || 'image',
    };
  } catch (error) {
    console.error('[ImageUpload] Erro ao capturar foto:', error);
    return { cancelled: true };
  }
}

/**
 * Redimensiona e comprime a imagem se necessário
 */
export async function processImage(uri: string): Promise<string> {
  console.log('[ImageUpload] Processando imagem:', uri);
  
  // Validação de entrada
  if (!uri || typeof uri !== 'string') {
    console.error('[ImageUpload] URI inválida para processamento');
    throw new Error('URI de imagem inválida');
  }
  
  try {
    // Redimensionar se maior que o limite
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: MAX_IMAGE_DIMENSION,
          },
        },
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    if (!manipulatedImage || !manipulatedImage.uri) {
      console.error('[ImageUpload] Manipulação retornou resultado inválido');
      return uri; // Fallback para URI original
    }

    console.log('[ImageUpload] Imagem processada:', manipulatedImage.uri);
    return manipulatedImage.uri;
  } catch (error) {
    console.error('[ImageUpload] Erro ao processar imagem:', error);
    // Retorna URI original em caso de erro (fallback seguro)
    return uri;
  }
}

/**
 * Faz upload da imagem para o servidor
 * Pipeline robusto: pick → normalize → process → validate → upload
 */
export async function uploadImage(
  uri: string,
  purpose: 'post' | 'profile' | 'group' | 'event' = 'post'
): Promise<UploadResult> {
  console.log('[ImageUpload] Iniciando upload:', { uri, purpose });
  
  // PASSO 1: Validar URI de entrada
  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    console.error('[ImageUpload] URI inválida');
    return {
      success: false,
      error: 'URI de imagem inválida',
    };
  }
  
  try {
    // PASSO 2: Processar imagem (redimensionar/comprimir)
    let processedUri: string;
    try {
      processedUri = await processImage(uri);
    } catch (processError: any) {
      console.error('[ImageUpload] Erro no processamento:', processError);
      // Tenta usar URI original como fallback
      processedUri = uri;
    }
    
    // PASSO 3: Validar URI processada
    if (!processedUri || typeof processedUri !== 'string') {
      console.error('[ImageUpload] URI processada inválida');
      return {
        success: false,
        error: 'Erro ao processar imagem',
      };
    }

    // PASSO 4: Fazer upload para o servidor
    console.log('[ImageUpload] Enviando para servidor...');
    const response = await api.uploadMedia(processedUri, purpose);

    // PASSO 5: Processar resposta
    if (response && response.success) {
      console.log('[ImageUpload] Upload bem-sucedido:', response.url);
      
      // Se moderação não é obrigatória, status é 'approved' direto
      const status = MODERATION_REQUIRED 
        ? (response.status || 'pending') 
        : 'approved';
      
      return {
        success: true,
        url: response.url,
        uploadId: response.uploadId,
        status: status as 'pending' | 'approved' | 'rejected',
      };
    } else {
      console.error('[ImageUpload] Servidor retornou erro:', response);
      return {
        success: false,
        error: response?.error || 'Erro ao fazer upload da imagem',
      };
    }
  } catch (error: any) {
    console.error('[ImageUpload] Erro no upload:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao fazer upload da imagem',
    };
  }
}

/**
 * Faz upload de múltiplas imagens
 */
export async function uploadMultipleImages(
  uris: string[],
  purpose: 'post' | 'profile' | 'group' | 'event' = 'post'
): Promise<UploadResult[]> {
  console.log('[ImageUpload] Upload múltiplo:', uris.length, 'imagens');
  
  // Validação de entrada
  if (!uris || !Array.isArray(uris) || uris.length === 0) {
    return [];
  }
  
  const results: UploadResult[] = [];

  for (const uri of uris) {
    if (uri && typeof uri === 'string') {
      const result = await uploadImage(uri, purpose);
      results.push(result);
    } else {
      results.push({ success: false, error: 'URI inválida' });
    }
  }

  return results;
}

/**
 * Verifica o status de moderação de uma imagem
 */
export async function checkModerationStatus(uploadId: number): Promise<{
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}> {
  console.log('[ImageUpload] Verificando status de moderação:', uploadId);
  
  // Se moderação não é obrigatória, retorna aprovado
  if (!MODERATION_REQUIRED) {
    return { status: 'approved' };
  }
  
  // Validação de entrada
  if (!uploadId || typeof uploadId !== 'number') {
    console.error('[ImageUpload] uploadId inválido');
    return { status: 'pending' };
  }
  
  try {
    const response = await api.checkMediaStatus(uploadId);
    
    if (response && response.status) {
      return {
        status: response.status as 'pending' | 'approved' | 'rejected',
        reason: response.reason,
      };
    }
    
    return { status: 'pending' };
  } catch (error) {
    console.error('[ImageUpload] Erro ao verificar status:', error);
    return { status: 'pending' };
  }
}
