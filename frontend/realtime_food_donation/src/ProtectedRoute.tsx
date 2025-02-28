import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  isAuthenticated, 
  isLoading,
  children 
}) => {
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;