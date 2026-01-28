import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FollowButton } from './FollowButton';

interface PrivateProfileViewProps {
  currentUserId: number;
  targetUserId: number;
  followStatus: 'none' | 'pending' | 'accepted' | null;
  onStatusChange?: (newStatus: string) => void;
}

export const PrivateProfileView: React.FC<PrivateProfileViewProps> = ({
  currentUserId,
  targetUserId,
  followStatus,
  onStatusChange,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed" size={48} color="#666" />
      </View>
      <Text style={styles.title}>Esta conta é privada</Text>
      <Text style={styles.subtitle}>
        Siga esta conta para ver as publicações
      </Text>
      <View style={styles.buttonContainer}>
        <FollowButton
          currentUserId={currentUserId}
          targetUserId={targetUserId}
          initialStatus={followStatus}
          isPrivate={true}
          onStatusChange={onStatusChange}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0D1B2A',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    marginTop: 8,
  },
});

export default PrivateProfileView;
