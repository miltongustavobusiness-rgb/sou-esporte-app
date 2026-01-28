import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { api, MODERATION_REQUIRED } from './api';

export interface VideoUploadResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  uploadId?: number;
  status?: 'pending' | 'approved' | 'rejected';
  error?: string;
}

export interface VideoPickerResult {
  cancelled: boolean;
  uri?: string;
  duration?: number;
  width?: number;
  height?: number;
  type?: string;
}

// Configurações de upload de vídeo
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_VIDEO_DURATION = 60; // 60 segundos

/**
 * Solicita permissão para acessar a galeria
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[VideoUpload] Erro ao solicitar permissão de galeria:', error);
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
    console.error('[VideoUpload] Erro ao solicitar permissão de câmera:', error);
    return false;
  }
}

/**
 * Abre a galeria para selecionar um vídeo
 */
export async function pickVideoFromGallery(): Promise<VideoPickerResult> {
  console.log('[VideoUpload] Abrindo galeria para vídeo...');
  
  try {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      console.log('[VideoUpload] Permissão negada');
      return { cancelled: true };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: MAX_VIDEO_DURATION,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('[VideoUpload] Seleção cancelada');
      return { cancelled: true };
    }

    const asset = result.assets[0];
    
    // Validação de propriedades
    if (!asset || !asset.uri) {
      console.error('[VideoUpload] Asset inválido:', asset);
      return { cancelled: true };
    }
    
    console.log('[VideoUpload] Vídeo selecionado:', {
      uri: asset.uri,
      duration: asset.duration,
      width: asset.width,
      height: asset.height,
    });

    return {
      cancelled: false,
      uri: asset.uri,
      duration: asset.duration || 0,
      width: asset.width || 0,
      height: asset.height || 0,
      type: asset.type || 'video',
    };
  } catch (error) {
    console.error('[VideoUpload] Erro ao selecionar vídeo:', error);
    return { cancelled: true };
  }
}

/**
 * Abre a câmera para gravar um vídeo
 */
export async function recordVideo(): Promise<VideoPickerResult> {
  console.log('[VideoUpload] Abrindo câmera para gravação...');
  
  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      console.log('[VideoUpload] Permissão de câmera negada');
      return { cancelled: true };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: MAX_VIDEO_DURATION,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('[VideoUpload] Gravação cancelada');
      return { cancelled: true };
    }

    const asset = result.assets[0];
    
    // Validação de propriedades
    if (!asset || !asset.uri) {
      console.error('[VideoUpload] Asset inválido:', asset);
      return { cancelled: true };
    }
    
    console.log('[VideoUpload] Vídeo gravado:', {
      uri: asset.uri,
      duration: asset.duration,
      width: asset.width,
      height: asset.height,
    });

    return {
      cancelled: false,
      uri: asset.uri,
      duration: asset.duration || 0,
      width: asset.width || 0,
      height: asset.height || 0,
      type: asset.type || 'video',
    };
  } catch (error) {
    console.error('[VideoUpload] Erro ao gravar vídeo:', error);
    return { cancelled: true };
  }
}

/**
 * Gera thumbnail do vídeo
 */
export async function generateThumbnail(videoUri: string): Promise<string | null> {
  console.log('[VideoUpload] Gerando thumbnail para:', videoUri);
  
  // Validação de entrada
  if (!videoUri || typeof videoUri !== 'string') {
    console.error('[VideoUpload] URI inválida para thumbnail');
    return null;
  }
  
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000, // 1 segundo do vídeo
      quality: 0.8,
    });
    
    if (!uri) {
      console.error('[VideoUpload] Thumbnail gerado sem URI');
      return null;
    }
    
    console.log('[VideoUpload] Thumbnail gerado:', uri);
    return uri;
  } catch (error) {
    console.error('[VideoUpload] Erro ao gerar thumbnail:', error);
    return null;
  }
}

/**
 * Faz upload do vídeo para o servidor
 * Pipeline robusto: pick → normalize → generate thumbnail → validate → upload
 */
export async function uploadVideo(
  videoUri: string,
  purpose: 'post' | 'story' = 'post'
): Promise<VideoUploadResult> {
  console.log('[VideoUpload] Iniciando upload:', { uri: videoUri, purpose });
  
  // PASSO 1: Validar URI de entrada
  if (!videoUri || typeof videoUri !== 'string' || videoUri.trim() === '') {
    console.error('[VideoUpload] URI inválida');
    return {
      success: false,
      error: 'URI de vídeo inválida',
    };
  }
  
  try {
    // PASSO 2: Gerar thumbnail (não bloqueia se falhar)
    let thumbnailUri: string | null = null;
    try {
      thumbnailUri = await generateThumbnail(videoUri);
    } catch (thumbError) {
      console.warn('[VideoUpload] Falha ao gerar thumbnail, continuando sem:', thumbError);
    }
    
    // PASSO 3: Upload do vídeo
    console.log('[VideoUpload] Enviando vídeo para servidor...');
    const videoResponse = await api.uploadMedia(videoUri, purpose);
    
    if (!videoResponse || !videoResponse.success) {
      console.error('[VideoUpload] Falha no upload do vídeo:', videoResponse);
      return {
        success: false,
        error: videoResponse?.error || 'Erro ao fazer upload do vídeo',
      };
    }

    // PASSO 4: Upload do thumbnail (se gerado)
    let thumbnailUrl: string | undefined;
    if (thumbnailUri) {
      console.log('[VideoUpload] Enviando thumbnail...');
      try {
        const thumbResponse = await api.uploadMedia(thumbnailUri, 'post');
        if (thumbResponse && thumbResponse.success && thumbResponse.url) {
          thumbnailUrl = thumbResponse.url;
          console.log('[VideoUpload] Thumbnail enviado:', thumbnailUrl);
        }
      } catch (thumbUploadError) {
        console.warn('[VideoUpload] Falha no upload do thumbnail:', thumbUploadError);
        // Não bloqueia o upload do vídeo
      }
    }

    // PASSO 5: Retornar resultado
    console.log('[VideoUpload] Upload bem-sucedido:', videoResponse.url);
    
    // Se moderação não é obrigatória, status é 'approved' direto
    const status = MODERATION_REQUIRED 
      ? (videoResponse.status || 'pending') 
      : 'approved';

    return {
      success: true,
      videoUrl: videoResponse.url,
      thumbnailUrl: thumbnailUrl,
      uploadId: videoResponse.uploadId,
      status: status as 'pending' | 'approved' | 'rejected',
    };
  } catch (error: any) {
    console.error('[VideoUpload] Erro no upload:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao fazer upload do vídeo',
    };
  }
}

/**
 * Verifica se o vídeo está dentro dos limites
 */
export function validateVideo(duration?: number, fileSize?: number): { valid: boolean; error?: string } {
  console.log('[VideoUpload] Validando vídeo:', { duration, fileSize });
  
  // Validação de duração
  if (duration !== undefined && duration !== null) {
    const durationMs = typeof duration === 'number' ? duration : 0;
    if (durationMs > MAX_VIDEO_DURATION * 1000) {
      return { 
        valid: false, 
        error: `Vídeo muito longo. Máximo: ${MAX_VIDEO_DURATION} segundos` 
      };
    }
  }
  
  // Validação de tamanho
  if (fileSize !== undefined && fileSize !== null) {
    const size = typeof fileSize === 'number' ? fileSize : 0;
    if (size > MAX_VIDEO_SIZE) {
      return { 
        valid: false, 
        error: `Vídeo muito grande. Máximo: ${MAX_VIDEO_SIZE / (1024 * 1024)}MB` 
      };
    }
  }
  
  return { valid: true };
}
