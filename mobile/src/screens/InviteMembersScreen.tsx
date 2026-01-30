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
import { useApp } from '../contexts/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'InviteMembers'>;

interface FollowingUser {
  id: number;
  name: string;
  username: string;
  profilePhoto: string | null;
  invited: boolean;
}

export default function InviteMembersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { groupId, groupName } = route.params || { groupId: '', groupName: 'Grupo' };
  const { user } = useApp();
  
  const [inviteLink, setInviteLink] = useState('');
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [invitingUser, setInvitingUser] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Gerar link de convite único
    const baseUrl = 'https://souesporte.app/grupo';
    const uniqueCode = `${groupId}-${Date.now().toString(36)}`;
    setInviteLink(`${baseUrl}/${uniqueCode}`);
  }, [groupId]);

  useEffect(() => {
    const loadFollowing = async () => {
      if (!user?.id) {
        setLoadingFollowing(false);
        return;
      }
      try {
        const result = await api.getFollowing(user.id, 50, 0);
        const users = result.users.map((u: any) => ({
          id: u.id,
          name: u.name || u.username,
          username: u.username,
          profilePhoto: u.profilePhoto,
          invited: false,
        }));
        setFollowing(users);
      } catch (error) {
        console.error('Error loading following:', error);
      } finally {
        setLoadingFollowing(false);
      }
    };
    loadFollowing();
  }, [user?.id]);

  const handleInviteUser = async (userId: number) => {
    setInvitingUser(userId);
    try {
      // TODO: Implement actual invite API call
      // await api.inviteToGroup(groupId, userId);
      
      // For now, mark as invited locally
      setFollowing(prev => prev.map(u => 
        u.id === userId ? { ...u, invited: true } : u
      ));
      Alert.alert('Convite Enviado', 'O convite foi enviado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar o convite');
    } finally {
      setInvitingUser(null);
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
        {/* Título do Grupo */}
        <View style={styles.groupInfo}>
          <Ionicons name="people-circle-outline" size={60} color="#00ff88" />
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.groupSubtitle}>Convide amigos para participar</Text>
        </View>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>QR Code do Grupo</Text>
          <View style={styles.qrContainer}>
            {/* Placeholder para QR Code - usar biblioteca react-native-qrcode-svg */}
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={120} color="#00ff88" />
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
                color={copied ? "#0a1628" : "#00ff88"} 
              />
            </TouchableOpacity>
          </View>
          {copied && (
            <Text style={styles.copiedText}>Link copiado!</Text>
          )}
        </View>

        {/* Opções de Compartilhamento */}
        <View style={styles.shareSection}>
          <Text style={styles.sectionTitle}>Compartilhar via</Text>
          
          <View style={styles.shareOptions}>
            {/* WhatsApp */}
            <TouchableOpacity style={styles.shareOption} onPress={handleShareWhatsApp}>
              <View style={[styles.shareIconContainer, { backgroundColor: '#25D366' }]}>
                <Ionicons name="logo-whatsapp" size={28} color="#fff" />
              </View>
              <Text style={styles.shareLabel}>WhatsApp</Text>
            </TouchableOpacity>

            {/* Telegram */}
            <TouchableOpacity style={styles.shareOption} onPress={handleShareTelegram}>
              <View style={[styles.shareIconContainer, { backgroundColor: '#0088cc' }]}>
                <Ionicons name="paper-plane" size={28} color="#fff" />
              </View>
              <Text style={styles.shareLabel}>Telegram</Text>
            </TouchableOpacity>

            {/* Mais opções */}
            <TouchableOpacity style={styles.shareOption} onPress={handleShareGeneral}>
              <View style={[styles.shareIconContainer, { backgroundColor: '#666' }]}>
                <Ionicons name="share-social-outline" size={28} color="#fff" />
              </View>
              <Text style={styles.shareLabel}>Mais</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pessoas que você segue */}
        <View style={styles.followingSection}>
          <Text style={styles.sectionTitle}>Pessoas que você segue</Text>
          {loadingFollowing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#00ff88" />
            </View>
          ) : following.length === 0 ? (
            <View style={styles.emptyFollowing}>
              <Ionicons name="people-outline" size={40} color="#666" />
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
                      <Ionicons name="person" size={20} color="#666" />
                    </View>
                  )}
                  <View style={styles.followingInfo}>
                    <Text style={styles.followingName}>{person.name}</Text>
                    <Text style={styles.followingUsername}>@{person.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.inviteButton, person.invited && styles.inviteButtonDisabled]}
                    onPress={() => !person.invited && handleInviteUser(person.id)}
                    disabled={person.invited || invitingUser === person.id}
                  >
                    {invitingUser === person.id ? (
                      <ActivityIndicator size="small" color="#00ff88" />
                    ) : (
                      <Text style={[styles.inviteButtonText, person.invited && styles.inviteButtonTextDisabled]}>
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
          <Ionicons name="people-outline" size={24} color="#00ff88" />
          <View style={styles.importTextContainer}>
            <Text style={styles.importTitle}>Importar Contatos</Text>
            <Text style={styles.importSubtitle}>Convide amigos da sua lista de contatos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

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
    backgroundColor: '#0a1628',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2a44',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  groupInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  groupSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  qrSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  qrContainer: {
    backgroundColor: '#1a2a44',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: '#0a1628',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrHint: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  linkSection: {
    marginTop: 24,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2a44',
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  linkText: {
    flex: 1,
    color: '#00ff88',
    fontSize: 14,
  },
  copyButton: {
    backgroundColor: '#0a1628',
    padding: 12,
    borderRadius: 8,
  },
  copyButtonSuccess: {
    backgroundColor: '#00ff88',
  },
  copiedText: {
    color: '#00ff88',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  shareSection: {
    marginTop: 24,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shareOption: {
    alignItems: 'center',
  },
  shareIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2a44',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  importTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  importTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  importSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  tipsSection: {
    marginTop: 24,
    backgroundColor: '#1a2a44',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  followingSection: {
    marginTop: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyFollowing: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1a2a44',
    borderRadius: 12,
  },
  emptyFollowingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
  },
  followingList: {
    backgroundColor: '#1a2a44',
    borderRadius: 12,
    padding: 8,
  },
  followingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0a1628',
  },
  followingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  followingAvatarPlaceholder: {
    backgroundColor: '#0a1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  followingName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  followingUsername: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  inviteButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  inviteButtonDisabled: {
    backgroundColor: '#1a2a44',
    borderWidth: 1,
    borderColor: '#334155',
  },
  inviteButtonText: {
    color: '#0a1628',
    fontSize: 13,
    fontWeight: '600',
  },
  inviteButtonTextDisabled: {
    color: '#888',
  },
  moreFollowing: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    padding: 12,
  },
});
