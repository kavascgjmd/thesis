import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import { UserProfile } from './components/profile/UserProfile';
// import { DriverProfile } from './components/profile/DriverProfile';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStatus } from './hooks/useAuthStatus';
import './App.css';
import FoodListingPage from './pages/FoodListingPage';
import FoodDetailPage from './pages/FoodDetailPage';
import PaymentConfirmationPage from './pages/PaymentConfirmationPage';
import DriverDashboard from './pages/DriverDashboard';
import DeliveryRequestsPage from './pages/DeliveryRequestPage';
import ActiveDeliveryPage from './pages/ActiveDeliveryPage';
import DeliveryHistory from './pages/DeliveryHistory';
import EarningsPage from './pages/EarningPages';

// Custom hook for driver authentication
const useDriverAuth = () => {
  const [isDriverAuthenticated, setIsDriverAuthenticated] = useState<boolean>(
    localStorage.getItem('driverToken') ? true : false
  );
  const [isDriverLoading, setIsDriverLoading] = useState<boolean>(false);
  
  return {
    isDriverAuthenticated,
    setIsDriverAuthenticated,
    isDriverLoading
  };
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStatus();
  const { isDriverAuthenticated, isDriverLoading } = useDriverAuth();
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/food" element={<FoodListingPage />} />
        <Route path="/food/:id" element={<FoodDetailPage />} />

        {/* Protected User Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              isLoading={isLoading}
            >
              <UserProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment/:orderId"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              isLoading={isLoading}
            >
              <PaymentConfirmationPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Driver Routes */}
        <Route
          path="/driver"
          element={
            <ProtectedRoute
              isAuthenticated={isDriverAuthenticated}
              isLoading={isDriverLoading}
            >
              <DriverDashboard />
            </ProtectedRoute>
          }
        />

        {/* <Route
          path="/driver/profile"
          element={
            <ProtectedRoute
              isAuthenticated={isDriverAuthenticated}
              isLoading={isDriverLoading}
            >
              <DriverProfile />
            </ProtectedRoute>
          }
        /> */}

        <Route
          path="/driver/requests"
          element={
            <ProtectedRoute
              isAuthenticated={isDriverAuthenticated}
              isLoading={isDriverLoading}
            >
              <DeliveryRequestsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver/active-delivery"
          element={
            <ProtectedRoute
              isAuthenticated={isDriverAuthenticated}
              isLoading={isDriverLoading}
            >
              <ActiveDeliveryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver/history"
          element={
            <ProtectedRoute
              isAuthenticated={isDriverAuthenticated}
              isLoading={isDriverLoading}
            >
              <DeliveryHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver/earnings"
          element={
            <ProtectedRoute
              isAuthenticated={isDriverAuthenticated}
              isLoading={isDriverLoading}
            >
              <EarningsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;