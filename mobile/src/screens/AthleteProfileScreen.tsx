import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import GridItem from '../components/GridItem';
import LinkifiedText from '../components/LinkifiedText';
import api from '../services/api';

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3 - 2;

interface AthleteProfile {
  id: number;
  name: string;
  username?: string | null;
  photoUrl: string | null;
  city: string | null;
  gridBio: string | null;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

interface PostItem {
  id: number;
  thumbnailUrl: string | null;
  mediaType: 'image' | 'video';
}

export default function AthleteProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useApp();
  const { showToast } = useToast();
  const { athleteId } = route.params as { athleteId: number };
  
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const loadAthleteProfile = useCallback(async () => {
    try {
      // Usar API real com currentUserId para verificar status de follow
      const data = await api.getAthleteGridProfile(athleteId, user?.id);
      
      if (data?.profile) {
        setProfile({
          id: data.profile.id,
          name: data.profile.name || 'Usuário',
          username: data.profile.username,
          photoUrl: data.profile.photoUrl,
          city: data.profile.city,
          gridBio: data.profile.gridBio || data.profile.bio,
          postsCount: data.profile.postsCount || 0,
          followersCount: data.profile.followersCount || 0,
          followingCount: data.profile.followingCount || 0,
          isFollowing: data.profile.isFollowing || false,
        });
        setIsFollowing(data.profile.isFollowing || false);
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      showToast('Erro ao carregar perfil', 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [athleteId, user?.id, showToast]);

  useEffect(() => {
    loadAthleteProfile();
  }, [loadAthleteProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAthleteProfile();
  }, [loadAthleteProfile]);

  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;
    
    setFollowLoading(true);
    const wasFollowing = isFollowing;
    
    // Optimistic update
    setIsFollowing(!wasFollowing);
    setProfile(prev => prev ? {
      ...prev,
      isFollowing: !wasFollowing,
      followersCount: wasFollowing ? prev.followersCount - 1 : prev.followersCount + 1
    } : null);
    
    try {
      if (wasFollowing) {
        await api.unfollowUser(athleteId);
        showToast('Deixou de seguir', 'success');
      } else {
        await api.followUser(athleteId);
        showToast('Seguindo!', 'success');
      }
    } catch (error) {
      // Rollback on error
      setIsFollowing(wasFollowing);
      setProfile(prev => prev ? {
        ...prev,
        isFollowing: wasFollowing,
        followersCount: wasFollowing ? prev.followersCount + 1 : prev.followersCount - 1
      } : null);
      console.error('Error toggling follow:', error);
      showToast('Erro ao atualizar', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    navigation.navigate('Chat' as any, {
      recipientId: profile.id,
      recipientName: profile.name,
    });
  };

  const handlePostPress = (post: PostItem) => {
    navigation.navigate('PostDetail' as any, { postId: post.id });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Perfil não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const avatarUrl = profile.photoUrl || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=a3e635&color=0a0a0a&size=200`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileTop}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.postsCount}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.followersCount}</Text>
                <Text style={styles.statLabel}>Seguidores</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.followingCount}</Text>
                <Text style={styles.statLabel}>Seguindo</Text>
              </View>
            </View>
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            {profile.username && (
              <Text style={styles.username}>@{profile.username}</Text>
            )}
            <LinkifiedText 
              text={profile.gridBio || `📍 ${profile.city || 'Brasil'}`}
              style={styles.profileBio}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? COLORS.text : COLORS.background} />
              ) : (
                <>
                  <Ionicons 
                    name={isFollowing ? "checkmark" : "person-add"} 
                    size={18} 
                    color={isFollowing ? COLORS.text : COLORS.background} 
                  />
                  <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                    {isFollowing ? 'Seguindo' : 'Seguir'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
              <Ionicons name="chatbubble-outline" size={18} color={COLORS.text} />
              <Text style={styles.messageBtnText}>Mensagem</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Posts Grid */}
        <View style={styles.postsGrid}>
          {posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.gridItem}
              onPress={() => handlePostPress(post)}
            >
              <GridItem
                thumbnailUrl={post.thumbnailUrl}
                mediaType={post.mediaType}
                size={GRID_SIZE}
              />
            </TouchableOpacity>
          ))}
        </View>

        {posts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nenhuma publicação ainda</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 16,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    padding: 16,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  profileInfo: {
    marginTop: 16,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  username: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  profileBio: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  followingBtnText: {
    color: COLORS.text,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 1,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    margin: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },
});
