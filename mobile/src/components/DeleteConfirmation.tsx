import React from 'react';
import { Alert } from 'react-native';

interface DeleteConfirmationOptions {
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const showDeleteConfirmation = ({
  title = 'Confirmar exclusão',
  message = 'Tem certeza que deseja excluir? Itens excluídos não podem ser restaurados.',
  onConfirm,
  onCancel,
}: DeleteConfirmationOptions) => {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'Cancelar',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
};

// Specific delete confirmations
export const confirmDeleteConversation = (onConfirm: () => void, onCancel?: () => void) => {
  showDeleteConfirmation({
    title: 'Confirmar exclusão',
    message: 'Tem certeza que deseja excluir esta conversa? Conversas excluídas não podem ser restauradas.',
    onConfirm,
    onCancel,
  });
};

export const confirmDeleteMessage = (onConfirm: () => void, onCancel?: () => void) => {
  showDeleteConfirmation({
    title: 'Confirmar exclusão',
    message: 'Tem certeza que deseja excluir esta mensagem? Mensagens excluídas não podem ser restauradas.',
    onConfirm,
    onCancel,
  });
};

export const confirmDeletePost = (onConfirm: () => void, onCancel?: () => void) => {
  showDeleteConfirmation({
    title: 'Confirmar exclusão',
    message: 'Tem certeza que deseja excluir esta publicação? Publicações excluídas não podem ser restauradas.',
    onConfirm,
    onCancel,
  });
};

export const confirmDeleteComment = (onConfirm: () => void, onCancel?: () => void) => {
  showDeleteConfirmation({
    title: 'Confirmar exclusão',
    message: 'Tem certeza que deseja excluir este comentário? Comentários excluídos não podem ser restaurados.',
    onConfirm,
    onCancel,
  });
};

export default { 
  showDeleteConfirmation, 
  confirmDeleteConversation, 
  confirmDeleteMessage,
  confirmDeletePost,
  confirmDeleteComment,
};
