import React from 'react'
interface ProfileCompletionProps {
  completion: number
  verificationStatus?: {
    is_verified: boolean
    can_place_orders: boolean
    message: string
  }
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ 
  completion, 
  verificationStatus 
}) => {
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Profile Completion</h3>
        <span className="text-sm font-medium">{completion}%</span>
      </div>
      <div className="bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-rose-500 h-2.5 rounded-full" 
          style={{ width: `${completion}%` }}
        ></div>
      </div>
      
      {/* Add verification status message */}
      {verificationStatus && !verificationStatus.is_verified && (
        <div className="mt-2 text-sm text-yellow-600">
          <p>
            Documents pending verification. An administrator has been notified via email and will review your documents.
          </p>
        </div>
      )}
    </div>
  );
};