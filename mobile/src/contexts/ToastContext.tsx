import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View } from 'react-native';
import Toast, { ToastType } from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<ToastState>({
    visible: false as boolean,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // Ensure strict boolean typing for Fabric compatibility
    setToast({
      visible: true as boolean,
      message: String(message || ''),
      type: type || 'info',
    });
  }, []);

  const hideToast = useCallback(() => {
    // Ensure strict boolean typing for Fabric compatibility
    setToast(prev => ({ ...prev, visible: false as boolean }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={Boolean(toast.visible)}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
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
