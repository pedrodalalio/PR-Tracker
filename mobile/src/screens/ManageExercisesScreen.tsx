import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exerciseApi } from '../services/api';
import { Exercise, CreateExerciseRequest } from '../types/workout';

export default function ManageExercisesScreen({ navigation }: any) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    'Superiores' | 'Inferiores' | 'Cardio' | 'all'
  >('all');

  // Form state
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseCategory, setExerciseCategory] = useState<
    'Superiores' | 'Inferiores' | 'Cardio'
  >('Superiores');
  const [muscleGroupInput, setMuscleGroupInput] = useState('');
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);

  const categories: ('Superiores' | 'Inferiores' | 'Cardio')[] = [
    'Superiores',
    'Inferiores',
    'Cardio',
  ];

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const exercisesData = await exerciseApi.getExercises();
      setExercises(exercisesData);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar exercícios');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setExerciseName(exercise.name);
    setExerciseCategory(exercise.category);
    setMuscleGroups([...exercise.muscleGroups]);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setEditingExercise(null);
    setExerciseName('');
    setExerciseCategory('Upper');
    setMuscleGroupInput('');
    setMuscleGroups([]);
  };

  const addMuscleGroup = () => {
    const trimmed = muscleGroupInput.trim();
    if (trimmed && !muscleGroups.includes(trimmed)) {
      setMuscleGroups([...muscleGroups, trimmed]);
      setMuscleGroupInput('');
    }
  };

  const removeMuscleGroup = (index: number) => {
    setMuscleGroups(muscleGroups.filter((_, i) => i !== index));
  };

  const saveExercise = async () => {
    if (!exerciseName.trim()) {
      Alert.alert('Erro', 'Por favor insira o nome do exercício');
      return;
    }

    if (muscleGroups.length === 0) {
      Alert.alert('Erro', 'Por favor adicione pelo menos um grupo muscular');
      return;
    }

    try {
      const exerciseData: CreateExerciseRequest = {
        name: exerciseName.trim(),
        category: exerciseCategory,
        muscleGroups,
      };

      if (editingExercise) {
        const updatedExercise = await exerciseApi.updateExercise(
          editingExercise.id,
          exerciseData,
        );
        setExercises(
          exercises.map(ex =>
            ex.id === editingExercise.id ? updatedExercise : ex,
          ),
        );
        Alert.alert('Sucesso', 'Exercício atualizado com sucesso!');
      } else {
        const newExercise = await exerciseApi.createExercise(exerciseData);
        setExercises([...exercises, newExercise]);
        Alert.alert('Sucesso', 'Exercício criado com sucesso!');
      }

      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar exercício');
    }
  };

  const deleteExercise = async (exerciseId: string) => {
    Alert.alert(
      'Excluir Exercício',
      'Are you sure you want to delete this exercise?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await exerciseApi.deleteExercise(exerciseId);
              setExercises(exercises.filter(ex => ex.id !== exerciseId));
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir exercício');
            }
          },
        },
      ],
    );
  };

  const getFilteredExercises = () => {
    if (selectedCategory === 'all') return exercises;
    return exercises.filter(ex => ex.category === selectedCategory);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      Upper: '#FF6B6B',
      Lower: '#4ECDC4',
      Cardio: '#45B7D1',
    };
    return colors[category as keyof typeof colors] || '#666';
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(item.category) },
            ]}
          >
            <Text style={styles.categoryBadgeText}>
              {item.category === 'Upper' ? 'Superiores' :
               item.category === 'Lower' ? 'Inferiores' :
               item.category === 'Cardio' ? 'Cardio' :
               item.category}
            </Text>
          </View>
        </View>
        <View style={styles.exerciseActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteExercise(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.muscleGroupsContainer}>
        {item.muscleGroups.map((muscle, index) => (
          <View key={index} style={styles.muscleGroup}>
            <Text style={styles.muscleGroupText}>{muscle}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Gerenciar Exercícios</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterContent}>
          {(['all', ...categories] as const).map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category &&
                    styles.categoryButtonTextActive,
                ]}
              >
                {category === 'all' ? 'Todos' :
                 category === 'Superiores' ? 'Superiores' :
                 category === 'Inferiores' ? 'Inferiores' :
                 category === 'Cardio' ? 'Cardio' :
                 category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredExercises()}
          renderItem={renderExerciseItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="barbell-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Nenhum exercício encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Crie seu primeiro exercício!
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingExercise ? 'Editar Exercício' : 'Novo Exercício'}
            </Text>
            <TouchableOpacity onPress={saveExercise}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome do Exercício</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o nome do exercício"
                value={exerciseName}
                onChangeText={setExerciseName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.categorySelector}>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categorySelectorButton,
                      exerciseCategory === category &&
                        styles.categorySelectorButtonActive,
                    ]}
                    onPress={() => setExerciseCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categorySelectorText,
                        exerciseCategory === category &&
                          styles.categorySelectorTextActive,
                      ]}
                    >
                      {category === 'Superiores' ? 'Superiores' :
                       category === 'Inferiores' ? 'Inferiores' :
                       category === 'Cardio' ? 'Cardio' :
                       category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Grupos Musculares</Text>
              <View style={styles.muscleGroupInput}>
                <TextInput
                  style={styles.muscleGroupTextInput}
                  placeholder="Digite o grupo muscular"
                  value={muscleGroupInput}
                  onChangeText={setMuscleGroupInput}
                  onSubmitEditing={addMuscleGroup}
                />
                <TouchableOpacity
                  style={styles.addMuscleButton}
                  onPress={addMuscleGroup}
                >
                  <Ionicons name="add" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.muscleGroupsList}>
                {muscleGroups.map((muscle, index) => (
                  <View key={index} style={styles.muscleGroupTag}>
                    <Text style={styles.muscleGroupTagText}>{muscle}</Text>
                    <TouchableOpacity onPress={() => removeMuscleGroup(index)}>
                      <Ionicons name="close-circle" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryFilter: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: 'white',
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
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  exerciseCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  exerciseActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  muscleGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  muscleGroup: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  muscleGroupText: {
    fontSize: 12,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categorySelectorButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  categorySelectorButtonActive: {
    backgroundColor: '#007AFF',
  },
  categorySelectorText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categorySelectorTextActive: {
    color: 'white',
  },
  muscleGroupInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  muscleGroupTextInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginRight: 8,
  },
  addMuscleButton: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  muscleGroupsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  muscleGroupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1f5fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  muscleGroupTagText: {
    fontSize: 14,
    color: '#0277bd',
    marginRight: 4,
  },
});
