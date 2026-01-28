import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { useApp } from '../contexts/AppContext';

interface FollowRequest {
  id: number;
  requesterId: number;
  name: string;
  username?: string;
  photoUrl?: string;
  createdAt: string;
}

export const FollowRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useApp();
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const loadRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = await api.getFollowRequestsInbox({ userId: user.id });
      setRequests(result || []);
    } catch (error) {
      console.error('Error loading follow requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleAccept = async (requesterId: number) => {
    if (!user?.id) return;
    setProcessingIds(prev => new Set(prev).add(requesterId));
    try {
      await api.acceptFollowRequest({ userId: user.id, followerId: requesterId });
      setRequests(prev => prev.filter(r => r.requesterId !== requesterId));
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requesterId);
        return next;
      });
    }
  };

  const handleDecline = async (requesterId: number) => {
    if (!user?.id) return;
    setProcessingIds(prev => new Set(prev).add(requesterId));
    try {
      await api.declineFollowRequest({ userId: user.id, followerId: requesterId });
      setRequests(prev => prev.filter(r => r.requesterId !== requesterId));
    } catch (error) {
      console.error('Error declining request:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requesterId);
        return next;
      });
    }
  };

  const renderRequest = ({ item }: { item: FollowRequest }) => {
    const isProcessing = processingIds.has(item.requesterId);
    
    return (
      <View style={styles.requestItem}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => navigation.navigate('UserGrid' as never, { userId: item.requesterId, userName: item.name } as never)}
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
        
        <View style={styles.actions}>
          {isProcessing ? (
            <ActivityIndicator size="small" color="#C8FA1E" />
          ) : (
            <>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAccept(item.requesterId)}
              >
                <Text style={styles.acceptText}>Aceitar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => handleDecline(item.requesterId)}
              >
                <Text style={styles.declineText}>Recusar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitações para seguir</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C8FA1E" />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>Nenhuma solicitação pendente</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.requesterId.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadRequests();
              }}
              tintColor="#C8FA1E"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1B2838',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1B2838',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1B2838',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  username: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#C8FA1E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptText: {
    color: '#0D1B2A',
    fontWeight: '600',
    fontSize: 14,
  },
  declineButton: {
    borderWidth: 1,
    borderColor: '#666',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineText: {
    color: '#888',
    fontSize: 14,
  },
});

export default FollowRequestsScreen;
