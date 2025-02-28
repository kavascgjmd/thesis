import React from 'react'
interface ProfileCompletionProps {
  completion: number;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ completion }) => {
  return (
    <div className="mt-6 bg-rose-50 rounded-lg p-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-rose-800 font-medium">Complete your profile</p>
          <p className="text-rose-600 text-sm mt-1">
            {100 - completion}% left to complete
          </p>
        </div>
        <div className="w-32 bg-rose-200 rounded-full h-2">
          <div 
            className="bg-rose-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>
    </div>
  );
};