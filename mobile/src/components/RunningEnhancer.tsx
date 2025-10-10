import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RunningEnhancerProps {
  visible: boolean;
  onClose: () => void;
  onSaveRun: (runData: {
    distance: number;
    duration: number;
    pace: number;
    notes?: string;
    heartRateZone?: string;
    splits?: Array<{ distance: number; time: number; pace: number }>;
  }) => void;
}

export default function RunningEnhancer({ visible, onClose, onSaveRun }: RunningEnhancerProps) {
  const [distance, setDistance] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [heartRateZone, setHeartRateZone] = useState('');
  const [splits, setSplits] = useState<Array<{ distance: number; time: number; pace: number }>>([]);
  const [showSplitsModal, setShowSplitsModal] = useState(false);

  const calculatePace = (distanceKm: number, timeSeconds: number): number => {
    if (distanceKm <= 0 || timeSeconds <= 0) return 0;
    return timeSeconds / 60 / distanceKm; // minutes per km
  };

  const formatPace = (pace: number): string => {
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace % 1) * 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
  };

  const parseTimeInput = (timeString: string): number => {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return (parseFloat(timeString) || 0) * 60;
  };

  const formatTimeInput = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(Math.round(remainingSeconds)).padStart(2, '0')}`;
  };

  const handleSave = () => {
    const distanceNum = parseFloat(distance);
    const timeNum = parseTimeInput(time);

    if (!distanceNum || !timeNum) {
      Alert.alert('Error', 'Please enter both distance and time');
      return;
    }

    const pace = calculatePace(distanceNum, timeNum);

    onSaveRun({
      distance: distanceNum * 1000, // Convert to meters
      duration: timeNum,
      pace,
      notes: notes || undefined,
      heartRateZone: heartRateZone || undefined,
      splits: splits.length > 0 ? splits : undefined,
    });

    // Reset form
    setDistance('');
    setTime('');
    setNotes('');
    setHeartRateZone('');
    setSplits([]);
    onClose();
  };

  const getCurrentPace = () => {
    const distanceNum = parseFloat(distance);
    const timeNum = parseTimeInput(time);
    if (distanceNum && timeNum) {
      return calculatePace(distanceNum, timeNum);
    }
    return 0;
  };

  const addSplit = () => {
    const splitDistance = 1; // 1km splits
    const splitTime = 300; // 5 minutes default
    const splitPace = calculatePace(splitDistance, splitTime);

    setSplits([...splits, { distance: splitDistance, time: splitTime, pace: splitPace }]);
  };

  const heartRateZones = [
    { name: 'Zone 1 - Recovery', range: '50-60% Max HR', color: '#34C759' },
    { name: 'Zone 2 - Aerobic Base', range: '60-70% Max HR', color: '#007AFF' },
    { name: 'Zone 3 - Aerobic', range: '70-80% Max HR', color: '#FF9500' },
    { name: 'Zone 4 - Threshold', range: '80-90% Max HR', color: '#FF3B30' },
    { name: 'Zone 5 - Neuromuscular', range: '90-100% Max HR', color: '#AF52DE' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Enhanced Running Log</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Run Details</Text>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Distance (km)</Text>
                <TextInput
                  style={styles.input}
                  value={distance}
                  onChangeText={setDistance}
                  placeholder="5.0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Time (MM:SS)</Text>
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="25:00"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {getCurrentPace() > 0 && (
              <View style={styles.paceDisplay}>
                <Ionicons name="speedometer" size={20} color="#007AFF" />
                <Text style={styles.paceText}>
                  Pace: {formatPace(getCurrentPace())}
                </Text>
              </View>
            )}
          </View>

          {/* Heart Rate Zone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Heart Rate Zone (Optional)</Text>
            <View style={styles.heartRateZones}>
              {heartRateZones.map((zone, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.zoneButton,
                    heartRateZone === zone.name && { backgroundColor: zone.color },
                  ]}
                  onPress={() => setHeartRateZone(heartRateZone === zone.name ? '' : zone.name)}
                >
                  <Text
                    style={[
                      styles.zoneButtonText,
                      heartRateZone === zone.name && { color: 'white' },
                    ]}
                  >
                    Zone {index + 1}
                  </Text>
                  <Text
                    style={[
                      styles.zoneRange,
                      heartRateZone === zone.name && { color: 'white' },
                    ]}
                  >
                    {zone.range}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did the run feel? Weather conditions, route notes..."
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Advanced Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Advanced Features</Text>

            <TouchableOpacity style={styles.featureButton} onPress={() => setShowSplitsModal(true)}>
              <Ionicons name="timer" size={20} color="#007AFF" />
              <Text style={styles.featureButtonText}>Add Splits ({splits.length})</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.featureButton} disabled>
              <Ionicons name="location" size={20} color="#ccc" />
              <Text style={[styles.featureButtonText, { color: '#ccc' }]}>GPS Tracking (Coming Soon)</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  paceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  paceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  heartRateZones: {
    gap: 8,
  },
  zoneButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  zoneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  zoneRange: {
    fontSize: 12,
    color: '#666',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
});