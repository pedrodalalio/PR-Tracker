# PR-Tracker

A comprehensive workout and fitness tracking application with a mobile React Native frontend and Node.js backend.

## 📱 Features

- **Workout Tracking**: Create and log workouts with exercises, sets, reps, and weights
- **Exercise Management**: Comprehensive exercise database with muscle group categorization
- **Progress Monitoring**: Visual progress tracking with charts and statistics
- **Calendar View**: Monthly calendar showing workout history
- **Workout Types**: Support for Upper body, Legs, and Cardio workouts
- **Daily Streaks**: Track consecutive workout days

## 🏗️ Architecture

### Backend
- **Framework**: Fastify with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **API**: RESTful API with CORS support
- **Port**: 3000

### Mobile App
- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **Charts**: React Native Chart Kit
- **State**: React hooks with local state management

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Expo CLI (for mobile development)

### Backend Setup

1. **Clone and install dependencies:**
   ```bash
   cd backend
   pnpm install
   ```

2. **Database setup:**
   ```bash
   # Copy environment template and configure PostgreSQL connection
   cp .env.example .env
   # Update DATABASE_URL in .env with your PostgreSQL connection string
   ```

3. **Run database migrations:**
   ```bash
   pnpm prisma migrate dev
   ```

4. **Seed the database (optional):**
   ```bash
   pnpm prisma db seed
   ```

5. **Start development server:**
   ```bash
   pnpm dev
   ```

### Mobile Setup

1. **Install dependencies:**
   ```bash
   cd mobile
   pnpm install
   ```

2. **Start Metro bundler:**
   ```bash
   pnpm start
   ```

3. **Run on device/simulator:**
   ```bash
   # iOS (macOS only)
   pnpm run ios

   # Android
   pnpm run android
   ```

## 📚 API Endpoints

### Workouts
- `GET /api/workouts` - Get all workouts
- `GET /api/workouts/:id` - Get specific workout
- `POST /api/workouts` - Create new workout
- `PUT /api/workouts/:id` - Update workout
- `DELETE /api/workouts/:id` - Delete workout

### Exercises
- `GET /api/exercises` - Get all exercises
- `POST /api/exercises` - Create new exercise
- `PUT /api/exercises/:id` - Update exercise
- `DELETE /api/exercises/:id` - Delete exercise

### Goals
- `GET /api/goals` - Get user goals and progress

## 🛠️ Development

### Available Scripts

**Backend:**
- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

**Mobile:**
- `pnpm start` - Start Metro bundler
- `pnpm run android` - Run on Android
- `pnpm run ios` - Run on iOS
- `pnpm lint` - Run ESLint

### Database Management

```bash
# Generate Prisma client
pnpm prisma generate

# Reset database
pnpm prisma migrate reset

# View database in browser
pnpm prisma studio
```

## 📊 Tech Stack

**Backend:**
- Fastify
- TypeScript
- Prisma ORM
- PostgreSQL
- Helmet (security)

**Mobile:**
- React Native
- Expo
- TypeScript
- React Navigation
- React Native Chart Kit
- Expo Vector Icons

## 📄 License

This project is licensed under the MIT License.
