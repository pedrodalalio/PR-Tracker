import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { workoutApi, exerciseApi } from '../services/api';
import { Exercise, Set, WorkoutExercise, WorkoutType, WeekDay, Workout } from '../types/workout';
import RunningEnhancer from '../components/RunningEnhancer';

export default function NewWorkoutScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
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
  const [showRunningEnhancer, setShowRunningEnhancer] = useState(false);
  const [currentRunningExercise, setCurrentRunningExercise] = useState<WorkoutExercise | null>(null);

  useEffect(() => {
    // Auto-select day of week based on selected date
    if (selectedDate) {
      const [year, month, day] = selectedDate.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const dayNames: WeekDay[] = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sabado'];
      const dayOfWeekFromDate = dayNames[date.getDay()];
      setDayOfWeek(dayOfWeekFromDate);
      setWorkoutType(getWorkoutTypeFromDay(dayOfWeekFromDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    // Load existing workouts to check for daily restrictions
    loadExistingWorkouts();
  }, []);

  // Reload exercises when screen comes back into focus (e.g., from ManageExercises)
  useFocusEffect(
    useCallback(() => {
      if (workoutType) {
        loadExercises();
      }
    }, [workoutType])
  );

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
        if (workoutType === 'upper') return exercise.category === 'Superiores';
        if (workoutType === 'lower') return exercise.category === 'Inferiores';
        if (workoutType === 'cardio') return exercise.category === 'Cardio';
        return true;
      });

      // Filter out already selected exercises
      const availableExercises = typeFilteredExercises.filter(exercise =>
        !selectedExercises.some(selected => selected.exercise.id === exercise.id)
      );

      setExercises(availableExercises);
      setFilteredExercises(availableExercises);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar exercícios');
    }
  };

  const loadLastWorkoutExercises = async () => {
    if (!workoutType) return;

    try {
      // Get all workouts and filter by type, excluding today's date
      const workouts = await workoutApi.getWorkouts();
      const workoutsOfSameType = workouts
        .filter(workout =>
          workout.workoutType === workoutType &&
          workout.date !== selectedDate
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (workoutsOfSameType.length > 0) {
        const lastWorkout = workoutsOfSameType[0];

        // Convert the exercises from the last workout to new WorkoutExercise objects
        const lastWorkoutExercises: WorkoutExercise[] = lastWorkout.exercises.map((workoutExercise, index) => ({
          id: `${Date.now()}_${index}`,
          exerciseId: workoutExercise.exercise.id,
          exercise: workoutExercise.exercise,
          sets: [], // Start with empty sets so user can add their own
          notes: workoutExercise.notes || '', // Keep notes from last workout
        }));

        setSelectedExercises(lastWorkoutExercises);
      }
    } catch (error) {
      console.error('Failed to load last workout exercises:', error);
      // Don't show error to user, just proceed normally
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

    // Add to selected exercises
    const updatedSelectedExercises = [...selectedExercises, workoutExercise];
    setSelectedExercises(updatedSelectedExercises);

    // Remove from available exercises to prevent duplicates
    const updatedAvailableExercises = exercises.filter(ex => ex.id !== exercise.id);
    setExercises(updatedAvailableExercises);
    setFilteredExercises(updatedAvailableExercises);

    setShowExerciseList(false);
    setSearchQuery('');
  };

  const removeExercise = (exerciseId: string) => {
    // Find the exercise being removed
    const removedExercise = selectedExercises.find(ex => ex.id === exerciseId);

    // Remove from selected exercises
    const updatedSelectedExercises = selectedExercises.filter(ex => ex.id !== exerciseId);
    setSelectedExercises(updatedSelectedExercises);

    // Add back to available exercises if it matches the current workout type
    if (removedExercise) {
      const exercise = removedExercise.exercise;
      const shouldAddBack =
        (workoutType === 'upper' && exercise.category === 'Superiores') ||
        (workoutType === 'lower' && exercise.category === 'Inferiores') ||
        (workoutType === 'cardio' && exercise.category === 'Cardio');

      if (shouldAddBack) {
        const updatedAvailableExercises = [...exercises, exercise];
        setExercises(updatedAvailableExercises);
        // Update filtered exercises if there's a search query
        if (searchQuery.trim() === '') {
          setFilteredExercises(updatedAvailableExercises);
        } else {
          const filtered = updatedAvailableExercises.filter(ex =>
            ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ex.muscleGroups.some(muscle =>
              muscle.toLowerCase().includes(searchQuery.toLowerCase())
            )
          );
          setFilteredExercises(filtered);
        }
      }
    }
  };

  const addSet = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.map(ex => {
      if (ex.id === exerciseId) {
        const isCardio = ex.exercise.category === 'Cardio';
        const newSet: Set = {
          id: Date.now().toString(),
          reps: isCardio ? 1 : 0, // For cardio, reps represents the run number
          weight: isCardio ? 0 : 0, // Not used for cardio
          ...(isCardio && {
            duration: 0, // time in seconds
            distance: 0, // distance in meters
            pace: 0 // calculated pace
          })
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    }));
  };

  const getWorkoutTypeFromDay = (day: WeekDay): WorkoutType => {
    if (day === 'segunda' || day === 'quinta') return 'upper';
    if (day === 'terça' || day === 'sexta') return 'lower';
    return 'cardio'; // quarta, sabado, domingo
  };

  const isWorkoutAllowed = (selectedWorkoutType: WorkoutType): { allowed: boolean; message?: string } => {
    if (!selectedDate) return { allowed: true };

    const dayWorkouts = existingWorkouts.filter(w => w.date === selectedDate);

    if (dayWorkouts.length === 0) {
      return { allowed: true };
    }

    const hasUpper = dayWorkouts.some(w => w.workoutType === 'upper');
    const hasLower = dayWorkouts.some(w => w.workoutType === 'lower');
    const hasCardio = dayWorkouts.some(w => w.workoutType === 'cardio');

    // Check for invalid combinations
    if (selectedWorkoutType === 'upper' && hasLegs) {
      return {
        allowed: false,
        message: 'Não é possível combinar Membros Superiores e Pernas no mesmo dia!'
      };
    }

    if (selectedWorkoutType === 'lower' && hasUpper) {
      return {
        allowed: false,
        message: 'Não é possível combinar Pernas e Membros Superiores no mesmo dia!'
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
    const hasLower = dayWorkouts.some(w => w.workoutType === 'lower');
    const hasCardio = dayWorkouts.some(w => w.workoutType === 'cardio');

    if ((hasUpper || hasLegs) && !hasCardio) {
      return 'Você pode adicionar Cardio neste dia!';
    }

    if (hasUpper && hasLegs) {
      return 'Ótimo! Você ainda pode adicionar mais Cardio.';
    }

    return '';
  };

  const getDayName = (dayKey: WeekDay): string => {
    const days = {
      segunda: 'Segunda',
      terça: 'Terça',
      quarta: 'Quarta',
      quinta: 'Quinta',
      sexta: 'Sexta',
      sabado: 'Sábado',
      domingo: 'Domingo'
    };
    return days[dayKey];
  };

  const getWorkoutTypeName = (type: WorkoutType): string => {
    const types = {
      upper: 'Membros Superiores',
      lower: 'Pernas',
      cardio: 'Cardio'
    };
    return types[type];
  };

  const handleDaySelection = (day: WeekDay) => {
    setDayOfWeek(day);
    const suggestedType = getWorkoutTypeFromDay(day);
    setWorkoutType(suggestedType);
  };

  const handleContinueToExercises = async () => {
    if (!workoutType || !selectedDate) {
      Alert.alert('Erro', 'Por favor selecione a data e tipo de treino');
      return;
    }

    const validation = isWorkoutAllowed(workoutType);
    if (!validation.allowed) {
      Alert.alert('Treino Não Permitido', validation.message || 'Esta combinação de treinos não é permitida.');
      return;
    }

    setStep('exercises');

    // Load exercises and last workout exercises concurrently
    await Promise.all([
      loadExercises(),
      loadLastWorkoutExercises()
    ]);
  };

  // Helper function to calculate pace in minutes per kilometer
  const calculatePace = (distanceInMeters: number, durationInSeconds: number): number => {
    if (distanceInMeters <= 0 || durationInSeconds <= 0) return 0;
    const distanceInKm = distanceInMeters / 1000;
    const durationInMinutes = durationInSeconds / 60;
    return durationInMinutes / distanceInKm; // minutes per km
  };

  // Helper function to format time from seconds to MM:SS
  const formatTimeInput = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(Math.round(remainingSeconds)).padStart(2, '0')}`;
  };

  // Helper function to parse time input from MM:SS to seconds
  const parseTimeInput = (timeString: string): number => {
    if (!timeString) return 0;

    // Handle MM:SS format
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }

    // Handle just minutes or seconds
    const number = parseFloat(timeString) || 0;
    return number * 60; // Assume input is in minutes if no colon
  };

  const updateSet = (exerciseId: string, setId: string, field: keyof Set, value: any) => {
    setSelectedExercises(selectedExercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(set => {
            if (set.id === setId) {
              const updatedSet = { ...set, [field]: value };

              // Auto-calculate pace for cardio exercises
              if (ex.exercise.category === 'Cardio' && (field === 'distance' || field === 'duration')) {
                const distance = field === 'distance' ? value : (set.distance || 0);
                const duration = field === 'duration' ? value : (set.duration || 0);
                updatedSet.pace = calculatePace(distance, duration);
              }

              return updatedSet;
            }
            return set;
          })
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

  const handleEnhancedRun = (exercise: WorkoutExercise) => {
    setCurrentRunningExercise(exercise);
    setShowRunningEnhancer(true);
  };

  const handleSaveEnhancedRun = (runData: {
    distance: number;
    duration: number;
    pace: number;
    notes?: string;
    heartRateZone?: string;
  }) => {
    if (!currentRunningExercise) return;

    const newSet: Set = {
      id: Date.now().toString(),
      reps: 1,
      weight: 0,
      distance: runData.distance,
      duration: runData.duration,
      pace: runData.pace,
    };

    setSelectedExercises(selectedExercises.map(ex => {
      if (ex.id === currentRunningExercise.id) {
        const updatedExercise = { ...ex, sets: [...ex.sets, newSet] };
        if (runData.notes) {
          updatedExercise.notes = (updatedExercise.notes || '') + '\n' + runData.notes;
        }
        return updatedExercise;
      }
      return ex;
    }));

    setCurrentRunningExercise(null);
  };

  const saveWorkout = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('Erro', 'Por favor adicione pelo menos um exercício');
      return;
    }

    // Check if all exercises have at least one set with valid data
    const invalidExercises = selectedExercises.filter(ex => {
      if (ex.sets.length === 0) return true;

      if (ex.exercise.category === 'Cardio') {
        // For cardio, require distance and duration
        return ex.sets.some(set => !set.distance || !set.duration);
      } else {
        // For non-cardio, require reps and weight
        return ex.sets.some(set => !set.reps || !set.weight);
      }
    });

    if (invalidExercises.length > 0) {
      const errorMessage = invalidExercises.some(ex => ex.exercise.category === 'Cardio')
        ? 'Por favor adicione distância e tempo para todas as corridas'
        : 'Por favor adicione séries com repetições e peso para todos os exercícios';
      Alert.alert('Error', errorMessage);
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
        text1: 'Treino Salvo! 💪',
        text2: `${workoutName} concluído com sucesso`,
        visibilityTime: 3000,
      });

      // Navigate to home screen
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar treino');
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
        <View style={styles.exerciseInfo}>
          <Text style={styles.selectedExerciseName}>{exercise.exercise.name}</Text>
          <Text style={styles.exerciseCategory}>{exercise.exercise.category}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeExerciseButton}
          onPress={() => removeExercise(exercise.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {exercise.sets.map((set, setIndex) => (
        <View key={set.id} style={styles.setRow}>
          <Text style={styles.setNumber}>{setIndex + 1}</Text>

          {exercise.exercise.category === 'Cardio' ? (
            // Cardio/Running inputs
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="map" size={16} color="#666" />
                <TextInput
                  style={styles.setInput}
                  placeholder="Distância (km)"
                  value={set.distance ? (set.distance / 1000).toString() : ''}
                  onChangeText={(text) => updateSet(exercise.id, set.id, 'distance', (parseFloat(text) || 0) * 1000)}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="time" size={16} color="#666" />
                <TextInput
                  style={styles.setInput}
                  placeholder="Tempo (MM:SS)"
                  value={set.duration ? formatTimeInput(set.duration) : ''}
                  onChangeText={(text) => updateSet(exercise.id, set.id, 'duration', parseTimeInput(text))}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              {set.pace && set.pace > 0 && (
                <View style={styles.paceContainer}>
                  <Text style={styles.paceText}>
                    {Math.floor(set.pace)}:{String(Math.round((set.pace % 1) * 60)).padStart(2, '0')}/km
                  </Text>
                </View>
              )}
            </>
          ) : (
            // Regular strength training inputs
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="barbell" size={16} color="#666" />
                <TextInput
                  style={styles.setInput}
                  placeholder="Peso (kg)"
                  value={set.weight?.toString() || ''}
                  onChangeText={(text) => updateSet(exercise.id, set.id, 'weight', parseFloat(text) || 0)}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="repeat" size={16} color="#666" />
                <TextInput
                  style={styles.setInput}
                  placeholder="Repetições"
                  value={set.reps?.toString() || ''}
                  onChangeText={(text) => updateSet(exercise.id, set.id, 'reps', parseInt(text) || 0)}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.removeSetButton}
            onPress={() => removeSet(exercise.id, set.id)}
          >
            <Ionicons name="remove-circle" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ))}

      {exercise.exercise.category === 'Cardio' ? (
        <View style={styles.cardioButtons}>
          <TouchableOpacity
            style={styles.addSetButton}
            onPress={() => addSet(exercise.id)}
          >
            <Ionicons name="add" size={16} color="#007AFF" />
            <Text style={styles.addSetText}>Adicionar Corrida Rápida</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.enhancedRunButton}
            onPress={() => handleEnhancedRun(exercise)}
          >
            <Ionicons name="analytics" size={16} color="#34C759" />
            <Text style={styles.enhancedRunText}>Log de Corrida Avançado</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addSetButton}
          onPress={() => addSet(exercise.id)}
        >
          <Ionicons name="add" size={16} color="#007AFF" />
          <Text style={styles.addSetText}>Adicionar Série (Repetições + Peso)</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (showExerciseList) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            setShowExerciseList(false);
            setSearchQuery('');
            setFilteredExercises(exercises);
          }}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Selecionar Exercício</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar exercícios..."
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
            <Text style={styles.noResultsTitle}>Nenhum exercício encontrado</Text>
            <Text style={styles.noResultsSubtitle}>
              Tente buscar com palavras-chave diferentes
            </Text>
            <TouchableOpacity
              style={styles.createExerciseButton}
              onPress={() => navigation.getParent()?.navigate('Exercises', { screen: 'ManageExercises' })}
            >
              <Ionicons name="add-circle" size={20} color="#007AFF" />
              <Text style={styles.createExerciseText}>Criar novo exercício</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id}
            style={styles.exerciseList}
            contentContainerStyle={styles.exerciseListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          />
        )}

        {/* Floating Create Exercise Button */}
        <TouchableOpacity
          style={styles.floatingCreateButton}
          onPress={() => navigation.getParent()?.navigate('Exercises', { screen: 'ManageExercises' })}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  // Setup step - day and workout type selection
  if (step === 'setup') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Novo Treino</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Selecionar Data</Text>
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={(day: DateData) => {
                setSelectedDate(day.dateString);
                // Auto-select day of week and suggest workout type
                const [year, month, dayNum] = day.dateString.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(dayNum));
                const dayNames: WeekDay[] = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sabado'];
                const dayOfWeekFromDate = dayNames[date.getDay()];
                setDayOfWeek(dayOfWeekFromDate);
                setWorkoutType(getWorkoutTypeFromDay(dayOfWeekFromDate));
              }}
              locale={{
                monthNames: [
                  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                ],
                monthNamesShort: [
                  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
                ],
                dayNames: [
                  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
                  'Quinta-feira', 'Sexta-feira', 'Sábado'
                ],
                dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                today: 'Hoje'
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
                Selecionado: {new Date(selectedDate).toLocaleDateString('pt-BR', {
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
              <Text style={styles.sectionTitle}>Tipo de Treino</Text>

              {/* Show recommendation */}
              {getWorkoutTypeRecommendation() && (
                <Text style={styles.recommendationText}>
                  {getWorkoutTypeRecommendation()}
                </Text>
              )}

              <View style={styles.typeGrid}>
                {(['upper', 'lower', 'cardio'] as WorkoutType[]).map((type) => {
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
                          name={type === 'upper' ? 'body' : type === 'lower' ? 'walk' : 'heart'}
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
              <Text style={styles.continueButtonText}>Continuar para Exercícios</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Exercise selection and workout building step
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('setup')}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getWorkoutTypeName(workoutType!)}</Text>
        <TouchableOpacity
          onPress={saveWorkout}
          disabled={loading}
          style={styles.saveButton}
        >
          <Text style={[styles.saveText, loading && styles.disabledText]}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setShowExerciseList(true)}
        >
          <Ionicons name="add-circle" size={24} color="#007AFF" />
          <Text style={styles.addExerciseText}>Adicionar Exercício de {getWorkoutTypeName(workoutType!)}</Text>
        </TouchableOpacity>

        {selectedExercises.map((exercise, index) => renderSelectedExercise(exercise, index))}
      </ScrollView>

      <RunningEnhancer
        visible={showRunningEnhancer}
        onClose={() => {
          setShowRunningEnhancer(false);
          setCurrentRunningExercise(null);
        }}
        onSaveRun={handleSaveEnhancedRun}
      />
    </KeyboardAvoidingView>
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  removeExerciseButton: {
    padding: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'center',
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
  exerciseListContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
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
  paceContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  paceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  cardioButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  enhancedRunButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#E8F5E8',
    borderRadius: 6,
    flex: 1,
  },
  enhancedRunText: {
    color: '#34C759',
    marginLeft: 4,
    fontWeight: '500',
    fontSize: 12,
  },
  createExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  createExerciseText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '600',
  },
  floatingCreateButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
});