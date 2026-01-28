import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import LinkifiedText from '../components/LinkifiedText';

interface Athlete {
  id: number;
  name: string;
  avatar: string | null;
  city: string | null;
  gridBio: string | null;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export default function SearchAthletesScreen() {
  const navigation = useNavigation();
  const { user } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchAthletes = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const results = await api.searchAthletes(searchQuery, user?.id);
      setAthletes(results.map((u: any) => ({
        id: u.id,
        name: u.name || 'Usuário',
        avatar: u.photoUrl,
        city: u.city,
        gridBio: u.gridBio,
        postsCount: u.postsCount || 0,
        followersCount: u.followersCount || 0,
        followingCount: u.followingCount || 0,
        isFollowing: u.isFollowing || false,
      })));
    } catch (error) {
      console.error('Erro ao buscar atletas:', error);
      setAthletes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (athleteId: number) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;
    
    try {
      if (athlete.isFollowing) {
        await api.unfollowUser(athleteId);
      } else {
        await api.followUser(athleteId);
      }
      
      // Update local state
      setAthletes(prev => 
        prev.map(a => 
          a.id === athleteId 
            ? { ...a, isFollowing: !a.isFollowing, followersCount: a.isFollowing ? a.followersCount - 1 : a.followersCount + 1 }
            : a
        )
      );
    } catch (error) {
      console.error('Erro ao seguir/deixar de seguir:', error);
    }
  };

  const handleMessage = (athlete: Athlete) => {
    // TODO: Navegar para tela de mensagens
    navigation.navigate('Chat' as any, { recipientId: athlete.id, recipientName: athlete.name });
  };

  const handleViewProfile = (athlete: Athlete) => {
    navigation.navigate('UserGrid' as any, { userId: athlete.id, userName: athlete.name });
  };

  const renderAthlete = ({ item }: { item: Athlete }) => (
    <TouchableOpacity 
      style={styles.athleteCard}
      onPress={() => handleViewProfile(item)}
    >
      <Image 
        source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=a3e635&color=0a0a0a&size=200` }}
        style={styles.athleteAvatar}
      />
      <View style={styles.athleteInfo}>
        <Text style={styles.athleteName}>{item.name}</Text>
        <LinkifiedText 
          text={item.gridBio || `📍 ${item.city || 'Brasil'}`}
          style={styles.athleteBio}
          numberOfLines={1}
        />
        <View style={styles.athleteStats}>
          <Text style={styles.athleteStat}>{item.postsCount} posts</Text>
          <Text style={styles.athleteStat}>•</Text>
          <Text style={styles.athleteStat}>{item.followersCount} seguidores</Text>
        </View>
      </View>
      <View style={styles.athleteActions}>
        <TouchableOpacity 
          style={[styles.followBtn, item.isFollowing && styles.followingBtn]}
          onPress={() => handleFollow(item.id)}
        >
          <Text style={[styles.followBtnText, item.isFollowing && styles.followingBtnText]}>
            {item.isFollowing ? 'Seguindo' : 'Seguir'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.messageBtn}
          onPress={() => handleMessage(item)}
        >
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscar Atletas</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou cidade..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchAthletes}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : hasSearched && athletes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Nenhum atleta encontrado</Text>
          <Text style={styles.emptySubtext}>Tente buscar por outro nome ou cidade</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Busque por atletas</Text>
          <Text style={styles.emptySubtext}>Digite o nome ou cidade para encontrar outros atletas</Text>
        </View>
      ) : (
        <FlatList
          data={athletes}
          renderItem={renderAthlete}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
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
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  athleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  athleteAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  athleteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  athleteName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  athleteBio: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  athleteStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  athleteStat: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  athleteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.background,
  },
  followingBtnText: {
    color: COLORS.text,
  },
  messageBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
