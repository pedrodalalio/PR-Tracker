import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { goalsApi } from '../services/api';
import { UserGoals, StreakInfo } from '../types/workout';

export default function GoalSettingsScreen({ navigation }: any) {
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGoalPicker, setShowGoalPicker] = useState(false);

  const goalOptions = [2, 3, 4, 5, 6, 7];

  useEffect(() => {
    loadGoalsData();
  }, []);

  const loadGoalsData = async () => {
    try {
      console.log('Loading goals data...');
      const [goals, streak] = await Promise.all([
        goalsApi.getGoals(),
        goalsApi.getStreakInfo(),
      ]);
      console.log('Goals loaded:', goals);
      console.log('Streak loaded:', streak);
      setUserGoals(goals);
      setStreakInfo(streak);
    } catch (error) {
      console.error('Goals loading error:', error);
      Alert.alert(
        'Connection Error',
        'Failed to load goals data. Please check if the backend server is running.\n\nError: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setLoading(false);
    }
  };

  const updateGoal = async (newGoal: number) => {
    try {
      console.log('Updating goal to:', newGoal);
      setLoading(true);
      const updatedGoals = await goalsApi.updateGoals({ weeklyWorkoutGoal: newGoal });
      console.log('Updated goals received:', updatedGoals);
      setUserGoals(updatedGoals);
      setShowGoalPicker(false);

      // Reload streak info after goal update
      try {
        const newStreakInfo = await goalsApi.getStreakInfo();
        setStreakInfo(newStreakInfo);
      } catch (streakError) {
        console.warn('Failed to update streak info:', streakError);
      }

      Alert.alert(
        'Goal Updated! 🎯',
        `Your new weekly goal is ${newGoal} workouts. Your streak will be recalculated based on this new target.`
      );
    } catch (error) {
      console.error('Failed to update goal:', error);
      Alert.alert('Error', `Failed to update goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const renderGoalPicker = () => (
    <Modal
      visible={showGoalPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowGoalPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choose Weekly Goal</Text>
          <Text style={styles.modalSubtitle}>
            How many workouts do you want to complete each week?
          </Text>

          <View style={styles.goalOptions}>
            {goalOptions.map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.goalOption,
                  userGoals?.weeklyWorkoutGoal === goal && styles.selectedGoalOption
                ]}
                onPress={() => updateGoal(goal)}
                disabled={loading}
              >
                <Text style={[
                  styles.goalOptionText,
                  userGoals?.weeklyWorkoutGoal === goal && styles.selectedGoalOptionText
                ]}>
                  {goal}
                </Text>
                <Text style={[
                  styles.goalOptionLabel,
                  userGoals?.weeklyWorkoutGoal === goal && styles.selectedGoalOptionText
                ]}>
                  workout{goal !== 1 ? 's' : ''}
                </Text>
                {userGoals?.weeklyWorkoutGoal === goal && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color="white" />
                  </View>
                )}
                {loading && (
                  <View style={styles.loadingIndicator}>
                    <Text style={styles.loadingText}>...</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowGoalPicker(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Current Goal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Workout Goal</Text>
        <TouchableOpacity
          style={styles.goalCard}
          onPress={() => setShowGoalPicker(true)}
        >
          <View style={styles.goalCardContent}>
            <View style={styles.goalDisplay}>
              <Text style={styles.goalNumber}>{userGoals?.weeklyWorkoutGoal ?? 3}</Text>
              <Text style={styles.goalLabel}>workouts per week</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </View>
          <Text style={styles.goalDescription}>
            Complete this many workouts each week to maintain your streak
          </Text>
        </TouchableOpacity>
      </View>

      {/* Streak Information */}
      {streakInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streak Statistics</Text>

          <View style={styles.streakGrid}>
            <View style={styles.streakCard}>
              <Ionicons name="flame" size={32} color="#FF6B35" />
              <Text style={styles.streakNumber}>{streakInfo.currentStreak}</Text>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakSubLabel}>weeks</Text>
            </View>

            <View style={styles.streakCard}>
              <Ionicons name="trophy" size={32} color="#FFD700" />
              <Text style={styles.streakNumber}>{streakInfo.bestStreak}</Text>
              <Text style={styles.streakLabel}>Best Streak</Text>
              <Text style={styles.streakSubLabel}>weeks</Text>
            </View>

            <View style={styles.streakCard}>
              <Ionicons name="checkmark-circle" size={32} color="#34C759" />
              <Text style={styles.streakNumber}>{streakInfo.totalWeeksCompleted}</Text>
              <Text style={styles.streakLabel}>Total Weeks</Text>
              <Text style={styles.streakSubLabel}>completed</Text>
            </View>
          </View>

          {/* Current Week Status */}
          <View style={styles.weekStatusCard}>
            <View style={styles.weekStatusHeader}>
              <Text style={styles.weekStatusTitle}>This Week</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: streakInfo.isOnTrack ? '#34C759' : '#FF6B35' }
              ]}>
                <Text style={styles.statusBadgeText}>
                  {streakInfo.isOnTrack ? 'On Track' : 'At Risk'}
                </Text>
              </View>
            </View>
            <Text style={styles.weekStatusDescription}>
              {streakInfo.isOnTrack
                ? 'Great job! You\'ve met your weekly goal.'
                : streakInfo.daysUntilDeadline > 0
                ? `${streakInfo.daysUntilDeadline} days left to save your streak!`
                : 'Week ended - streak may be broken.'
              }
            </Text>
          </View>
        </View>
      )}

      {/* How It Works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How Streaks Work</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.infoText}>
              Complete your weekly goal to maintain your streak
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Weeks run from Monday to Sunday
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="warning" size={20} color="#FF6B35" />
            <Text style={styles.infoText}>
              Miss a week and your streak resets to 0
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="trophy" size={20} color="#FFD700" />
            <Text style={styles.infoText}>
              Your best streak is always remembered
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
      {renderGoalPicker()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  section: {
    margin: 20,
    marginTop: 0,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  goalCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalDisplay: {
    alignItems: 'center',
  },
  goalNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#007AFF',
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  streakGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  streakCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flex: 1,
    marginHorizontal: 4,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 8,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 4,
  },
  streakSubLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  weekStatusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  weekStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  weekStatusDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 12,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxWidth: 350,
    width: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  goalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 25,
  },
  goalOption: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 16,
    padding: 20,
    margin: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  selectedGoalOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  goalOptionText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  selectedGoalOptionText: {
    color: 'white',
  },
  goalOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
  },
  cancelButton: {
    padding: 15,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  loadingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
  },
});