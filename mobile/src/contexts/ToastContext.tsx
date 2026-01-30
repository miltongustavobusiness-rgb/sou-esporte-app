import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import Toast from 'react-native-toast-message';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // Map our types to react-native-toast-message types
    let toastType: 'success' | 'error' | 'info' = 'info';
    let title = '';
    
    switch (type) {
      case 'success':
        toastType = 'success';
        title = 'Sucesso';
        break;
      case 'error':
        toastType = 'error';
        title = 'Erro';
        break;
      case 'warning':
        toastType = 'error'; // Use error style for warning
        title = '⚠️ Aviso';
        break;
      case 'info':
      default:
        toastType = 'info';
        title = 'Info';
        break;
    }

    Toast.show({
      type: toastType,
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 50,
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
