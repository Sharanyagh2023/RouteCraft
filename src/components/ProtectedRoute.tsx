import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const raw = localStorage.getItem('user');
  let user: { name?: string; email?: string } | null = null;

  try {
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }

  if (!user || typeof user !== 'object' || !user.email) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

