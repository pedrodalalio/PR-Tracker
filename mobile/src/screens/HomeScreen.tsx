import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { offlineWorkoutApi, offlineGoalsApi } from "../services/offlineApi";
import { SyncStatusIndicator } from "../components/SyncStatusIndicator";
import { Workout, WorkoutType, UserGoals, WeeklyProgress, StreakInfo } from "../types/workout";

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    thisWeekWorkouts: 0,
    totalWorkouts: 0,
    currentStreak: 0,
    recentPRs: 0,
    nextWorkoutType: null as WorkoutType | null,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, []),
  );

  const loadDashboardData = async () => {
    try {
      // Load all data in parallel
      const [workouts, goals, weekProgress, streak] = await Promise.all([
        offlineWorkoutApi.getWorkouts(),
        offlineGoalsApi.getGoals(),
        offlineGoalsApi.getWeekProgress(),
        offlineGoalsApi.getStreakInfo(),
      ]);

      // Sort workouts by date (newest first)
      const sortedWorkouts = workouts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setAllWorkouts(sortedWorkouts);
      setUserGoals(goals);
      setWeeklyProgress(weekProgress);
      setStreakInfo(streak);
      calculateDashboardStats(sortedWorkouts, weekProgress);
    } catch (error) {
      Alert.alert("Erro", "Falha ao carregar dados do painel");
      console.error("Dashboard loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (workouts: Workout[], weekProgress?: WeeklyProgress | null) => {
    // Use API data for week workouts if available, otherwise calculate
    const thisWeekWorkouts = weekProgress?.completedWorkouts ?? 0;

    // Recent PRs (workouts in last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recentPRs = workouts.filter(workout => {
      const [year, month, day] = workout.date.split('-');
      const workoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return workoutDate >= lastWeek;
    }).length;

    // Suggest next workout type based on proper schedule
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    let nextWorkoutType: WorkoutType | null = null;

    // Follow the schedule: Mon/Thu = upper, Tue/Fri = legs, rest = cardio
    if (dayOfWeek === 1 || dayOfWeek === 4) { // Monday or Thursday
      nextWorkoutType = 'upper';
    } else if (dayOfWeek === 2 || dayOfWeek === 5) { // Tuesday or Friday
      nextWorkoutType = 'legs';
    } else { // Wednesday, Saturday, Sunday
      nextWorkoutType = 'cardio';
    }

    // Check if user already did the scheduled workout today
    const todayString = today.toISOString().split('T')[0];
    const todayWorkouts = workouts.filter(w => w.date === todayString);

    if (todayWorkouts.length > 0) {
      const hasScheduledWorkout = todayWorkouts.some(w => w.workoutType === nextWorkoutType);

      if (hasScheduledWorkout) {
        // If scheduled workout is done, suggest cardio (if not upper/legs already)
        const hasUpperOrLegs = todayWorkouts.some(w => w.workoutType === 'upper' || w.workoutType === 'legs');
        if (!hasUpperOrLegs || !todayWorkouts.some(w => w.workoutType === 'cardio')) {
          nextWorkoutType = 'cardio';
        } else {
          nextWorkoutType = null; // All done for today
        }
      }
    }

    setDashboardStats({
      thisWeekWorkouts,
      totalWorkouts: workouts.length,
      currentStreak: streakInfo?.currentStreak ?? 0,
      recentPRs,
      nextWorkoutType,
    });
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString();
  };

  const getWorkoutTypeName = (type: WorkoutType): string => {
    const types = {
      upper: 'Membros Superiores',
      legs: 'Pernas',
      cardio: 'Cardio'
    };
    return types[type];
  };

  const getWorkoutTypeIcon = (type: WorkoutType): string => {
    const icons = {
      upper: 'body',
      legs: 'walk',
      cardio: 'heart'
    };
    return icons[type];
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom Dia! 🌅';
    if (hour < 17) return 'Boa Tarde! ☀️';
    return 'Boa Noite! 🌙';
  };

  const getWeekProgress = () => {
    const targetWorkouts = userGoals?.weeklyWorkoutGoal ?? 3;
    const progress = Math.min((dashboardStats.thisWeekWorkouts / targetWorkouts) * 100, 100);
    return progress;
  };

  const renderWeeklyProgress = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();
    const currentDay = today.getDay();

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);

    return (
      <View style={styles.weekProgressContainer}>
        <Text style={styles.sectionTitle}>Progresso da Semana</Text>
        <View style={styles.weekDays}>
          {days.map((day, index) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + index);
            const dateString = dayDate.toISOString().split('T')[0];

            const hasWorkout = weeklyProgress?.workouts.some(workout => workout.date === dateString) ?? false;
            const isToday = index === currentDay;
            const isPast = index < currentDay;
            const isFuture = index > currentDay;

            return (
              <View key={day} style={styles.weekDay}>
                <Text style={[styles.weekDayLabel, isToday && styles.todayLabel]}>{day}</Text>
                <View style={[
                  styles.weekDayCircle,
                  hasWorkout && styles.completedDay,
                  isToday && styles.todayCircle,
                  isPast && !hasWorkout && styles.missedDay,
                  isFuture && styles.futureDay,
                ]}>
                  {hasWorkout && <Ionicons name="checkmark" size={14} color="white" />}
                  {isToday && !hasWorkout && <Text style={styles.todayDot}>•</Text>}
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getWeekProgress()}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {dashboardStats.thisWeekWorkouts}/{userGoals?.weeklyWorkoutGoal ?? 3} treinos esta semana
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Carregando seu painel...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with greeting and streak */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.subtitle}>Vamos alcançar seus objetivos fitness!</Text>
          </View>
          <SyncStatusIndicator style={styles.syncStatus} />
        </View>
        {streakInfo && streakInfo.currentStreak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color="#FF6B35" />
            <Text style={styles.streakText}>{streakInfo.currentStreak} semanas seguidas!</Text>
            {streakInfo.bestStreak > streakInfo.currentStreak && (
              <Text style={styles.bestStreakText}>Melhor: {streakInfo.bestStreak}</Text>
            )}
          </View>
        )}
      </View>

      {/* Quick Action Button */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("Workouts", { screen: "NewWorkout" })}
      >
        <Ionicons name="add-circle" size={24} color="white" />
        <Text style={styles.primaryButtonText}>
          {dashboardStats.nextWorkoutType
            ? `Iniciar ${getWorkoutTypeName(dashboardStats.nextWorkoutType)}`
            : 'Novo Treino'}
        </Text>
        {dashboardStats.nextWorkoutType && (
          <Ionicons
            name={getWorkoutTypeIcon(dashboardStats.nextWorkoutType) as any}
            size={20}
            color="white"
          />
        )}
      </TouchableOpacity>

      {/* Weekly Progress */}
      {renderWeeklyProgress()}

      {/* Stats Grid */}
      <View style={styles.statsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suas Estatísticas</Text>
          <TouchableOpacity onPress={() => navigation.navigate('GoalSettings')}>
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="fitness" size={28} color="#007AFF" />
            <Text style={styles.statNumber}>{dashboardStats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total de Treinos</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color="#34C759" />
            <Text style={styles.statNumber}>{dashboardStats.thisWeekWorkouts}</Text>
            <Text style={styles.statLabel}>Esta Semana</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="flame" size={28} color="#FF6B35" />
            <Text style={styles.statNumber}>{streakInfo?.currentStreak ?? 0}</Text>
            <Text style={styles.statLabel}>Sequência</Text>
          </View>
        </View>
      </View>

      {/* Recent Workouts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Atividade Recente</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Workouts")}>
            <Text style={styles.seeAllText}>Ver Todos</Text>
          </TouchableOpacity>
        </View>

        {allWorkouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhum treino ainda!</Text>
            <Text style={styles.emptySubtitle}>Comece sua jornada fitness hoje</Text>
          </View>
        ) : (
          allWorkouts.slice(0, 3).map((workout) => (
            <TouchableOpacity
              key={workout.id}
              style={styles.workoutCard}
              onPress={() =>
                navigation.navigate("Workouts", {
                  screen: "WorkoutDetail",
                  params: { workoutId: workout.id },
                })
              }
            >
              <View style={styles.workoutHeader}>
                <View style={styles.workoutInfo}>
                  <Ionicons
                    name={getWorkoutTypeIcon(workout.workoutType) as any}
                    size={20}
                    color="#007AFF"
                  />
                  <Text style={styles.workoutName}>{workout.name}</Text>
                </View>
                <Text style={styles.workoutDate}>
                  {formatDate(workout.date)}
                </Text>
              </View>
              <Text style={styles.workoutDetails}>
                {workout.exercises.length} exercícios • {workout.exercises.reduce((total, ex) => total + ex.sets.length, 0)} séries
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Motivational Message */}
      {dashboardStats.totalWorkouts > 0 && streakInfo && (
        <View style={styles.motivationCard}>
          <Ionicons
            name={streakInfo.currentStreak >= 4 ? "trophy" : streakInfo.isOnTrack ? "checkmark-circle" : "flame"}
            size={24}
            color={streakInfo.currentStreak >= 4 ? "#FFD700" : streakInfo.isOnTrack ? "#34C759" : "#FF6B35"}
          />
          <Text style={styles.motivationText}>
            {streakInfo.currentStreak >= 4
              ? `${streakInfo.currentStreak} semanas seguidas! Você é imparável! 🏆`
              : streakInfo.isOnTrack
              ? `Meta da semana alcançada! Mantenha a sequência! 💪`
              : streakInfo.daysUntilDeadline > 0
              ? `${streakInfo.daysUntilDeadline} dias restantes para salvar sua sequência! 🔥`
              : "Sua sequência está em risco! Hora de treinar! ⚡"
            }
          </Text>
        </View>
      )}

      {/* Bottom padding */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
    backgroundColor: "#007AFF",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 12,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  streakText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  bestStreakText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    margin: 20,
    borderRadius: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 8,
  },
  weekProgressContainer: {
    backgroundColor: "white",
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  weekDays: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  weekDay: {
    alignItems: "center",
  },
  weekDayLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  todayLabel: {
    color: "#007AFF",
    fontWeight: "700",
  },
  weekDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  completedDay: {
    backgroundColor: "#34C759",
    borderColor: "#34C759",
  },
  todayCircle: {
    borderColor: "#007AFF",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  missedDay: {
    backgroundColor: "#ffebee",
    borderColor: "#ffcccb",
  },
  futureDay: {
    backgroundColor: "#f8f9fa",
  },
  todayDot: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#34C759",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  seeAllText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  statsSection: {
    margin: 20,
    marginTop: 0,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flex: 1,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontWeight: "600",
  },
  workoutCard: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  workoutInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginLeft: 8,
  },
  workoutDate: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  workoutDetails: {
    fontSize: 14,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  motivationCard: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  motivationText: {
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "600",
    marginLeft: 12,
    flex: 1,
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "500",
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  syncStatus: {
    marginLeft: 12,
  },
});
