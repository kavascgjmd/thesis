import { useState } from 'react';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import Card from '../components/Card';
import '../styles/Homepage.css';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { useDriverAuth } from '../hooks/useDriverAuth';
import { SignInModal } from './SignInModal';
import { SignUpModal } from './SignUpModal';
import { DriverSignInModal } from './DriverSigninModal';
import { DriverSignUpModal } from './DriverSignUpModal';

const HomePage = () => {
  const { 
    isAuthenticated, 
    setIsAuthenticated, 
    isLoading,
    userData,
    logout 
  } = useAuthStatus();
  
  const { 
    isDriverAuthenticated, 
    setIsDriverAuthenticated,
    isDriverLoading,
    driverData,
    driverLogout
  } = useDriverAuth();
  
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showDriverSignInModal, setShowDriverSignInModal] = useState(false);
  const [showDriverSignUpModal, setShowDriverSignUpModal] = useState(false);
  
  const handleAuthModalClose = () => {
    setShowSignUpModal(false);
    setShowSignInModal(false);
    setShowDriverSignInModal(false);
    setShowDriverSignUpModal(false);
  };

  return (
    <div className="homepage">
      <Navbar
        onLoginClick={() => setShowSignInModal(true)}
        onSignUpClick={() => setShowSignUpModal(true)}
        isAuthenticated={isAuthenticated}
        isDriverAuthenticated={isDriverAuthenticated}
        onLogout={logout}
        onDriverLogout={driverLogout}
        userData={userData}
        driverData={driverData}
      />
      
      {showSignInModal && (
        <SignInModal
          onClose={handleAuthModalClose}
          setIsAuthenticated={setIsAuthenticated}
        />
      )}

      {showSignUpModal && (
        <SignUpModal
          onClose={handleAuthModalClose}
          setIsAuthenticated={setIsAuthenticated}
        />
      )}
      
      {showDriverSignInModal && (
        <DriverSignInModal
          onClose={handleAuthModalClose}
          setIsDriverAuthenticated={setIsDriverAuthenticated}
        />
      )}

      {showDriverSignUpModal && (
        <DriverSignUpModal
          onClose={handleAuthModalClose}
          setIsAuthenticated={setIsDriverAuthenticated}
        />
      )}

      <header className="hero-section">
        <div className="overlay">
          <h1 className="hero-title">Donate Food, Tatakae</h1>
          <div className="location-input">
            <img src="/" alt="Location Icon" />
            <input type="text" placeholder="Patna" />
            <SearchBar />
          </div>
        </div>
      </header>

      <section className="cards-section">
        <Card
          image="/order_online.jpeg"
          title="Order Online"
          description="Stay home and order to your doorstep"
        />
        <Card
          image="/dining.jpg"
          title="Dining"
          description="View the city's favourite dining venues"
        />
        <Card
          image="/donation_events.jpg"
          title="Live Events"
          description="Discover India's best events & concerts"
        />
      </section>
      
      {/* Driver login section with both login and signup options */}
      <div className="driver-login-container mt-8 text-center pb-8">
        <p className="text-gray-600 mb-3">Are you a delivery partner?</p>
        {isDriverLoading ? (
          <div className="flex justify-center">
            <p>Loading...</p>
          </div>
        ) : isDriverAuthenticated ? (
          <div className="flex justify-center">
            <a 
              href="/driver" 
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Go to Driver Dashboard
            </a>
          </div>
        ) : (
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => setShowDriverSignInModal(true)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition-colors"
            >
              Login as Driver
            </button>
            <button 
              onClick={() => setShowDriverSignUpModal(true)}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Become a Driver
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;