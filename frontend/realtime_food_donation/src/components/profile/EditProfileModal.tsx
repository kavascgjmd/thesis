import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './Dialog'
import { Button } from '../ui/button/Button'
import { User, RoleSpecificDetails } from '../../types/user'
import { BasicInfoForm } from './BasicInfoForm'
import { RoleDetailsForm } from './RoleDetailsForm'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  roleSpecificDetails: RoleSpecificDetails
  onUpdateUser: (user: Partial<User>) => Promise<void>
  onUpdateRoleDetails: (details: RoleSpecificDetails) => Promise<void>
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  roleSpecificDetails,
  onUpdateUser,
  onUpdateRoleDetails,
}) => {
  const [activeTab, setActiveTab] = useState('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    basic: { ...user },
    role: { ...roleSpecificDetails }
  })

  const handleTabChange = (tab: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setActiveTab(tab)
    setError(null)
  }

  const handleBasicInfoChange = (updatedUser: Partial<User>) => {
    setFormData(prev => ({
      ...prev,
      basic: { ...prev.basic, ...updatedUser }
    }))
  }

  const handleRoleDetailsChange = (updatedDetails: Partial<RoleSpecificDetails>) => {
    // Convert donor_type to uppercase if it exists
    const processedDetails = {
      ...updatedDetails,
      donor_type: updatedDetails.donorType?.toUpperCase() as 'INDIVIDUAL' | 'RESTAURANT' | 'CORPORATE' | undefined
    }
    
    setFormData(prev => ({
      ...prev,
      role: { ...prev.role, ...processedDetails }
    }))
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare basic user data - keeping the full phone number intact
      const basicData = {
        username: formData.basic.username,
        email: formData.basic.email,
        phone: formData.basic.phone, // Pass the combined phone number as is
        address: formData.basic.address || '',
        profile_picture: formData.basic.profilePicture
      }

      // Prepare role-specific data (using snake_case for backend)
      const roleData = {
        ...formData.role,
        donor_type: formData.role.donorType?.toUpperCase(),
        contact_person: formData.role.contactPerson,
        contact_number: formData.role.contactNumber,
        operating_hours: formData.role.operatingHours,
        organization_name: formData.role.organizationName,
        organization_details: formData.role.organizationDetails,
        ngo_name: formData.role.ngoName,
        mission_statement: formData.role.missionStatement,
        target_demographics: formData.role.targetDemographics,
        recipient_name: formData.role.recipientName,
        recipient_details: formData.role.recipientDetails
      }

      // Send updates
      await onUpdateUser(basicData)
      await onUpdateRoleDetails(roleData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving changes')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="flex border-b mb-4">
          <button
            type="button"
            className={`px-4 py-2 ${activeTab === 'basic' ? 'border-b-2 border-rose-500 text-rose-500' : 'text-gray-600'}`}
            onClick={handleTabChange('basic')}
            disabled={isSubmitting}
          >
            Basic Information
          </button>
          <button
            type="button"
            className={`px-4 py-2 ${activeTab === 'role' ? 'border-b-2 border-rose-500 text-rose-500' : 'text-gray-600'}`}
            onClick={handleTabChange('role')}
            disabled={isSubmitting}
          >
            Role Details
          </button>
        </div>

        {error && (
          <div className="text-red-500 text-sm mb-4">
            {error}
          </div>
        )}

        <div>
          {activeTab === 'basic' ? (
            <BasicInfoForm 
              user={formData.basic}
              onUpdateUser={handleBasicInfoChange}
              isSubmitting={isSubmitting}
              preventSubmit
            />
          ) : (
            <RoleDetailsForm 
              role={formData.basic.role}
              details={formData.role}
              onUpdateDetails={handleRoleDetailsChange}
              isSubmitting={isSubmitting}
              preventSubmit
            />
          )}
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button 
            type="button"
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            className="bg-rose-500 hover:bg-rose-600 text-white"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}