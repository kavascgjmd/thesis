import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

interface DriverSignInFormData {
  username: string; // Changed from email to username as login identifier
  password: string;
}

interface DriverSignInModalProps {
  onClose: () => void;
  setIsDriverAuthenticated: (value: boolean) => void;
}

export const DriverSignInModal: React.FC<DriverSignInModalProps> = ({ 
  onClose, 
  setIsDriverAuthenticated 
}) => {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<DriverSignInFormData>({
    username: '', // Changed from email to username
    password: '',
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${BASE_URL}/api/driver/signin`, {
        username: formData.username, // Can be email or username
        password: formData.password
      }, {
        withCredentials: true
      });
      
      if (response.data.status === 'success') {
        // Store driver token in localStorage
        localStorage.setItem('driverToken', response.data.token);
        
        setIsDriverAuthenticated(true);
        navigate('/driver', { replace: true });
        onClose();
      }
    } catch (err) {
      setError('Invalid driver credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-overlay fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div 
        className="modal-content bg-white w-[480px] rounded-lg shadow-xl relative animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="modal-close-button absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-8">
          <h2 className="text-[32px] font-medium mb-8">Driver Login</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <input
                type="text"
                name="username"
                placeholder="Username or Email"
                value={formData.username}
                onChange={handleChange}
                className="w-full p-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-gray-400"
                required
              />
            </div>

            <div className="space-y-2">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full p-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-gray-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#ef4f5f] text-white p-3 rounded-md hover:bg-[#d63848] transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Login as Driver'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};