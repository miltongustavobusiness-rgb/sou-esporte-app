import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING } from '../constants/theme';

export default function MyGroupsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Grupos</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.content}>
        <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.title}>Em breve!</Text>
        <Text style={styles.subtitle}>Esta funcionalidade está sendo desenvolvida.</Text>
      </View>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: SPACING.md,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
