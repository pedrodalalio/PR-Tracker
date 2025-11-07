import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast, InfoToast, ToastConfig } from 'react-native-toast-message';

const styles = StyleSheet.create({
  base: {
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  successToast: {
    backgroundColor: '#F0F9FF',
    borderLeftColor: '#10B981',
  },
  successTitle: {
    color: '#065F46',
  },
  successMessage: {
    color: '#047857',
  },
  errorToast: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#EF4444',
  },
  errorTitle: {
    color: '#991B1B',
  },
  errorMessage: {
    color: '#DC2626',
  },
  warningToast: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#F59E0B',
  },
  warningTitle: {
    color: '#92400E',
  },
  warningMessage: {
    color: '#D97706',
  },
  infoToast: {
    backgroundColor: '#F0F9FF',
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    color: '#1E40AF',
  },
  infoMessage: {
    color: '#2563EB',
  },
});

export const toastConfig: ToastConfig = {
  success: ({ text1, text2 }) => (
    <View style={[styles.base, styles.successToast]}>
      {text1 && <Text style={[styles.title, styles.successTitle]}>{text1}</Text>}
      {text2 && <Text style={[styles.message, styles.successMessage]}>{text2}</Text>}
    </View>
  ),

  error: ({ text1, text2 }) => (
    <View style={[styles.base, styles.errorToast]}>
      {text1 && <Text style={[styles.title, styles.errorTitle]}>{text1}</Text>}
      {text2 && <Text style={[styles.message, styles.errorMessage]}>{text2}</Text>}
    </View>
  ),

  warning: ({ text1, text2 }) => (
    <View style={[styles.base, styles.warningToast]}>
      {text1 && <Text style={[styles.title, styles.warningTitle]}>{text1}</Text>}
      {text2 && <Text style={[styles.message, styles.warningMessage]}>{text2}</Text>}
    </View>
  ),

  info: ({ text1, text2 }) => (
    <View style={[styles.base, styles.infoToast]}>
      {text1 && <Text style={[styles.title, styles.infoTitle]}>{text1}</Text>}
      {text2 && <Text style={[styles.message, styles.infoMessage]}>{text2}</Text>}
    </View>
  ),
};