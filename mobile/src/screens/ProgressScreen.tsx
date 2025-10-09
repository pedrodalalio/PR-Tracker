import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { workoutApi } from "../services/api";
import {
  Workout,
  Exercise,
  WorkoutType,
  Set as WorkoutSet,
} from "../types/workout";

const { width } = Dimensions.get("window");

interface ExerciseProgress {
  exercise: Exercise;
  maxWeight: number;
  maxVolume: number;
  estimated1RM: number;
  workoutCount: number;
  totalSets: number;
  lastWorkout: string;
  progressData: {
    date: string;
    weight: number;
    reps: number;
    volume: number;
    estimated1RM: number;
    sets: number;
  }[];
  improvement: {
    weight: number;
    volume: number;
    oneRM: number;
  };
}

type ChartType = "weight";
type ViewMode = "individual" | "comparison";

interface MuscleGroupProgress {
  muscleGroup: string;
  totalVolume: number;
  exerciseCount: number;
  improvement: number;
  workouts: number;
}

export default function ProgressScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>(
    [],
  );
  const [muscleGroupProgress, setMuscleGroupProgress] = useState<
    MuscleGroupProgress[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkoutType, setSelectedWorkoutType] =
    useState<WorkoutType>("upper");
  const [selectedTimeRange, setSelectedTimeRange] = useState<"month" | "all">(
    "all",
  );
  const [selectedChartType] = useState<ChartType>("weight");
  const [viewMode, setViewMode] = useState<ViewMode>("individual");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  useEffect(() => {
    if (workouts.length > 0) {
      calculateProgress();
    }
  }, [workouts, selectedTimeRange, selectedWorkoutType]);

  const loadData = async () => {
    try {
      const workoutsData = await workoutApi.getWorkouts();
      setWorkouts(workoutsData);
    } catch (error) {
      Alert.alert("Error", "Failed to load progress data");
    } finally {
      setLoading(false);
    }
  };

  // 1RM estimation using Brzycki formula
  const calculate1RM = (weight: number, reps: number): number => {
    if (reps === 1) return weight;
    if (reps > 36) return weight; // Formula becomes inaccurate beyond 36 reps
    return weight / (1.0278 - 0.0278 * reps);
  };

  // Calculate total volume for a set of sets
  const calculateVolume = (sets: WorkoutSet[]): number => {
    return sets.reduce((total, set) => {
      return total + (set.weight || 0) * (set.reps || 0);
    }, 0);
  };

  const calculateProgress = () => {
    const exerciseMap = new Map<string, ExerciseProgress>();
    const cutoffDate = getCutoffDate();

    // Filter by time range and workout type
    const filteredWorkouts = workouts.filter(
      (workout) =>
        new Date(workout.date) >= cutoffDate &&
        workout.workoutType === selectedWorkoutType,
    );

    filteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((workoutExercise) => {
        const exerciseId = workoutExercise.exercise.id;

        if (!exerciseMap.has(exerciseId)) {
          exerciseMap.set(exerciseId, {
            exercise: workoutExercise.exercise,
            maxWeight: 0,
            maxVolume: 0,
            estimated1RM: 0,
            workoutCount: 0,
            totalSets: 0,
            lastWorkout: workout.date,
            progressData: [],
            improvement: {
              weight: 0,
              volume: 0,
              oneRM: 0,
            },
          });
        }

        const progress = exerciseMap.get(exerciseId)!;
        const workoutDate = workout.date;

        // Calculate day's stats
        let dayMaxWeight = 0;
        let maxReps = 0;
        let dayMax1RM = 0;
        const dayVolume = calculateVolume(workoutExercise.sets);
        const dayTotalSets = workoutExercise.sets.length;

        workoutExercise.sets.forEach((set) => {
          const weight = set.weight || 0;
          const reps = set.reps || 0;

          if (weight > dayMaxWeight) {
            dayMaxWeight = weight;
            maxReps = reps;
          }

          const set1RM = calculate1RM(weight, reps);
          if (set1RM > dayMax1RM) {
            dayMax1RM = set1RM;
          }
        });

        // Update overall maxes
        if (dayMaxWeight > progress.maxWeight) {
          progress.maxWeight = dayMaxWeight;
        }
        if (dayVolume > progress.maxVolume) {
          progress.maxVolume = dayVolume;
        }
        if (dayMax1RM > progress.estimated1RM) {
          progress.estimated1RM = dayMax1RM;
        }

        progress.workoutCount++;
        progress.totalSets += dayTotalSets;

        if (new Date(workoutDate) > new Date(progress.lastWorkout)) {
          progress.lastWorkout = workoutDate;
        }

        progress.progressData.push({
          date: workoutDate,
          weight: dayMaxWeight,
          reps: maxReps,
          volume: dayVolume,
          estimated1RM: dayMax1RM,
          sets: dayTotalSets,
        });
      });
    });

    // Calculate improvement percentages and sort
    const progressArray = Array.from(exerciseMap.values())
      .filter((progress) => progress.workoutCount > 1)
      .map((progress) => {
        // Sort progress data by date
        progress.progressData.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        // Calculate improvements
        const firstData = progress.progressData[0];
        const lastData =
          progress.progressData[progress.progressData.length - 1];

        progress.improvement = {
          weight:
            firstData?.weight > 0
              ? ((lastData?.weight - firstData?.weight) / firstData?.weight) *
                100
              : 0,
          volume:
            firstData?.volume > 0
              ? ((lastData?.volume - firstData?.volume) / firstData?.volume) *
                100
              : 0,
          oneRM:
            firstData?.estimated1RM > 0
              ? ((lastData?.estimated1RM - firstData?.estimated1RM) /
                  firstData?.estimated1RM) *
                100
              : 0,
        };

        return progress;
      })
      .sort((a, b) => b.maxWeight - a.maxWeight);

    setExerciseProgress(progressArray);
  };

  const calculateMuscleGroupProgress = () => {
    const muscleMap = new Map<string, MuscleGroupProgress>();
    const cutoffDate = getCutoffDate();

    const filteredWorkouts = workouts.filter(
      (workout) =>
        new Date(workout.date) >= cutoffDate &&
        workout.workoutType === selectedWorkoutType,
    );

    filteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((workoutExercise) => {
        workoutExercise.exercise.muscleGroups.forEach((muscle) => {
          if (!muscleMap.has(muscle)) {
            muscleMap.set(muscle, {
              muscleGroup: muscle,
              totalVolume: 0,
              exerciseCount: 0,
              improvement: 0,
              workouts: 0,
            });
          }

          const progress = muscleMap.get(muscle)!;
          const volume = calculateVolume(workoutExercise.sets);

          progress.totalVolume += volume;
          progress.workouts++;
        });
      });
    });

    // Count unique exercises per muscle group
    exerciseProgress.forEach((progress) => {
      progress.exercise.muscleGroups.forEach((muscle) => {
        if (muscleMap.has(muscle)) {
          muscleMap.get(muscle)!.exerciseCount++;
        }
      });
    });

    const muscleArray = Array.from(muscleMap.values()).sort(
      (a, b) => b.totalVolume - a.totalVolume,
    );

    setMuscleGroupProgress(muscleArray);
  };

  const getCutoffDate = () => {
    const now = new Date();
    switch (selectedTimeRange) {
      case "month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "all":
      default:
        return new Date(0);
    }
  };

  const getWorkoutTypeStats = () => {
    const cutoffDate = getCutoffDate();
    const filteredWorkouts = workouts.filter(
      (workout) =>
        new Date(workout.date) >= cutoffDate &&
        workout.workoutType === selectedWorkoutType,
    );

    const totalWorkouts = filteredWorkouts.length;
    const uniqueExercises = new Set();

    filteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        uniqueExercises.add(exercise.exercise.id);
      });
    });

    return {
      totalWorkouts,
      uniqueExercises: uniqueExercises.size,
      averageImprovement:
        exerciseProgress.length > 0
          ? exerciseProgress.reduce(
              (sum, p) => sum + p.improvement[selectedChartType],
              0,
            ) / exerciseProgress.length
          : 0,
    };
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString();
  };

  const getTimeRangeText = () => {
    switch (selectedTimeRange) {
      case "month":
        return "Last 30 Days";
      case "all":
        return "All Time";
    }
  };

  const getChartTypeLabel = () => {
    return "Weight";
  };

  const formatChartValue = (value: number): string => {
    return `${value.toFixed(1)}kg`;
  };

  const getCurrentImprovement = (progress: ExerciseProgress): number => {
    return progress.improvement.weight;
  };

  const getCurrentMaxValue = (progress: ExerciseProgress): number => {
    return progress.maxWeight;
  };

  const getWorkoutTypeName = (type: WorkoutType): string => {
    const types = {
      upper: "Upper Body",
      legs: "Legs",
      cardio: "Cardio",
    };
    return types[type];
  };

  const getWorkoutTypeIcon = (type: WorkoutType): string => {
    switch (type) {
      case "upper":
        return "body";
      case "legs":
        return "walk";
      case "cardio":
        return "heart";
    }
  };

  const getWorkoutTypeColor = (type: WorkoutType): string => {
    switch (type) {
      case "upper":
        return "#007AFF";
      case "legs":
        return "#34C759";
      case "cardio":
        return "#FF3B30";
    }
  };

  const renderExerciseChart = (progress: ExerciseProgress) => {
    if (progress.progressData.length < 2) return null;

    const chartData = progress.progressData.slice(-8);
    const getValue = (d: (typeof chartData)[0]) => {
      return d.weight;
    };

    const data = {
      labels: chartData.map((d) => {
        const [year, month, day] = d.date.split("-");
        return `${parseInt(day)}/${parseInt(month)}`;
      }),
      datasets: [
        {
          data: chartData.map(getValue),
          color: (opacity = 1) => getWorkoutTypeColor(selectedWorkoutType),
          strokeWidth: 3,
        },
      ],
    };

    return (
      <View>
        <LineChart
          data={data}
          width={width - 80}
          height={180}
          chartConfig={{
            backgroundColor: "#f8f9fa",
            backgroundGradientFrom: "#f8f9fa",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 0,
            color: (opacity = 1) => getWorkoutTypeColor(selectedWorkoutType),
            labelColor: (opacity = 1) => "#333333",
            style: {
              borderRadius: 12,
            },
            propsForDots: {
              r: "6",
              strokeWidth: "3",
              stroke: "#ffffff",
              fill: getWorkoutTypeColor(selectedWorkoutType),
            },
            propsForBackgroundLines: {
              stroke: "#e0e0e0",
              strokeWidth: 1,
            },
            propsForLabels: {
              fontSize: 14,
              fontWeight: "600",
            },
          }}
          style={{
            marginVertical: 12,
            borderRadius: 12,
            marginLeft: 10,
            marginRight: 10,
          }}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={true}
          withHorizontalLines={true}
          fromZero={false}
          formatYLabel={(value) => `${Math.round(Number(value))}kg`}
        />
      </View>
    );
  };

  const renderComparisonChart = () => {
    if (selectedExercises.length === 0) return null;

    const selectedProgressData = exerciseProgress.filter((p) =>
      selectedExercises.includes(p.exercise.id),
    );

    if (selectedProgressData.length === 0) return null;

    // Create comparison data - use normalized values (percentage improvement)
    const maxDataPoints = Math.max(
      ...selectedProgressData.map((p) => p.progressData.length),
    );
    const colors = ["#007AFF", "#34C759", "#FF3B30", "#FF9500", "#AF52DE"];

    const data = {
      labels: Array.from(
        { length: Math.min(maxDataPoints, 8) },
        (_, i) => `${i + 1}`,
      ),
      datasets: selectedProgressData.map((progress, index) => {
        const normalizedData = progress.progressData.slice(-8).map((d, i) => {
          const firstValue = progress.progressData[0];
          const currentValue = d;
          const baseValue = firstValue.weight;
          const current = currentValue.weight;

          return baseValue > 0 ? ((current - baseValue) / baseValue) * 100 : 0;
        });

        return {
          data: normalizedData,
          color: (opacity = 1) => colors[index % colors.length],
          strokeWidth: 2,
        };
      }),
    };

    return (
      <View style={styles.comparisonContainer}>
        <Text style={styles.comparisonTitle}>Weight Progress Comparison</Text>
        <Text style={styles.comparisonSubtitle}>
          Percentage improvement from first workout
        </Text>
        <LineChart
          data={data}
          width={width - 60}
          height={220}
          chartConfig={{
            backgroundColor: "#f8f9fa",
            backgroundGradientFrom: "#f8f9fa",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 1,
            color: (opacity = 1) => "#333333",
            labelColor: (opacity = 1) => "#333333",
            style: {
              borderRadius: 12,
            },
            propsForDots: {
              r: "5",
              strokeWidth: "2",
            },
            propsForBackgroundLines: {
              stroke: "#e0e0e0",
              strokeWidth: 1,
            },
            propsForLabels: {
              fontSize: 12,
              fontWeight: "500",
            },
          }}
          style={{
            marginVertical: 12,
            borderRadius: 12,
            paddingRight: 20,
          }}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={true}
          withHorizontalLines={true}
          formatYLabel={(value) => `${value}%`}
        />
        <View style={styles.comparisonLegend}>
          {selectedProgressData.map((progress, index) => (
            <View key={progress.exercise.id} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: colors[index % colors.length] },
                ]}
              />
              <Text style={styles.legendText}>{progress.exercise.name}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMuscleGroupOverview = () => {
    if (muscleGroupProgress.length === 0) return null;

    const data = {
      labels: muscleGroupProgress
        .slice(0, 5)
        .map((m) => m.muscleGroup.slice(0, 8)),
      datasets: [
        {
          data: muscleGroupProgress.slice(0, 5).map((m) => m.totalVolume),
          color: (opacity = 1) => getWorkoutTypeColor(selectedWorkoutType),
        },
      ],
    };

    return (
      <View style={styles.muscleGroupContainer}>
        <Text style={styles.sectionTitle}>Muscle Group Volume</Text>
        <BarChart
          data={data}
          width={width - 40}
          height={160}
          chartConfig={{
            backgroundColor: "transparent",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 0,
            color: (opacity = 1) => getWorkoutTypeColor(selectedWorkoutType),
            labelColor: (opacity = 1) => "#666666",
            barPercentage: 0.7,
          }}
          style={{
            marginVertical: 8,
            borderRadius: 8,
          }}
        />
      </View>
    );
  };

  const toggleExerciseSelection = (exerciseId: string) => {
    setSelectedExercises((prev) => {
      if (prev.includes(exerciseId)) {
        return prev.filter((id) => id !== exerciseId);
      } else if (prev.length < 5) {
        return [...prev, exerciseId];
      }
      return prev;
    });
  };

  const renderExerciseSelector = () => {
    return (
      <Modal
        visible={showExerciseSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExerciseSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Exercises to Compare</Text>
              <TouchableOpacity onPress={() => setShowExerciseSelector(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.exerciseList}>
              {exerciseProgress.map((progress) => (
                <TouchableOpacity
                  key={progress.exercise.id}
                  style={[
                    styles.exerciseItem,
                    selectedExercises.includes(progress.exercise.id) &&
                      styles.exerciseItemSelected,
                  ]}
                  onPress={() => toggleExerciseSelection(progress.exercise.id)}
                >
                  <Text style={styles.exerciseItemName}>
                    {progress.exercise.name}
                  </Text>
                  <View style={styles.exerciseItemStats}>
                    <Text style={styles.exerciseItemStat}>
                      {formatChartValue(getCurrentMaxValue(progress))}
                    </Text>
                    <Text
                      style={[
                        styles.exerciseItemImprovement,
                        {
                          color:
                            getCurrentImprovement(progress) > 0
                              ? "#34C759"
                              : "#FF3B30",
                        },
                      ]}
                    >
                      {getCurrentImprovement(progress) > 0 ? "+" : ""}
                      {getCurrentImprovement(progress).toFixed(1)}%
                    </Text>
                  </View>
                  {selectedExercises.includes(progress.exercise.id) && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#007AFF"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading progress...</Text>
      </View>
    );
  }

  const stats = getWorkoutTypeStats();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercise Progress</Text>
        <View style={styles.headerControls}>
          <View style={styles.viewModeSelector}>
            {(["individual", "comparison"] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.viewModeButton,
                  viewMode === mode && styles.viewModeButtonActive,
                ]}
                onPress={() => setViewMode(mode)}
              >
                <Ionicons
                  name={mode === "individual" ? "list" : "stats-chart"}
                  size={16}
                  color={viewMode === mode ? "white" : "#666"}
                />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.timeRangeSelector}>
            {(["month", "all"] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  selectedTimeRange === range && styles.timeRangeButtonActive,
                ]}
                onPress={() => setSelectedTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeButtonText,
                    selectedTimeRange === range &&
                      styles.timeRangeButtonTextActive,
                  ]}
                >
                  {range === "month" ? "30D" : "All"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Workout Type Selector */}
      <View style={styles.workoutTypeSelector}>
        {(["upper", "legs", "cardio"] as WorkoutType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.workoutTypeButton,
              selectedWorkoutType === type && [
                styles.workoutTypeButtonActive,
                { backgroundColor: getWorkoutTypeColor(type) },
              ],
            ]}
            onPress={() => setSelectedWorkoutType(type)}
          >
            <Ionicons
              name={getWorkoutTypeIcon(type) as any}
              size={20}
              color={
                selectedWorkoutType === type
                  ? "white"
                  : getWorkoutTypeColor(type)
              }
            />
            <Text
              style={[
                styles.workoutTypeButtonText,
                selectedWorkoutType === type &&
                  styles.workoutTypeButtonTextActive,
              ]}
            >
              {getWorkoutTypeName(type)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>
          {getWorkoutTypeName(selectedWorkoutType)} - {getTimeRangeText()}
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons
              name="fitness"
              size={24}
              color={getWorkoutTypeColor(selectedWorkoutType)}
            />
            <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons
              name="barbell"
              size={24}
              color={getWorkoutTypeColor(selectedWorkoutType)}
            />
            <Text style={styles.statNumber}>{stats.uniqueExercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons
              name="analytics"
              size={24}
              color={getWorkoutTypeColor(selectedWorkoutType)}
            />
            <Text style={styles.statNumber}>
              {stats.averageImprovement.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Avg Improvement</Text>
          </View>
        </View>
      </View>

      {/* Muscle Group Overview */}
      {viewMode === "individual" && renderMuscleGroupOverview()}

      {/* Comparison View */}
      {viewMode === "comparison" && (
        <View style={styles.comparisonControls}>
          <TouchableOpacity
            style={styles.selectExercisesButton}
            onPress={() => setShowExerciseSelector(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.selectExercisesText}>
              Select Exercises ({selectedExercises.length}/5)
            </Text>
          </TouchableOpacity>
          {selectedExercises.length > 0 && (
            <TouchableOpacity
              style={styles.clearSelectionButton}
              onPress={() => setSelectedExercises([])}
            >
              <Text style={styles.clearSelectionText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {viewMode === "comparison" && renderComparisonChart()}

      {exerciseProgress.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="trending-up-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No progress data</Text>
          <Text style={styles.emptySubtitle}>
            Complete some workouts to see your progress!
          </Text>
        </View>
      ) : (
        <View style={styles.progressContainer}>
          {exerciseProgress.map((progress) => (
            <View key={progress.exercise.id} style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>
                    {progress.exercise.name}
                  </Text>
                  <Text style={styles.exerciseCategory}>
                    {progress.exercise.category}
                  </Text>
                </View>
                <View style={styles.improvementBadge}>
                  <Ionicons
                    name={
                      getCurrentImprovement(progress) > 0
                        ? "trending-up"
                        : getCurrentImprovement(progress) < 0
                          ? "trending-down"
                          : "remove"
                    }
                    size={16}
                    color={
                      getCurrentImprovement(progress) > 0
                        ? "#34C759"
                        : getCurrentImprovement(progress) < 0
                          ? "#FF3B30"
                          : "#666"
                    }
                  />
                  <Text
                    style={[
                      styles.improvementText,
                      {
                        color:
                          getCurrentImprovement(progress) > 0
                            ? "#34C759"
                            : getCurrentImprovement(progress) < 0
                              ? "#FF3B30"
                              : "#666",
                      },
                    ]}
                  >
                    {getCurrentImprovement(progress) > 0 ? "+" : ""}
                    {getCurrentImprovement(progress).toFixed(1)}%
                  </Text>
                </View>
              </View>

              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatNumber}>
                    {progress.maxWeight.toFixed(1)}kg
                  </Text>
                  <Text style={styles.progressStatLabel}>Max Weight</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatNumber}>
                    {progress.progressData[progress.progressData.length - 1]?.weight.toFixed(1)}kg
                  </Text>
                  <Text style={styles.progressStatLabel}>Last Weight</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatNumber}>
                    {progress.workoutCount}
                  </Text>
                  <Text style={styles.progressStatLabel}>Workouts</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatNumber}>
                    {formatDate(progress.lastWorkout)}
                  </Text>
                  <Text style={styles.progressStatLabel}>Last Done</Text>
                </View>
              </View>

              {viewMode === "individual" && renderExerciseChart(progress)}
            </View>
          ))}
        </View>
      )}

      {renderExerciseSelector()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "white",
    padding: 20,
    paddingTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  timeRangeSelector: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 2,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeRangeButtonActive: {
    backgroundColor: "#007AFF",
  },
  timeRangeButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  timeRangeButtonTextActive: {
    color: "white",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  statsContainer: {
    backgroundColor: "white",
    padding: 20,
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  workoutTypeSelector: {
    flexDirection: "row",
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  workoutTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  workoutTypeButtonActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutTypeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 6,
  },
  workoutTypeButtonTextActive: {
    color: "white",
  },
  progressContainer: {
    marginTop: 8,
    paddingBottom: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseCategory: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  improvementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  improvementText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
  },
  progressStat: {
    alignItems: "center",
    flex: 1,
  },
  progressStatNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  progressStatLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  viewModeSelector: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 2,
  },
  viewModeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewModeButtonActive: {
    backgroundColor: "#007AFF",
  },
  chartTypeSelector: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 2,
    marginBottom: 8,
  },
  chartTypeButton: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  chartTypeButtonActive: {
    backgroundColor: "#007AFF",
  },
  chartTypeButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  chartTypeButtonTextActive: {
    color: "white",
  },
  comparisonControls: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectExercisesButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f8ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  selectExercisesText: {
    marginLeft: 8,
    color: "#007AFF",
    fontWeight: "500",
  },
  clearSelectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearSelectionText: {
    color: "#FF3B30",
    fontWeight: "500",
  },
  comparisonContainer: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  comparisonSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  comparisonLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  muscleGroupContainer: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  exerciseList: {
    maxHeight: 400,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  exerciseItemSelected: {
    backgroundColor: "#f0f8ff",
  },
  exerciseItemName: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  exerciseItemStats: {
    alignItems: "flex-end",
    marginRight: 12,
  },
  exerciseItemStat: {
    fontSize: 14,
    color: "#666",
  },
  exerciseItemImprovement: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});
