import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, SIZES } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { trpcCall } from '../config/api';
import GridItem from '../components/GridItem';
import { useToast } from '../contexts/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 3; // 3 colunas com gap

type SavedPostsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SavedPosts'>;
};

interface SavedPost {
  id: number;
  content: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  thumbnailUrl: string | null;
  author: {
    id: number;
    name: string;
    photoUrl: string | null;
  };
  createdAt: string;
  likesCount: number;
  commentsCount: number;
}

export default function SavedPostsScreen({ navigation }: SavedPostsScreenProps) {
  const { user } = useApp();
  const { showToast } = useToast();
  
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSavedPosts = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const result = await trpcCall('mobileSocial.socialGetSavedPosts', {
        userId: user.id,
        limit: 50,
        offset: 0,
      });
      
      if (result && Array.isArray(result)) {
        setPosts(result);
      }
    } catch (error) {
      console.error('Error loading saved posts:', error);
      showToast('Erro ao carregar posts salvos', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, showToast]);

  useEffect(() => {
    loadSavedPosts();
  }, [loadSavedPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSavedPosts();
  };

  const handlePostPress = (post: SavedPost) => {
    // Navegação DIRETA para post específico (igual Instagram)
    console.log('[SavedPostsScreen] Post pressed:', post.id, 'mediaType:', post.mediaType);
    
    if (!post.id) {
      showToast('Post não disponível', 'error');
      return;
    }

    if (post.mediaType === 'video') {
      // Vídeo → VideoPlayer (fullscreen + autoplay)
      navigation.navigate('VideoPlayer', { 
        postId: post.id, 
        autoplay: true, 
        fullscreen: true 
      });
    } else {
      // Imagem/Texto → PostDetail
      navigation.navigate('PostDetail', { postId: post.id });
    }
  };

  /**
   * Renderiza cada item usando o componente GridItem unificado
   * Isso garante navegação consistente em todo o app
   */
  const renderPost = ({ item }: { item: SavedPost }) => (
    <GridItem
      id={item.id}
      thumbnailUrl={item.thumbnailUrl}
      mediaUrl={item.mediaUrl}
      mediaType={item.mediaType || undefined}
      content={item.content}
      size={ITEM_WIDTH}
      gap={4}
      columns={3}
      source="saved_posts"
      likesCount={item.likesCount}
      commentsCount={item.commentsCount}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={64} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>Nenhum post salvo</Text>
      <Text style={styles.emptySubtitle}>
        Toque no ícone de bookmark nos posts do feed para salvá-los aqui
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts Salvos</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </View>
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
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  columnWrapper: {
    gap: 8,
    marginBottom: 8,
  },
  postItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.3, // Aspect ratio 4:5 aproximado
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  postThumbnail: {
    width: '100%',
    height: '100%',
  },
  textPostPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    backgroundColor: COLORS.card,
  },
  textPostPreview: {
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 4,
  },
  postStats: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
