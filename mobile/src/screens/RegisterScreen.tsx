import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

interface RegisterScreenProps {
  onSuccess: () => void;
  onBackToLogin: () => void;
}

export default function RegisterScreen({
  onSuccess,
  onBackToLogin,
}: RegisterScreenProps) {
  const { register, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const validateForm = () => {
    const newErrors = {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    };

    let hasErrors = false;

    if (!username.trim()) {
      newErrors.username = "Nome de usuário é obrigatório";
      hasErrors = true;
    } else if (username.length < 3) {
      newErrors.username = "Nome de usuário deve ter pelo menos 3 caracteres";
      hasErrors = true;
    } else if (!/^[a-zA-Z0-9]+$/.test(username)) {
      newErrors.username =
        "Nome de usuário deve conter apenas letras e números";
      hasErrors = true;
    }

    if (!email.trim()) {
      newErrors.email = "Email é obrigatório";
      hasErrors = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = "Por favor, insira um email válido";
        hasErrors = true;
      }
    }

    if (!password.trim()) {
      newErrors.password = "Senha é obrigatória";
      hasErrors = true;
    } else if (password.length < 6) {
      newErrors.password = "Senha deve ter pelo menos 6 caracteres";
      hasErrors = true;
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirmação de senha é obrigatória";
      hasErrors = true;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Senhas não coincidem";
      hasErrors = true;
    }

    setErrors(newErrors);

    if (hasErrors) {
      // Show alert with the first error found
      const firstError =
        newErrors.username ||
        newErrors.email ||
        newErrors.password ||
        newErrors.confirmPassword;
      Alert.alert("Erro de Validação", firstError);
      return false;
    }

    return true;
  };

  const clearError = (field: keyof typeof errors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleRegister = async () => {
    const isValid = validateForm();

    if (!isValid) {
      return;
    }

    try {
      const success = await register({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (success) {
        Alert.alert(
          "Conta Criada! 🎉",
          "Sua conta foi criada com sucesso. Você agora está logado!",
          [{ text: "OK", onPress: onSuccess }],
        );
      } else {
        Alert.alert(
          "Erro ao Criar Conta",
          "Não foi possível criar sua conta. Tente novamente."
        );
      }
    } catch (error) {
      console.error("Registration error:", error);

      if (error instanceof Error) {
        Alert.alert("Erro ao Criar Conta", error.message);
      } else {
        Alert.alert(
          "Erro de Conexão",
          "Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.",
        );
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Ionicons name="person-add" size={60} color="#007AFF" />
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>
            Junte-se ao PR Tracker e comece sua jornada fitness
          </Text>
        </View>

        <View style={styles.formSection}>
          {/* Username Field */}
          <View>
            <View
              style={[
                styles.inputContainer,
                errors.username && styles.inputError,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nome de usuário"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  clearError("username");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
            </View>
            {errors.username ? (
              <Text style={styles.errorText}>{errors.username}</Text>
            ) : null}
          </View>

          {/* Email Field */}
          <View>
            <View
              style={[styles.inputContainer, errors.email && styles.inputError]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearError("email");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          {/* Password Field */}
          <View>
            <View
              style={[
                styles.inputContainer,
                errors.password && styles.inputError,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Senha (mín. 6 caracteres)"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  clearError("password");
                }}
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
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          {/* Confirm Password Field */}
          <View>
            <View
              style={[
                styles.inputContainer,
                errors.confirmPassword && styles.inputError,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  clearError("confirmPassword");
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? "Criando conta..." : "Criar Conta"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Ao criar uma conta, você concorda com nossos termos de uso
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: 0,
    left: 0,
    padding: 10,
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
    textAlign: "center",
  },
  formSection: {
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
  registerButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#B0B0B0",
  },
  registerButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },
  inputError: {
    borderColor: "#FF3B30",
    borderWidth: 2,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
    marginLeft: 12,
  },
});
