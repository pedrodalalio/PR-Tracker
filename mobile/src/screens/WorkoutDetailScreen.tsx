import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { workoutApi } from '../services/api';
import { Workout } from '../types/workout';

export default function WorkoutDetailScreen({ route, navigation }: any) {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  const translateWorkoutName = (workoutName: string): string => {
    const translations: { [key: string]: string } = {
      // Common workout patterns
      "Upper Workout": "Treino de Superiores",
      "Upper Body Workout": "Treino de Membros Superiores",
      "Legs Workout": "Treino de Pernas",
      "Lower Body Workout": "Treino de Membros Inferiores",
      "Cardio Workout": "Treino de Cardio",
      "Full Body Workout": "Treino de Corpo Inteiro",
      "Push Workout": "Treino de Empurrar",
      "Pull Workout": "Treino de Puxar",
      "Chest Workout": "Treino de Peito",
      "Back Workout": "Treino de Costas",
      "Shoulder Workout": "Treino de Ombros",
      "Arms Workout": "Treino de Braços",
      "Core Workout": "Treino de Core",
      "HIIT Workout": "Treino HIIT",
      "Strength Training": "Treino de Força",
      "Running Session": "Sessão de Corrida",
      "Morning Workout": "Treino Matinal",
      "Evening Workout": "Treino Noturno",
      "Quick Workout": "Treino Rápido",
      "Intense Workout": "Treino Intenso",

      // Day-based workouts
      "Monday Workout": "Treino de Segunda",
      "Tuesday Workout": "Treino de Terça",
      "Wednesday Workout": "Treino de Quarta",
      "Thursday Workout": "Treino de Quinta",
      "Friday Workout": "Treino de Sexta",
      "Saturday Workout": "Treino de Sábado",
      "Sunday Workout": "Treino de Domingo",

      // Specific patterns that might come from backend
      "Upper": "Superiores",
      "Lower": "Pernas",
      "Cardio": "Cardio",
      "Legs": "Pernas",
      "Arms": "Braços",
      "Chest": "Peito",
      "Back": "Costas",
      "Shoulders": "Ombros",
    };

    // Try exact match first
    if (translations[workoutName]) {
      return translations[workoutName];
    }

    // Try partial matches for common patterns
    let translatedName = workoutName;

    // Replace common English words with Portuguese equivalents
    translatedName = translatedName.replace(/\bWorkout\b/gi, 'Treino');
    translatedName = translatedName.replace(/\bUpper\b/gi, 'Superiores');
    translatedName = translatedName.replace(/\bLower\b/gi, 'Pernas');
    translatedName = translatedName.replace(/\bLegs\b/gi, 'Pernas');
    translatedName = translatedName.replace(/\bArms\b/gi, 'Braços');
    translatedName = translatedName.replace(/\bChest\b/gi, 'Peito');
    translatedName = translatedName.replace(/\bBack\b/gi, 'Costas');
    translatedName = translatedName.replace(/\bShoulders\b/gi, 'Ombros');
    translatedName = translatedName.replace(/\bCardio\b/gi, 'Cardio');
    translatedName = translatedName.replace(/\bCore\b/gi, 'Core');
    translatedName = translatedName.replace(/\bMorning\b/gi, 'Matinal');
    translatedName = translatedName.replace(/\bEvening\b/gi, 'Noturno');
    translatedName = translatedName.replace(/\bSession\b/gi, 'Sessão');

    return translatedName;
  };

  useEffect(() => {
    loadWorkout();
  }, []);

  const loadWorkout = async () => {
    try {
      const workoutData = await workoutApi.getWorkout(workoutId);
      setWorkout(workoutData);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar detalhes do treino');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkout = async () => {
    const translatedName = translateWorkoutName(workout?.name || '');
    Alert.alert(
      'Excluir Treino',
      `Tem certeza que deseja excluir "${translatedName}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await workoutApi.deleteWorkout(workoutId);

              Toast.show({
                type: 'success',
                text1: 'Treino Excluído! 🗑️',
                text2: `"${translatedName}" foi removido`,
                visibilityTime: 3000,
              });

              // Navigate to home screen to refresh the workout list
              navigation.navigate('Home');
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Falha na Exclusão',
                text2: 'Não foi possível excluir o treino. Tente novamente.',
                visibilityTime: 3000,
              });
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const calculateWorkoutDuration = () => {
    if (!workout?.startTime || !workout?.endTime) return null;
    const start = new Date(workout.startTime);
    const end = new Date(workout.endTime);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    return `${minutes} minutes`;
  };

  const getTotalVolume = () => {
    if (!workout) return 0;
    return workout.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((exerciseTotal, set) => {
        return exerciseTotal + ((set.weight || 0) * (set.reps || 0));
      }, 0);
    }, 0);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Carregando treino...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Treino não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.workoutName}>{translateWorkoutName(workout.name)}</Text>
          <Text style={styles.workoutDate}>{formatDate(workout.date)}</Text>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={deleteWorkout}>
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{workout.exercises.length}</Text>
          <Text style={styles.statLabel}>Exercícios</Text>
        </View>
      </View>

      {workout.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesTitle}>Observações</Text>
          <Text style={styles.notesText}>{workout.notes}</Text>
        </View>
      )}

      {workout.tags && workout.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          <Text style={styles.tagsTitle}>Tags</Text>
          <View style={styles.tagsRow}>
            {workout.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.exercisesContainer}>
        <Text style={styles.exercisesTitle}>Exercícios</Text>
        {workout.exercises.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
            </View>

            <Text style={styles.muscleGroups}>
              {exercise.exercise.muscleGroups.join(', ')}
            </Text>

            {exercise.sets.length > 0 && (
              <View style={styles.setsContainer}>
                <View style={styles.setsHeader}>
                  <Text style={styles.setsHeaderText}>Peso</Text>
                  <Text style={styles.setsHeaderText}>Reps</Text>
                </View>
                {exercise.sets.map((set, setIndex) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={styles.setValue}>{set.weight || 0} kg</Text>
                    <Text style={styles.setValue}>{set.reps || 0}</Text>
                  </View>
                ))}
              </View>
            )}

            {exercise.notes && (
              <View style={styles.exerciseNotes}>
                <Text style={styles.exerciseNotesText}>{exercise.notes}</Text>
              </View>
            )}
          </View>
        ))}
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
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  workoutDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    color: '#007AFF',
  },
  deleteButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  notesContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 8,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  tagsContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 8,
  },
  tagsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e1f5fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#0277bd',
  },
  exercisesContainer: {
    marginTop: 8,
    paddingBottom: 20,
  },
  exercisesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  exerciseCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exerciseHeader: {
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#007AFF',
    textTransform: 'capitalize',
  },
  muscleGroups: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  setsContainer: {
    marginTop: 8,
  },
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    marginBottom: 8,
  },
  setsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  setNumber: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  setValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  exerciseNotes: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  exerciseNotesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});