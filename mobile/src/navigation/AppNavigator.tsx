import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ProgressScreen from '../screens/ProgressScreen';
import CalendarScreen from '../screens/CalendarScreen';
import NewWorkoutScreen from '../screens/NewWorkoutScreen';
import ManageExercisesScreen from '../screens/ManageExercisesScreen';
import GoalSettingsScreen from '../screens/GoalSettingsScreen';

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
        options={{ title: 'New Workout' }}
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
              iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
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
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={TabNavigator} />
        <RootStack.Screen name="GoalSettings" component={GoalSettingsScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}