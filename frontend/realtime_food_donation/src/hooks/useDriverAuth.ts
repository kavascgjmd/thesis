import { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const useDriverAuth = () => {
  const [isDriverAuthenticated, setIsDriverAuthenticated] = useState<boolean>(false);
  const [isDriverLoading, setIsDriverLoading] = useState<boolean>(true);
  const [driverData, setDriverData] = useState<any>(null);

  useEffect(() => {
    const checkDriverAuth = async () => {
      const driverToken = localStorage.getItem('driverToken');
      
      if (!driverToken) {
        setIsDriverLoading(false);
        return;
      }

      try {
        setIsDriverLoading(true);
        const response = await axios.get(`${BASE_URL}/api/driver/verify`, {
          headers: {
            Authorization: `Bearer ${driverToken}`
          },
          withCredentials: true
        });

        if (response.data.status === 'success') {
          setIsDriverAuthenticated(true);
          setDriverData(response.data.driver);
        } else {
          localStorage.removeItem('driverToken');
          setIsDriverAuthenticated(false);
        }
      } catch (error) {
        localStorage.removeItem('driverToken');
        setIsDriverAuthenticated(false);
      } finally {
        setIsDriverLoading(false);
      }
    };

    checkDriverAuth();
  }, []);

  const driverLogout = () => {
    localStorage.removeItem('driverToken');
    setIsDriverAuthenticated(false);
    setDriverData(null);
  };

  return {
    isDriverAuthenticated,
    setIsDriverAuthenticated,
    isDriverLoading,
    driverData,
    driverLogout
  };
};

export default useDriverAuth;