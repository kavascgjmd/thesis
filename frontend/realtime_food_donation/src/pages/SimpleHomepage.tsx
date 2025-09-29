import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/SimpleHomepage.css';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { useDriverAuth } from '../hooks/useDriverAuth';
import { SignInModal } from './SignInModal';
import { SignUpModal } from './SignUpModal';
import { DriverSignInModal } from './DriverSigninModal';
import { DriverSignUpModal } from './DriverSignUpModal';

const SimpleHomePage = ({ toggleView }) => {
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
  
  const [showSignUpModal, setShowSignUpModal] = React.useState(false);
  const [showSignInModal, setShowSignInModal] = React.useState(false);
  const [showDriverSignInModal, setShowDriverSignInModal] = React.useState(false);
  const [showDriverSignUpModal, setShowDriverSignUpModal] = React.useState(false);
  
  const handleAuthModalClose = () => {
    setShowSignUpModal(false);
    setShowSignInModal(false);
    setShowDriverSignInModal(false);
    setShowDriverSignUpModal(false);
  };

  return (
    <div className="simple-homepage">
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
      
      <div className="toggle-container">
        <button className="toggle-view-btn" onClick={toggleView}>
          Switch to 3D View
        </button>
      </div>
      
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

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Second Serve</h1>
          <p>Reducing food waste, one meal at a time</p>
          <div className="hero-buttons">
            <a href="/food" className="primary-btn">Browse Food</a>
            <a href="#about" className="secondary-btn">Learn More</a>
          </div>
        </div>
      </section>
      
      {/* About Section */}
      <section className="about-section" id="about">
        <div className="section-container">
          <h2>History</h2>
          <div className="about-content">
            <div className="about-text">
              <p>Save delicious food from going to waste — order surplus food from weddings and celebrations right here. Planning ahead? You can also <em>preorder</em> food before the event even happens!</p>
              <p>Hosting an event? You can <strong>register as a donor</strong> and share extra food to help NGOs and people in need.</p>
              <p><strong>Fresh. Affordable. Sustainable. Compassionate.</strong> Join us in making a difference — one meal at a time.</p>
            </div>
            <div className="about-image">
              <img src="/kids.jpg" alt="Food sharing initiative" />
            </div>
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section className="services-section">
        <div className="section-container">
          <h2>Our Services</h2>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">🍽️</div>
              <h3>Food Rescue</h3>
              <p>Order surplus food from events at a discount and help reduce waste.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">🎁</div>
              <h3>Food Donation</h3>
              <p>Donate excess food from your events to those in need.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">🚚</div>
              <h3>Delivery Partners</h3>
              <p>Join our team of drivers to deliver food and earn extra income.</p>
              {isDriverLoading ? (
                <p>Loading...</p>
              ) : isDriverAuthenticated ? (
                <a href="/driver" className="driver-link">Driver Dashboard</a>
              ) : (
                <div className="driver-buttons">
                  <button onClick={() => setShowDriverSignInModal(true)}>Login</button>
                  <button onClick={() => setShowDriverSignUpModal(true)}>Sign Up</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="cta-section">
        <div className="section-container">
          <h2>Join Our Mission</h2>
          <p>Help us create a more sustainable future by rescuing food and reducing waste.</p>
          <div className="cta-buttons">
            <a href="/food" className="primary-btn">Order Food</a>
            {!isAuthenticated && (
              <button onClick={() => setShowSignUpModal(true)} className="secondary-btn">Create Account</button>
            )}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="footer">
        <div className="section-container">
          <div className="footer-content">
            <div className="footer-logo">
              <h3>Second Serve</h3>
              <p>Reducing food waste, one meal at a time</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Navigation</h4>
                <ul>
                  <li><a href="/">Home</a></li>
                  <li><a href="/food">Food Listings</a></li>
                  <li><a href="#about">About Us</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Services</h4>
                <ul>
                  <li><a href="/food">Order Food</a></li>
                  <li><a href="/donor/food-donations">Donate Food</a></li>
                  <li><a href="/driver">Become a Driver</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <ul>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Contact Us</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Second Serve. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SimpleHomePage;