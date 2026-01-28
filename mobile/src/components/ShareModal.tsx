import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface ShareOption {
  id: string;
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  postId: number;
  postContent: string;
  postAuthor: string;
  onShareToFeed?: () => void;
  onShareComplete?: () => void;
}

export default function ShareModal({
  visible,
  onClose,
  postId,
  postContent,
  postAuthor,
  onShareToFeed,
  onShareComplete,
}: ShareModalProps) {
  
  // Generate share URL (deep link)
  const shareUrl = `https://souesporte.app/post/${postId}`;
  const shareText = `${postAuthor}: "${postContent.substring(0, 100)}${postContent.length > 100 ? '...' : ''}"`;
  const fullShareText = `${shareText}\n\n${shareUrl}`;

  // Share via system share sheet
  const handleSystemShare = async () => {
    try {
      const result = await Share.share({
        message: fullShareText,
        url: shareUrl, // iOS only
        title: 'Compartilhar post',
      });
      
      if (result.action === Share.sharedAction) {
        onShareComplete?.();
      }
      onClose();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Share to WhatsApp
  const handleWhatsAppShare = async () => {
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(fullShareText)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        onShareComplete?.();
      } else {
        // Fallback to web WhatsApp
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(fullShareText)}`);
        onShareComplete?.();
      }
      onClose();
    } catch (error) {
      console.error('Error sharing to WhatsApp:', error);
      // Try system share as fallback
      handleSystemShare();
    }
  };

  // Share to Instagram Stories
  const handleInstagramShare = async () => {
    // Instagram doesn't support direct text sharing, so we use the system share
    // or open Instagram app
    const instagramUrl = 'instagram://app';
    
    try {
      const canOpen = await Linking.canOpenURL(instagramUrl);
      if (canOpen) {
        // Copy text to clipboard and open Instagram
        await Linking.openURL(instagramUrl);
        onShareComplete?.();
      } else {
        // Fallback to system share
        handleSystemShare();
      }
      onClose();
    } catch (error) {
      console.error('Error sharing to Instagram:', error);
      handleSystemShare();
    }
  };

  // Share to Facebook
  const handleFacebookShare = async () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    
    try {
      await Linking.openURL(facebookUrl);
      onShareComplete?.();
      onClose();
    } catch (error) {
      console.error('Error sharing to Facebook:', error);
      handleSystemShare();
    }
  };

  // Share to Twitter/X
  const handleTwitterShare = async () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    
    try {
      await Linking.openURL(twitterUrl);
      onShareComplete?.();
      onClose();
    } catch (error) {
      console.error('Error sharing to Twitter:', error);
      handleSystemShare();
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      // Using Clipboard API
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(shareUrl);
      onShareComplete?.();
      onClose();
    } catch (error) {
      console.error('Error copying link:', error);
      onClose();
    }
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'feed',
      icon: 'repeat',
      label: 'Repostar no Feed',
      color: COLORS.primary,
      onPress: () => {
        onShareToFeed?.();
        onClose();
      },
    },
    {
      id: 'whatsapp',
      icon: 'logo-whatsapp',
      label: 'WhatsApp',
      color: '#25D366',
      onPress: handleWhatsAppShare,
    },
    {
      id: 'instagram',
      icon: 'logo-instagram',
      label: 'Instagram',
      color: '#E4405F',
      onPress: handleInstagramShare,
    },
    {
      id: 'facebook',
      icon: 'logo-facebook',
      label: 'Facebook',
      color: '#1877F2',
      onPress: handleFacebookShare,
    },
    {
      id: 'twitter',
      icon: 'logo-twitter',
      label: 'Twitter/X',
      color: '#1DA1F2',
      onPress: handleTwitterShare,
    },
    {
      id: 'copy',
      icon: 'link',
      label: 'Copiar Link',
      color: COLORS.textSecondary,
      onPress: handleCopyLink,
    },
    {
      id: 'more',
      icon: 'share-outline',
      label: 'Mais opções',
      color: COLORS.textSecondary,
      onPress: handleSystemShare,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Handle bar */}
              <View style={styles.handleBar} />
              
              {/* Title */}
              <Text style={styles.title}>Compartilhar</Text>
              
              {/* Share options grid */}
              <View style={styles.optionsGrid}>
                {shareOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.optionItem}
                    onPress={option.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                      <Ionicons name={option.icon as any} size={24} color={option.color} />
                    </View>
                    <Text style={styles.optionLabel} numberOfLines={1}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Cancel button */}
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl + 20, // Extra padding for safe area
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: SPACING.lg,
  },
  optionItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  optionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
});
