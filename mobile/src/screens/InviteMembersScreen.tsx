import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Linking,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { api } from '../services/api';
import { apiRequest } from '../config/api';
import { useApp } from '../contexts/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'InviteMembers'>;

interface FollowingUser {
  id: number;
  name: string;
  username: string;
  profilePhoto: string | null;
  invited: boolean;
  inviteId?: number; // Store invite ID for cancellation
}

export default function InviteMembersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const params = route.params || { groupId: 0, groupName: 'Grupo' };
  // Ensure groupId is always a number
  const groupId = typeof params.groupId === 'string' ? parseInt(params.groupId, 10) || 0 : (params.groupId || 0);
  const groupName = params.groupName || 'Grupo';
  const { user } = useApp();
  
  const [inviteLink, setInviteLink] = useState('');
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [invitingUser, setInvitingUser] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Map<number, number>>(new Map()); // userId -> inviteId

  useEffect(() => {
    // Gerar link de convite único
    const baseUrl = 'https://souesporte.app/grupo';
    const uniqueCode = `temp-${Math.random().toString(36).substring(2, 10)}`;
    setInviteLink(`${baseUrl}/${uniqueCode}`);
  }, [groupId]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoadingFollowing(false);
        return;
      }
      try {
        // Load following users and pending invites in parallel
        // Only load pending invites if groupId is valid
        const [followingResult, invitesResult] = await Promise.all([
          api.getFollowing(user.id, 50, 0),
          groupId > 0 ? apiRequest('getPendingInvites', { groupId: Number(groupId), userId: user.id }, 'query').catch(() => []) : Promise.resolve([]),
        ]);
        
        // Create map of pending invites
        const invitesMap = new Map<number, number>();
        if (Array.isArray(invitesResult)) {
          invitesResult.forEach((invite: any) => {
            invitesMap.set(invite.user?.id || invite.invitedUserId, invite.invite?.id || invite.id);
          });
        }
        setPendingInvites(invitesMap);
        
        // Map following users with invite status
        const users = followingResult.users.map((u: any) => ({
          id: u.id,
          name: u.name || u.username,
          username: u.username,
          profilePhoto: u.profilePhoto,
          invited: invitesMap.has(u.id),
          inviteId: invitesMap.get(u.id),
        }));
        setFollowing(users);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingFollowing(false);
      }
    };
    loadData();
  }, [user?.id, groupId]);

  const handleInviteUser = async (userId: number) => {
    setInvitingUser(userId);
    try {
      if (!groupId || groupId <= 0) {
        throw new Error('ID do grupo inválido');
      }
      const result = await apiRequest('inviteUser', {
        groupId: Number(groupId),
        userId: user!.id,
        targetUserId: userId,
      });
      
      // Update local state - mark as invited
      setFollowing(prev => prev.map(u => 
        u.id === userId ? { ...u, invited: true, inviteId: result.inviteId } : u
      ));
      setPendingInvites(prev => new Map(prev).set(userId, result.inviteId));
      // No success alert - just update UI
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível enviar o convite');
    } finally {
      setInvitingUser(null);
    }
  };

  const handleCancelInvite = async (userId: number, inviteId?: number) => {
    if (!inviteId) {
      // Try to get from pendingInvites map
      inviteId = pendingInvites.get(userId);
    }
    
    if (!inviteId) {
      Alert.alert('Erro', 'Convite não encontrado');
      return;
    }
    
    setInvitingUser(userId);
    try {
      await apiRequest('cancelInvite', { inviteId, userId: user!.id });
      
      // Update local state - mark as not invited
      setFollowing(prev => prev.map(u => 
        u.id === userId ? { ...u, invited: false, inviteId: undefined } : u
      ));
      setPendingInvites(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
      // No success alert - just update UI
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível cancelar o convite');
    } finally {
      setInvitingUser(null);
    }
  };

  const handleToggleInvite = async (person: FollowingUser) => {
    if (person.invited) {
      await handleCancelInvite(person.id, person.inviteId);
    } else {
      await handleInviteUser(person.id);
    }
  };

  const handleCopyLink = async () => {
    try {
      // Em React Native, usamos Share ou Clipboard
      await Share.share({
        message: inviteLink,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível copiar o link');
    }
  };

  const handleShareGeneral = async () => {
    try {
      await Share.share({
        title: `Convite para ${groupName}`,
        message: `🏃 Venha fazer parte do grupo "${groupName}" no Sou Esporte!\n\nClique no link para entrar:\n${inviteLink}`,
      });
    } catch (error) {
      console.log('Erro ao compartilhar:', error);
    }
  };

  const handleShareWhatsApp = async () => {
    const message = encodeURIComponent(
      `🏃 Venha fazer parte do grupo "${groupName}" no Sou Esporte!\n\nClique no link para entrar:\n${inviteLink}`
    );
    const whatsappUrl = `whatsapp://send?text=${message}`;
    
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('WhatsApp não instalado', 'Instale o WhatsApp para compartilhar por lá.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
    }
  };

  const handleShareTelegram = async () => {
    const message = encodeURIComponent(
      `🏃 Venha fazer parte do grupo "${groupName}" no Sou Esporte!\n\nClique no link para entrar:\n${inviteLink}`
    );
    const telegramUrl = `tg://msg?text=${message}`;
    
    try {
      const canOpen = await Linking.canOpenURL(telegramUrl);
      if (canOpen) {
        await Linking.openURL(telegramUrl);
      } else {
        Alert.alert('Telegram não instalado', 'Instale o Telegram para compartilhar por lá.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o Telegram');
    }
  };

  const handleImportContacts = () => {
    Alert.alert(
      'Importar Contatos',
      'Esta funcionalidade permite importar contatos do seu dispositivo para convidar amigos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Permitir Acesso', 
          onPress: () => {
            // Implementar acesso aos contatos
            Alert.alert('Em breve', 'Funcionalidade em desenvolvimento');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Convidar Membros</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pessoas que você segue - MOVED TO TOP */}
        <View style={styles.followingSection}>
          <Text style={styles.sectionTitle}>Pessoas que você segue</Text>
          {loadingFollowing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#84CC16" />
            </View>
          ) : following.length === 0 ? (
            <View style={styles.emptyFollowing}>
              <Ionicons name="people-outline" size={40} color="#64748B" />
              <Text style={styles.emptyFollowingText}>Você ainda não segue ninguém</Text>
            </View>
          ) : (
            <View style={styles.followingList}>
              {following.slice(0, 10).map((person) => (
                <View key={person.id} style={styles.followingItem}>
                  {person.profilePhoto ? (
                    <Image source={{ uri: person.profilePhoto }} style={styles.followingAvatar} />
                  ) : (
                    <View style={[styles.followingAvatar, styles.followingAvatarPlaceholder]}>
                      <Ionicons name="person" size={20} color="#64748B" />
                    </View>
                  )}
                  <View style={styles.followingInfo}>
                    <Text style={styles.followingName}>{person.name}</Text>
                    <Text style={styles.followingUsername}>@{person.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.inviteButton, 
                      person.invited && styles.inviteButtonInvited
                    ]}
                    onPress={() => handleToggleInvite(person)}
                    disabled={invitingUser === person.id}
                  >
                    {invitingUser === person.id ? (
                      <ActivityIndicator size="small" color={person.invited ? "#94A3B8" : "#84CC16"} />
                    ) : (
                      <Text style={[
                        styles.inviteButtonText, 
                        person.invited && styles.inviteButtonTextInvited
                      ]}>
                        {person.invited ? 'Convidado' : 'Convidar'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
              {following.length > 10 && (
                <Text style={styles.moreFollowing}>+{following.length - 10} pessoas</Text>
              )}
            </View>
          )}
        </View>

        {/* Importar Contatos */}
        <TouchableOpacity style={styles.importButton} onPress={handleImportContacts}>
          <Ionicons name="people-outline" size={24} color="#84CC16" />
          <View style={styles.importTextContainer}>
            <Text style={styles.importTitle}>Importar Contatos</Text>
            <Text style={styles.importSubtitle}>Convide amigos da sua lista de contatos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>QR Code do Grupo</Text>
          <View style={styles.qrContainer}>
            {/* Placeholder para QR Code - usar biblioteca react-native-qrcode-svg */}
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={120} color="#84CC16" />
            </View>
            <Text style={styles.qrHint}>
              Mostre este QR Code para que outros escaneiem e entrem no grupo
            </Text>
          </View>
        </View>

        {/* Link de Convite */}
        <View style={styles.linkSection}>
          <Text style={styles.sectionTitle}>Link de Convite</Text>
          <View style={styles.linkContainer}>
            <Text style={styles.linkText} numberOfLines={1}>
              {inviteLink}
            </Text>
            <TouchableOpacity 
              style={[styles.copyButton, copied && styles.copyButtonSuccess]}
              onPress={handleCopyLink}
            >
              <Ionicons 
                name={copied ? "checkmark" : "copy-outline"} 
                size={20} 
                color={copied ? "#0F172A" : "#84CC16"} 
              />
            </TouchableOpacity>
          </View>
          {copied && (
            <Text style={styles.copiedText}>Link copiado!</Text>
          )}
        </View>

        {/* Opções de Compartilhamento - CLEAN STYLE WITHOUT BACKGROUNDS */}
        <View style={styles.shareSection}>
          <Text style={styles.sectionTitle}>Compartilhar via</Text>
          
          <View style={styles.shareOptions}>
            {/* WhatsApp - Clean style */}
            <TouchableOpacity style={styles.shareOption} onPress={handleShareWhatsApp}>
              <Ionicons name="logo-whatsapp" size={32} color="#25D366" />
              <Text style={styles.shareLabel}>WhatsApp</Text>
            </TouchableOpacity>

            {/* Telegram - Clean style */}
            <TouchableOpacity style={styles.shareOption} onPress={handleShareTelegram}>
              <Ionicons name="paper-plane" size={32} color="#0088cc" />
              <Text style={styles.shareLabel}>Telegram</Text>
            </TouchableOpacity>

            {/* Mais opções - Clean style */}
            <TouchableOpacity style={styles.shareOption} onPress={handleShareGeneral}>
              <Ionicons name="share-social-outline" size={32} color="#94A3B8" />
              <Text style={styles.shareLabel}>Mais</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dicas */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Dicas</Text>
          <Text style={styles.tipText}>
            • O link de convite não expira e pode ser usado várias vezes
          </Text>
          <Text style={styles.tipText}>
            • Membros que entrarem pelo link serão aprovados automaticamente (se o grupo for público)
          </Text>
          <Text style={styles.tipText}>
            • Você pode gerar um novo link a qualquer momento nas configurações do grupo
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  // Following section - NOW AT TOP
  followingSection: {
    marginTop: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyFollowing: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyFollowingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },
  followingList: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  followingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  followingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  followingAvatarPlaceholder: {
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  followingName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  followingUsername: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  inviteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#84CC16',
    backgroundColor: 'transparent',
    minWidth: 90,
    alignItems: 'center',
  },
  inviteButtonInvited: {
    borderColor: '#64748B',
    backgroundColor: '#1E293B',
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#84CC16',
  },
  inviteButtonTextInvited: {
    color: '#94A3B8',
  },
  moreFollowing: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    paddingVertical: 12,
  },
  // Import contacts
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  importTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  importTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  importSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  // QR Code
  qrSection: {
    marginTop: 24,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  qrHint: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 250,
  },
  // Link section
  linkSection: {
    marginTop: 24,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#84CC16',
    marginRight: 12,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#84CC16',
  },
  copyButtonSuccess: {
    backgroundColor: '#84CC16',
    borderColor: '#84CC16',
  },
  copiedText: {
    fontSize: 12,
    color: '#84CC16',
    marginTop: 8,
    textAlign: 'center',
  },
  // Share section - CLEAN STYLE
  shareSection: {
    marginTop: 24,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  shareOption: {
    alignItems: 'center',
    padding: 12,
  },
  shareLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  // Tips
  tipsSection: {
    marginTop: 24,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
    lineHeight: 18,
  },
});
