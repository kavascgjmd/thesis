// components/Navbar.tsx
import { FC } from 'react';
import '../styles/Navbar.css';

interface NavbarProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

const Navbar: FC<NavbarProps> = ({ onLoginClick, onSignUpClick }) => {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <a href="/" className="logo">Food App</a>
      </div>
      <div className="nav-right">
        <a href="#" className="nav-link">Get the App</a>
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
      </div>
    </nav>
  );
};

export default Navbar;
