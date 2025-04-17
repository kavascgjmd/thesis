import React from 'react';
import { useProfile } from '../../hooks/useProfile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileCompletion } from './ProfileCompletion';
import { RoleSpecificCard } from './RoleSpecificCard';
import { EditProfileModal } from './EditProfileModal';
import { Alert, AlertDescription } from '../ui/alert/Alert';

export const UserProfile: React.FC = () => {
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  
  const { 
    user, 
    roleDetails, 
    completion, 
    loading, 
    error, 
    updateBasicInfo, 
    updateRoleDetails, 
    uploadDocument, 
    verificationStatus 
  } = useProfile();

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-48 bg-gradient-to-r from-rose-500 to-rose-600" />
      
      <div className="max-w-5xl mx-auto px-4 -mt-24">
        <div className="bg-white rounded-lg shadow-md p-6">
          <ProfileHeader user={user} onEdit={() => setIsEditModalOpen(true)} />
          {completion < 100 && <ProfileCompletion completion={completion} />}
        </div>

        <RoleSpecificCard user={user} roleSpecificDetails={roleDetails} />

        <EditProfileModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          user={user} 
          roleSpecificDetails={roleDetails} 
          onUpdateUser={updateBasicInfo} 
          onUpdateRoleDetails={updateRoleDetails} 
          onUploadDocument={uploadDocument}
          verificationStatus={verificationStatus}
        />
      </div>
    </div>
  );
};