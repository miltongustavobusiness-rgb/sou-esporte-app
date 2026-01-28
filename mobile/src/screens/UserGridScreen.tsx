import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Share,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import GridItem from '../components/GridItem';
import LinkifiedText from '../components/LinkifiedText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 4) / 3;

type UserGridScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UserGrid'>;
  route: RouteProp<RootStackParamList, 'UserGrid'>;
};

interface ProfileData {
  id: number;
  name: string;
  username: string | null;
  photoUrl: string | null;
  bio: string | null;
  gridBio: string | null;
  city: string | null;
  state: string | null;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

interface PostItem {
  id: number;
  thumbnailUrl: string | null;
  mediaType: 'image' | 'video';
  videoUrl?: string | null;
  content?: string | null;
}

export default function UserGridScreen({ navigation, route }: UserGridScreenProps) {
  const { userId, userName } = route.params;
  const { user } = useApp();
  const { showToast } = useToast();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      // Passar currentUserId para verificar corretamente se está seguindo
      const data = await api.getAthleteGridProfile(userId, user?.id);
      setProfile(data.profile);
      setPosts(data.posts || []);
      setIsFollowing(data.profile?.isFollowing || false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast('Erro ao carregar perfil', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, user?.id, showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  const handleFollowToggle = async () => {
    if (followLoading) return;
    
    setFollowLoading(true);
    const wasFollowing = isFollowing;
    
    // Optimistic update
    setIsFollowing(!wasFollowing);
    if (profile) {
      setProfile({
        ...profile,
        followersCount: wasFollowing 
          ? profile.followersCount - 1 
          : profile.followersCount + 1,
      });
    }
    
    try {
      if (wasFollowing) {
        await api.unfollowUser(userId);
        showToast('Deixou de seguir', 'success');
      } else {
        await api.followUser(userId);
        showToast('Seguindo!', 'success');
      }
    } catch (error) {
      // Rollback on error
      setIsFollowing(wasFollowing);
      if (profile) {
        setProfile({
          ...profile,
          followersCount: wasFollowing 
            ? profile.followersCount 
            : profile.followersCount,
        });
      }
      showToast('Erro ao atualizar', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    navigation.navigate('Chat' as any, { 
      recipientId: userId,
      recipientName: profile?.name || userName,
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Confira o perfil de ${profile?.name || userName} no Sou Esporte!`,
        url: `https://souesporte.com/athlete/${userId}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // ============================================================
  // NAVEGAÇÃO DIRETA - IGUAL INSTAGRAM
  // Clique no Grid → Abre tela específica (NÃO passa pelo Feed)
  // ============================================================
  const handlePostPress = useCallback((item: PostItem) => {
    // Log para debug
    console.log('[UserGridScreen] ====== POST PRESSED ======');
    console.log('[UserGridScreen] Item:', JSON.stringify({
      id: item.id,
      mediaType: item.mediaType,
      hasVideoUrl: !!item.videoUrl,
    }));

    // Validar ID
    if (!item.id) {
      console.error('[UserGridScreen] ERROR: Invalid postId');
      showToast('Post não disponível', 'error');
      return;
    }

    // NAVEGAÇÃO DIRETA baseada no tipo de mídia
    if (item.mediaType === 'video' || item.videoUrl) {
      // VÍDEO → VideoPlayer (fullscreen + autoplay)
      console.log('[UserGridScreen] >>> Navigating to VideoPlayer:', item.id);
      navigation.navigate('VideoPlayer', { 
        postId: item.id, 
        autoplay: true, 
        fullscreen: true 
      });
    } else {
      // IMAGEM/TEXTO → PostDetail
      console.log('[UserGridScreen] >>> Navigating to PostDetail:', item.id);
      navigation.navigate('PostDetail', { postId: item.id });
    }
  }, [navigation, showToast]);

  const avatarUrl = profile?.photoUrl || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || userName || 'User')}&background=a3e635&color=0a0a0a`;

  /**
   * Renderiza cada item do grid usando o componente GridItem unificado
   * Isso garante navegação consistente em todo o app:
   * - Imagem/Texto → PostDetail
   * - Vídeo → VideoPlayer (fullscreen + autoplay)
   */
  const renderPostItem = ({ item }: { item: PostItem }) => (
    <GridItem
      id={item.id}
      thumbnailUrl={item.thumbnailUrl}
      videoUrl={item.videoUrl}
      mediaType={item.mediaType}
      content={item.content}
      size={GRID_ITEM_SIZE}
      gap={2}
      columns={3}
      source="user_grid"
    />
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Profile Info */}
      <View style={styles.profileSection}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.postsCount || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigation.navigate('FollowersList' as any, { 
              userId, 
              userName: profile?.name || userName 
            })}
          >
            <Text style={styles.statNumber}>{profile?.followersCount || 0}</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigation.navigate('FollowingList' as any, { 
              userId, 
              userName: profile?.name || userName 
            })}
          >
            <Text style={styles.statNumber}>{profile?.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Seguindo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Name and Bio */}
      <View style={styles.infoSection}>
        <Text style={styles.name}>{profile?.name || userName}</Text>
        {profile?.username && (
          <Text style={styles.username}>@{profile.username}</Text>
        )}
        {(profile?.gridBio || profile?.bio) && (
          <LinkifiedText 
            text={profile.gridBio || profile.bio || ''}
            style={styles.bio}
            numberOfLines={3}
          />
        )}
        
        {/* Localização e Categoria */}
        <View style={styles.profileMeta}>
          {(profile?.city || profile?.state || (profile as any)?.country) && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.metaText}>
                {[profile?.city, profile?.state, (profile as any)?.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          
          {(profile as any)?.athleteCategory && (
            <View style={styles.metaItem}>
              <Ionicons name="ribbon-outline" size={14} color={COLORS.primary} />
              <Text style={[styles.metaText, styles.categoryText]}>
                {(profile as any).athleteCategory === 'profissional' ? 'Atleta Profissional' :
                 (profile as any).athleteCategory === 'amador' ? 'Atleta Amador' : 'Instrutor'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Modalidades */}
        {(profile as any)?.sports && (() => {
          try {
            const sports = typeof (profile as any).sports === 'string' ? JSON.parse((profile as any).sports) : (profile as any).sports;
            if (Array.isArray(sports) && sports.length > 0) {
              return (
                <View style={styles.sportsContainer}>
                  {sports.slice(0, 5).map((sport: string, index: number) => (
                    <View key={index} style={styles.sportTag}>
                      <Text style={styles.sportTagText}>{sport}</Text>
                    </View>
                  ))}
                </View>
              );
            }
          } catch { return null; }
          return null;
        })()}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[
            styles.followButton, 
            isFollowing && styles.followingButton
          ]}
          onPress={handleFollowToggle}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? COLORS.text : COLORS.background} />
          ) : (
            <Text style={[
              styles.followButtonText,
              isFollowing && styles.followingButtonText
            ]}>
              {isFollowing ? 'Seguindo' : 'Seguir'}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Grid Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Ionicons name="grid-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Ionicons name="bookmark-outline" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{profile?.name || userName}</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nenhum post ainda</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  infoSection: {
    marginBottom: SPACING.md,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  location: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  profileMeta: {
    marginTop: 8,
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  categoryText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  sportTag: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sportTagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: 8,
  },
  followButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  followingButtonText: {
    color: COLORS.text,
  },
  messageButton: {
    width: 44,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 44,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    padding: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.card,
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
});
