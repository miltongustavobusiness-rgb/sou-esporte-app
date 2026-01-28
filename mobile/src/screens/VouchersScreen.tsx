import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { api } from '../services/api';

import { useToast } from '../contexts/ToastContext';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Voucher {
  id: number;
  eventId?: number;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  maxUses?: number;
  currentUses: number;
  minOrderValue?: string;
  validFrom?: string;
  validUntil?: string;
  active: boolean;
  description?: string;
  createdAt: string;
}

export default function VouchersScreen() {
  const { showToast } = useToast();
  const navigation = useNavigation<NavigationProp>();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  const loadVouchers = useCallback(async () => {
    try {
      const data = await api.getMyVouchers();
      setVouchers(data);
    } catch (error) {
      console.error('Erro ao carregar vouchers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVouchers();
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMaxUses('');
    setMinOrderValue('');
    setValidUntil('');
    setDescription('');
    setActive(true);
    setEditingVoucher(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setCode(voucher.code);
    setDiscountType(voucher.discountType);
    setDiscountValue(voucher.discountValue);
    setMaxUses(voucher.maxUses?.toString() || '');
    setMinOrderValue(voucher.minOrderValue || '');
    setValidUntil(voucher.validUntil ? new Date(voucher.validUntil).toLocaleDateString('pt-BR') : '');
    setDescription(voucher.description || '');
    setActive(voucher.active);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!code.trim()) {
      showToast('Digite o código do voucher', 'info');
      return;
    }
    if (!discountValue.trim()) {
      showToast('Digite o valor do desconto', 'info');
      return;
    }

    setSaving(true);
    try {
      if (editingVoucher) {
        await api.updateVoucher(editingVoucher.id, {
          code: code.toUpperCase(),
          discountType,
          discountValue,
          maxUses: maxUses ? parseInt(maxUses) : undefined,
          minOrderValue: minOrderValue || undefined,
          active,
          description: description || undefined,
        });
        showToast('Voucher atualizado!', 'info');
      } else {
        await api.createVoucher({
          code: code.toUpperCase(),
          discountType,
          discountValue,
          maxUses: maxUses ? parseInt(maxUses) : undefined,
          minOrderValue: minOrderValue || undefined,
          description: description || undefined,
        });
        showToast('Voucher criado!', 'info');
      }
      setModalVisible(false);
      resetForm();
      loadVouchers();
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar voucher', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (voucher: Voucher) => {
    Alert.alert(
      'Excluir Voucher',
      `Deseja excluir o voucher ${voucher.code}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteVoucher(voucher.id);
              loadVouchers();
            } catch (error) {
              showToast('Erro ao excluir voucher', 'info');
            }
          },
        },
      ]
    );
  };

  const formatDiscount = (voucher: Voucher) => {
    if (voucher.discountType === 'percentage') {
      return `${voucher.discountValue}%`;
    }
    return `R$ ${parseFloat(voucher.discountValue).toFixed(2)}`;
  };

  const renderVoucher = (voucher: Voucher) => (
    <TouchableOpacity
      key={voucher.id}
      style={[styles.voucherCard, !voucher.active && styles.voucherInactive]}
      onPress={() => openEditModal(voucher)}
    >
      <View style={styles.voucherHeader}>
        <View style={styles.codeContainer}>
          <Text style={styles.voucherCode}>{voucher.code}</Text>
          {!voucher.active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inativo</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => handleDelete(voucher)}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.voucherBody}>
        <View style={styles.discountBadge}>
          <Ionicons name="pricetag" size={16} color={COLORS.white} />
          <Text style={styles.discountText}>{formatDiscount(voucher)}</Text>
        </View>
        
        <View style={styles.voucherStats}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.statText}>
              {voucher.currentUses}/{voucher.maxUses || '∞'} usos
            </Text>
          </View>
          
          {voucher.validUntil && (
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.statText}>
                Até {new Date(voucher.validUntil).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}
        </View>
        
        {voucher.description && (
          <Text style={styles.voucherDescription} numberOfLines={2}>
            {voucher.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vouchers</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {vouchers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetags-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>Nenhum voucher</Text>
            <Text style={styles.emptyText}>
              Crie vouchers de desconto para seus eventos
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>Criar Voucher</Text>
            </TouchableOpacity>
          </View>
        ) : (
          vouchers.map(renderVoucher)
        )}
      </ScrollView>

      {/* Modal de Criar/Editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingVoucher ? 'Editar Voucher' : 'Novo Voucher'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.modalSave}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Código */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Código do Voucher *</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                placeholder="Ex: DESCONTO10"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="characters"
              />
            </View>

            {/* Tipo de Desconto */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tipo de Desconto *</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    discountType === 'percentage' && styles.segmentButtonActive,
                  ]}
                  onPress={() => setDiscountType('percentage')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      discountType === 'percentage' && styles.segmentTextActive,
                    ]}
                  >
                    Porcentagem (%)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    discountType === 'fixed' && styles.segmentButtonActive,
                  ]}
                  onPress={() => setDiscountType('fixed')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      discountType === 'fixed' && styles.segmentTextActive,
                    ]}
                  >
                    Valor Fixo (R$)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Valor do Desconto */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Valor do Desconto * {discountType === 'percentage' ? '(%)' : '(R$)'}
              </Text>
              <TextInput
                style={styles.input}
                value={discountValue}
                onChangeText={setDiscountValue}
                placeholder={discountType === 'percentage' ? 'Ex: 10' : 'Ex: 25.00'}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Limite de Usos */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Limite de Usos (opcional)</Text>
              <TextInput
                style={styles.input}
                value={maxUses}
                onChangeText={setMaxUses}
                placeholder="Deixe vazio para ilimitado"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
              />
            </View>

            {/* Valor Mínimo */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Valor Mínimo do Pedido (opcional)</Text>
              <TextInput
                style={styles.input}
                value={minOrderValue}
                onChangeText={setMinOrderValue}
                placeholder="Ex: 50.00"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Descrição */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Descrição interna do voucher"
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Ativo */}
            {editingVoucher && (
              <View style={styles.switchRow}>
                <Text style={styles.label}>Voucher Ativo</Text>
                <Switch
                  value={active}
                  onValueChange={setActive}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.white,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SIZES.padding,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginTop: SIZES.padding,
  },
  emptyText: {
    ...FONTS.body3,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: SIZES.padding,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    gap: 8,
  },
  createButtonText: {
    ...FONTS.body2,
    color: COLORS.white,
    fontWeight: '600',
  },
  voucherCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voucherInactive: {
    opacity: 0.6,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voucherCode: {
    ...FONTS.h3,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  inactiveBadge: {
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    ...FONTS.body4,
    color: COLORS.error,
  },
  voucherBody: {
    gap: 8,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  discountText: {
    ...FONTS.body2,
    color: COLORS.white,
    fontWeight: '700',
  },
  voucherStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
  },
  voucherDescription: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
  },
  modalTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  modalSave: {
    ...FONTS.body2,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: SIZES.padding,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    ...FONTS.body3,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...FONTS.body2,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: SIZES.radius - 4,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    ...FONTS.body3,
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
});
