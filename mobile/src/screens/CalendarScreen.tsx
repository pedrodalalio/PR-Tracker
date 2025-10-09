import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { workoutApi } from '../services/api';
import { Workout, WorkoutType } from '../types/workout';

const { width } = Dimensions.get('window');

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  workouts: Workout[];
}

export default function CalendarScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadWorkouts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

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

  const getWorkoutTypeColor = (type: WorkoutType): string => {
    switch (type) {
      case 'upper':
        return '#007AFF';
      case 'legs':
        return '#34C759';
      case 'cardio':
        return '#FF3B30';
    }
  };

  const getWorkoutTypeIcon = (type: WorkoutType): string => {
    switch (type) {
      case 'upper':
        return 'body';
      case 'legs':
        return 'walk';
      case 'cardio':
        return 'heart';
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const startDay = firstDay.getDay();

    const days: CalendarDay[] = [];

    // Add days from previous month to fill the first week
    for (let i = startDay; i > 0; i--) {
      const date = new Date(year, month, 1 - i);
      days.push({
        date,
        isCurrentMonth: false,
        workouts: getWorkoutsForDate(date),
      });
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        workouts: getWorkoutsForDate(date),
      });
    }

    // Add days from next month to fill the last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        workouts: getWorkoutsForDate(date),
      });
    }

    return days;
  };

  const getWorkoutsForDate = (date: Date): Workout[] => {
    const dateString = date.toISOString().split('T')[0];
    return workouts.filter(workout => {
      const workoutDate = new Date(workout.date).toISOString().split('T')[0];
      return workoutDate === dateString;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatMonthYear = (): string => {
    return currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const renderCalendarDay = (calendarDay: CalendarDay, index: number) => {
    const { date, isCurrentMonth, workouts } = calendarDay;
    const dayNumber = date.getDate();
    const today = isToday(date);

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayContainer,
          !isCurrentMonth && styles.dayContainerInactive,
          today && styles.dayContainerToday,
        ]}
        onPress={() => {
          if (workouts.length > 0) {
            // Could navigate to workout details or show modal
            Alert.alert(
              `${dayNumber}/${date.getMonth() + 1}`,
              `Workouts: ${workouts.map(w => w.workoutType).join(', ')}`
            );
          }
        }}
      >
        <Text style={[
          styles.dayNumber,
          !isCurrentMonth && styles.dayNumberInactive,
          today && styles.dayNumberToday,
        ]}>
          {dayNumber}
        </Text>

        {workouts.length > 0 && (
          <View style={styles.workoutIndicators}>
            {workouts.slice(0, 3).map((workout, workoutIndex) => (
              <View
                key={workoutIndex}
                style={[
                  styles.workoutDot,
                  { backgroundColor: getWorkoutTypeColor(workout.workoutType) }
                ]}
              />
            ))}
            {workouts.length > 3 && (
              <Text style={styles.moreWorkouts}>+{workouts.length - 3}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const calendarDays = generateCalendarDays();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Calendar</Text>
        <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNavigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateMonth('prev')}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>{formatMonthYear()}</Text>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateMonth('next')}
        >
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.dayHeaders}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <Text key={index} style={styles.dayHeader}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendar}>
        {calendarDays.map((calendarDay, index) => renderCalendarDay(calendarDay, index))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Workout Types:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getWorkoutTypeColor('upper') }]} />
            <Text style={styles.legendText}>Upper Body</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getWorkoutTypeColor('legs') }]} />
            <Text style={styles.legendText}>Legs</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getWorkoutTypeColor('cardio') }]} />
            <Text style={styles.legendText}>Cardio</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  todayButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  todayButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  monthNavigation: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  dayHeaders: {
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  calendar: {
    backgroundColor: 'white',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 20,
  },
  dayContainer: {
    flex: 1,
    minWidth: '14.28%', // 100% / 7 days
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  dayContainerInactive: {
    backgroundColor: '#fafafa',
  },
  dayContainerToday: {
    backgroundColor: '#e3f2fd',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dayNumberInactive: {
    color: '#ccc',
  },
  dayNumberToday: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  workoutIndicators: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  moreWorkouts: {
    fontSize: 8,
    color: '#666',
    marginLeft: 2,
  },
  legend: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
});