import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { workoutApi, exerciseApi } from '../services/api';
import { Exercise, Set, WorkoutExercise, WorkoutType, WeekDay, Workout } from '../types/workout';

export default function NewWorkoutScreen({ navigation, route }: any) {
  const selectedDateFromRoute = route?.params?.selectedDate;
  const [selectedDate, setSelectedDate] = useState(selectedDateFromRoute || new Date().toISOString().split('T')[0]);
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<WeekDay | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'exercises'>('setup');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [existingWorkouts, setExistingWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    // Auto-select day of week based on selected date
    if (selectedDate) {
      const [year, month, day] = selectedDate.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const dayNames: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeekFromDate = dayNames[date.getDay()];
      setDayOfWeek(dayOfWeekFromDate);
      setWorkoutType(getWorkoutTypeFromDay(dayOfWeekFromDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    // Load existing workouts to check for daily restrictions
    loadExistingWorkouts();
  }, []);

  const loadExistingWorkouts = async () => {
    try {
      const workouts = await workoutApi.getWorkouts();
      setExistingWorkouts(workouts);
    } catch (error) {
      console.error('Failed to load existing workouts:', error);
    }
  };

  const loadExercises = async () => {
    try {
      const exercisesData = await exerciseApi.getExercises();
      // Filter exercises based on workout type
      const typeFilteredExercises = exercisesData.filter(exercise => {
        if (workoutType === 'upper') return exercise.category === 'Upper';
        if (workoutType === 'legs') return exercise.category === 'Lower';
        if (workoutType === 'cardio') return exercise.category === 'Cardio';
        return true;
      });
      setExercises(typeFilteredExercises);
      setFilteredExercises(typeFilteredExercises);
    } catch (error) {
      Alert.alert('Error', 'Failed to load exercises');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredExercises(exercises);
    } else {
      const filtered = exercises.filter(exercise =>
        exercise.name.toLowerCase().includes(query.toLowerCase()) ||
        exercise.muscleGroups.some(muscle =>
          muscle.toLowerCase().includes(query.toLowerCase())
        )
      );
      setFilteredExercises(filtered);
    }
  };

  const addExercise = (exercise: Exercise) => {
    const workoutExercise: WorkoutExercise = {
      id: Date.now().toString(),
      exerciseId: exercise.id,
      exercise,
      sets: [],
      notes: '',
    };
    setSelectedExercises([...selectedExercises, workoutExercise]);
    setShowExerciseList(false);
    setSearchQuery('');
    setFilteredExercises(exercises);
  };

  const removeExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(ex => ex.id !== exerciseId));
  };

  const addSet = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSet: Set = {
          id: Date.now().toString(),
          reps: 0,
          weight: 0,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    }));
  };

  const getWorkoutTypeFromDay = (day: WeekDay): WorkoutType => {
    if (day === 'monday' || day === 'thursday') return 'upper';
    if (day === 'tuesday' || day === 'friday') return 'legs';
    return 'cardio'; // wednesday, saturday, sunday
  };

  const isWorkoutAllowed = (selectedWorkoutType: WorkoutType): { allowed: boolean; message?: string } => {
    if (!selectedDate) return { allowed: true };

    const dayWorkouts = existingWorkouts.filter(w => w.date === selectedDate);

    if (dayWorkouts.length === 0) {
      return { allowed: true };
    }

    const hasUpper = dayWorkouts.some(w => w.workoutType === 'upper');
    const hasLegs = dayWorkouts.some(w => w.workoutType === 'legs');
    const hasCardio = dayWorkouts.some(w => w.workoutType === 'cardio');

    // Check for invalid combinations
    if (selectedWorkoutType === 'upper' && hasLegs) {
      return {
        allowed: false,
        message: 'Cannot combine Upper Body and Legs on the same day!'
      };
    }

    if (selectedWorkoutType === 'legs' && hasUpper) {
      return {
        allowed: false,
        message: 'Cannot combine Legs and Upper Body on the same day!'
      };
    }

    // Check for duplicates (except cardio can be done multiple times)
    if (selectedWorkoutType !== 'cardio' && dayWorkouts.some(w => w.workoutType === selectedWorkoutType)) {
      return {
        allowed: false,
        message: `You already completed ${getWorkoutTypeName(selectedWorkoutType)} today!`
      };
    }

    return { allowed: true };
  };

  const getWorkoutTypeRecommendation = (): string => {
    if (!selectedDate || !dayOfWeek) return '';

    const dayWorkouts = existingWorkouts.filter(w => w.date === selectedDate);
    const scheduledType = getWorkoutTypeFromDay(dayOfWeek);

    if (dayWorkouts.length === 0) {
      return `Recommended: ${getWorkoutTypeName(scheduledType)}`;
    }

    const hasUpper = dayWorkouts.some(w => w.workoutType === 'upper');
    const hasLegs = dayWorkouts.some(w => w.workoutType === 'legs');
    const hasCardio = dayWorkouts.some(w => w.workoutType === 'cardio');

    if ((hasUpper || hasLegs) && !hasCardio) {
      return 'You can add Cardio to this day!';
    }

    if (hasUpper && hasLegs) {
      return 'Great! You can still add more Cardio.';
    }

    return '';
  };

  const getDayName = (dayKey: WeekDay): string => {
    const days = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    return days[dayKey];
  };

  const getWorkoutTypeName = (type: WorkoutType): string => {
    const types = {
      upper: 'Upper Body',
      legs: 'Legs',
      cardio: 'Cardio'
    };
    return types[type];
  };

  const handleDaySelection = (day: WeekDay) => {
    setDayOfWeek(day);
    const suggestedType = getWorkoutTypeFromDay(day);
    setWorkoutType(suggestedType);
  };

  const handleContinueToExercises = () => {
    if (!workoutType || !selectedDate) {
      Alert.alert('Error', 'Please select date and workout type');
      return;
    }

    const validation = isWorkoutAllowed(workoutType);
    if (!validation.allowed) {
      Alert.alert('Workout Not Allowed', validation.message || 'This workout combination is not allowed.');
      return;
    }

    setStep('exercises');
    loadExercises();
  };

  const updateSet = (exerciseId: string, setId: string, field: keyof Set, value: any) => {
    setSelectedExercises(selectedExercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(set =>
            set.id === setId ? { ...set, [field]: value } : set
          )
        };
      }
      return ex;
    }));
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setSelectedExercises(selectedExercises.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, sets: ex.sets.filter(set => set.id !== setId) };
      }
      return ex;
    }));
  };

  const saveWorkout = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    // Check if all exercises have at least one set with reps and weight
    const invalidExercises = selectedExercises.filter(ex =>
      ex.sets.length === 0 || ex.sets.some(set => !set.reps || !set.weight)
    );

    if (invalidExercises.length > 0) {
      Alert.alert('Error', 'Please add sets with reps and weight for all exercises');
      return;
    }

    setLoading(true);
    try {
      const workoutName = getWorkoutTypeName(workoutType!);
      await workoutApi.createWorkout({
        name: workoutName,
        date: selectedDate,
        workoutType: workoutType!,
        dayOfWeek: dayOfWeek!,
        exercises: selectedExercises,
      });

      Toast.show({
        type: 'success',
        text1: 'Workout Saved! 💪',
        text2: `${workoutName} completed successfully`,
        visibilityTime: 3000,
      });

      // Navigate to home screen
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
    } finally {
      setLoading(false);
    }
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => addExercise(item)}
    >
      <View>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseCategory}>{item.category}</Text>
        <Text style={styles.muscleGroups}>{item.muscleGroups.join(', ')}</Text>
      </View>
      <Ionicons name="add-circle" size={24} color="#007AFF" />
    </TouchableOpacity>
  );

  const renderSelectedExercise = (exercise: WorkoutExercise, index: number) => (
    <View key={exercise.id} style={styles.selectedExercise}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.selectedExerciseName}>{exercise.exercise.name}</Text>
        <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {exercise.sets.map((set, setIndex) => (
        <View key={set.id} style={styles.setRow}>
          <Text style={styles.setNumber}>{setIndex + 1}</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="barbell" size={16} color="#666" />
            <TextInput
              style={styles.setInput}
              placeholder="Weight (kg)"
              value={set.weight?.toString() || ''}
              onChangeText={(text) => updateSet(exercise.id, set.id, 'weight', parseFloat(text) || 0)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="repeat" size={16} color="#666" />
            <TextInput
              style={styles.setInput}
              placeholder="Reps"
              value={set.reps?.toString() || ''}
              onChangeText={(text) => updateSet(exercise.id, set.id, 'reps', parseInt(text) || 0)}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.removeSetButton}
            onPress={() => removeSet(exercise.id, set.id)}
          >
            <Ionicons name="remove-circle" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addSetButton}
        onPress={() => addSet(exercise.id)}
      >
        <Ionicons name="add" size={16} color="#007AFF" />
        <Text style={styles.addSetText}>Add Set (Reps + Weight)</Text>
      </TouchableOpacity>
    </View>
  );

  if (showExerciseList) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            setShowExerciseList(false);
            setSearchQuery('');
            setFilteredExercises(exercises);
          }}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Exercise</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {filteredExercises.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={styles.noResultsTitle}>No exercises found</Text>
            <Text style={styles.noResultsSubtitle}>
              Try searching with different keywords
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id}
            style={styles.exerciseList}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    );
  }

  // Setup step - day and workout type selection
  if (step === 'setup') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Workout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={(day: DateData) => {
                setSelectedDate(day.dateString);
                // Auto-select day of week and suggest workout type
                const [year, month, dayNum] = day.dateString.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(dayNum));
                const dayNames: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const dayOfWeekFromDate = dayNames[date.getDay()];
                setDayOfWeek(dayOfWeekFromDate);
                setWorkoutType(getWorkoutTypeFromDay(dayOfWeekFromDate));
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: '#007AFF',
                },
                [new Date().toISOString().split('T')[0]]: {
                  marked: true,
                  dotColor: '#007AFF',
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

          {selectedDate && (
            <View style={styles.selectedDateInfo}>
              <Text style={styles.selectedDateText}>
                Selected: {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
          )}

          {selectedDate && (
            <View style={styles.workoutTypeSection}>
              <Text style={styles.sectionTitle}>Workout Type</Text>

              {/* Show recommendation */}
              {getWorkoutTypeRecommendation() && (
                <Text style={styles.recommendationText}>
                  {getWorkoutTypeRecommendation()}
                </Text>
              )}

              <View style={styles.typeGrid}>
                {(['upper', 'legs', 'cardio'] as WorkoutType[]).map((type) => {
                  const isSelected = workoutType === type;
                  const validation = isWorkoutAllowed(type);
                  const isDisabled = !validation.allowed;

                  return (
                    <View key={type}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          isSelected && styles.selectedTypeButton,
                          isDisabled && styles.disabledTypeButton
                        ]}
                        onPress={() => {
                          if (isDisabled) {
                            Alert.alert('Not Allowed', validation.message);
                          } else {
                            setWorkoutType(type);
                          }
                        }}
                        disabled={isDisabled}
                      >
                        <Ionicons
                          name={type === 'upper' ? 'body' : type === 'legs' ? 'walk' : 'heart'}
                          size={24}
                          color={isDisabled ? '#ccc' : isSelected ? 'white' : '#007AFF'}
                        />
                        <Text style={[
                          styles.typeButtonText,
                          isSelected && styles.selectedTypeButtonText,
                          isDisabled && styles.disabledTypeButtonText
                        ]}>
                          {getWorkoutTypeName(type)}
                        </Text>
                        {isDisabled && (
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color="#FF3B30"
                            style={styles.disabledIcon}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {workoutType && selectedDate && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinueToExercises}
            >
              <Text style={styles.continueButtonText}>Continue to Exercises</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // Exercise selection and workout building step
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('setup')}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getWorkoutTypeName(workoutType!)}</Text>
        <TouchableOpacity
          onPress={saveWorkout}
          disabled={loading}
        >
          <Text style={[styles.saveText, loading && styles.disabledText]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setShowExerciseList(true)}
        >
          <Ionicons name="add-circle" size={24} color="#007AFF" />
          <Text style={styles.addExerciseText}>Add {getWorkoutTypeName(workoutType!)} Exercise</Text>
        </TouchableOpacity>

        {selectedExercises.map((exercise, index) => renderSelectedExercise(exercise, index))}
      </ScrollView>
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  workoutNameInput: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  addExerciseText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  selectedExercise: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedExerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    width: 30,
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    marginHorizontal: 4,
    paddingHorizontal: 8,
    flex: 1,
  },
  setInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
    marginLeft: 6,
  },
  removeSetButton: {
    padding: 4,
    marginLeft: 8,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginTop: 8,
  },
  addSetText: {
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  exerciseList: {
    flex: 1,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  muscleGroups: {
    fontSize: 12,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    padding: 10,
  },
  selectedDateInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  suggestedText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recommendationText: {
    fontSize: 14,
    color: '#34C759',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  workoutTypeSection: {
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  typeButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e1e1e1',
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 6,
    minHeight: 80,
    justifyContent: 'center',
  },
  selectedTypeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  selectedTypeButtonText: {
    color: 'white',
  },
  disabledTypeButton: {
    backgroundColor: '#f8f8f8',
    borderColor: '#e1e1e1',
    opacity: 0.6,
  },
  disabledTypeButtonText: {
    color: '#ccc',
  },
  disabledIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});