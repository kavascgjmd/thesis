import { useState, useEffect } from 'react';
import axios from 'axios';
const BASE_URL =  'http://localhost:3000';
export const useAuthStatus = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/user/verify`, {
          withCredentials: true
        });
        setIsAuthenticated(Boolean(response.data.authenticated));
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  return { isAuthenticated, isLoading, setIsAuthenticated };
};