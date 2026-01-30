import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types';
import { apiRequest } from '../config/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'EditGroup'>;

export default function EditGroupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { groupId, groupName } = route.params || { groupId: 0, groupName: 'Grupo' };

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [regras, setRegras] = useState('');
  const [fotoCapa, setFotoCapa] = useState<string | null>(null);
  const [visibilidade, setVisibilidade] = useState<'publico' | 'privado'>('publico');
  const [aprovarMembrosManualmente, setAprovarMembrosManualmente] = useState(false);

  // Load group data
  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      const group = await apiRequest('groups.getById', { groupId });
      if (group) {
        setNome(group.name || '');
        setDescricao(group.description || '');
        setCidade(group.city || '');
        setBairro(group.neighborhood || '');
        setRegras(group.rules || '');
        setFotoCapa(group.coverImageUrl || null);
        setVisibilidade(group.visibility === 'private' ? 'privado' : 'publico');
        setAprovarMembrosManualmente(group.requiresApproval || false);
      }
    } catch (error) {
      console.error('Error loading group:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do grupo');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFotoCapa(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome do grupo é obrigatório');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('groups.update', {
        groupId,
        name: nome.trim(),
        description: descricao.trim(),
        city: cidade.trim(),
        neighborhood: bairro.trim(),
        rules: regras.trim(),
        coverImageUrl: fotoCapa,
        visibility: visibilidade === 'privado' ? 'private' : 'public',
        requiresApproval: aprovarMembrosManualmente,
      });

      Alert.alert('Sucesso', 'Grupo atualizado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error updating group:', error);
      Alert.alert('Erro', error.message || 'Não foi possível atualizar o grupo');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Excluir Grupo',
      'Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('groups.delete', { groupId });
              Alert.alert('Sucesso', 'Grupo excluído com sucesso');
              navigation.navigate('MyGroups');
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível excluir o grupo');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Grupo</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          style={styles.saveButton}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#22c55e" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cover Image */}
        <TouchableOpacity style={styles.coverImageContainer} onPress={pickImage}>
          {fotoCapa ? (
            <Image source={{ uri: fotoCapa }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverImagePlaceholder}>
              <Ionicons name="camera" size={40} color="#666" />
              <Text style={styles.coverImageText}>Alterar foto de capa</Text>
            </View>
          )}
          <View style={styles.editCoverBadge}>
            <Ionicons name="pencil" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Grupo *</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Lobos Corredores"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Descreva o grupo..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                style={styles.input}
                value={cidade}
                onChangeText={setCidade}
                placeholder="Cidade"
                placeholderTextColor="#666"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Bairro</Text>
              <TextInput
                style={styles.input}
                value={bairro}
                onChangeText={setBairro}
                placeholder="Bairro"
                placeholderTextColor="#666"
              />
            </View>
          </View>
        </View>

        {/* Rules Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Regras do Grupo</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={regras}
            onChangeText={setRegras}
            placeholder="Defina as regras do grupo..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Settings Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Configurações</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Grupo Privado</Text>
              <Text style={styles.settingDescription}>
                Apenas membros aprovados podem ver o conteúdo
              </Text>
            </View>
            <Switch
              value={visibilidade === 'privado'}
              onValueChange={(value) => setVisibilidade(value ? 'privado' : 'publico')}
              trackColor={{ false: '#3e3e3e', true: '#22c55e' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Aprovar Membros</Text>
              <Text style={styles.settingDescription}>
                Novos membros precisam de aprovação para entrar
              </Text>
            </View>
            <Switch
              value={aprovarMembrosManualmente}
              onValueChange={setAprovarMembrosManualmente}
              trackColor={{ false: '#3e3e3e', true: '#22c55e' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Management Actions */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Gerenciamento</Text>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ManageMembers', { 
              groupId, 
              groupName: nome || groupName,
              userRole: 'owner'
            })}
          >
            <View style={styles.actionButtonIcon}>
              <Ionicons name="people" size={22} color="#3b82f6" />
            </View>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonLabel}>Gerenciar Membros</Text>
              <Text style={styles.actionButtonDescription}>Adicionar, remover e alterar roles</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('InviteMembers', { 
              groupId, 
              groupName: nome || groupName 
            })}
          >
            <View style={styles.actionButtonIcon}>
              <Ionicons name="person-add" size={22} color="#22c55e" />
            </View>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonLabel}>Convidar Membros</Text>
              <Text style={styles.actionButtonDescription}>Enviar convites para novos membros</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[styles.formSection, styles.dangerZone]}>
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Zona de Perigo</Text>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteGroup}
          >
            <Ionicons name="trash" size={20} color="#ef4444" />
            <Text style={styles.deleteButtonText}>Excluir Grupo</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  coverImageContainer: {
    height: 180,
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  editCoverBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#22c55e',
    borderRadius: 20,
    padding: 8,
  },
  formSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  actionButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  dangerZone: {
    borderBottomWidth: 0,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
