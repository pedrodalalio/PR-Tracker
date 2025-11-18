// Mapeamento entre português (frontend) e inglês (backend)
export const CategoryMapping = {
  // Frontend -> Backend
  toBackend: {
    'Superiores': 'Upper',
    'Inferiores': 'Lower',
    'Cardio': 'Cardio'
  } as const,

  // Backend -> Frontend
  toFrontend: {
    'Upper': 'Superiores',
    'Lower': 'Inferiores',
    'Cardio': 'Cardio'
  } as const
};

export const WorkoutTypeMapping = {
  // Frontend -> Backend
  toBackend: {
    'upper': 'upper',
    'lower': 'lower',
    'cardio': 'cardio'
  } as const,

  // Backend -> Frontend
  toFrontend: {
    'upper': 'upper',
    'lower': 'lower',
    'cardio': 'cardio'
  } as const
};

// Tipos para facilitar o uso
export type BackendCategory = 'Upper' | 'Lower' | 'Cardio';
export type FrontendCategory = 'Superiores' | 'Inferiores' | 'Cardio';
export type BackendWorkoutType = 'upper' | 'lower' | 'cardio';
export type FrontendWorkoutType = 'upper' | 'lower' | 'cardio';

// Funções utilitárias
export const mapCategoryToBackend = (category: FrontendCategory): BackendCategory => {
  return CategoryMapping.toBackend[category];
};

export const mapCategoryToFrontend = (category: BackendCategory): FrontendCategory => {
  return CategoryMapping.toFrontend[category];
};

export const mapWorkoutTypeToBackend = (workoutType: FrontendWorkoutType): BackendWorkoutType => {
  return WorkoutTypeMapping.toBackend[workoutType];
};

export const mapWorkoutTypeToFrontend = (workoutType: BackendWorkoutType): FrontendWorkoutType => {
  return WorkoutTypeMapping.toFrontend[workoutType];
};