import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { workoutApi } from '../services/api';
import { Workout, WorkoutType } from '../types/workout';

interface MarkedDates {
  [key: string]: {
    marked: boolean;
    dotColor?: string;
    selectedColor?: string;
    workoutType?: WorkoutType;
    workoutCount?: number;
  };
}

export default function CalendarProgressScreen({ navigation }: any) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedWorkouts, setSelectedWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkouts();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

  useEffect(() => {
    if (workouts.length > 0) {
      processWorkoutsForCalendar();
    }
  }, [workouts]);

  const loadWorkouts = async () => {
    try {
      const workoutsData = await workoutApi.getWorkouts();
      setWorkouts(workoutsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  };

  const processWorkoutsForCalendar = () => {
    const marked: MarkedDates = {};

    workouts.forEach(workout => {
      const date = workout.date.split('T')[0]; // Get YYYY-MM-DD format

      if (!marked[date]) {
        marked[date] = {
          marked: true,
          dotColor: getWorkoutTypeColor(workout.workoutType),
          workoutType: workout.workoutType,
          workoutCount: 1,
        };
      } else {
        marked[date].workoutCount = (marked[date].workoutCount || 0) + 1;
      }
    });

    setMarkedDates(marked);
  };

  const getWorkoutTypeColor = (type: WorkoutType): string => {
    switch (type) {
      case 'upper': return '#007AFF';
      case 'legs': return '#34C759';
      case 'cardio': return '#FF3B30';
      default: return '#666';
    }
  };

  const getWorkoutTypeIcon = (type: WorkoutType): string => {
    switch (type) {
      case 'upper': return 'body';
      case 'legs': return 'walk';
      case 'cardio': return 'heart';
      default: return 'fitness';
    }
  };

  const onDayPress = (day: DateData) => {
    const dayWorkouts = workouts.filter(workout =>
      workout.date.split('T')[0] === day.dateString
    );

    setSelectedDate(day.dateString);
    setSelectedWorkouts(dayWorkouts);

    // If no workouts on this day, immediately offer to create one
    if (dayWorkouts.length === 0) {
      Alert.alert(
        'Create Workout',
        `No workouts on ${(() => {
          const [year, month, dayNum] = day.dateString.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(dayNum));
          return date.toLocaleDateString();
        })()} Would you like to create one?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Workout',
            onPress: () => navigation.navigate('NewWorkout', { selectedDate: day.dateString })
          }
        ]
      );
    }
  };

  const getWorkoutTypeName = (type: WorkoutType): string => {
    const types = {
      upper: 'Upper Body',
      legs: 'Legs',
      cardio: 'Cardio'
    };
    return types[type];
  };

  const getDayName = (dayKey: string): string => {
    const days = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    return days[dayKey as keyof typeof days] || dayKey;
  };

  const calculateWorkoutStats = (workout: Workout) => {
    let totalVolume = 0;
    let totalSets = 0;

    workout.exercises.forEach(exercise => {
      totalSets += exercise.sets.length;
      exercise.sets.forEach(set => {
        totalVolume += (set.weight || 0) * (set.reps || 0);
      });
    });

    return { totalVolume, totalSets };
  };

  const renderWorkoutCard = (workout: Workout) => {
    const stats = calculateWorkoutStats(workout);

    return (
      <View key={workout.id} style={styles.workoutCard}>
        <View style={styles.workoutHeader}>
          <View style={styles.workoutTitleContainer}>
            <Ionicons
              name={getWorkoutTypeIcon(workout.workoutType) as any}
              size={20}
              color={getWorkoutTypeColor(workout.workoutType)}
            />
            <Text style={styles.workoutTitle}>{workout.name}</Text>
          </View>
          <View style={[styles.workoutTypeBadge, { backgroundColor: getWorkoutTypeColor(workout.workoutType) + '20' }]}>
            <Text style={[styles.workoutTypeBadgeText, { color: getWorkoutTypeColor(workout.workoutType) }]}>
              {getWorkoutTypeName(workout.workoutType)}
            </Text>
          </View>
        </View>

        <View style={styles.workoutStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{workout.exercises.length}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalSets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(stats.totalVolume)}</Text>
            <Text style={styles.statLabel}>Volume (kg)</Text>
          </View>
        </View>

        <View style={styles.exercisesList}>
          {workout.exercises.slice(0, 3).map((exercise, index) => (
            <Text key={index} style={styles.exerciseItem}>
              • {exercise.exercise.name}
            </Text>
          ))}
          {workout.exercises.length > 3 && (
            <Text style={styles.moreExercises}>
              +{workout.exercises.length - 3} more exercises
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.id })}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="arrow-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const getMonthlyStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyWorkouts = workouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate.getMonth() === currentMonth && workoutDate.getFullYear() === currentYear;
    });

    const upperWorkouts = monthlyWorkouts.filter(w => w.workoutType === 'upper').length;
    const legsWorkouts = monthlyWorkouts.filter(w => w.workoutType === 'legs').length;
    const cardioWorkouts = monthlyWorkouts.filter(w => w.workoutType === 'cardio').length;

    return {
      total: monthlyWorkouts.length,
      upper: upperWorkouts,
      legs: legsWorkouts,
      cardio: cardioWorkouts,
    };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  const monthlyStats = getMonthlyStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Calendar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.monthlyStatsContainer}>
          <Text style={styles.monthlyStatsTitle}>This Month</Text>
          <View style={styles.monthlyStatsGrid}>
            <View style={styles.monthlyStatCard}>
              <Text style={styles.monthlyStatNumber}>{monthlyStats.total}</Text>
              <Text style={styles.monthlyStatLabel}>Total Workouts</Text>
            </View>
            <View style={styles.monthlyStatCard}>
              <View style={styles.statTypeRow}>
                <Ionicons name="body" size={16} color="#007AFF" />
                <Text style={styles.monthlyStatTypeNumber}>{monthlyStats.upper}</Text>
              </View>
              <View style={styles.statTypeRow}>
                <Ionicons name="walk" size={16} color="#34C759" />
                <Text style={styles.monthlyStatTypeNumber}>{monthlyStats.legs}</Text>
              </View>
              <View style={styles.statTypeRow}>
                <Ionicons name="heart" size={16} color="#FF3B30" />
                <Text style={styles.monthlyStatTypeNumber}>{monthlyStats.cardio}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={onDayPress}
            markedDates={{
              ...markedDates,
              [new Date().toISOString().split('T')[0]]: {
                ...markedDates[new Date().toISOString().split('T')[0]],
                marked: markedDates[new Date().toISOString().split('T')[0]]?.marked || false,
                dotColor: markedDates[new Date().toISOString().split('T')[0]]?.dotColor,
                today: true,
              },
              [selectedDate]: {
                ...markedDates[selectedDate],
                selected: true,
                selectedColor: '#007AFF',
              },
            }}
            theme={{
              selectedDayBackgroundColor: '#007AFF',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#007AFF',
              todayBackgroundColor: '#E3F2FD',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#00adf5',
              selectedDotColor: '#ffffff',
              arrowColor: '#007AFF',
              monthTextColor: '#2d4150',
              indicatorColor: '#007AFF',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
          />
        </View>

        {selectedDate && selectedWorkouts.length > 0 && (
          <View style={styles.selectedDateContainer}>
            <Text style={styles.selectedDateTitle}>
              Workouts on {(() => {
                const [year, month, day] = selectedDate.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                return date.toLocaleDateString();
              })()}
            </Text>
            {selectedWorkouts.map(renderWorkoutCard)}
          </View>
        )}

        {selectedDate && selectedWorkouts.length === 0 && (
          <View style={styles.noWorkoutsContainer}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.noWorkoutsTitle}>No workouts on this day</Text>
            <TouchableOpacity
              style={styles.addWorkoutButton}
              onPress={() => navigation.navigate('NewWorkout', { selectedDate })}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addWorkoutText}>Add Workout</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button for Today's Workout */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          const today = new Date().toISOString().split('T')[0];
          const todayWorkouts = workouts.filter(workout =>
            workout.date.split('T')[0] === today
          );

          if (todayWorkouts.length > 0) {
            // If there are workouts today, just navigate to calendar view of today
            setSelectedDate(today);
            setSelectedWorkouts(todayWorkouts);
          } else {
            // If no workouts today, create one
            navigation.navigate('NewWorkout', { selectedDate: today });
          }
        }}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  monthlyStatsContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },
  monthlyStatsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  monthlyStatsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  monthlyStatCard: {
    flex: 1,
    alignItems: 'center',
  },
  monthlyStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  monthlyStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  statTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  monthlyStatTypeNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
    color: '#333',
  },
  calendarContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 10,
  },
  selectedDateContainer: {
    margin: 16,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  workoutCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  workoutTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  workoutTypeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  exercisesList: {
    marginBottom: 12,
  },
  exerciseItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  moreExercises: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 4,
  },
  noWorkoutsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
  },
  noWorkoutsTitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 20,
  },
  addWorkoutButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addWorkoutText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});