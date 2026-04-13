import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import RecruitmentModule from './modules/recruitment/RecruitmentModule';
import InterviewModule from './modules/interview/InterviewModule';
import HiringModule from './modules/hiring/HiringModule';
import OnboardingModule from './modules/onboarding/OnboardingModule';
import PerformanceModule from './modules/performance/PerformanceModule';
import ExitModule from './modules/exit/ExitModule';
import SupervisorModule from './modules/supervisor/SupervisorModule';
import AnalyticsModule from './modules/analytics/AnalyticsModule';
import SettingsModule from './modules/settings/SettingsModule';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DirectionRoute({ children }: { children: React.ReactNode }) {
  const authRole = useStore((s) => s.authRole);
  if (authRole !== 'direction') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<SupervisorModule />} />
          <Route path="recruitment" element={<RecruitmentModule />} />
          <Route path="interview" element={<InterviewModule />} />
          <Route path="hiring" element={<HiringModule />} />
          <Route path="onboarding" element={<OnboardingModule />} />
          <Route path="performance" element={<PerformanceModule />} />
          <Route path="exit" element={<ExitModule />} />
          <Route path="analytics" element={<AnalyticsModule />} />
          <Route
            path="settings"
            element={
              <DirectionRoute>
                <SettingsModule />
              </DirectionRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}
