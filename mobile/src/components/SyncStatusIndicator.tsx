import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { syncService, SyncStatus } from '../services/syncService';

interface SyncStatusIndicatorProps {
  style?: any;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ style }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSyncTime: null,
    pendingItems: 0
  });

  useEffect(() => {
    const unsubscribe = syncService.addSyncListener(setSyncStatus);

    // Get initial status
    const initialStatus = syncService.getSyncStatus();
    setSyncStatus(initialStatus);

    // Get pending items count
    syncService.getPendingItemsCount().then(count => {
      setSyncStatus(prev => ({ ...prev, pendingItems: count }));
    });

    return unsubscribe;
  }, []);

  const handleSyncPress = async () => {
    if (syncStatus.isOnline && !syncStatus.isSyncing) {
      await syncService.forceSyncNow();
    }
  };

  const getStatusColor = () => {
    if (syncStatus.isSyncing) return '#FF9500'; // Orange
    if (!syncStatus.isOnline) return '#FF3B30'; // Red
    if (syncStatus.pendingItems > 0) return '#FF9500'; // Orange
    return '#34C759'; // Green
  };

  const getIconColor = () => {
    return 'white'; // Always white for better contrast on the glass background
  };

  const getStatusIcon = () => {
    if (syncStatus.isSyncing) return 'sync';
    if (!syncStatus.isOnline) return 'cloud-offline';
    if (syncStatus.pendingItems > 0) return 'cloud-upload';
    return 'cloud-done';
  };

  const getStatusText = () => {
    if (syncStatus.isSyncing) return 'Syncing...';
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} pending`;
    return 'Synced';
  };

  const getLastSyncText = () => {
    if (!syncStatus.lastSyncTime) return 'Never synced';
    const date = new Date(syncStatus.lastSyncTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: `${getStatusColor()}20`, // 20% opacity of status color
          borderColor: `${getStatusColor()}40`, // 40% opacity for border
        },
        style
      ]}
      onPress={handleSyncPress}
      disabled={syncStatus.isSyncing || !syncStatus.isOnline}
    >
      <View style={styles.content}>
        <Ionicons
          name={getStatusIcon() as any}
          size={14}
          color={getIconColor()}
          style={[
            styles.icon,
            syncStatus.isSyncing && styles.spinning
          ]}
        />
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>
            {getStatusText()}
          </Text>
          <Text style={styles.lastSyncText}>
            {getLastSyncText()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
  spinning: {
    // Add rotation animation if needed
  },
  textContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  lastSyncText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
    textAlign: 'center',
  },
});