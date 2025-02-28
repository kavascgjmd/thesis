import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, RoleSpecificDetails } from '../types/user';

const BASE_URL = 'http://localhost:3000';
axios.defaults.withCredentials = true; 

export const useProfile = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roleDetails, setRoleDetails] = useState<RoleSpecificDetails>({});
  const [completion, setCompletion] = useState<number>(0);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, completionRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/profile`, {
          withCredentials: true // Explicitly include credentials
        }),
        axios.get(`${BASE_URL}/api/profile/completion`, {
          withCredentials: true
        })
      ]);
      
      if (profileRes.data.authenticated === false) {
        // Handle unauthenticated state
        setUser(null);
        setError('Not authenticated');
        return;
      }
      
      setUser(profileRes.data.user);
      setRoleDetails(profileRes.data.roleDetails || {});
      setCompletion(completionRes.data.completion);
      setError(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Please log in to access your profile');
        setUser(null);
      } else {
        setError('Failed to load profile');
        console.error('Error loading profile:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateBasicInfo = async (updatedUser: Partial<User>) => {
    try {
      setLoading(true);
      const res = await axios.put(
        `${BASE_URL}/api/profile/basic`,
        updatedUser,
        { withCredentials: true }
      );
      
      if (res.data.success) {
        setUser(prev => prev ? { ...prev, ...res.data.user } : null);
        await fetchProfile();
        return true;
      }
      throw new Error(res.data.message || 'Update failed');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateRoleDetails = async (details: Partial<RoleSpecificDetails>) => {
    try {
      setLoading(true);
      const res = await axios.put(
        `${BASE_URL}/api/profile/role-details`,
        details,
        { withCredentials: true }
      );
      
      if (res.data.success) {
        setRoleDetails(prev => ({ ...prev, ...res.data.details }));
        await fetchProfile();
        return true;
      }
      throw new Error(res.data.message || 'Update failed');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update role details';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    user,
    roleDetails,
    completion,
    loading,
    error,
    updateBasicInfo,
    updateRoleDetails,
    refreshProfile: fetchProfile
  };
};