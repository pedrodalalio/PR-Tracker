import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

export interface LocalWorkout {
  id: string;
  userId: string;
  name: string;
  date: string;
  workoutType: string;
  dayOfWeek: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
  onlineId?: string; // ID do banco online quando sincronizado
}

export interface LocalWorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
  notes?: string;
  syncStatus: 'synced' | 'pending' | 'error';
  onlineId?: string;
}

export interface LocalSet {
  id: string;
  workoutExerciseId: string;
  reps: number;
  weight: number;
  duration?: number;
  distance?: number;
  pace?: number;
  syncStatus: 'synced' | 'pending' | 'error';
  onlineId?: string;
}

class LocalDatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'PRTracker.db',
        location: 'default',
      });

      await this.createTables();
      console.log('[LocalDB] Database initialized successfully');
    } catch (error) {
      console.error('[LocalDB] Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const queries = [
      // Workouts table
      `CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        workoutType TEXT NOT NULL,
        dayOfWeek TEXT NOT NULL,
        startTime TEXT,
        endTime TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending',
        onlineId TEXT
      )`,

      // Workout exercises table
      `CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY,
        workoutId TEXT NOT NULL,
        exerciseId TEXT NOT NULL,
        exerciseName TEXT NOT NULL,
        notes TEXT,
        syncStatus TEXT DEFAULT 'pending',
        onlineId TEXT,
        FOREIGN KEY (workoutId) REFERENCES workouts (id) ON DELETE CASCADE
      )`,

      // Sets table
      `CREATE TABLE IF NOT EXISTS sets (
        id TEXT PRIMARY KEY,
        workoutExerciseId TEXT NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL NOT NULL,
        duration INTEGER,
        distance REAL,
        pace REAL,
        syncStatus TEXT DEFAULT 'pending',
        onlineId TEXT,
        FOREIGN KEY (workoutExerciseId) REFERENCES workout_exercises (id) ON DELETE CASCADE
      )`,

      // Sync queue table
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tableName TEXT NOT NULL,
        recordId TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT,
        createdAt TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        lastError TEXT
      )`,
    ];

    for (const query of queries) {
      await this.db.executeSql(query);
    }
  }

  // Workout operations
  async saveWorkout(workout: Omit<LocalWorkout, 'syncStatus'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const workoutWithSync: LocalWorkout = {
      ...workout,
      syncStatus: 'pending',
    };

    await this.db.executeSql(
      `INSERT OR REPLACE INTO workouts
       (id, userId, name, date, workoutType, dayOfWeek, startTime, endTime, notes, createdAt, updatedAt, syncStatus, onlineId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workoutWithSync.id,
        workoutWithSync.userId,
        workoutWithSync.name,
        workoutWithSync.date,
        workoutWithSync.workoutType,
        workoutWithSync.dayOfWeek,
        workoutWithSync.startTime || null,
        workoutWithSync.endTime || null,
        workoutWithSync.notes || null,
        workoutWithSync.createdAt,
        workoutWithSync.updatedAt,
        workoutWithSync.syncStatus,
        workoutWithSync.onlineId || null,
      ]
    );

    // Add to sync queue if not already synced
    if (workoutWithSync.syncStatus === 'pending') {
      await this.addToSyncQueue('workouts', workout.id, 'CREATE', workoutWithSync);
    }
  }

  async getWorkouts(userId: string): Promise<LocalWorkout[]> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM workouts WHERE userId = ? ORDER BY date DESC',
      [userId]
    );

    const workouts: LocalWorkout[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      workouts.push(result.rows.item(i));
    }

    return workouts;
  }

  async getWorkout(id: string): Promise<LocalWorkout | null> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM workouts WHERE id = ?',
      [id]
    );

    return result.rows.length > 0 ? result.rows.item(0) : null;
  }

  // Workout exercise operations
  async saveWorkoutExercise(exercise: Omit<LocalWorkoutExercise, 'syncStatus'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const exerciseWithSync: LocalWorkoutExercise = {
      ...exercise,
      syncStatus: 'pending',
    };

    await this.db.executeSql(
      `INSERT OR REPLACE INTO workout_exercises
       (id, workoutId, exerciseId, exerciseName, notes, syncStatus, onlineId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        exerciseWithSync.id,
        exerciseWithSync.workoutId,
        exerciseWithSync.exerciseId,
        exerciseWithSync.exerciseName,
        exerciseWithSync.notes || null,
        exerciseWithSync.syncStatus,
        exerciseWithSync.onlineId || null,
      ]
    );

    if (exerciseWithSync.syncStatus === 'pending') {
      await this.addToSyncQueue('workout_exercises', exercise.id, 'CREATE', exerciseWithSync);
    }
  }

  async getWorkoutExercises(workoutId: string): Promise<LocalWorkoutExercise[]> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM workout_exercises WHERE workoutId = ?',
      [workoutId]
    );

    const exercises: LocalWorkoutExercise[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      exercises.push(result.rows.item(i));
    }

    return exercises;
  }

  // Set operations
  async saveSet(set: Omit<LocalSet, 'syncStatus'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setWithSync: LocalSet = {
      ...set,
      syncStatus: 'pending',
    };

    await this.db.executeSql(
      `INSERT OR REPLACE INTO sets
       (id, workoutExerciseId, reps, weight, duration, distance, pace, syncStatus, onlineId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        setWithSync.id,
        setWithSync.workoutExerciseId,
        setWithSync.reps,
        setWithSync.weight,
        setWithSync.duration || null,
        setWithSync.distance || null,
        setWithSync.pace || null,
        setWithSync.syncStatus,
        setWithSync.onlineId || null,
      ]
    );

    if (setWithSync.syncStatus === 'pending') {
      await this.addToSyncQueue('sets', set.id, 'CREATE', setWithSync);
    }
  }

  async getSets(workoutExerciseId: string): Promise<LocalSet[]> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM sets WHERE workoutExerciseId = ?',
      [workoutExerciseId]
    );

    const sets: LocalSet[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      sets.push(result.rows.item(i));
    }

    return sets;
  }

  // Sync queue operations
  private async addToSyncQueue(
    tableName: string,
    recordId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    data: any
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql(
      `INSERT INTO sync_queue (tableName, recordId, operation, data, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [
        tableName,
        recordId,
        operation,
        JSON.stringify(data),
        new Date().toISOString(),
      ]
    );
  }

  async getPendingSyncItems(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM sync_queue ORDER BY id ASC'
    );

    const items: any[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const item = result.rows.item(i);
      items.push({
        ...item,
        data: JSON.parse(item.data),
      });
    }

    return items;
  }

  async markSyncComplete(queueId: number, onlineId?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = await this.db.transaction();

    try {
      // Remove from sync queue
      await transaction.executeSql(
        'DELETE FROM sync_queue WHERE id = ?',
        [queueId]
      );

      // If we have an online ID, update the record to mark as synced
      if (onlineId) {
        await transaction.executeSql(
          'UPDATE workouts SET syncStatus = ?, onlineId = ? WHERE id = ?',
          ['synced', onlineId, queueId]
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async markSyncError(queueId: number, error: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql(
      'UPDATE sync_queue SET attempts = attempts + 1, lastError = ? WHERE id = ?',
      [error, queueId]
    );
  }

  async clearDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = ['workouts', 'workout_exercises', 'sets', 'sync_queue'];

    for (const table of tables) {
      await this.db.executeSql(`DELETE FROM ${table}`);
    }
  }
}

export const localDatabase = new LocalDatabaseService();