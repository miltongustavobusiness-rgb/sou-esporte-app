import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS, RADIUS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { 
  pickImageFromGallery, 
  takePhoto, 
  uploadImage,
  UploadResult 
} from '../services/imageUpload';
import {
  pickVideoFromGallery,
  recordVideo,
  uploadVideo,
  generateThumbnail,
  VideoUploadResult,
} from '../services/videoUpload';
import { Video, ResizeMode } from 'expo-av';
import ImageFilterSelector from '../components/ImageFilterSelector';
import VideoFilterSelector from '../components/VideoFilterSelector';

interface CreatePostScreenProps {
  navigation: any;
  route?: any;
}

export default function CreatePostScreen({ navigation, route }: CreatePostScreenProps) {
  const { user } = useApp();
  const { showToast } = useToast();
  
  const groupId = route?.params?.groupId;
  
  // Repost data from route params
  const repostId = route?.params?.repostId;
  const repostAuthor = route?.params?.repostAuthor;
  const repostContent = route?.params?.repostContent;
  const repostImageUrl = route?.params?.repostImageUrl;
  
  // Initialize state with repost data if available
  const [postText, setPostText] = useState('');
  const [selectedImages, setSelectedImages] = useState<{ uri: string; uploading: boolean; uploadResult?: UploadResult }[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{ uri: string; thumbnailUri?: string; uploading: boolean; uploadResult?: VideoUploadResult } | null>(null);
  const [repostImage, setRepostImage] = useState<string | null>(repostImageUrl || null);
  const [postType, setPostType] = useState<'text' | 'activity' | 'poll'>('text');
  const [isPosting, setIsPosting] = useState(false);
  const isRepost = !!repostId;

  // Dados de atividade (se for post de atividade)
  const [activityData, setActivityData] = useState({
    distance: '',
    duration: '',
    pace: '',
  });

  // Dados de enquete (se for post de enquete)
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Estado para filtros de imagem
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterImageIndex, setFilterImageIndex] = useState<number | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<{ [key: number]: string }>({});

  // Estado para filtros de vídeo
  const [showVideoFilterModal, setShowVideoFilterModal] = useState(false);
  const [videoFilter, setVideoFilter] = useState<string>('original');
  
  // Estado para aspect ratio do vídeo (fit = vídeo inteiro com barras, fill = zoom para preencher)
  const [videoAspectMode, setVideoAspectMode] = useState<'fit' | 'fill'>('fit');

  const handlePost = async () => {
    if (!postText.trim() && selectedImages.length === 0 && !selectedVideo && !isRepost) {
      Alert.alert('Atenção', 'Escreva algo ou adicione uma mídia para publicar.');
      return;
    }

    // Verificar se todas as imagens foram carregadas
    const pendingUploads = selectedImages.filter(img => img.uploading);
    if (pendingUploads.length > 0) {
      Alert.alert('Aguarde', 'Algumas imagens ainda estão sendo carregadas.');
      return;
    }

    // Verificar se o vídeo está sendo carregado
    if (selectedVideo?.uploading) {
      Alert.alert('Aguarde', 'O vídeo ainda está sendo carregado.');
      return;
    }

    // Verificar se alguma imagem falhou
    const failedUploads = selectedImages.filter(img => img.uploadResult && !img.uploadResult.success);
    if (failedUploads.length > 0) {
      Alert.alert('Erro', 'Algumas imagens falharam no upload. Remova-as e tente novamente.');
      return;
    }

    // Verificar se o vídeo falhou
    if (selectedVideo?.uploadResult && !selectedVideo.uploadResult.success) {
      Alert.alert('Erro', 'O vídeo falhou no upload. Remova e tente novamente.');
      return;
    }

    setIsPosting(true);

    try {
      // Preparar dados do post
      let postTypeToSend = postType === 'activity' ? 'activity' : postType === 'poll' ? 'poll' : 'text';
      
      // Determinar tipo baseado na mídia
      if (selectedVideo?.uploadResult?.videoUrl) {
        postTypeToSend = 'video';
      } else if (selectedImages.length > 0 || repostImage) {
        postTypeToSend = 'photo';
      }
      
      const postData: any = {
        content: postText.trim(),
        groupId: groupId || undefined,
        type: postTypeToSend,
      };

      // Adicionar URL da imagem se houver (nova imagem ou repost)
      if (selectedImages.length > 0 && selectedImages[0].uploadResult?.url) {
        postData.imageUrl = selectedImages[0].uploadResult.url;
      } else if (repostImage) {
        // Use the repost image URL directly
        postData.imageUrl = repostImage;
      }

      // Adicionar URL do vídeo se houver
      if (selectedVideo?.uploadResult?.videoUrl) {
        postData.videoUrl = selectedVideo.uploadResult.videoUrl;
        postData.videoThumbnailUrl = selectedVideo.uploadResult.thumbnailUrl;
        postData.videoAspectMode = videoAspectMode;
      }

      // Adicionar dados de atividade se for post de atividade
      if (postType === 'activity' && (activityData.distance || activityData.duration || activityData.pace)) {
        postData.activityData = {
          type: 'run',
          distance: activityData.distance ? parseFloat(activityData.distance) : undefined,
          duration: activityData.duration ? parseInt(activityData.duration) : undefined,
          pace: activityData.pace || undefined,
        };
      }

      // Adicionar dados de enquete se for post de enquete
      if (postType === 'poll' && pollOptions.filter(opt => opt.trim()).length >= 2) {
        postData.pollData = {
          options: pollOptions.filter(opt => opt.trim()),
        };
      }

      // Criar post via API
      const result = await api.createPost(postData);

      if (result.success) {
        showToast('Post publicado com sucesso!', 'success');
        navigation.goBack();
      } else {
        showToast('Erro ao publicar post. Tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showToast('Erro ao publicar post. Tente novamente.', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleAddImage = () => {
    Alert.alert(
      'Adicionar Imagem',
      'Escolha uma opção',
      [
        { 
          text: 'Câmera', 
          onPress: async () => {
            const result = await takePhoto();
            if (!result.cancelled && result.uri) {
              addImageAndUpload(result.uri);
            }
          }
        },
        { 
          text: 'Galeria', 
          onPress: async () => {
            const result = await pickImageFromGallery();
            if (!result.cancelled && result.uri) {
              addImageAndUpload(result.uri);
            }
          }
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleAddVideo = () => {
    Alert.alert(
      'Adicionar Vídeo',
      'Escolha uma opção (máx. 60 segundos)',
      [
        { 
          text: 'Gravar', 
          onPress: async () => {
            const result = await recordVideo();
            if (!result.cancelled && result.uri) {
              addVideoAndUpload(result.uri);
            }
          }
        },
        { 
          text: 'Galeria', 
          onPress: async () => {
            const result = await pickVideoFromGallery();
            if (!result.cancelled && result.uri) {
              addVideoAndUpload(result.uri);
            }
          }
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const addVideoAndUpload = async (uri: string) => {
    // Gerar thumbnail primeiro
    const thumbnailUri = await generateThumbnail(uri);
    
    // Adicionar vídeo com status de uploading
    setSelectedVideo({ uri, thumbnailUri: thumbnailUri || undefined, uploading: true, uploadResult: undefined });
    
    // Remover imagens se houver (só pode ter vídeo OU imagens)
    setSelectedImages([]);

    // Fazer upload
    const uploadResult = await uploadVideo(uri, 'post');

    // Atualizar status do vídeo
    setSelectedVideo(prev => prev ? { ...prev, uploading: false, uploadResult } : null);

    if (!uploadResult.success) {
      showToast('Erro ao fazer upload do vídeo', 'error');
    } else if (uploadResult.status === 'pending') {
      showToast('Vídeo enviado para moderação', 'info');
    }
  };

  const handleRemoveVideo = () => {
    setSelectedVideo(null);
    setVideoFilter('original');
  };

  // Abrir modal de filtros de vídeo
  const handleOpenVideoFilters = () => {
    setShowVideoFilterModal(true);
  };

  // Aplicar filtro de vídeo selecionado
  const handleApplyVideoFilter = (filterId: string) => {
    setVideoFilter(filterId);
    setShowVideoFilterModal(false);
  };

  const addImageAndUpload = async (uri: string) => {
    // Adicionar imagem com status de uploading
    const newImage = { uri, uploading: true, uploadResult: undefined };
    setSelectedImages(prev => [...prev, newImage]);

    // Fazer upload
    const uploadResult = await uploadImage(uri, 'post');

    // Atualizar status da imagem
    setSelectedImages(prev => 
      prev.map(img => 
        img.uri === uri 
          ? { ...img, uploading: false, uploadResult } 
          : img
      )
    );

    if (!uploadResult.success) {
      showToast('Erro ao fazer upload da imagem', 'error');
    } else if (uploadResult.status === 'pending') {
      showToast('Imagem enviada para moderação', 'info');
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    // Remover filtro aplicado
    setAppliedFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[index];
      return newFilters;
    });
  };

  // Abrir modal de filtros para uma imagem
  const handleOpenFilters = (index: number) => {
    setFilterImageIndex(index);
    setShowFilterModal(true);
  };

  // Aplicar filtro selecionado
  const handleApplyFilter = (filteredUri: string, filterId: string) => {
    if (filterImageIndex !== null) {
      // Atualizar a URI da imagem com a versão filtrada
      setSelectedImages(prev => prev.map((img, i) => 
        i === filterImageIndex ? { ...img, uri: filteredUri } : img
      ));
      // Salvar qual filtro foi aplicado
      setAppliedFilters(prev => ({
        ...prev,
        [filterImageIndex]: filterId
      }));
    }
    setShowFilterModal(false);
    setFilterImageIndex(null);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const userAvatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=a3e635&color=0a0a0a`;
  const userName = user?.name || 'Usuário';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isRepost ? 'Repostar' : 'Criar Post'}</Text>
        <TouchableOpacity 
          onPress={handlePost} 
          style={[styles.postButton, (!postText.trim() && selectedImages.length === 0 && !isRepost) && styles.postButtonDisabled]}
          disabled={isPosting || (!postText.trim() && selectedImages.length === 0 && !isRepost)}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={[styles.postButtonText, (!postText.trim() && selectedImages.length === 0) && styles.postButtonTextDisabled]}>
              Publicar
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tipo de Post */}
          <View style={styles.postTypeContainer}>
            <TouchableOpacity 
              style={[styles.postTypeButton, postType === 'text' && styles.postTypeButtonActive]}
              onPress={() => setPostType('text')}
            >
              <Ionicons name="text" size={20} color={postType === 'text' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.postTypeText, postType === 'text' && styles.postTypeTextActive]}>Texto</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.postTypeButton, postType === 'activity' && styles.postTypeButtonActive]}
              onPress={() => setPostType('activity')}
            >
              <Ionicons name="fitness" size={20} color={postType === 'activity' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.postTypeText, postType === 'activity' && styles.postTypeTextActive]}>Atividade</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.postTypeButton, postType === 'poll' && styles.postTypeButtonActive]}
              onPress={() => setPostType('poll')}
            >
              <Ionicons name="stats-chart" size={20} color={postType === 'poll' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.postTypeText, postType === 'poll' && styles.postTypeTextActive]}>Enquete</Text>
            </TouchableOpacity>
          </View>

          {/* Área de texto */}
          <View style={styles.textAreaContainer}>
            <View style={styles.userInfo}>
              <Image 
                source={{ uri: userAvatar }} 
                style={styles.userAvatar}
              />
              <View>
                <Text style={styles.userName}>{userName}</Text>
                {groupId && <Text style={styles.userGroup}>Postando no grupo</Text>}
              </View>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="O que você quer compartilhar?"
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={postText}
              onChangeText={setPostText}
              maxLength={500}
            />
            <Text style={styles.charCount}>{postText.length}/500</Text>
          </View>

          {/* Dados de Atividade (se tipo = activity) */}
          {postType === 'activity' && (
            <View style={styles.activityContainer}>
              <Text style={styles.sectionTitle}>Dados da Atividade</Text>
              <View style={styles.activityInputs}>
                <View style={styles.activityInputWrapper}>
                  <Ionicons name="map" size={18} color={COLORS.primary} />
                  <TextInput
                    style={styles.activityInput}
                    placeholder="Distância (km)"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                    value={activityData.distance}
                    onChangeText={(text) => setActivityData({...activityData, distance: text})}
                  />
                </View>
                <View style={styles.activityInputWrapper}>
                  <Ionicons name="time" size={18} color={COLORS.primary} />
                  <TextInput
                    style={styles.activityInput}
                    placeholder="Duração (min)"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    value={activityData.duration}
                    onChangeText={(text) => setActivityData({...activityData, duration: text})}
                  />
                </View>
                <View style={styles.activityInputWrapper}>
                  <Ionicons name="speedometer" size={18} color={COLORS.primary} />
                  <TextInput
                    style={styles.activityInput}
                    placeholder="Pace (min/km)"
                    placeholderTextColor={COLORS.textMuted}
                    value={activityData.pace}
                    onChangeText={(text) => setActivityData({...activityData, pace: text})}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Opções de Enquete (se tipo = poll) */}
          {postType === 'poll' && (
            <View style={styles.pollContainer}>
              <Text style={styles.sectionTitle}>Opções da Enquete</Text>
              {pollOptions.map((option, index) => (
                <View key={index} style={styles.pollOptionWrapper}>
                  <TextInput
                    style={styles.pollInput}
                    placeholder={`Opção ${index + 1}`}
                    placeholderTextColor={COLORS.textMuted}
                    value={option}
                    onChangeText={(text) => updatePollOption(index, text)}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity onPress={() => handleRemovePollOption(index)} style={styles.removeOptionButton}>
                      <Ionicons name="close-circle" size={22} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {pollOptions.length < 4 && (
                <TouchableOpacity onPress={handleAddPollOption} style={styles.addOptionButton}>
                  <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.addOptionText}>Adicionar opção</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Repost Preview */}
          {isRepost && (repostContent || repostImage) && (
            <View style={styles.repostContainer}>
              <View style={styles.repostHeader}>
                <Ionicons name="repeat" size={16} color={COLORS.primary} />
                <Text style={styles.repostLabel}>Repostando de {repostAuthor}</Text>
              </View>
              <View style={styles.repostContent}>
                {repostContent && (
                  <Text style={styles.repostText} numberOfLines={3}>{repostContent}</Text>
                )}
                {repostImage && (
                  <Image source={{ uri: repostImage }} style={styles.repostImage} />
                )}
              </View>
            </View>
          )}

          {/* Imagens selecionadas */}
          {selectedImages.length > 0 && (
            <View style={styles.imagesContainer}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image.uri }} style={styles.selectedImage} />
                  
                  {/* Overlay de upload */}
                  {image.uploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="large" color={COLORS.primary} />
                      <Text style={styles.uploadingText}>Enviando...</Text>
                    </View>
                  )}
                  
                  {/* Indicador de status */}
                  {!image.uploading && image.uploadResult && (
                    <View style={[
                      styles.statusBadge,
                      image.uploadResult.success ? styles.statusSuccess : styles.statusError
                    ]}>
                      <Ionicons 
                        name={image.uploadResult.success ? 'checkmark-circle' : 'alert-circle'} 
                        size={16} 
                        color={COLORS.background} 
                      />
                      <Text style={styles.statusText}>
                        {image.uploadResult.success 
                          ? (image.uploadResult.status === 'pending' ? 'Em moderação' : 'Aprovado')
                          : 'Erro'}
                      </Text>
                    </View>
                  )}
                  
                  {/* Botão de Filtro */}
                  <TouchableOpacity 
                    style={styles.filterImageButton}
                    onPress={() => handleOpenFilters(index)}
                  >
                    <Ionicons name="color-wand" size={20} color="#fff" />
                  </TouchableOpacity>

                  {/* Indicador de filtro aplicado */}
                  {appliedFilters[index] && appliedFilters[index] !== 'original' && (
                    <View style={styles.filterAppliedBadge}>
                      <Ionicons name="sparkles" size={12} color="#fff" />
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Vídeo selecionado */}
          {selectedVideo && (
            <View style={styles.videoContainer}>
              <View style={styles.videoWrapper}>
                {selectedVideo.thumbnailUri ? (
                  <Image source={{ uri: selectedVideo.thumbnailUri }} style={styles.videoThumbnail} />
                ) : (
                  <Video
                    source={{ uri: selectedVideo.uri }}
                    style={styles.videoThumbnail}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted={true}
                  />
                )}
                
                {/* Play icon overlay */}
                <View style={styles.playIconOverlay}>
                  <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                </View>
                
                {/* Overlay de upload */}
                {selectedVideo.uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.uploadingText}>Enviando vídeo...</Text>
                  </View>
                )}
                
                {/* Indicador de status */}
                {!selectedVideo.uploading && selectedVideo.uploadResult && (
                  <View style={[
                    styles.statusBadge,
                    selectedVideo.uploadResult.success ? styles.statusSuccess : styles.statusError
                  ]}>
                    <Ionicons 
                      name={selectedVideo.uploadResult.success ? 'checkmark-circle' : 'alert-circle'} 
                      size={16} 
                      color={COLORS.background} 
                    />
                    <Text style={styles.statusText}>
                      {selectedVideo.uploadResult.success 
                        ? (selectedVideo.uploadResult.status === 'pending' ? 'Em moderação' : 'Aprovado')
                        : 'Erro'}
                    </Text>
                  </View>
                )}

                {/* Botão de Filtro de Vídeo */}
                <TouchableOpacity 
                  style={styles.filterImageButton}
                  onPress={handleOpenVideoFilters}
                >
                  <Ionicons name="color-wand" size={20} color="#fff" />
                </TouchableOpacity>

                {/* Botão de Toggle Fit/Fill */}
                <TouchableOpacity 
                  style={styles.aspectToggleButton}
                  onPress={() => setVideoAspectMode(prev => prev === 'fit' ? 'fill' : 'fit')}
                >
                  <Ionicons 
                    name={videoAspectMode === 'fit' ? 'expand' : 'contract'} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.aspectToggleText}>
                    {videoAspectMode === 'fit' ? 'Fit' : 'Fill'}
                  </Text>
                </TouchableOpacity>

                {/* Indicador de filtro aplicado */}
                {videoFilter && videoFilter !== 'original' && (
                  <View style={styles.filterAppliedBadge}>
                    <Ionicons name="sparkles" size={12} color="#fff" />
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={handleRemoveVideo}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Barra de ações */}
        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddImage} disabled={!!selectedVideo}>
            <Ionicons name="image" size={24} color={selectedVideo ? COLORS.textMuted : COLORS.primary} />
            <Text style={[styles.actionText, selectedVideo && { color: COLORS.textMuted }]}>Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddVideo} disabled={selectedImages.length > 0}>
            <Ionicons name="videocam" size={24} color={selectedImages.length > 0 ? COLORS.textMuted : COLORS.primary} />
            <Text style={[styles.actionText, selectedImages.length > 0 && { color: COLORS.textMuted }]}>Vídeo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="location" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Local</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="pricetag" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Marcar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modal de Filtros de Imagem */}
      {filterImageIndex !== null && (
        <ImageFilterSelector
          visible={showFilterModal}
          imageUri={selectedImages[filterImageIndex]?.uri || ''}
          onClose={() => {
            setShowFilterModal(false);
            setFilterImageIndex(null);
          }}
          onApplyFilter={handleApplyFilter}
        />
      )}

      {/* Modal de Filtros de Vídeo */}
      {selectedVideo && (
        <VideoFilterSelector
          visible={showVideoFilterModal}
          videoUri={selectedVideo.uri}
          thumbnailUri={selectedVideo.thumbnailUri}
          onClose={() => setShowVideoFilterModal(false)}
          onApplyFilter={handleApplyVideoFilter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  postButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    minWidth: 90,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  postButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 14,
  },
  postButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  postTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  postTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  postTypeButtonActive: {
    backgroundColor: COLORS.background,
  },
  postTypeText: {
    marginLeft: 6,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  postTypeTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  textAreaContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  userGroup: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  textInput: {
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  activityContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
  },
  activityInputs: {
    gap: 12,
  },
  activityInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activityInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  pollContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
  },
  pollOptionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pollInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  removeOptionButton: {
    marginLeft: 10,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addOptionText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  imageWrapper: {
    position: 'relative',
    width: 150,
    height: 150,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 8,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  statusSuccess: {
    backgroundColor: COLORS.primary,
  },
  statusError: {
    backgroundColor: COLORS.error,
  },
  statusText: {
    color: COLORS.background,
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  filterImageButton: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aspectToggleButton: {
    position: 'absolute',
    bottom: 8,
    left: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    gap: 4,
  },
  aspectToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filterAppliedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  // Repost styles
  repostContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  repostLabel: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  repostContent: {
    gap: 12,
  },
  repostText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  repostImage: {
    width: '100%',
    height: 200,
    borderRadius: RADIUS.md,
    resizeMode: 'cover',
  },
  // Video styles
  videoContainer: {
    marginBottom: 16,
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    height: 250,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});
