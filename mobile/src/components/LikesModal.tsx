import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LikeUser {
  userId: number;
  name: string;
  username?: string;
  photoUrl?: string;
  isFollowing?: boolean;
}

interface LikesModalProps {
  visible: boolean;
  onClose: () => void;
  postId: number;
  currentUserId: number;
  onFollowUser?: (userId: number) => void;
  onNavigateToProfile?: (userId: number, userName: string) => void;
}

export const LikesModal: React.FC<LikesModalProps> = ({
  visible,
  onClose,
  postId,
  currentUserId,
  onFollowUser,
  onNavigateToProfile,
}) => {
  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (visible) {
      loadLikes();
    } else {
      setLikes([]);
      setOffset(0);
      setHasMore(true);
    }
  }, [visible, postId]);

  const loadLikes = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await api.getPostLikes({ postId, limit: 20, offset: 0 });
      setLikes(result || []);
      setOffset(20);
      setHasMore((result?.length || 0) >= 20);
    } catch (error) {
      console.error('Error loading likes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLikes = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await api.getPostLikes({ postId, limit: 20, offset });
      if (result && result.length > 0) {
        setLikes(prev => [...prev, ...result]);
        setOffset(prev => prev + 20);
        setHasMore(result.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more likes:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFollow = async (userId: number) => {
    try {
      await api.followRequest({ followerId: currentUserId, followingId: userId });
      setLikes(prev => prev.map(like => 
        like.userId === userId ? { ...like, isFollowing: true } : like
      ));
      onFollowUser?.(userId);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleAvatarPress = (userId: number, userName: string) => {
    if (onNavigateToProfile) {
      onClose(); // Fechar o modal antes de navegar
      setTimeout(() => {
        onNavigateToProfile(userId, userName);
      }, 300);
    }
  };

  const renderLikeItem = ({ item }: { item: LikeUser }) => (
    <View style={styles.likeItem}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => handleAvatarPress(item.userId, item.name)}
        activeOpacity={0.7}
      >
        <Image
          source={item.photoUrl ? { uri: item.photoUrl } : require('../../assets/icon.png')}
          style={styles.avatar}
        />
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{item.name}</Text>
          {item.username && <Text style={styles.username}>@{item.username}</Text>}
        </View>
      </TouchableOpacity>
      
      {item.userId !== currentUserId && !item.isFollowing && (
        <TouchableOpacity
          style={styles.followButton}
          onPress={() => handleFollow(item.userId)}
        >
          <Text style={styles.followButtonText}>Seguir</Text>
        </TouchableOpacity>
      )}
      
      {item.isFollowing && (
        <View style={styles.followingBadge}>
          <Text style={styles.followingText}>Seguindo</Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Curtidas</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#C8FA1E" />
            </View>
          ) : likes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>Nenhuma curtida ainda</Text>
            </View>
          ) : (
            <FlatList
              data={likes}
              renderItem={renderLikeItem}
              keyExtractor={(item) => item.userId.toString()}
              onEndReached={loadMoreLikes}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator size="small" color="#C8FA1E" style={styles.footerLoader} />
                ) : null
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0D1B2A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    minHeight: SCREEN_HEIGHT * 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1B2838',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#666',
    marginTop: 12,
    fontSize: 16,
  },
  likeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1B2838',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B2838',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  username: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  followButton: {
    backgroundColor: '#C8FA1E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followButtonText: {
    color: '#0D1B2A',
    fontWeight: '600',
    fontSize: 14,
  },
  followingBadge: {
    borderWidth: 1,
    borderColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followingText: {
    color: '#888',
    fontSize: 13,
  },
  footerLoader: {
    padding: 16,
  },
});

export default LikesModal;
