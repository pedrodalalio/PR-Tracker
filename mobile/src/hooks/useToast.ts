import Toast from 'react-native-toast-message';

export interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
  position?: 'top' | 'bottom';
}

export const useToast = () => {
  const showToast = ({
    type = 'info',
    title,
    message,
    duration = 4000,
    position = 'top'
  }: ToastOptions) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
      visibilityTime: duration,
      position,
    });
  };

  const showSuccess = (message: string, title?: string) => {
    showToast({
      type: 'success',
      title: title || 'Sucesso',
      message,
    });
  };

  const showError = (message: string, title?: string) => {
    showToast({
      type: 'error',
      title: title || 'Erro',
      message,
    });
  };

  const showWarning = (message: string, title?: string) => {
    showToast({
      type: 'warning',
      title: title || 'Atenção',
      message,
    });
  };

  const showInfo = (message: string, title?: string) => {
    showToast({
      type: 'info',
      title: title || 'Informação',
      message,
    });
  };

  const hideToast = () => {
    Toast.hide();
  };

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
  };
};