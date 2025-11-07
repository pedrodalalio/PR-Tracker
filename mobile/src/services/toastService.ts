import Toast from 'react-native-toast-message';
import { AxiosError } from 'axios';

export class ToastService {
  static showSuccess(message: string, title?: string) {
    Toast.show({
      type: 'success',
      text1: title || 'Sucesso',
      text2: message,
      visibilityTime: 4000,
      position: 'top',
    });
  }

  static showError(message: string, title?: string) {
    Toast.show({
      type: 'error',
      text1: title || 'Erro',
      text2: message,
      visibilityTime: 5000,
      position: 'top',
    });
  }

  static showWarning(message: string, title?: string) {
    Toast.show({
      type: 'warning',
      text1: title || 'Atenção',
      text2: message,
      visibilityTime: 4000,
      position: 'top',
    });
  }

  static showInfo(message: string, title?: string) {
    Toast.show({
      type: 'info',
      text1: title || 'Informação',
      text2: message,
      visibilityTime: 4000,
      position: 'top',
    });
  }

  static handleApiError(error: any, customMessage?: string) {
    console.error('API Error:', error);

    let errorMessage = customMessage || 'Ocorreu um erro inesperado';
    let errorTitle = 'Erro';

    if (error?.response) {
      // Erro do servidor
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          errorTitle = 'Dados Inválidos';
          if (data?.error) {
            errorMessage = data.error;
          } else if (data?.details && Array.isArray(data.details)) {
            errorMessage = data.details.join(', ');
          } else {
            errorMessage = 'Os dados fornecidos são inválidos';
          }
          break;

        case 401:
          errorTitle = 'Não Autorizado';
          errorMessage = data?.error || 'Você precisa fazer login novamente';
          break;

        case 403:
          errorTitle = 'Acesso Negado';
          errorMessage = data?.error || 'Você não tem permissão para esta ação';
          break;

        case 404:
          errorTitle = 'Não Encontrado';
          errorMessage = data?.error || 'O recurso solicitado não foi encontrado';
          break;

        case 409:
          errorTitle = 'Conflito';
          errorMessage = data?.error || 'Já existe um registro com essas informações';
          break;

        case 422:
          errorTitle = 'Dados Inválidos';
          if (data?.errors && Array.isArray(data.errors)) {
            errorMessage = data.errors.map((err: any) => err.message || err).join(', ');
          } else {
            errorMessage = data?.error || 'Os dados fornecidos são inválidos';
          }
          break;

        case 500:
          errorTitle = 'Erro do Servidor';
          errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
          break;

        default:
          errorTitle = `Erro ${status}`;
          errorMessage = data?.error || `Erro HTTP ${status}`;
      }
    } else if (error?.request) {
      // Erro de rede
      errorTitle = 'Erro de Conexão';
      errorMessage = 'Verifique sua conexão com a internet e tente novamente';
    } else if (error?.message) {
      // Outros erros
      errorMessage = error.message;
    }

    this.showError(errorMessage, errorTitle);
  }

  static handleValidationError(errors: string | string[]) {
    const errorMessage = Array.isArray(errors) ? errors.join(', ') : errors;
    this.showError(errorMessage, 'Erro de Validação');
  }

  static hide() {
    Toast.hide();
  }
}