import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, RADIUS, SHADOWS, SIZES } from '../constants/theme';
import { useApp } from '../contexts/AppContext';

const { width } = Dimensions.get('window');

type ModeSelectionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ModeSelection'>;
};

export default function ModeSelectionScreen({ navigation }: ModeSelectionScreenProps) {
  const { setMode } = useApp();

  const handleSelectMode = (mode: 'athlete' | 'organizer') => {
    setMode(mode);
    if (mode === 'athlete') {
      navigation.replace('Feed');
    } else {
      navigation.replace('OrganizerHome');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <LinearGradient
        colors={[COLORS.background, '#1a2744', COLORS.background]}
        style={styles.gradient}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Como você quer usar o</Text>
          <Text style={styles.titleBrand}>Sou Esporte?</Text>
          <Text style={styles.subtitle}>
            Você pode alternar entre os modos a qualquer momento
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelectMode('athlete')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="fitness" size={48} color={COLORS.white} />
              </View>
              <Text style={styles.cardTitle}>Sou Atleta</Text>
              <Text style={styles.cardDescription}>
                Encontre corridas, inscreva-se em eventos e acompanhe seus resultados
              </Text>
              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelectMode('organizer')}
            activeOpacity={0.9}
          >
            <View style={styles.cardOutline}>
              <View style={styles.iconContainerOutline}>
                <Ionicons name="business" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitleOutline}>Sou Organizador</Text>
              <Text style={styles.cardDescriptionOutline}>
                Crie eventos, gerencie inscrições e publique resultados
              </Text>
              <View style={styles.cardArrowOutline}>
                <Ionicons name="arrow-forward" size={24} color={COLORS.primary} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Ao continuar, você concorda com nossos{' '}
            <Text style={styles.footerLink}>Termos de Uso</Text> e{' '}
            <Text style={styles.footerLink}>Política de Privacidade</Text>
          </Text>
        </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 180,
    height: 70,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: SIZES.h3,
    color: COLORS.text,
  },
  titleBrand: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  subtitle: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  card: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.dark,
  },
  cardGradient: {
    padding: SPACING.lg,
    minHeight: 160,
  },
  cardOutline: {
    padding: SPACING.lg,
    minHeight: 160,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(132, 204, 22, 0.05)',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainerOutline: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  cardTitleOutline: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardDescription: {
    fontSize: SIZES.body5,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  cardDescriptionOutline: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  cardArrow: {
    position: 'absolute',
    right: SPACING.lg,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  cardArrowOutline: {
    position: 'absolute',
    right: SPACING.lg,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  footer: {
    paddingVertical: SPACING.xl,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
