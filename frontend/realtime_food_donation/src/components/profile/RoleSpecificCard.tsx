import React from "react"
import { User, RoleSpecificDetails } from '../../types/user'
import DonorFoodForm from '../../pages/FoodDonationForm'

export const RoleSpecificCard: React.FC<{
  user: User
  roleSpecificDetails: RoleSpecificDetails
}> = ({ user, roleSpecificDetails }) => {

  const upperRole = user.role.toUpperCase();
  return (
    <div className="mt-6 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {upperRole === 'DONOR' ? 'Organization Details' :
         upperRole === 'NGO' ? 'NGO Information' :
         'Recipient Information'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {upperRole === 'DONOR' && (
          <>
            <div>
              <label className="text-sm text-gray-600">Organization Name</label>
              <p className="text-gray-800 font-medium">
                {roleSpecificDetails.organizationName || 'Not specified'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Donor Type</label>
              <p className="text-gray-800 font-medium">
                {roleSpecificDetails.donorType || 'Not specified'}
              </p>
            </div>
            {roleSpecificDetails.contactPerson && (
              <div>
                <label className="text-sm text-gray-600">Contact Person</label>
                <p className="text-gray-800 font-medium">
                  {roleSpecificDetails.contactPerson}
                </p>
              </div>
            )}
            {roleSpecificDetails.operatingHours && (
              <div>
                <label className="text-sm text-gray-600">Operating Hours</label>
                <p className="text-gray-800 font-medium">
                  {roleSpecificDetails.operatingHours}
                </p>
              </div>
            )}
            {
              <DonorFoodForm />
            }
          </>
        )}

        {upperRole === 'NGO' && (
          <>
            <div>
              <label className="text-sm text-gray-600">NGO Name</label>
              <p className="text-gray-800 font-medium">
                {roleSpecificDetails.ngoName || 'Not specified'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Mission Statement</label>
              <p className="text-gray-800 font-medium">
                {roleSpecificDetails.missionStatement || 'Not specified'}
              </p>
            </div>
            {roleSpecificDetails.targetDemographics && (
              <div>
                <label className="text-sm text-gray-600">Target Demographics</label>
                <p className="text-gray-800 font-medium">
                  {roleSpecificDetails.targetDemographics}
                </p>
              </div>
            )}
          </>
        )}

        {upperRole === 'RECIPIENT' && (
          <>
            <div>
              <label className="text-sm text-gray-600">Recipient Name</label>
              <p className="text-gray-800 font-medium">
                {roleSpecificDetails.recipientName || 'Not specified'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Recipient Details</label>
              <p className="text-gray-800 font-medium">
                {roleSpecificDetails.recipientDetails || 'Not specified'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};