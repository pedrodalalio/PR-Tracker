import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.set.deleteMany();
  await prisma.workoutExercise.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.exercise.deleteMany();

  // Seed exercises with your custom list
  const exercises = [
    // Upper Body Exercises
    {
      name: 'Supino reto na máquina',
      category: 'Upper' as const,
      muscleGroups: ['peito', 'tríceps', 'ombros']
    },
    {
      name: 'Crucifixo inclinado na máquina',
      category: 'Upper' as const,
      muscleGroups: ['peito', 'ombros']
    },
    {
      name: 'Peck Deck',
      category: 'Upper' as const,
      muscleGroups: ['peito', 'ombros anteriores']
    },
    {
      name: 'Puxada alta com pegada fechada e semi supinada',
      category: 'Upper' as const,
      muscleGroups: ['dorsais', 'bíceps', 'trapézio']
    },
    {
      name: 'Remada baixa unilateral na máquina',
      category: 'Upper' as const,
      muscleGroups: ['dorsais', 'romboides', 'bíceps']
    },
    {
      name: 'Remada articulada unilateral',
      category: 'Upper' as const,
      muscleGroups: ['dorsais', 'romboides', 'bíceps']
    },
    {
      name: 'Rosca direta com halteres',
      category: 'Upper' as const,
      muscleGroups: ['bíceps', 'antebraços']
    },
    {
      name: 'Rosca direta com halteres no banco inclinado',
      category: 'Upper' as const,
      muscleGroups: ['bíceps', 'antebraços']
    },
    {
      name: 'Tríceps carter',
      category: 'Upper' as const,
      muscleGroups: ['tríceps']
    },
    {
      name: 'Elevação lateral na máquina',
      category: 'Upper' as const,
      muscleGroups: ['deltoides médio', 'trapézio']
    },
    {
      name: 'Elevação lateral com halter',
      category: 'Upper' as const,
      muscleGroups: ['deltoides médio', 'trapézio']
    },
    {
      name: 'Desenvolvimento na máquina com anilhas',
      category: 'Upper' as const,
      muscleGroups: ['ombros', 'tríceps']
    },
    {
      name: 'Desenvolvimento na máquina sem anilhas',
      category: 'Upper' as const,
      muscleGroups: ['ombros', 'tríceps']
    },
    {
      name: 'Paralela na máquina',
      category: 'Upper' as const,
      muscleGroups: ['tríceps', 'peito', 'ombros']
    },
    {
      name: 'Elevação y na polia',
      category: 'Upper' as const,
      muscleGroups: ['deltoides posterior', 'romboides']
    },
    {
      name: 'Tríceps na polia',
      category: 'Upper' as const,
      muscleGroups: ['tríceps']
    },
    {
      name: 'Remada articulada sentado',
      category: 'Upper' as const,
      muscleGroups: ['dorsais', 'romboides', 'bíceps']
    },
    {
      name: 'Rosca martelo',
      category: 'Upper' as const,
      muscleGroups: ['bíceps', 'antebraços', 'braquial']
    },
    {
      name: 'Biceps na polia unilateral',
      category: 'Upper' as const,
      muscleGroups: ['bíceps', 'antebraços']
    },
    {
      name: 'Biceps na polia',
      category: 'Upper' as const,
      muscleGroups: ['bíceps', 'antebraços']
    },

    // Lower Body Exercises
    {
      name: 'Cadeira flexora',
      category: 'Lower' as const,
      muscleGroups: ['posteriores de coxa', 'glúteos']
    },
    {
      name: 'Stiff',
      category: 'Lower' as const,
      muscleGroups: ['posteriores de coxa', 'glúteos', 'lombar']
    },
    {
      name: 'Cadeira extensora',
      category: 'Lower' as const,
      muscleGroups: ['quadríceps']
    },
    {
      name: 'Cadeira adutora',
      category: 'Lower' as const,
      muscleGroups: ['adutores', 'glúteos']
    },
    {
      name: 'Leg press',
      category: 'Lower' as const,
      muscleGroups: ['quadríceps', 'glúteos', 'posteriores']
    },
    {
      name: 'Agachamento no hack',
      category: 'Lower' as const,
      muscleGroups: ['quadríceps', 'glúteos', 'posteriores']
    },
    {
      name: 'Panturrilha em pé na máquina',
      category: 'Lower' as const,
      muscleGroups: ['panturrilhas', 'sóleo']
    },
    {
      name: 'Elevação Pélvica',
      category: 'Lower' as const,
      muscleGroups: ['glúteos', 'posteriores de coxa']
    },
    {
      name: 'Panturrilha cavalinho',
      category: 'Lower' as const,
      muscleGroups: ['panturrilhas', 'sóleo']
    }
  ];

  for (const exercise of exercises) {
    await prisma.exercise.create({
      data: exercise
    });
  }

  // Your historical workout data (updated to 2025 for current week progress)
  const workoutData = [
    // Upper body workouts
    { date: '2025-06-23', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-06-30', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-07-03', type: 'upper' as const, day: 'thursday' as const },
    { date: '2025-07-07', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-07-10', type: 'upper' as const, day: 'thursday' as const },
    { date: '2025-07-14', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-07-17', type: 'upper' as const, day: 'thursday' as const },
    { date: '2025-07-21', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-07-24', type: 'upper' as const, day: 'thursday' as const },
    { date: '2025-07-28', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-07-31', type: 'upper' as const, day: 'thursday' as const },
    { date: '2025-08-04', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-08-11', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-08-18', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-08-25', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-08-28', type: 'upper' as const, day: 'thursday' as const },
    { date: '2025-09-08', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-09-22', type: 'upper' as const, day: 'monday' as const },
    { date: '2025-10-06', type: 'upper' as const, day: 'monday' as const },

    // Lower body workouts
    { date: '2025-06-24', type: 'legs' as const, day: 'tuesday' as const },
    { date: '2025-07-08', type: 'legs' as const, day: 'tuesday' as const },
    { date: '2025-07-11', type: 'legs' as const, day: 'friday' as const },
    { date: '2025-07-15', type: 'legs' as const, day: 'tuesday' as const },
    { date: '2025-07-18', type: 'legs' as const, day: 'friday' as const },
    { date: '2025-07-25', type: 'legs' as const, day: 'friday' as const },
    { date: '2025-07-29', type: 'legs' as const, day: 'tuesday' as const },
    { date: '2025-08-05', type: 'legs' as const, day: 'tuesday' as const },
    { date: '2025-08-19', type: 'legs' as const, day: 'tuesday' as const },
    { date: '2025-08-26', type: 'legs' as const, day: 'tuesday' as const },
    { date: '2025-10-07', type: 'legs' as const, day: 'tuesday' as const },
  ];

  // Exercise weight data (date -> weight mapping)
  const exerciseWeights: Record<string, Record<string, number>> = {
    'Supino reto na máquina': {
      '2025-06-23': 35, '2025-06-30': 35, '2025-07-03': 30, '2025-07-07': 35, '2025-07-10': 35,
      '2025-07-14': 35, '2025-07-17': 35, '2025-07-21': 40, '2025-07-24': 40, '2025-07-28': 40,
      '2025-07-31': 45, '2025-08-04': 40, '2025-08-11': 40, '2025-08-18': 40, '2025-08-25': 40,
      '2025-08-28': 40, '2025-09-08': 35, '2025-09-22': 40, '2025-10-06': 35
    },
    'Crucifixo inclinado na máquina': {
      '2025-06-23': 3, '2025-07-03': 3, '2025-07-07': 3, '2025-07-10': 3, '2025-07-14': 3,
      '2025-07-17': 3, '2025-07-21': 5, '2025-07-28': 5, '2025-08-04': 5, '2025-08-18': 5,
      '2025-09-22': 3
    },
    'Peck Deck': {
      '2025-06-23': 40, '2025-06-30': 35, '2025-07-28': 40, '2025-08-18': 40, '2025-09-08': 35
    },
    'Puxada alta com pegada fechada e semi supinada': {
      '2025-06-23': 40, '2025-06-30': 42.3, '2025-07-03': 42.3, '2025-07-07': 42.3, '2025-07-10': 44.6,
      '2025-07-14': 44.6, '2025-07-17': 47, '2025-07-21': 49.3, '2025-07-24': 49.3, '2025-07-28': 49.3,
      '2025-07-31': 49.3, '2025-08-04': 49.3, '2025-08-18': 49.3, '2025-09-08': 44.6, '2025-09-22': 44.6
    },
    'Remada articulada unilateral': {
      '2025-06-30': 30
    },
    'Rosca direta com halteres': {
      '2025-06-23': 8, '2025-07-28': 8, '2025-08-25': 6
    },
    'Rosca direta com halteres no banco inclinado': {
      '2025-06-30': 8, '2025-07-03': 8, '2025-07-07': 8, '2025-07-10': 8, '2025-07-17': 7,
      '2025-07-24': 8, '2025-09-08': 8, '2025-10-06': 8
    },
    'Tríceps carter': {
      '2025-06-30': 15, '2025-07-03': 15, '2025-07-07': 15, '2025-07-10': 10, '2025-07-14': 15,
      '2025-07-17': 15, '2025-07-24': 15, '2025-07-31': 15, '2025-08-18': 15, '2025-08-28': 15,
      '2025-09-22': 15, '2025-10-06': 15
    },
    'Elevação lateral na máquina': {
      '2025-07-28': 5
    },
    'Elevação lateral com halter': {
      '2025-06-30': 5
    },
    'Desenvolvimento na máquina com anilhas': {
      '2025-06-30': 10, '2025-07-03': 10, '2025-07-07': 10, '2025-07-14': 10, '2025-07-31': 10,
      '2025-09-22': 5
    },
    'Desenvolvimento na máquina sem anilhas': {
      '2025-07-10': 20, '2025-10-06': 25
    },
    'Paralela na máquina': {
      '2025-06-23': 40, '2025-07-03': 50, '2025-07-14': 50, '2025-07-21': 50
    },
    'Elevação y na polia': {
      '2025-06-23': 5, '2025-07-14': 10, '2025-07-17': 10, '2025-07-21': 10, '2025-09-22': 10
    },
    'Tríceps na polia': {
      '2025-06-23': 35, '2025-07-17': 30
    },
    'Remada articulada sentado': {
      '2025-07-03': 45, '2025-07-07': 35, '2025-07-14': 40, '2025-07-21': 40, '2025-07-24': 35,
      '2025-07-31': 30, '2025-08-11': 35, '2025-09-08': 30
    },
    'Rosca martelo': {
      '2025-07-14': 10
    },
    'Biceps na polia unilateral': {
      '2025-07-24': 15
    },
    'Biceps na polia': {
      '2025-07-28': 30, '2025-07-31': 30
    },
    'Cadeira flexora': {
      '2025-06-24': 50, '2025-08-04': 60, '2025-07-08': 60, '2025-07-11': 55, '2025-07-15': 60,
      '2025-07-18': 60, '2025-07-25': 60, '2025-07-29': 65, '2025-08-19': 65, '2025-08-26': 65,
      '2025-10-07': 60
    },
    'Stiff': {
      '2025-06-24': 20
    },
    'Cadeira extensora': {
      '2025-06-24': 70, '2025-08-04': 75, '2025-07-08': 80, '2025-07-11': 80, '2025-07-15': 80,
      '2025-07-18': 85, '2025-07-25': 85, '2025-07-29': 90, '2025-08-19': 85, '2025-08-26': 80,
      '2025-10-07': 75
    },
    'Cadeira adutora': {
      '2025-06-24': 60, '2025-08-04': 70, '2025-07-08': 70, '2025-07-11': 75, '2025-07-15': 70,
      '2025-07-18': 70, '2025-07-25': 70, '2025-07-29': 75, '2025-08-19': 75, '2025-08-26': 75,
      '2025-10-07': 65
    },
    'Leg press': {
      '2025-06-24': 140, '2025-07-11': 120, '2025-07-15': 140, '2025-07-18': 140, '2025-07-25': 150,
      '2025-07-29': 150, '2025-08-26': 140
    },
    'Agachamento no hack': {
      '2025-06-24': 40
    },
    'Panturrilha em pé na máquina': {
      '2025-06-24': 65, '2025-08-04': 75, '2025-07-08': 80, '2025-07-15': 80, '2025-07-25': 85,
      '2025-07-29': 90
    },
    'Elevação Pélvica': {
      '2025-08-04': 80, '2025-07-08': 90
    },
    'Panturrilha cavalinho': {
      '2025-07-18': 70, '2025-08-26': 80
    }
  };

  // Get all created exercises for reference
  const createdExercises = await prisma.exercise.findMany();
  const exerciseMap = new Map(createdExercises.map(ex => [ex.name, ex]));

  // Create workouts with exercises and sets
  for (const workoutInfo of workoutData) {
    const workout = await prisma.workout.create({
      data: {
        name: `${workoutInfo.type.charAt(0).toUpperCase()}${workoutInfo.type.slice(1)} Workout`,
        date: new Date(workoutInfo.date + 'T10:00:00.000Z'),
        workoutType: workoutInfo.type,
        dayOfWeek: workoutInfo.day,
        startTime: new Date(workoutInfo.date + 'T10:00:00.000Z'),
        endTime: new Date(workoutInfo.date + 'T11:30:00.000Z'),
      }
    });

    // Add exercises that have data for this date
    for (const [exerciseName, dateWeights] of Object.entries(exerciseWeights)) {
      if (dateWeights[workoutInfo.date]) {
        const exercise = exerciseMap.get(exerciseName);
        if (exercise) {
          const workoutExercise = await prisma.workoutExercise.create({
            data: {
              workoutId: workout.id,
              exerciseId: exercise.id,
            }
          });

          // Create one set with the recorded weight
          await prisma.set.create({
            data: {
              workoutExerciseId: workoutExercise.id,
              reps: 12, // Default reps since not specified in your data
              weight: dateWeights[workoutInfo.date],
            }
          });
        }
      }
    }

    console.log(`Created workout for ${workoutInfo.date} (${workoutInfo.type})`);
  }

  console.log('Database seeded successfully with all your historical data!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });