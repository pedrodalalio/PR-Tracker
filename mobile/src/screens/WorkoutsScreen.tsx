import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { workoutApi } from '../services/api';
import { Workout } from '../types/workout';

export default function WorkoutsScreen({ navigation }: any) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

  const loadWorkouts = async () => {
    try {
      const workoutsData = await workoutApi.getWorkouts();
      // Sort by date (newest first)
      const sortedWorkouts = workoutsData.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setWorkouts(sortedWorkouts);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar treinos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWorkouts();
  };

  const handleDeleteWorkout = async (workoutId: string, workoutName: string) => {
    const translatedName = translateWorkoutName(workoutName);
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
              setWorkouts(workouts.filter(w => w.id !== workoutId));

              Toast.show({
                type: 'success',
                text1: 'Treino Excluído! 🗑️',
                text2: `"${translatedName}" foi removido`,
                visibilityTime: 3000,
              });
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
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getWorkoutTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'upper': return '#007AFF';
      case 'legs': return '#34C759';
      case 'cardio': return '#FF3B30';
      default: return '#666';
    }
  };

  const getWorkoutTypeIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'upper': return 'body';
      case 'legs': return 'walk';
      case 'cardio': return 'heart';
      default: return 'fitness';
    }
  };

  const getDaysSinceWorkout = (dateString: string): string => {
    const workoutDate = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - workoutDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return formatDate(dateString);
  };

  const getTotalWeight = (workout: Workout): number => {
    return workout.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((setTotal, set) => {
        return setTotal + (set.weight || 0) * (set.reps || 0);
      }, 0);
    }, 0);
  };

  const getWorkoutDuration = (workout: Workout): string => {
    if (!workout.startTime || !workout.endTime) return '';
    const start = new Date(workout.startTime);
    const end = new Date(workout.endTime);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes

    if (duration < 60) return `${Math.round(duration)}m`;
    const hours = Math.floor(duration / 60);
    const mins = Math.round(duration % 60);
    return `${hours}h ${mins}m`;
  };

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

  const renderWorkoutItem = ({ item }: { item: Workout }) => {
    return (
      <TouchableOpacity
        style={[
          styles.workoutCard,
          { borderLeftColor: getWorkoutTypeColor(item.workoutType) }
        ]}
        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
      >
        <View style={styles.workoutHeader}>
          <View style={styles.workoutTypeContainer}>
            <View style={[
              styles.workoutTypeIcon,
              { backgroundColor: getWorkoutTypeColor(item.workoutType) }
            ]}>
              <Ionicons
                name={getWorkoutTypeIcon(item.workoutType) as any}
                size={20}
                color="white"
              />
            </View>
            <View style={styles.workoutMainInfo}>
              <Text style={styles.workoutName}>{translateWorkoutName(item.name)}</Text>
              <Text style={styles.workoutDate}>{getDaysSinceWorkout(item.date)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteWorkout(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        <View style={styles.workoutStats}>
          <View style={styles.statItem}>
            <Ionicons name="barbell" size={16} color="#666" />
            <Text style={styles.statLabel}>{item.exercises.length} exercícios</Text>
          </View>
        </View>

        {item.exercises.length > 0 && (
          <View style={styles.exercisePreview}>
            <Text style={styles.exercisePreviewTitle}>Exercícios:</Text>
            <Text style={styles.exercisePreviewText}>
              {item.exercises.slice(0, 3).map(ex => ex.exercise.name).join(', ')}
              {item.exercises.length > 3 && ` +${item.exercises.length - 3} mais`}
            </Text>
          </View>
        )}

        <View style={styles.workoutFooter}>
          <View style={[
            styles.workoutTypeBadge,
            { backgroundColor: `${getWorkoutTypeColor(item.workoutType)}20` }
          ]}>
            <Text style={[
              styles.workoutTypeBadgeText,
              { color: getWorkoutTypeColor(item.workoutType) }
            ]}>
              {item.workoutType === 'upper' ? 'SUPERIORES' :
               item.workoutType === 'legs' ? 'PERNAS' :
               item.workoutType === 'cardio' ? 'CARDIO' :
               item.workoutType.toUpperCase()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </View>
      </TouchableOpacity>
    );
  };

  const getWeekWorkouts = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return workouts.filter(workout => new Date(workout.date) >= weekAgo);
  };

  const getMonthWorkouts = () => {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return workouts.filter(workout => new Date(workout.date) >= monthAgo);
  };

  return (
    <View style={styles.container}>

      {loading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Carregando treinos...</Text>
        </View>
      ) : workouts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="fitness-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Nenhum treino ainda</Text>
          <Text style={styles.emptySubtitle}>Comece a acompanhar seu progresso na academia!</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => navigation.navigate('NewWorkout')}
          >
            <Text style={styles.startButtonText}>Criar Primeiro Treino</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workouts}
          renderItem={renderWorkoutItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerSpacer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  workoutCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutTypeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  workoutTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutMainInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  workoutStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  exercisePreview: {
    marginBottom: 12,
  },
  exercisePreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exercisePreviewText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  workoutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  workoutTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  workoutTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});