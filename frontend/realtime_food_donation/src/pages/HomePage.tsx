import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ModelContainer from '../components/ModelContainer';
import Card from '../components/Card';
import '../styles/Homepage.css';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { useDriverAuth } from '../hooks/useDriverAuth';
import { SignInModal } from './SignInModal';
import { SignUpModal } from './SignUpModal';
import { DriverSignInModal } from './DriverSigninModal';
import { DriverSignUpModal } from './DriverSignUpModal';
import { preloadAssets } from '../utils/fbxLoader';
import FoodModelContainer from '../components/FoodModelContainer';
import TruckModelContainer from '../components/TruckModelContainer';

// Define asset paths
const ASSETS = {
  LOBA_MODEL: '/Loba.fbx',
  GUITAR_ANIMATION: '/Guitar Playing.fbx',
  SINGER_MODEL: '/Singer.fbx',
  SINGING_ANIMATION: '/Singing.fbx',
  GIBSON_GUITAR: '/Guitar.glb',
  MARSHALL_AMP: '/Marshal.glb',
  BRIDE_MODEL: '/Bride.fbx',
  BRIDE_ANIMATION: '/Bride twist.fbx',
  GROOM_MODEL: '/Groom.fbx',
  GROOM_ANIMATION: '/Groom Idle.fbx',
  GIRL : '/Girl.glb',
  SPEAKER_2 : '/Speaker2.glb',
  HALL : '/Hall.glb',
  ROUNDTABLE : '/Roundtable.glb',
  RECTANGULARTABLE : '/Rectangulartable.glb',
  BUFFET: '/Buffet.glb',
  SOPHIE_MODEL: '/Sophie.fbx',
  HIP_HOP_ANIMATION: '/Hip Hop Dancing.fbx',
  CH13 : '/Ch13.fbx',
  CH13_ANIMATION: '/Ch13dance.fbx',
  CH31 : '/Ch31.fbx',
  CH31_ANIMATION: '/Ch31dance.fbx',
  CH22 : '/Ch22.fbx',
  CH22_ANIMATION: '/Ch22dance.fbx',  
  BOSS : '/Boss.fbx',
  BOSS_ANIMATION: '/Bossdance.fbx',  
  BOSS_ANIMATION_2: '/Bossdance2.fbx',  
  SOPHIE_ANIMATION_2: '/Sophiedance2.fbx',
  
  // Adding Sophie's scroll animation sequences
  SOPHIE_TURN: '/Sophieturn.fbx',
  SOPHIE_JUMP: '/Sophiejump.fbx',
  SOPHIE_THANKING: '/Sophiethanking.fbx', // New thanking animation
  SOPHIE_POINTING: '/Sophiepointing.fbx', // New pointing animation
  SOPHIE_IDLE: '/Sophieidle.fbx',

  TRUCK: '/truck.glb',
  FOOD_GARBAGE: '/food_garbage.glb',
  FOOD: '/food.glb',
};

// Add the toggleView prop to HomePage
interface HomePageProps {
  toggleView: () => void;
}

const HomePage = ({ toggleView }: HomePageProps) => {
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
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Define the 3D models configuration
  const modelConfigs = [
    {
      modelPath: ASSETS.LOBA_MODEL,
      animationPath: ASSETS.GUITAR_ANIMATION,
      position: [-3.05, -2.1, -5.2] as [number, number, number],
      rotation: [0, Math.PI / 8, 0] as [number, number, number],
      scale: 0.05,
      guitarModelPath: ASSETS.GIBSON_GUITAR // Include the GLB guitar
    },
    // ... rest of the model configurations remain the same
    // (keeping the original model configs to maintain functionality)
    {
      modelPath: ASSETS.SINGER_MODEL,
      animationPath: ASSETS.SINGING_ANIMATION,
      position: [-1.5, -1.4, -5] as [number, number, number],
      rotation: [0, -Math.PI / 8, 0] as [number, number, number],
      scale: 0.125
    },
    // Add the Marshall amp as a static model (no animation)
    {
      staticModelPath: ASSETS.MARSHALL_AMP,
      position: [-1.5, -1.4, -4] as [number, number, number], // Position in front of Loba
      rotation: [0, Math.PI / 4, 0] as [number, number, number], // Slightly angled toward the singer
      scale: 2, // Adjust as needed for the amp size
      isStatic: true // Flag to indicate this is a static model with no animation
    },
   
    // Add Groom model to the right of the Bride, facing left (toward Bride)
    {
      modelPath: ASSETS.GROOM_MODEL,
      animationPath: ASSETS.GROOM_ANIMATION,
      position: [0.8, -1.25, -2] as [number, number, number],
      rotation: [0, -Math.PI * 1.8/ 4, 0] as [number, number, number], // Facing left
      scale: 0.1
    },
    
    {
      staticModelPath: ASSETS.SPEAKER_2,
      position: [7, -1.5, -8] as [number, number, number], // Position behind the bride
      rotation: [0, Math.PI / 4, 0] as [number, number, number], // Similar rotation to the bride
      scale: 0.005, // Adjust scale as needed
      isStatic: true // Flag to indicate this is a static model
    },
    {
      staticModelPath: ASSETS.GIRL,
      position: [0.2, -1.25, -2] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number], // Facing right
      scale: 1,
      isStatic: true // Flag to indicate this is a static model with no animation
    },
    {
      staticModelPath: ASSETS.HALL,
      position: [-4, 4, 6] as [number, number, number], // Position behind the bride
      rotation: [0, Math.PI/2, 0] as [number, number, number], // Similar rotation to the bride
      scale: 0.5, // Adjust scale as needed
      isStatic: true // Flag to indicate this is a static model
    },
    {
      staticModelPath: ASSETS.ROUNDTABLE,
      position: [-0.7, -1, 4] as [number, number, number], // Position behind the bride
      rotation: [0, 0, 0] as [number, number, number], // Similar rotation to the bride
      scale: 0.75, // Adjust scale as needed
      isStatic: true // Flag to indicate this is a static model
    },
 
    {
      staticModelPath: ASSETS.RECTANGULARTABLE,
      position: [3.5, -2, 4] as [number, number, number], // Position behind the bride
      rotation: [0, 0, 0] as [number, number, number], // Similar rotation to the bride
      scale: 0.25, // Adjust scale as needed
      isStatic: true // Flag to indicate this is a static model
    },
    {
      staticModelPath: ASSETS.BUFFET,
      position: [3, -1, 4.35] as [number, number, number], // Position behind the bride
      rotation: [0, Math.PI/2, 0] as [number, number, number], // Similar rotation to the bride
      scale: 0.25, // Adjust scale as needed
      isStatic: true // Flag to indicate this is a static model
    },

    // Sophie with scroll animation capabilities
    {
      modelPath: ASSETS.SOPHIE_MODEL,
      // For normal state, use the hip hop animation
      animationPath: ASSETS.HIP_HOP_ANIMATION,
      alternateAnimationPath: ASSETS.SOPHIE_ANIMATION_2, // For hover effects
      position: [0.15, -1.4, 4], // Centered position within screen
      rotation: [0, -Math.PI, 0], // Facing the camera
      scale: 0.01,
      modelName: "Sophie",
      
      // Enable scroll animation for Sophie
      isScrollAnimated: true,
      breakOutOfScreen: true, // Enable the break-out-of-screen effect
      
      // Define all scroll animation paths
      scrollAnimationPaths: {
        turn: ASSETS.SOPHIE_TURN,         // Sophie turns to face the viewer
        jump: ASSETS.SOPHIE_JUMP,         // Sophie jumps out of the screen
        thanking: ASSETS.SOPHIE_THANKING, // Sophie thanking animation
        pointing: ASSETS.SOPHIE_POINTING, // Sophie pointing animation
        idle: ASSETS.SOPHIE_IDLE,         // Sophie's idle animation after sequence
        default: ASSETS.HIP_HOP_ANIMATION // Default animation when not in scroll sequence
      }
    },

    {
      modelPath: ASSETS.CH13,
      animationPath: ASSETS.CH13_ANIMATION,
      position: [1.5, -1.4, 1], // Positioned to the right side of the scene
      rotation: [0, -1.2*Math.PI, 0], // Slightly angled to face center
      scale: 0.1 // You might need to adjust this based on the model's actual size
    },
    {
      modelPath: ASSETS.CH31,
      animationPath: ASSETS.CH31_ANIMATION,
      position: [2.4, -1.4, 1.2], // Positioned to the right side of the scene
      rotation: [0, -Math.PI, 0], // Slightly angled to face center
      scale: 0.1 // You might need to adjust this based on the model's actual size
    },
    {
      modelPath: ASSETS.CH22,
      animationPath: ASSETS.CH22_ANIMATION,
      position: [3.0, -1.4, 0.6], // Positioned to the right side of the scene
      rotation: [0, -Math.PI*3/4, 0], // Slightly angled to face center
      scale: 0.1 // You might need to adjust this based on the model's actual size
    },
    {
      modelPath: ASSETS.BOSS,
      animationPath: ASSETS.BOSS_ANIMATION,
      alternateAnimationPath: ASSETS.BOSS_ANIMATION_2, // Add alternate animation for hover
      position: [-2.0, -1.4, 2.2], // Positioned to the right side of the scene
      rotation: [0, -1.2*Math.PI, 0], // Slightly angled to face center
      scale: 0.1, 
      modelName: "Boss" 
    },
  ];
  
  // Preload 3D assets
  useEffect(() => {
    // Start preloading all assets
    const assetsToPreload = Object.values(ASSETS);
    preloadAssets(assetsToPreload);
    
    // Set a timeout to indicate loading is complete
    const timer = setTimeout(() => {
      setModelLoaded(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
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
      
      {/* Toggle View Button */}
      <div className="toggle-container">
        <button className="toggle-view-btn" onClick={toggleView}>
          Switch to Simple View
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

      {/* Full-screen 3D Model Section with additional height for scroll animation */}
      <section className="fullscreen-model-section">
        <div className="sticky-viewport">
          {modelLoaded ? (
            <ModelContainer 
              models={modelConfigs}
              height="90vh"
              className="fullscreen-model-viewer"
              backgroundColor="#161616" // Slightly darker background
              enableScrollAnimation={true} // Enable scroll animation controller
            />
          ) : (
            <div className="fullscreen-loading" style={{ 
              height: '90vh', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              backgroundColor: '#000'
            }}>
              <div className="loading-spinner"></div>
              <p style={{ color: '#fff', marginTop: '20px' }}>Loading 3D Experience...</p>
            </div>
          )}
        </div>
        
        {/* Green section content with updated styling */}
        <div className="history-section-content">
          <div className="history-section-inner">
            <div className="history-heading">
              <h2>History</h2>
            </div>
            
            <div className="history-content-container">
              <div className="history-text-content">
                <p>Save delicious food from going to waste — order surplus food from weddings and celebrations right here. Planning ahead? You can also <em>preorder</em> food before the event even happens!</p>
                <p>Hosting an event? You can <strong>register as a donor</strong> and share extra food to help NGOs and people in need.</p>
                <p><strong>Fresh. Affordable. Sustainable. Compassionate.</strong> Join us in making a difference — one meal at a time.</p>
              </div>
              
              <div className="history-image-content">
                <div className="history-image-wrapper">
                  <img src="/kids.jpg" alt="Food sharing initiative" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Split canvas section with 3D models and driver login */}
        <div className="split-canvas-container">
          <div className="split-canvas">
            {/* Left side - Truck model with driver login */}
            <div className="split-canvas-left">
              <TruckModelContainer />
              
              {/* Driver login section - updated styling */}
              <div className="driver-login-container mt-8 text-center pb-8">
                <p className="text-gray-300 mb-3">Are you a delivery partner?</p>
                {isDriverLoading ? (
                  <div className="flex justify-center">
                    <p>Loading...</p>
                  </div>
                ) : isDriverAuthenticated ? (
                  <div className="flex justify-center">
                    <a 
                      href="/driver" 
                      className="driver-button primary"
                    >
                      Go to Driver Dashboard
                    </a>
                  </div>
                ) : (
                  <div className="flex justify-center space-x-8">
                    <button 
                      onClick={() => setShowDriverSignInModal(true)}
                      className="driver-button"
                    >
                      Login as Driver
                    </button>
                    <button 
                      onClick={() => setShowDriverSignUpModal(true)}
                      className="driver-button primary"
                    >
                      Become a Driver
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right side - Food model that changes on hover */}
            <div className="split-canvas-right">
              <FoodModelContainer />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;