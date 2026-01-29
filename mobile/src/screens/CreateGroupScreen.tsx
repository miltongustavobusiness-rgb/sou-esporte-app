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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MODALIDADES = [
  { id: 'corrida', label: 'Corrida', icon: 'walk-outline' },
  { id: 'triathlon', label: 'Triathlon', icon: 'bicycle-outline' },
  { id: 'bike', label: 'Bike', icon: 'bicycle-outline' },
  { id: 'natacao', label: 'Natação', icon: 'water-outline' },
  { id: 'funcional', label: 'Funcional Avançado', icon: 'barbell-outline' },
  { id: 'caminhada_trail', label: 'Caminhada/Trail', icon: 'trail-sign-outline' },
  { id: 'yoga', label: 'Yoga', icon: 'body-outline' },
  { id: 'lutas', label: 'Lutas/Artes Marciais', icon: 'hand-left-outline' },
  { id: 'outro', label: 'Outro', icon: 'fitness-outline' },
];

const DISTANCIAS_CORRIDA = ['5k', '10k', '15k', '21k', '42k'];
const DISTANCIAS_BIKE = ['20km', '40km', '60km', '80km', '100km+'];
const DISTANCIAS_NATACAO = ['500m', '1000m', '1500m', '2000m', '3000m+'];

// Tipos de grupo
type TipoGrupo = 'gratuito' | 'pago';

// Opções de período de cobrança
const PERIODOS_COBRANCA = [
  { id: 'mensal', label: 'Mensal' },
  { id: 'trimestral', label: 'Trimestral' },
  { id: 'semestral', label: 'Semestral' },
  { id: 'anual', label: 'Anual' },
];

export default function CreateGroupScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  // Form state
  const [nome, setNome] = useState('');
  const [modalidade, setModalidade] = useState('');
  const [distanciasSelecionadas, setDistanciasSelecionadas] = useState<string[]>([]);
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [visibilidade, setVisibilidade] = useState<'publico' | 'privado'>('publico');
  const [fotoCapa, setFotoCapa] = useState<string | null>(null);
  const [regras, setRegras] = useState('');
  const [permitirTreinosPublicos, setPermitirTreinosPublicos] = useState(true);
  const [aprovarMembrosManualmente, setAprovarMembrosManualmente] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Novos estados para tipo de grupo e instrutor
  const [tipoGrupo, setTipoGrupo] = useState<TipoGrupo>('gratuito');
  const [valorMensalidade, setValorMensalidade] = useState('');
  const [periodoCobranca, setPeriodoCobranca] = useState('mensal');
  const [nomeInstrutor, setNomeInstrutor] = useState('');
  const [especialidadeInstrutor, setEspecialidadeInstrutor] = useState('');
  const [descricaoInstrutor, setDescricaoInstrutor] = useState('');
  const [fotoInstrutor, setFotoInstrutor] = useState<string | null>(null);
  const [beneficiosComunidade, setBeneficiosComunidade] = useState('');

  // Obter localização automaticamente
  useEffect(() => {
    getLocationAsync();
  }, []);

  const getLocationAsync = async () => {
    setLoadingLocation(true);
    try {
      // Primeiro verifica se já tem permissão
      let { status } = await Location.getForegroundPermissionsAsync();
      
      // Se não tem, solicita
      if (status !== 'granted') {
        const response = await Location.requestForegroundPermissionsAsync();
        status = response.status;
      }
      
      if (status !== 'granted') {
        // Usuário negou - não mostra alert, apenas deixa preencher manualmente
        console.log('Permissão de localização negada pelo usuário');
        setLoadingLocation(false);
        return;
      }

      // Tenta obter localização com timeout
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 0,
      });
      
      if (location && location.coords) {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          // Preenche cidade e bairro automaticamente
          const cidadeObtida = address.city || address.subregion || address.region || '';
          const bairroObtido = address.district || address.street || address.name || '';
          
          if (cidadeObtida) setCidade(cidadeObtida);
          if (bairroObtido) setBairro(bairroObtido);
          
          console.log('Localização obtida:', { cidade: cidadeObtida, bairro: bairroObtido });
        }
      }
    } catch (error: any) {
      console.log('Erro ao obter localização:', error?.message || error);
      // Não mostra alert - usuário pode preencher manualmente
    }
    setLoadingLocation(false);
  };

  const getDistanciasParaModalidade = () => {
    switch (modalidade) {
      case 'corrida':
        return DISTANCIAS_CORRIDA;
      case 'bike':
        return DISTANCIAS_BIKE;
      case 'natacao':
        return DISTANCIAS_NATACAO;
      default:
        return [];
    }
  };

  const toggleDistancia = (dist: string) => {
    if (distanciasSelecionadas.includes(dist)) {
      setDistanciasSelecionadas(distanciasSelecionadas.filter(d => d !== dist));
    } else {
      setDistanciasSelecionadas([...distanciasSelecionadas, dist]);
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

  const pickInstrutorImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFotoInstrutor(result.assets[0].uri);
    }
  };

  const formatCurrency = (value: string) => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    // Converte para número e formata
    const amount = parseInt(numbers || '0', 10) / 100;
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleValorChange = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    setValorMensalidade(numbers);
  };

  const handleCriar = async () => {
    // Validação básica
    if (!nome.trim()) {
      Alert.alert('Erro', 'Digite o nome do grupo');
      return;
    }
    if (!modalidade) {
      Alert.alert('Erro', 'Selecione uma modalidade');
      return;
    }
    if (!cidade.trim()) {
      Alert.alert('Erro', 'Digite a cidade');
      return;
    }

    // Validação para comunidade paga
    if (tipoGrupo === 'pago') {
      if (!valorMensalidade || parseInt(valorMensalidade) === 0) {
        Alert.alert('Erro', 'Digite o valor da mensalidade para comunidade paga');
        return;
      }
      if (!nomeInstrutor.trim()) {
        Alert.alert('Erro', 'Digite o nome do instrutor');
        return;
      }
    }

    setLoading(true);
    
    try {
      // Criar grupo via API
      const result = await api.createGroup({
        name: nome,
        description: regras || undefined,
        privacy: visibilidade === 'publico' ? 'public' : 'private',
        groupType: modalidade as any,
        city: cidade,
        state: bairro || undefined,
        requiresApproval: aprovarMembrosManualmente,
      });

      if (!result.success || !result.groupId) {
        throw new Error('Falha ao criar grupo');
      }

      console.log('Grupo criado com sucesso! ID:', result.groupId);
      
      Alert.alert(
        'Sucesso!', 
        'Grupo criado com sucesso!',
        [
          {
            text: 'Ver Grupo',
            onPress: () => {
              // Navegar para o detalhe do grupo como admin
              navigation.navigate('GroupDetail', { 
                groupId: result.groupId!,
                groupName: nome,
                isAdmin: true,
              });
            }
          }
        ]
      );
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar o grupo. Tente novamente.');
    }
    
    setLoading(false);
  };

  const handleConvidar = () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Primeiro crie o grupo para convidar membros');
      return;
    }
    // Navegar para tela de convite
    navigation.navigate('InviteMembers', { 
      groupId: 'temp',
      groupName: nome,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Grupo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Foto de Capa */}
        <TouchableOpacity style={styles.coverContainer} onPress={pickImage}>
          {fotoCapa ? (
            <Image source={{ uri: fotoCapa }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="camera-outline" size={40} color="#666" />
              <Text style={styles.coverPlaceholderText}>Adicionar foto de capa</Text>
            </View>
          )}
          <View style={styles.coverEditIcon}>
            <Ionicons name="pencil" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Nome do Grupo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome do grupo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Lobos Corredores"
            placeholderTextColor="#666"
            value={nome}
            onChangeText={setNome}
            maxLength={50}
          />
        </View>

        {/* Tipo de Grupo - NOVO */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tipo de Grupo *</Text>
          <View style={styles.tipoGrupoRow}>
            <TouchableOpacity
              style={[
                styles.tipoGrupoOption,
                tipoGrupo === 'gratuito' && styles.tipoGrupoOptionSelected,
              ]}
              onPress={() => setTipoGrupo('gratuito')}
            >
              <View style={styles.tipoGrupoIconContainer}>
                <Ionicons
                  name="people-outline"
                  size={28}
                  color={tipoGrupo === 'gratuito' ? '#00ff88' : '#888'}
                />
              </View>
              <Text
                style={[
                  styles.tipoGrupoTitle,
                  tipoGrupo === 'gratuito' && styles.tipoGrupoTitleSelected,
                ]}
              >
                Grupo Gratuito
              </Text>
              <Text style={styles.tipoGrupoDescription}>
                Acesso livre para todos os membros
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tipoGrupoOption,
                tipoGrupo === 'pago' && styles.tipoGrupoOptionSelected,
              ]}
              onPress={() => setTipoGrupo('pago')}
            >
              <View style={styles.tipoGrupoIconContainer}>
                <Ionicons
                  name="diamond-outline"
                  size={28}
                  color={tipoGrupo === 'pago' ? '#FFD700' : '#888'}
                />
              </View>
              <Text
                style={[
                  styles.tipoGrupoTitle,
                  tipoGrupo === 'pago' && styles.tipoGrupoTitleSelectedPago,
                ]}
              >
                Comunidade Paga
              </Text>
              <Text style={styles.tipoGrupoDescription}>
                Com instrutor e conteúdo exclusivo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seção de Comunidade Paga - NOVO */}
        {tipoGrupo === 'pago' && (
          <>
            {/* Valor e Período */}
            <View style={styles.inputGroup}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="cash-outline" size={18} color="#FFD700" /> Valores da Comunidade
              </Text>
              
              <Text style={styles.label}>Valor da Mensalidade *</Text>
              <TextInput
                style={styles.input}
                placeholder="R$ 0,00"
                placeholderTextColor="#666"
                value={valorMensalidade ? formatCurrency(valorMensalidade) : ''}
                onChangeText={handleValorChange}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { marginTop: 12 }]}>Período de Cobrança</Text>
              <View style={styles.periodosGrid}>
                {PERIODOS_COBRANCA.map((periodo) => (
                  <TouchableOpacity
                    key={periodo.id}
                    style={[
                      styles.periodoChip,
                      periodoCobranca === periodo.id && styles.periodoChipSelected,
                    ]}
                    onPress={() => setPeriodoCobranca(periodo.id)}
                  >
                    <Text
                      style={[
                        styles.periodoText,
                        periodoCobranca === periodo.id && styles.periodoTextSelected,
                      ]}
                    >
                      {periodo.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dados do Instrutor */}
            <View style={styles.inputGroup}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="person-outline" size={18} color="#FFD700" /> Instrutor
              </Text>

              {/* Foto do Instrutor */}
              <TouchableOpacity style={styles.instrutorFotoContainer} onPress={pickInstrutorImage}>
                {fotoInstrutor ? (
                  <Image source={{ uri: fotoInstrutor }} style={styles.instrutorFoto} />
                ) : (
                  <View style={styles.instrutorFotoPlaceholder}>
                    <Ionicons name="person-add-outline" size={32} color="#666" />
                  </View>
                )}
                <View style={styles.instrutorFotoEditIcon}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>

              <Text style={styles.label}>Nome do Instrutor *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: João Silva"
                placeholderTextColor="#666"
                value={nomeInstrutor}
                onChangeText={setNomeInstrutor}
                maxLength={100}
              />

              <Text style={[styles.label, { marginTop: 12 }]}>Especialidade</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Personal Trainer, Coach de Corrida"
                placeholderTextColor="#666"
                value={especialidadeInstrutor}
                onChangeText={setEspecialidadeInstrutor}
                maxLength={100}
              />

              <Text style={[styles.label, { marginTop: 12 }]}>Sobre o Instrutor</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descreva a experiência e qualificações do instrutor..."
                placeholderTextColor="#666"
                value={descricaoInstrutor}
                onChangeText={setDescricaoInstrutor}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>

            {/* Benefícios da Comunidade */}
            <View style={styles.inputGroup}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="star-outline" size={18} color="#FFD700" /> Benefícios
              </Text>
              
              <Text style={styles.label}>O que os membros terão acesso?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Treinos personalizados, acompanhamento semanal, acesso a planilhas exclusivas, grupo VIP no WhatsApp..."
                placeholderTextColor="#666"
                value={beneficiosComunidade}
                onChangeText={setBeneficiosComunidade}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#FFD700" />
              <Text style={styles.infoBoxText}>
                Comunidades pagas permitem que você monetize seu conhecimento oferecendo treinos e acompanhamento personalizado. Os membros pagam uma mensalidade para ter acesso ao conteúdo exclusivo.
              </Text>
            </View>
          </>
        )}

        {/* Modalidade */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Modalidade *</Text>
          <View style={styles.modalidadesGrid}>
            {MODALIDADES.map((mod) => (
              <TouchableOpacity
                key={mod.id}
                style={[
                  styles.modalidadeItem,
                  modalidade === mod.id && styles.modalidadeItemSelected,
                ]}
                onPress={() => {
                  setModalidade(mod.id);
                  setDistanciasSelecionadas([]);
                }}
              >
                <Ionicons
                  name={mod.icon as any}
                  size={24}
                  color={modalidade === mod.id ? '#00ff88' : '#888'}
                />
                <Text
                  style={[
                    styles.modalidadeText,
                    modalidade === mod.id && styles.modalidadeTextSelected,
                  ]}
                >
                  {mod.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Distâncias (se aplicável) */}
        {getDistanciasParaModalidade().length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Distâncias preferidas</Text>
            <View style={styles.distanciasGrid}>
              {getDistanciasParaModalidade().map((dist) => (
                <TouchableOpacity
                  key={dist}
                  style={[
                    styles.distanciaChip,
                    distanciasSelecionadas.includes(dist) && styles.distanciaChipSelected,
                  ]}
                  onPress={() => toggleDistancia(dist)}
                >
                  <Text
                    style={[
                      styles.distanciaText,
                      distanciasSelecionadas.includes(dist) && styles.distanciaTextSelected,
                    ]}
                  >
                    {dist}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Localização */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Localização *</Text>
            <TouchableOpacity onPress={getLocationAsync} disabled={loadingLocation}>
              <Ionicons 
                name="locate-outline" 
                size={20} 
                color={loadingLocation ? '#666' : '#00ff88'} 
              />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Cidade"
            placeholderTextColor="#666"
            value={cidade}
            onChangeText={setCidade}
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Bairro (opcional)"
            placeholderTextColor="#666"
            value={bairro}
            onChangeText={setBairro}
          />
        </View>

        {/* Visibilidade */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Visibilidade</Text>
          <View style={styles.visibilidadeRow}>
            <TouchableOpacity
              style={[
                styles.visibilidadeOption,
                visibilidade === 'publico' && styles.visibilidadeOptionSelected,
              ]}
              onPress={() => setVisibilidade('publico')}
            >
              <Ionicons
                name="earth-outline"
                size={20}
                color={visibilidade === 'publico' ? '#00ff88' : '#888'}
              />
              <Text
                style={[
                  styles.visibilidadeText,
                  visibilidade === 'publico' && styles.visibilidadeTextSelected,
                ]}
              >
                Público
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilidadeOption,
                visibilidade === 'privado' && styles.visibilidadeOptionSelected,
              ]}
              onPress={() => setVisibilidade('privado')}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={visibilidade === 'privado' ? '#00ff88' : '#888'}
              />
              <Text
                style={[
                  styles.visibilidadeText,
                  visibilidade === 'privado' && styles.visibilidadeTextSelected,
                ]}
              >
                Privado
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Regras */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Regras do grupo (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ex: Respeito mútuo, pontualidade nos treinos..."
            placeholderTextColor="#666"
            value={regras}
            onChangeText={setRegras}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        {/* Preferências */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preferências</Text>
          
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Permitir treinos públicos</Text>
              <Text style={styles.toggleDescription}>
                Qualquer membro pode criar treinos visíveis
              </Text>
            </View>
            <Switch
              value={permitirTreinosPublicos}
              onValueChange={setPermitirTreinosPublicos}
              trackColor={{ false: '#333', true: '#00ff8855' }}
              thumbColor={permitirTreinosPublicos ? '#00ff88' : '#666'}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Aprovar membros manualmente</Text>
              <Text style={styles.toggleDescription}>
                Novos membros precisam de aprovação
              </Text>
            </View>
            <Switch
              value={aprovarMembrosManualmente}
              onValueChange={setAprovarMembrosManualmente}
              trackColor={{ false: '#333', true: '#00ff8855' }}
              thumbColor={aprovarMembrosManualmente ? '#00ff88' : '#666'}
            />
          </View>
        </View>

        {/* Botões de Ação */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.button, 
              tipoGrupo === 'pago' ? styles.buttonPrimaryPago : styles.buttonPrimary
            ]}
            onPress={handleCriar}
            disabled={loading}
          >
            <Ionicons 
              name={tipoGrupo === 'pago' ? "diamond-outline" : "checkmark-circle-outline"} 
              size={20} 
              color="#0a1628" 
            />
            <Text style={styles.buttonPrimaryText}>
              {loading ? 'Criando...' : tipoGrupo === 'pago' ? 'Criar Comunidade Paga' : 'Criar Grupo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleConvidar}
          >
            <Ionicons name="person-add-outline" size={20} color="#00ff88" />
            <Text style={styles.buttonSecondaryText}>Convidar Membros</Text>
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
  coverContainer: {
    marginTop: 16,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a2a44',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    color: '#666',
    marginTop: 8,
    fontSize: 14,
  },
  coverEditIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#00ff88',
    borderRadius: 20,
    padding: 8,
  },
  inputGroup: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a2a44',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a3a54',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  // Estilos para Tipo de Grupo
  tipoGrupoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tipoGrupoOption: {
    flex: 1,
    backgroundColor: '#1a2a44',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2a3a54',
    alignItems: 'center',
  },
  tipoGrupoOptionSelected: {
    borderColor: '#00ff88',
    backgroundColor: '#00ff8810',
  },
  tipoGrupoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a1628',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipoGrupoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 4,
    textAlign: 'center',
  },
  tipoGrupoTitleSelected: {
    color: '#00ff88',
  },
  tipoGrupoTitleSelectedPago: {
    color: '#FFD700',
  },
  tipoGrupoDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  // Estilos para Períodos
  periodosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodoChip: {
    backgroundColor: '#1a2a44',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a3a54',
  },
  periodoChipSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#FFD70015',
  },
  periodoText: {
    color: '#888',
    fontSize: 14,
  },
  periodoTextSelected: {
    color: '#FFD700',
    fontWeight: '600',
  },
  // Estilos para Instrutor
  instrutorFotoContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  instrutorFoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  instrutorFotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a2a44',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a3a54',
    borderStyle: 'dashed',
  },
  instrutorFotoEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFD700',
    borderRadius: 15,
    padding: 6,
  },
  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFD70015',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFD70030',
    gap: 10,
  },
  infoBoxText: {
    flex: 1,
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
  },
  // Modalidades
  modalidadesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalidadeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2a44',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a3a54',
    gap: 6,
  },
  modalidadeItemSelected: {
    borderColor: '#00ff88',
    backgroundColor: '#00ff8815',
  },
  modalidadeText: {
    color: '#888',
    fontSize: 14,
  },
  modalidadeTextSelected: {
    color: '#00ff88',
  },
  distanciasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distanciaChip: {
    backgroundColor: '#1a2a44',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a3a54',
  },
  distanciaChipSelected: {
    borderColor: '#00ff88',
    backgroundColor: '#00ff8815',
  },
  distanciaText: {
    color: '#888',
    fontSize: 14,
  },
  distanciaTextSelected: {
    color: '#00ff88',
  },
  visibilidadeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilidadeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2a44',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a3a54',
    gap: 8,
  },
  visibilidadeOptionSelected: {
    borderColor: '#00ff88',
    backgroundColor: '#00ff8815',
  },
  visibilidadeText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  visibilidadeTextSelected: {
    color: '#00ff88',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a2a44',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleDescription: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  actionsContainer: {
    marginTop: 30,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#00ff88',
  },
  buttonPrimaryPago: {
    backgroundColor: '#FFD700',
  },
  buttonPrimaryText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  buttonSecondaryText: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: '600',
  },
});
