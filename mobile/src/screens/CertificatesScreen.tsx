import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { api, ResultWithDetails } from '../services/api';

import { useToast } from '../contexts/ToastContext';
type CertificatesScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Certificates'>;
};

interface Certificate {
  id: number;
  eventName: string;
  eventDate: string;
  distance: string;
  time: string;
  position: number;
  totalParticipants: number;
  category: string;
  location: string;
  certificateUrl?: string;
}

const formatTime = (seconds: number | null): string => {
  if (!seconds) return '--:--:--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function CertificatesScreen({ navigation }: CertificatesScreenProps) {
  const { showToast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);

  const loadCertificates = useCallback(async () => {
    try {
      const results = await api.getMyResults();
      
      // Filter results that have certificates
      const certs: Certificate[] = results
        .filter(r => r.result.certificateUrl || r.result.status === 'official')
        .map(r => ({
          id: r.result.id,
          eventName: r.event?.name || 'Evento',
          eventDate: formatDate(r.event?.eventDate || new Date().toISOString()),
          distance: r.category?.distance ? `${r.category.distance}K` : 'N/A',
          time: formatTime(r.result.chipTime),
          position: r.result.overallRank || 0,
          totalParticipants: 0,
          category: r.category?.name || 'Geral',
          location: r.event ? `${r.event.city}, ${r.event.state}` : 'Local',
          certificateUrl: r.result.certificateUrl || undefined,
        }));
      
      setCertificates(certs);
      
      // Calculate total distance
      const total = results.reduce((sum, r) => {
        const dist = parseFloat(r.category?.distance || '0');
        return sum + (isNaN(dist) ? 0 : dist);
      }, 0);
      setTotalDistance(total);
    } catch (error) {
      console.error('Error loading certificates:', error);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCertificates();
    setRefreshing(false);
  };

  const handleDownload = async (certificate: Certificate) => {
    setDownloadingId(certificate.id);
    
    try {
      if (certificate.certificateUrl) {
        // Open certificate URL
        showToast('O certificado será aberto no navegador.', 'info');
      } else {
        showToast('O certificado ainda não está disponível para download.', 'warning');
      }
    } catch (error) {
      showToast('Não foi possível baixar o certificado. Tente novamente.', 'info');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShare = async (certificate: Certificate) => {
    try {
      await Share.share({
        message: `🏃‍♂️ Completei ${certificate.distance} na ${certificate.eventName}!\n\n⏱️ Tempo: ${certificate.time}\n🏆 Posição: ${certificate.position > 0 ? `${certificate.position}º` : 'N/A'}\n📍 ${certificate.location}\n\n#SouEsporte #Corrida #Running`,
      });
    } catch (error) {
      console.log('Erro ao compartilhar:', error);
    }
  };

  const renderCertificateCard = (certificate: Certificate) => (
    <View key={certificate.id} style={styles.certificateCard}>
      {/* Header do Certificado */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.cardHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <Ionicons name="ribbon" size={32} color={COLORS.white} />
          <View style={styles.headerText}>
            <Text style={styles.certificateTitle}>CERTIFICADO DE CONCLUSÃO</Text>
            <Text style={styles.eventName}>{certificate.eventName}</Text>
          </View>
        </View>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{certificate.distance}</Text>
        </View>
      </LinearGradient>

      {/* Conteúdo do Certificado */}
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.infoLabel}>Data</Text>
            <Text style={styles.infoValue}>{certificate.eventDate}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.infoLabel}>Local</Text>
            <Text style={styles.infoValue}>{certificate.location}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{certificate.time}</Text>
            <Text style={styles.statLabel}>Tempo</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {certificate.position > 0 ? `${certificate.position}º` : '--'}
            </Text>
            <Text style={styles.statLabel}>Posição</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{certificate.category}</Text>
            <Text style={styles.statLabel}>Categoria</Text>
          </View>
        </View>

        {/* Ações */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDownload(certificate)}
            disabled={downloadingId === certificate.id}
          >
            {downloadingId === certificate.id ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Baixar PDF</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => handleShare(certificate)}
          >
            <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
            <Text style={[styles.actionButtonText, styles.shareButtonText]}>Compartilhar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando certificados...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Certificados</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Resumo */}
      <View style={styles.summaryContainer}>
        <LinearGradient
          colors={[COLORS.card, COLORS.backgroundLight]}
          style={styles.summaryGradient}
        >
          <View style={styles.summaryItem}>
            <Ionicons name="trophy" size={24} color={COLORS.primary} />
            <Text style={styles.summaryValue}>{certificates.length}</Text>
            <Text style={styles.summaryLabel}>Certificados</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="medal" size={24} color={COLORS.warning} />
            <Text style={styles.summaryValue}>{totalDistance}km</Text>
            <Text style={styles.summaryLabel}>Total Percorrido</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Lista de Certificados */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {certificates.length > 0 ? (
          certificates.map(renderCertificateCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum certificado ainda</Text>
            <Text style={styles.emptyText}>
              Complete sua primeira corrida para receber seu certificado de participação!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
  },
  summaryContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  summaryGradient: {
    flexDirection: 'row',
    borderRadius: SIZES.radius,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  certificateCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  certificateTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  eventName: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 2,
  },
  distanceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: SIZES.radius,
  },
  distanceText: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  cardContent: {
    padding: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  infoValue: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
  },
  actionButtonText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  shareButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  shareButtonText: {
    color: COLORS.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xl,
  },
});
