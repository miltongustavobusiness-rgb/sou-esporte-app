import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import ReportModal from './ReportModal';

interface PostOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: number;
  authorId: number;
  onDelete?: () => Promise<boolean>;
  onReport?: () => void;
}

export default function PostOptionsModal({ 
  visible, 
  onClose, 
  postId, 
  authorId,
  onDelete,
  onReport 
}: PostOptionsModalProps) {
  const { user } = useApp();
  const { showToast } = useToast();
  const [showReportModal, setShowReportModal] = useState(false);
  
  const isOwner = user?.id === authorId;

  const handleDelete = () => {
    Alert.alert(
      'Excluir publicação',
      'Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            if (onDelete) {
              const success = await onDelete();
              if (success) {
                showToast('Publicação excluída', 'success');
                onClose();
              } else {
                showToast('Erro ao excluir publicação', 'error');
              }
            }
          }
        },
      ]
    );
  };

  const handleReport = () => {
    if (onReport) {
      onReport();
    } else {
      onClose();
      setTimeout(() => {
        setShowReportModal(true);
      }, 300);
    }
  };

  const handleCopyLink = () => {
    // TODO: Implement copy link functionality
    showToast('Link copiado!', 'success');
    onClose();
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    showToast('Compartilhamento em breve!', 'info');
    onClose();
  };

  const handleHide = () => {
    // TODO: Implement hide post functionality
    showToast('Publicação ocultada', 'success');
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.handle} />
            </View>

            {/* Options */}
            <View style={styles.options}>
              {/* Share */}
              <TouchableOpacity style={styles.option} onPress={handleShare}>
                <View style={styles.optionIcon}>
                  <Ionicons name="share-outline" size={22} color={COLORS.text} />
                </View>
                <Text style={styles.optionText}>Compartilhar</Text>
              </TouchableOpacity>

              {/* Copy Link */}
              <TouchableOpacity style={styles.option} onPress={handleCopyLink}>
                <View style={styles.optionIcon}>
                  <Ionicons name="link-outline" size={22} color={COLORS.text} />
                </View>
                <Text style={styles.optionText}>Copiar link</Text>
              </TouchableOpacity>

              {/* Hide (only for non-owners) */}
              {!isOwner && (
                <TouchableOpacity style={styles.option} onPress={handleHide}>
                  <View style={styles.optionIcon}>
                    <Ionicons name="eye-off-outline" size={22} color={COLORS.text} />
                  </View>
                  <Text style={styles.optionText}>Ocultar publicação</Text>
                </TouchableOpacity>
              )}

              {/* Report (only for non-owners) */}
              {!isOwner && (
                <TouchableOpacity style={styles.option} onPress={handleReport}>
                  <View style={[styles.optionIcon, styles.dangerIcon]}>
                    <Ionicons name="flag-outline" size={22} color="#ef4444" />
                  </View>
                  <Text style={[styles.optionText, styles.dangerText]}>Denunciar</Text>
                </TouchableOpacity>
              )}

              {/* Delete (only for owners) */}
              {isOwner && (
                <TouchableOpacity style={styles.option} onPress={handleDelete}>
                  <View style={[styles.optionIcon, styles.dangerIcon]}>
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                  </View>
                  <Text style={[styles.optionText, styles.dangerText]}>Excluir publicação</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="post"
        targetId={postId}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  options: {
    paddingHorizontal: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  optionText: {
    fontSize: 15,
    color: COLORS.text,
  },
  dangerText: {
    color: '#ef4444',
  },
  cancelButton: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
});
