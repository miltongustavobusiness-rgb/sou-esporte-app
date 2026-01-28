import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { ApiService } from '../services/api';

interface FollowButtonProps {
  currentUserId: number;
  targetUserId: number;
  initialStatus: 'none' | 'pending' | 'accepted' | null;
  isPrivate?: boolean;
  onStatusChange?: (newStatus: string) => void;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  currentUserId,
  targetUserId,
  initialStatus,
  isPrivate = false,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (status === 'accepted') {
        // Unfollow
        Alert.alert(
          'Deixar de seguir',
          'Tem certeza que deseja deixar de seguir este usuário?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setLoading(false) },
            {
              text: 'Deixar de seguir',
              style: 'destructive',
              onPress: async () => {
                await ApiService.unfollowUser({ followerId: currentUserId, followingId: targetUserId });
                setStatus(null);
                onStatusChange?.('none');
                setLoading(false);
              },
            },
          ]
        );
        return;
      }

      if (status === 'pending') {
        // Cancel request
        await ApiService.cancelFollowRequest({ followerId: currentUserId, followingId: targetUserId });
        setStatus(null);
        onStatusChange?.('none');
      } else {
        // Send follow request
        const result = await ApiService.followRequest({ followerId: currentUserId, followingId: targetUserId });
        setStatus(result.status);
        onStatusChange?.(result.status);
      }
    } catch (error) {
      console.error('Error handling follow:', error);
      Alert.alert('Erro', 'Não foi possível completar a ação');
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyle = () => {
    if (status === 'accepted') return styles.followingButton;
    if (status === 'pending') return styles.pendingButton;
    return styles.followButton;
  };

  const getButtonText = () => {
    if (status === 'accepted') return 'Seguindo';
    if (status === 'pending') return 'Solicitado';
    return 'Seguir';
  };

  const getTextStyle = () => {
    if (status === 'accepted' || status === 'pending') return styles.secondaryText;
    return styles.primaryText;
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle()]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={status ? '#888' : '#0D1B2A'} />
      ) : (
        <Text style={getTextStyle()}>{getButtonText()}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  followButton: {
    backgroundColor: '#C8FA1E',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  pendingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#C8FA1E',
  },
  primaryText: {
    color: '#0D1B2A',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default FollowButton;
