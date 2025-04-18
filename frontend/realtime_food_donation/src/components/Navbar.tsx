// components/Navbar.tsx
import { FC } from 'react';
import '../styles/Navbar.css';

interface NavbarProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
  isAuthenticated?: boolean;
  isDriverAuthenticated?: boolean;
  onLogout?: () => void;
  onDriverLogout?: () => void;
  userData?: any;
  driverData?: any;
}

const Navbar: FC<NavbarProps> = ({ 
  onLoginClick, 
  onSignUpClick, 
  isAuthenticated = false,
  isDriverAuthenticated = false,
  onLogout,
  onDriverLogout,
  userData,
  driverData
}) => {
  // Determine if any user (regular or driver) is logged in
  const isAnyUserAuthenticated = isAuthenticated || isDriverAuthenticated;
  
  // Decide what text to show for logged-in user
  const getWelcomeText = () => {
    if (isDriverAuthenticated && driverData) {
      return `Driver: ${driverData.username}`;
    } else if (isAuthenticated && userData) {
      return `Hi, ${userData.username}`;
    }
    return 'User';
  };
  
  // Handle logout for appropriate user type
  const handleLogout = () => {
    if (isDriverAuthenticated && onDriverLogout) {
      onDriverLogout();
    } else if (isAuthenticated && onLogout) {
      onLogout();
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <a href="/" className="logo">Food App</a>
      </div>
      <div className="nav-right">
        <a href="#" className="nav-link">Get the App</a>
        
        {isAnyUserAuthenticated ? (
          <>
            <span className="nav-link user-greeting">{getWelcomeText()}</span>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }} 
              className="nav-link nav-button"
            >
              Sign out
            </a>
          </>
        ) : (
          <>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                onLoginClick();
              }} 
              className="nav-link"
            >
              Log in
            </a>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                onSignUpClick();
              }} 
              className="nav-link nav-button"
            >
              Sign up
            </a>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;