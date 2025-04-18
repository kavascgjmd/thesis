import { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const useAuthStatus = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userData, setUserData] = useState<any>(null);
  
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/user/verify`, {
          withCredentials: true
        });
        
        if (response.data.authenticated) {
          setIsAuthenticated(true);
          setUserData(response.data.user);
        } else {
          setIsAuthenticated(false);
          setUserData(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUserData(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const logout = async () => {
    try {
      await axios.post(`${BASE_URL}/api/user/signout`, {}, {
        withCredentials: true
      });
      setIsAuthenticated(false);
      setUserData(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return { 
    isAuthenticated, 
    isLoading, 
    setIsAuthenticated,
    userData,
    logout
  };
};

export default useAuthStatus;