import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, RoleSpecificDetails } from '../types/user';

const BASE_URL = 'http://localhost:3000';
axios.defaults.withCredentials = true; 

interface VerificationStatus {
  is_verified: boolean;
  can_place_orders: boolean;
  verification_date: string | null;
  message: string;
}

export const useProfile = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roleDetails, setRoleDetails] = useState<RoleSpecificDetails>({});
  const [completion, setCompletion] = useState<number>(0);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [basicInfoCompleted, setBasicInfoCompleted] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, completionRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/profile`, {
          withCredentials: true
        }),
        axios.get(`${BASE_URL}/api/profile/completion`, {
          withCredentials: true
        })
      ]);

      if (profileRes.data.authenticated === false) {
        setUser(null);
        setError('Not authenticated');
        setBasicInfoCompleted(false);
        return;
      }

      setUser(profileRes.data.user);
      setRoleDetails(profileRes.data.roleDetails || {});
      setCompletion(completionRes.data.completion);

      // Determine if basic info is completed
      const userData = profileRes.data.user;
      if (userData && userData.username && userData.email) {
        setBasicInfoCompleted(true);
      } else {
        setBasicInfoCompleted(false);
      }

      setError(null);

      // If user is NGO or RECIPIENT, fetch verification status
      if (profileRes.data.user.role === 'NGO' || profileRes.data.user.role === 'RECIPIENT') {
        try {
          const statusRes = await axios.get(`${BASE_URL}/api/profile/verification-status`, {
            withCredentials: true
          });
          if (statusRes.data.success) {
            setVerificationStatus(statusRes.data.status);
          }
        } catch (statusError) {
          console.error('Error fetching verification status:', statusError);
        }
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Please log in to access your profile');
        setUser(null);
        setBasicInfoCompleted(false);
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
        
        // Check if basic info is now complete after update
        const updatedUserData = res.data.user;
        if (updatedUserData && updatedUserData.username && updatedUserData.email) {
          setBasicInfoCompleted(true);
        }
        
        await fetchProfile(); // Refresh all data
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
      
      // First, check if basic info is completed
      if (!basicInfoCompleted) {
        throw new Error('Please complete basic information first');
      }

      const mergedDetails: Partial<RoleSpecificDetails> = { ...(roleDetails ?? {}) };

      if (details) {
        for (const key in details) {
          const typedKey = key as keyof RoleSpecificDetails;
          const value = details[typedKey];

          if (value !== null && value !== undefined) {
            mergedDetails[typedKey] = value;
          }
        }
      }
      const res = await axios.put(
        `${BASE_URL}/api/profile/role-details`,
        mergedDetails,
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

  const uploadProfilePicture = async (file: File) => {
    try {
      setLoading(true);

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
      });
      reader.readAsDataURL(file);
      const base64Image = await base64Promise;

      // Upload to backend
      const res = await axios.post(
        `${BASE_URL}/api/profile/upload-profile-picture`,
        { image: base64Image, fileType: file.type },
        { withCredentials: true }
      );

      if (res.data.success) {
        setUser(prev => prev ? { 
          ...prev, 
          profile_picture: res.data.imageUrl
        } : null);
        return true;
      }
      throw new Error(res.data.message || 'Upload failed');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to upload profile picture';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Add this function to handle document uploads for NGO/Recipient verification
  const uploadDocument = async (documentType: string, file: File) => {
    try {
      setLoading(true);
  
      if (!basicInfoCompleted) {
        throw new Error('Please complete basic information before uploading documents');
      }
  
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
      });
      reader.readAsDataURL(file);
      const base64Document = await base64Promise;
  
      // Upload to backend
      const res = await axios.post(
        `${BASE_URL}/api/profile/upload-document`,
        { 
          documentType,
          document: base64Document, 
          fileType: file.type 
        },
        { withCredentials: true }
      );
  
      if (res.data.success) {
        // Update roleDetails with the new document URL
        const documentTypeKey = documentType as keyof RoleSpecificDetails;
        
        setRoleDetails(prev => ({ 
          ...prev,
          [documentTypeKey]: res.data.documentUrl
        }));
  
        // Fetch verification status after document upload
        if (user?.role === 'NGO' || user?.role === 'RECIPIENT') {
          try {
            const statusRes = await axios.get(`${BASE_URL}/api/profile/verification-status`, {
              withCredentials: true
            });
            
            if (statusRes.data.success) {
              // Update verification status with pending email verification message
              setVerificationStatus({
                ...statusRes.data.status,
                message: statusRes.data.status.message || 'Document uploaded successfully. An administrator has been notified via email and will verify your document.'
              });
            }
          } catch (statusError) {
            console.error('Error fetching verification status:', statusError);
          }
        }
  
        return res.data.documentUrl;
      }
      throw new Error(res.data.message || 'Upload failed');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to upload document';
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
    verificationStatus,
    basicInfoCompleted,
    updateBasicInfo,
    updateRoleDetails,
    refreshProfile: fetchProfile,
    uploadProfilePicture,
    uploadDocument
  };
};