import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { syncService, SyncStatus } from '../services/syncService';
import { colors } from '../styles/colors';

interface ConnectionStatusProps {
  style?: any;
  showSyncButton?: boolean;
}

export function ConnectionStatus({ style, showSyncButton = true }: ConnectionStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSyncTime: null,
    pendingItems: 0,
  });

  useEffect(() => {
    // Get initial status
    const status = syncService.getSyncStatus();
    setSyncStatus(status);

    // Listen for status changes
    const unsubscribe = syncService.addSyncListener((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  const handleSyncPress = () => {
    if (!syncStatus.isSyncing && syncStatus.isOnline) {
      syncService.forceSyncNow();
    }
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return colors.error;
    if (syncStatus.isSyncing) return colors.warning;
    if (syncStatus.pendingItems > 0) return colors.warning;
    return colors.success;
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing) return 'Sincronizando...';
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} pendente(s)`;
    return 'Online';
  };

  const getLastSyncText = () => {
    if (!syncStatus.lastSyncTime) return '';

    const now = Date.now();
    const diff = now - syncStatus.lastSyncTime;
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes === 0) return 'Agora mesmo';
    if (minutes === 1) return '1 min atrás';
    if (minutes < 60) return `${minutes} min atrás`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hora atrás';
    if (hours < 24) return `${hours} horas atrás`;

    const days = Math.floor(hours / 24);
    return `${days} dia(s) atrás`;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>

        {syncStatus.isSyncing && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loadingIndicator}
          />
        )}

        {showSyncButton && syncStatus.isOnline && !syncStatus.isSyncing && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncPress}
          >
            <Text style={styles.syncButtonText}>Sync</Text>
          </TouchableOpacity>
        )}
      </View>

      {syncStatus.lastSyncTime && (
        <Text style={styles.lastSyncText}>
          Última sync: {getLastSyncText()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  syncButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  syncButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  lastSyncText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 16,
  },
});

export default ConnectionStatus;