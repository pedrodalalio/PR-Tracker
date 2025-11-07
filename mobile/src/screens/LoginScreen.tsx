import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ToastService } from "../services/toastService";

interface LoginScreenProps {
  onLogin: (
    type: "admin" | "guest",
    credentials?: { username: string; password: string },
  ) => Promise<boolean>;
  onShowRegister?: () => void;
}

export default function LoginScreen({
  onLogin,
  onShowRegister,
}: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async () => {
    if (!username.trim() || !password.trim()) {
      ToastService.showError("Por favor, insira usuário e senha", "Campos obrigatórios");
      return;
    }

    setIsLoading(true);
    try {
      const success = await onLogin("admin", { username, password });
      if (!success) {
        // O error já foi tratado pelo ToastService no AuthContext
        // Não precisamos mostrar mensagem adicional aqui
      }
    } catch (error) {
      console.error("Login error:", error);
      ToastService.showError(
        "Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.",
        "Erro de Conexão"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      const success = await onLogin("guest");
      if (!success) {
        Alert.alert(
          "Erro",
          "Não foi possível iniciar o modo demo. Tente novamente.",
        );
      }
    } catch (error) {
      console.error("Error during guest login:", error);
      Alert.alert(
        "Erro",
        "Não foi possível iniciar o modo demo. Tente novamente.",
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Ionicons name="fitness" size={60} color="#007AFF" />
        <Text style={styles.title}>PR Tracker</Text>
        <Text style={styles.subtitle}>Acompanhe sua jornada fitness</Text>
      </View>

      <View style={styles.loginSection}>
        <Text style={styles.sectionTitle}>Login</Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="person-outline"
            size={20}
            color="#666"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Usuário ou Email"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#666"
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, styles.adminButton]}
          onPress={handleAdminLogin}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? "Entrando..." : "Entrar"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OU</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.guestSection}>
        <Text style={styles.sectionTitle}>Experimentar Demo</Text>
        <Text style={styles.guestDescription}>
          Explore o app com dados de exemplo - perfeito para visualizar o
          portfólio
        </Text>

        <TouchableOpacity
          style={[styles.loginButton, styles.guestButton]}
          onPress={handleGuestLogin}
        >
          <Ionicons
            name="eye-outline"
            size={20}
            color="#FFF"
            style={styles.buttonIcon}
          />
          <Text style={styles.loginButtonText}>Ver Demo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Este app faz parte do meu portfólio. Use o modo demo para explorar as
          funcionalidades.
        </Text>

        {onShowRegister && (
          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={onShowRegister}
          >
            <Text style={styles.createAccountText}>
              Não tem uma conta?{" "}
              <Text style={styles.createAccountLink}>Criar conta</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8F9FA",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  loginSection: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 15,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#FFF",
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#1A1A1A",
  },
  passwordInput: {
    paddingRight: 45,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    padding: 5,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  adminButton: {
    backgroundColor: "#007AFF",
  },
  guestButton: {
    backgroundColor: "#34C759",
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 15,
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  guestSection: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guestDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 20,
  },
  footer: {
    marginTop: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },
  createAccountButton: {
    marginTop: 20,
    padding: 15,
  },
  createAccountText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  createAccountLink: {
    color: "#007AFF",
    fontWeight: "600",
  },
});
