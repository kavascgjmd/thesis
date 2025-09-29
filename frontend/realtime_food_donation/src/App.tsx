import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SimpleHomePage from './pages/SimpleHomepage';
import { UserProfile } from './components/profile/UserProfile';
import { DonorFoodDonations } from './components/profile/DonorFoodDonation';
// import { DriverProfile } from './components/profile/DriverProfile';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStatus } from './hooks/useAuthStatus';
import { useDriverAuth } from './hooks/useDriverAuth';
import './App.css';
import FoodListingPage from './pages/FoodListingPage';
import FoodDetailPage from './pages/FoodDetailPage';
import PaymentConfirmationPage from './pages/PaymentConfirmationPage';
import DriverDashboard from './pages/DriverDashboard';
import DeliveryRequestsPage from './pages/DeliveryRequestPage';
import ActiveDeliveryPage from './pages/ActiveDeliveryPage';
import DeliveryHistory from './pages/DeliveryHistory';
import EarningsPage from './pages/EarningPages';

const HomePageToggle: React.FC = () => {
  const [showSimpleView, setShowSimpleView] = useState<boolean>(true);
  
  const toggleView = () => {
    setShowSimpleView(!showSimpleView);
  };
  
  return showSimpleView ? (
    <SimpleHomePage toggleView={toggleView} />
  ) : (
    <HomePage toggleView={toggleView} />
  );
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStatus();
  const { isDriverAuthenticated, isDriverLoading } = useDriverAuth();
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes - Using our toggle component for the homepage */}
        <Route path="/" element={<HomePageToggle />} />
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
         <Route path="/donor/food-donations" element={<DonorFoodDonations />} />
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