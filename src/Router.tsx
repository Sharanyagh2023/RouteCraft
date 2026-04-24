import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './App';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function isLoggedIn(): boolean {
  const raw = localStorage.getItem('user');
  if (!raw) return false;
  try {
    const user = JSON.parse(raw);
    return user && typeof user === 'object' && user.email;
  } catch {
    return false;
  }
}

export default function Router() {
  return (
    <Routes>
      <Route
        path="/"
        element={isLoggedIn() ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/track"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

