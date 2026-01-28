import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
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
import LinkifiedText from '../components/LinkifiedText';

type FollowersListScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FollowersList'>;
  route: RouteProp<RootStackParamList, 'FollowersList'>;
};

interface FollowerUser {
  id: number;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  isFollowing: boolean;
  isCurrentUser: boolean;
}

export default function FollowersListScreen({ navigation, route }: FollowersListScreenProps) {
  const { userId, userName } = route.params;
  const { user } = useApp();
  const { showToast } = useToast();
  
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<number>>(new Set());

  const fetchFollowers = useCallback(async (offset: number = 0, refresh: boolean = false) => {
    try {
      const data = await api.getFollowers(userId, 20, offset);
      
      if (refresh || offset === 0) {
        setFollowers(data.users);
      } else {
        setFollowers(prev => [...prev, ...data.users]);
      }
      
      setTotal(data.total);
      setHasMore(offset + data.users.length < data.total);
    } catch (error) {
      console.error('Error fetching followers:', error);
      showToast('Erro ao carregar seguidores', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [userId, showToast]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFollowers(0, true);
  }, [fetchFollowers]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchFollowers(followers.length);
  }, [loadingMore, hasMore, followers.length, fetchFollowers]);

  const handleFollowToggle = async (targetUserId: number, currentlyFollowing: boolean) => {
    if (followLoadingIds.has(targetUserId)) return;
    
    setFollowLoadingIds(prev => new Set(prev).add(targetUserId));
    
    // Optimistic update
    setFollowers(prev => prev.map(f => 
      f.id === targetUserId ? { ...f, isFollowing: !currentlyFollowing } : f
    ));
    
    try {
      if (currentlyFollowing) {
        await api.unfollowUser(targetUserId);
      } else {
        await api.followUser(targetUserId);
      }
    } catch (error) {
      // Rollback on error
      setFollowers(prev => prev.map(f => 
        f.id === targetUserId ? { ...f, isFollowing: currentlyFollowing } : f
      ));
      showToast('Erro ao atualizar', 'error');
    } finally {
      setFollowLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const navigateToProfile = (targetUserId: number, targetUserName: string) => {
    if (targetUserId === user?.id) {
      navigation.navigate('MyGrid' as any);
    } else {
      navigation.navigate('UserGrid' as any, { userId: targetUserId, userName: targetUserName });
    }
  };

  const renderFollowerItem = ({ item }: { item: FollowerUser }) => {
    const avatarUrl = item.photoUrl || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=a3e635&color=0a0a0a`;
    
    const isLoading = followLoadingIds.has(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.userItem}
        onPress={() => navigateToProfile(item.id, item.name)}
      >
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
          {item.bio && (
            <LinkifiedText 
              text={item.bio}
              style={styles.userBio}
              numberOfLines={1}
            />
          )}
        </View>
        
        {!item.isCurrentUser && (
          <TouchableOpacity 
            style={[
              styles.followButton, 
              item.isFollowing && styles.followingButton
            ]} 
            onPress={() => handleFollowToggle(item.id, item.isFollowing)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={item.isFollowing ? COLORS.text : COLORS.background} />
            ) : (
              <Text style={[
                styles.followButtonText,
                item.isFollowing && styles.followingButtonText
              ]}>
                {item.isFollowing ? 'Seguindo' : 'Seguir'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.navTitle}>Seguidores</Text>
          <Text style={styles.navSubtitle}>{userName}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Total count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>{total} seguidores</Text>
      </View>

      <FlatList
        data={followers}
        renderItem={renderFollowerItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nenhum seguidor ainda</Text>
          </View>
        }
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={followers.length === 0 ? styles.emptyList : undefined}
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
  headerTitleContainer: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  navSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  countContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  countText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.card,
  },
  userInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  userBio: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    minWidth: 90,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.background,
  },
  followingButtonText: {
    color: COLORS.text,
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
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
});
