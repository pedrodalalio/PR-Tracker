import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

import HomeScreen from '../screens/HomeScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ProgressScreen from '../screens/ProgressScreen';
import CalendarScreen from '../screens/CalendarScreen';
import NewWorkoutScreen from '../screens/NewWorkoutScreen';
import ManageExercisesScreen from '../screens/ManageExercisesScreen';
import GoalSettingsScreen from '../screens/GoalSettingsScreen';
import LoginScreen from '../screens/LoginScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  GoalSettings: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Workouts: undefined;
  Exercises: undefined;
  Progress: undefined;
  Calendar: undefined;
};

export type WorkoutStackParamList = {
  WorkoutsList: undefined;
  WorkoutDetail: { workoutId: string };
  NewWorkout: undefined;
};

export type ExerciseStackParamList = {
  ExercisesList: undefined;
  ManageExercises: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const WorkoutStack = createNativeStackNavigator<WorkoutStackParamList>();
const ExerciseStack = createNativeStackNavigator<ExerciseStackParamList>();

function WorkoutStackNavigator() {
  return (
    <WorkoutStack.Navigator>
      <WorkoutStack.Screen
        name="WorkoutsList"
        component={WorkoutsScreen}
        options={({ navigation }) => ({
          title: 'My Workouts',
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => navigation.navigate('NewWorkout')}
            >
              <Ionicons name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        })}
      />
      <WorkoutStack.Screen
        name="WorkoutDetail"
        component={WorkoutDetailScreen}
        options={{ title: 'Workout Details' }}
      />
      <WorkoutStack.Screen
        name="NewWorkout"
        component={NewWorkoutScreen}
        options={{ headerShown: false }}
      />
    </WorkoutStack.Navigator>
  );
}

function ExerciseStackNavigator() {
  return (
    <ExerciseStack.Navigator>
      <ExerciseStack.Screen
        name="ExercisesList"
        component={ExercisesScreen}
        options={({ navigation }) => ({
          title: 'Exercises',
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => navigation.navigate('ManageExercises')}
            >
              <Ionicons name="settings" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        })}
      />
      <ExerciseStack.Screen
        name="ManageExercises"
        component={ManageExercisesScreen}
        options={{ headerShown: false }}
      />
    </ExerciseStack.Navigator>
  );
}

function TabNavigator() {
  const { logout, user, isGuest } = useAuth();

  const handleLogout = () => {
    console.log('Logout button pressed');
    Alert.alert(
      'Logout',
      `Are you sure you want to logout?${isGuest ? ' You will lose any demo changes made.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => {
          console.log('User confirmed logout');
          try {
            await logout();
            console.log('Logout completed successfully');
          } catch (error) {
            console.error('Logout failed:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        }}
      ]
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Workouts':
              iconName = focused ? 'fitness' : 'fitness-outline';
              break;
            case 'Exercises':
              iconName = focused ? 'barbell' : 'barbell-outline';
              break;
            case 'Progress':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
            case 'Calendar':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerTitle: route.name,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            {isGuest && (
              <View style={{
                backgroundColor: '#34C759',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                marginRight: 10,
              }}>
                <Ionicons name="eye-outline" size={12} color="white" />
              </View>
            )}
            <TouchableOpacity onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Workouts" component={WorkoutStackNavigator} />
      <Tab.Screen name="Exercises" component={ExerciseStackNavigator} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, login } = useAuth();

  const handleLogin = async (type: 'admin' | 'guest', credentials?: { username: string; password: string }) => {
    const success = await login(type, credentials);
    if (!success && type === 'admin') {
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={TabNavigator} />
          <RootStack.Screen name="GoalSettings" component={GoalSettingsScreen} />
        </RootStack.Navigator>
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </NavigationContainer>
  );
}