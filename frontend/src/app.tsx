import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { RequireAnonymous, RequireAuth } from "@/components/require-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { queryClient } from "@/lib/query-client";
import { startSyncManager } from "@/lib/sync";
import { CalendarPage } from "@/pages/calendar-page";
import { CalendarProgressPage } from "@/pages/calendar-progress-page";
import { EditWorkoutPage } from "@/pages/edit-workout-page";
import { ExercisesPage } from "@/pages/exercises-page";
import { GoalSettingsPage } from "@/pages/goal-settings-page";
import { HomePage } from "@/pages/home-page";
import { LoginPage } from "@/pages/login-page";
import { ManageExercisesPage } from "@/pages/manage-exercises-page";
import { NewWorkoutPage } from "@/pages/new-workout-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { ProgressPage } from "@/pages/progress-page";
import { RegisterPage } from "@/pages/register-page";
import { ReportsPage } from "@/pages/reports-page";
import { NewRunPage } from "@/pages/new-run-page";
import { RunDetailPage } from "@/pages/run-detail-page";
import { RunsPage } from "@/pages/runs-page";
import { WorkoutDetailPage } from "@/pages/workout-detail-page";
import { WorkoutsPage } from "@/pages/workouts-page";

export default function App() {
  useEffect(() => {
    return startSyncManager();
  }, []);

  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route
                path="/login"
                element={
                  <RequireAnonymous>
                    <LoginPage />
                  </RequireAnonymous>
                }
              />
              <Route
                path="/register"
                element={
                  <RequireAnonymous>
                    <RegisterPage />
                  </RequireAnonymous>
                }
              />
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<HomePage />} />
                <Route path="workouts" element={<WorkoutsPage />} />
                <Route path="workouts/new" element={<NewWorkoutPage />} />
                <Route path="workouts/:id" element={<WorkoutDetailPage />} />
                <Route path="workouts/:id/edit" element={<EditWorkoutPage />} />
                <Route path="exercises" element={<ExercisesPage />} />
                <Route
                  path="exercises/manage"
                  element={<ManageExercisesPage />}
                />
                <Route path="calendar" element={<CalendarPage />} />
                <Route
                  path="calendar/progress"
                  element={<CalendarProgressPage />}
                />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="runs" element={<RunsPage />} />
                <Route path="runs/new" element={<NewRunPage />} />
                <Route path="runs/:id" element={<RunDetailPage />} />
                <Route path="goals" element={<GoalSettingsPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
