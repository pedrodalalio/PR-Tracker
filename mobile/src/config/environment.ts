import { Platform } from "react-native";

export type Environment = "development" | "production";

export interface EnvironmentConfig {
  environment: Environment;
  apiBaseUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Detecta automaticamente o ambiente baseado em múltiplos fatores:
 *
 * DESENVOLVIMENTO (__DEV__ = true):
 * - Modo Metro bundler (expo start, npx react-native start)
 * - Debug builds
 * - Emulador/Simulator conectado via USB/network
 *
 * PRODUÇÃO (__DEV__ = false):
 * - APK/IPA builds (expo build, eas build)
 * - Play Store / App Store builds
 * - Standalone apps instalados
 *
 * COMO FUNCIONA:
 * - __DEV__ é automaticamente `false` quando você faz build (eas build, expo build)
 * - __DEV__ é `true` apenas durante desenvolvimento com Metro bundler
 * - Você pode forçar um ambiente específico definindo FORCE_ENVIRONMENT
 */
const getEnvironmentConfig = (): EnvironmentConfig => {
  // Verificar se há uma variável de ambiente forçada (útil para testes)
  // @ts-ignore - process.env pode não estar disponível
  const forceEnv = process.env?.FORCE_ENVIRONMENT;

  // Lógica principal: __DEV__ é false em builds de produção
  let isDevelopment = __DEV__;

  // Override se forçado via variável de ambiente
  if (forceEnv === "production") {
    isDevelopment = false;
  } else if (forceEnv === "development") {
    isDevelopment = true;
  }

  const environment: Environment = isDevelopment ? "development" : "production";
  let apiBaseUrl: string;

  if (isDevelopment) {
    // DESENVOLVIMENTO: URLs locais baseadas na plataforma

    // Para testar em dispositivo físico, descomente e coloque o IP da sua máquina:
    // const LOCAL_IP = '192.168.1.100'; // Substitua pelo seu IP local
    // apiBaseUrl = `http://${LOCAL_IP}:3000/api`;

    if (Platform.OS === "android") {
      // Android Emulator: 10.0.2.2 mapeia para localhost da máquina host
      apiBaseUrl = "http://10.0.2.2:3000/api";

      // Para Android físico, descomente a linha abaixo e comente a de cima:
      // apiBaseUrl = `http://${LOCAL_IP}:3000/api`;
    } else if (Platform.OS === "ios") {
      // iOS Simulator: localhost funciona diretamente
      apiBaseUrl = "http://localhost:3000/api";

      // Para iOS físico, descomente a linha abaixo e comente a de cima:
      // apiBaseUrl = `http://${LOCAL_IP}:3000/api`;
    } else {
      // Fallback para outras plataformas
      apiBaseUrl = "http://localhost:3000/api";
    }
  } else {
    // PRODUÇÃO: URL do servidor de produção
    // Este é usado quando você faz build do app (APK/IPA)
    apiBaseUrl = "https://pr-tracker-nb87.onrender.com/api";
  }

  return {
    environment,
    apiBaseUrl,
    isDevelopment,
    isProduction: !isDevelopment,
  };
};

export const ENV_CONFIG = getEnvironmentConfig();
