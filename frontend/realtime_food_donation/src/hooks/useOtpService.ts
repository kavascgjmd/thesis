import { useState } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const useOtpService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiError = (err: any): never => {
    let errorMessage = 'An unexpected error occurred';
    
    if (err.message === 'Unexpected end of JSON input') {
      errorMessage = 'Server response was incomplete. Please try again.';
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    setError(errorMessage);
    throw new Error(errorMessage);
  };

  const sendEmailOtp = async (newEmail: string, contactMethod: 'email' | 'phone' = 'email') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BASE_URL}/profile/send-verification-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'email',
          newValue: newEmail,
          contactMethod
        })
      });
      
      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error('Failed to parse server response');
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }
      
      return data;
    } catch (err: any) {
      return handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendPhoneOtp = async (newPhone: string, contactMethod: 'email' | 'phone' = 'email') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BASE_URL}/profile/send-verification-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'phone',
          newValue: newPhone,
          contactMethod
        })
      });
      
      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error('Failed to parse server response');
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }
      
      return data;
    } catch (err: any) {
      return handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailOtp = async (otp: string): Promise<{ success: boolean; email: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.post(
        `${BASE_URL}/profile/verify-otp`,
        { 
          type: 'email',
          otp 
        },
        { 
          withCredentials: true,
          headers: { 'Accept': 'application/json' }
        }
      );
      
      return {
        success: response.data.success,
        email: response.data.email
      };
    } catch (err: any) {
      return handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneOtp = async (otp: string): Promise<{ success: boolean; phone: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.post(
        `${BASE_URL}/profile/verify-otp`,
        { 
          type: 'phone',
          otp 
        },
        { 
          withCredentials: true,
          headers: { 'Accept': 'application/json' }
        }
      );
      
      return {
        success: response.data.success,
        phone: response.data.phone
      };
    } catch (err: any) {
      return handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyNewEmail = async (otp: string, newEmail: string): Promise<{ success: boolean; email: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.post(
        `${BASE_URL}/profile/verify-new-email`,
        { 
          otp,
          newEmail
        },
        { 
          withCredentials: true,
          headers: { 'Accept': 'application/json' }
        }
      );
      
      return {
        success: response.data.success,
        email: response.data.email
      };
    } catch (err: any) {
      return handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const verifyNewPhone = async (otp: string, newPhone: string): Promise<{ success: boolean; phone: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.post(
        `${BASE_URL}/profile/verify-new-phone`,
        { 
          otp,
          newPhone 
        },
        { 
          withCredentials: true,
          headers: { 'Accept': 'application/json' }
        }
      );
      
      return {
        success: response.data.success,
        phone: response.data.phone
      };
    } catch (err: any) {
      return handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    sendEmailOtp,
    sendPhoneOtp,
    verifyEmailOtp,
    verifyPhoneOtp,
    verifyNewEmail,
    verifyNewPhone
  };
};