import React from 'react';
import { useProfile } from '../../hooks/useProfile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileCompletion } from './ProfileCompletion';
import { RoleSpecificCard } from './RoleSpecificCard';
import { EditProfileModal } from './EditProfileModal';
import { Alert, AlertDescription } from '../ui/alert/Alert';
import { NGOFoodAllocations } from './NGOFoodAllocations';
import { Link } from 'react-router-dom';
import { toUpper } from 'lodash';

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
          
          {/* Add Manage Food Donations button for donors */}
          {toUpper(user.role) === 'DONOR' && (
            <div className="mt-4">
              <Link 
                to="/donor/food-donations" 
                className="inline-block px-4 py-2 bg-rose-500 text-white rounded hover:bg-rose-600"
              >
                Manage Food Donations
              </Link>
            </div>
          )}
        </div>
        
        <RoleSpecificCard user={user} roleSpecificDetails={roleDetails} />
        
        {/* Show food allocations component if user is an NGO */}
        {user.role === 'NGO' && <NGOFoodAllocations />}
        
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