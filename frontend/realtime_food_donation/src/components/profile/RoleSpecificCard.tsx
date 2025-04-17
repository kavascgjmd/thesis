import React, { useState, useEffect } from 'react'
import { User, RoleSpecificDetails } from '../../types/user'
import DonorFoodForm from '../../pages/FoodDonationForm'
import axios from 'axios'

export const RoleSpecificCard: React.FC<{
  user: User
  roleSpecificDetails: RoleSpecificDetails
}> = ({ user, roleSpecificDetails }) => {
  const [details, setDetails] = useState<RoleSpecificDetails>(roleSpecificDetails)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState(false)

  useEffect(() => {
    setDetails(roleSpecificDetails)
  }, [roleSpecificDetails])

  const handleUpdateDetails = async (updatedDetails: RoleSpecificDetails) => {
    // For local state updates only (not API calls)
    setDetails(updatedDetails)
  }

  const handleSubmitUpdates = async () => {
    setIsUpdating(true)
    setUpdateError('')
    setUpdateSuccess(false)

    try {
      const response = await axios.put('/api/profile/role-details', details, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })

      if (response.data.success) {
        setUpdateSuccess(true)
        // Show success message briefly
        setTimeout(() => setUpdateSuccess(false), 3000)
      } else {
        setUpdateError(response.data.message || 'Failed to update details')
      }
    } catch (err) {
      setUpdateError('Error updating profile details')
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }

  const upperRole = user.role.toUpperCase()
  
  return (
    <>
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {upperRole === 'DONOR' ? 'Organization Details' :
           upperRole === 'NGO' ? 'NGO Information' :
           'Recipient Information'}
        </h2>
        
        {/* Update Status Messages */}
        {updateError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {updateError}
          </div>
        )}
        
        {updateSuccess && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
            Details updated successfully!
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upperRole === 'DONOR' && (
            <>
              <div>
                <label className="text-sm text-gray-600">Organization Name</label>
                <p className="text-gray-800 font-medium">
                  {details.organization_name || 'Not specified'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Donor Type</label>
                <p className="text-gray-800 font-medium">
                  {details.donor_type || 'Not specified'}
                </p>
              </div>
              {details.contact_person && (
                <div>
                  <label className="text-sm text-gray-600">Contact Person</label>
                  <p className="text-gray-800 font-medium">
                    {details.contact_person}
                  </p>
                </div>
              )}
              {details.operating_hours && (
                <div>
                  <label className="text-sm text-gray-600">Operating Hours</label>
                  <p className="text-gray-800 font-medium">
                    {details.operating_hours}
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
                  {details.ngo_name || 'Not specified'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Mission Statement</label>
                <p className="text-gray-800 font-medium">
                  {details.mission_statement || 'Not specified'}
                </p>
              </div>
              {details.target_demographics && (
                <div>
                  <label className="text-sm text-gray-600">Target Demographics</label>
                  <p className="text-gray-800 font-medium">
                    {details.target_demographics}
                  </p>
                </div>
              )}
              {details.contact_person && (
                <div>
                  <label className="text-sm text-gray-600">Contact Person</label>
                  <p className="text-gray-800 font-medium">
                    {details.contact_person}
                  </p>
                </div>
              )}
              {details.contact_number && (
                <div>
                  <label className="text-sm text-gray-600">Contact Number</label>
                  <p className="text-gray-800 font-medium">
                    {details.contact_number}
                  </p>
                </div>
              )}
              {details.operating_hours && (
                <div>
                  <label className="text-sm text-gray-600">Operating Hours</label>
                  <p className="text-gray-800 font-medium">
                    {details.operating_hours}
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
                  {details.recipient_name || 'Not specified'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Recipient Details</label>
                <p className="text-gray-800 font-medium">
                  {details.recipient_details || 'Not specified'}
                </p>
              </div>
              {details.contact_person && (
                <div>
                  <label className="text-sm text-gray-600">Contact Person</label>
                  <p className="text-gray-800 font-medium">
                    {details.contact_person}
                  </p>
                </div>
              )}
              {details.contact_number && (
                <div>
                  <label className="text-sm text-gray-600">Contact Number</label>
                  <p className="text-gray-800 font-medium">
                    {details.contact_number}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
     
    </>
  );
};