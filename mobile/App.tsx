import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Toast from "react-native-toast-message";
import AppNavigator from "./src/navigation/AppNavigator";
import { appInitializer } from "./src/services/appInitializer";
import { AuthProvider } from "./src/contexts/AuthContext";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(false);
      } catch (err) {
        console.error("Initialization error:", err);
        // Even if there's an error, allow the app to continue for demo mode
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Starting app...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
      <Toast />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF3B30",
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    fontStyle: "italic",
  },
});
