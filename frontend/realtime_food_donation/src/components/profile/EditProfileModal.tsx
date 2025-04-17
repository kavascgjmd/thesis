import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './Dialog'
import { Button } from '../ui/button/Button'
import { User, RoleSpecificDetails } from '../../types/user'
import { BasicInfoForm } from './BasicInfoForm'
import { RoleDetailsForm } from './RoleDetailsForm'
import { useOtpService } from '../../hooks/useOtpService'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  roleSpecificDetails: RoleSpecificDetails
  onUpdateUser: (user: Partial<User>) => Promise<void | boolean>
  onUpdateRoleDetails: (details: RoleSpecificDetails) => Promise<void | boolean>
  onUploadDocument?: (documentType: string, file: File) => Promise<string | boolean>
  verificationStatus?: {
    is_verified: boolean;
    can_place_orders: boolean;
    verification_date?: string | null;
    message: string;
  } | null;
  basicInfoCompleted?: boolean; // Add this prop to receive the state from parent
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  roleSpecificDetails,
  onUpdateUser,
  onUpdateRoleDetails,
  onUploadDocument,
  verificationStatus,
  basicInfoCompleted: propBasicInfoCompleted, // Get from props if available
}) => {
  const [activeTab, setActiveTab] = useState('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [basicInfoCompleted, setBasicInfoCompleted] = useState(false)

  // Create a local copy of user data that persists between renders
  const [formData, setFormData] = useState({
    basic: { ...user },
    role: { ...roleSpecificDetails }
  })

  // Track verification states separately
  const [emailVerificationInProgress, setEmailVerificationInProgress] = useState(false)
  const [phoneVerificationInProgress, setPhoneVerificationInProgress] = useState(false)

  const { error: otpError, isLoading: otpLoading } = useOtpService()

  // Check if basic info is already filled, preferring prop value if provided
  useEffect(() => {
    // First check if the prop was provided
    if (propBasicInfoCompleted !== undefined) {
      setBasicInfoCompleted(propBasicInfoCompleted);
    } else {
      // Consider basic info completed if user has essential fields filled
      if (user && user.username && user.email) {
        setBasicInfoCompleted(true);
      } else {
        setBasicInfoCompleted(false);
      }
    }

    // If basic info isn't complete, force user to the basic tab
    if (!basicInfoCompleted) {
      setActiveTab('basic');
    }
  }, [user, propBasicInfoCompleted, basicInfoCompleted])

  // Update local form data when props change (but only if not in verification process)
  useEffect(() => {
    if (!emailVerificationInProgress && !phoneVerificationInProgress) {
      setFormData({
        basic: { ...user },
        role: { ...roleSpecificDetails }
      })
    }
  }, [user, roleSpecificDetails, emailVerificationInProgress, phoneVerificationInProgress])

  const handleTabChange = (tab: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    // Only allow changing to role tab if basic info is completed
    if (tab === 'role') {
      if (!basicInfoCompleted) {
        setError('Please complete and save your basic information first')
        return
      }
    }
    setActiveTab(tab)
    setError(null)
  }

  const handleBasicInfoChange = (updatedUser: Partial<User>) => {
    setFormData(prev => ({
      ...prev,
      basic: {
        ...prev.basic,
        ...updatedUser,
        // Make sure profile_picture is updated correctly
        profile_picture: updatedUser.profile_picture || prev.basic.profile_picture
      }
    }))
  }

  const handleRoleDetailsChange = (updatedDetails: Partial<RoleSpecificDetails>) => {
    // Convert donor_type to uppercase if it exists
    const processedDetails = {
      ...updatedDetails,
      donor_type: updatedDetails.donor_type?.toUpperCase() as 'INDIVIDUAL' | 'RESTAURANT' | 'CORPORATE' | undefined
    }

    setFormData(prev => ({
      ...prev,
      role: { ...prev.role, ...processedDetails }
    }))
  }

  // Handle document upload errors
  const handleDocumentError = (errorMessage: string) => {
    setError(errorMessage)
  }

  // Track verification status changes
  const handleVerificationStatusChange = (type: 'email' | 'phone', inProgress: boolean) => {
    if (type === 'email') {
      setEmailVerificationInProgress(inProgress)
    } else {
      setPhoneVerificationInProgress(inProgress)
    }
  }

  const handleSaveBasic = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Check if there are pending verifications
      if (emailVerificationInProgress || phoneVerificationInProgress) {
        setError('Please complete all pending verifications before saving');
        setIsSubmitting(false);
        return;
      }

      // Prepare basic user data
      const basicData = {
        username: formData.basic.username,
        email: formData.basic.email,
        phone: formData.basic.phone,
        address: formData.basic.address || '',
        profile_picture: formData.basic.profile_picture
      };

      // Send update
      const result = await onUpdateUser(basicData);
      if (result) {
        // Mark basic info as completed and allow access to role form
        setBasicInfoCompleted(true);
        // Switch to role tab automatically only after successful update
        setActiveTab('role');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving changes');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSaveRole = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Verify basic info is completed before proceeding
      if (!basicInfoCompleted) {
        setError('Please complete and save your basic information first')
        setActiveTab('basic')
        setIsSubmitting(false)
        return
      }

      // Prepare role-specific data (using snake_case for backend)
      const roleData = {
        ...formData.role,
        donor_type: formData.role.donor_type?.toUpperCase(),
        contact_person: formData.role.contact_person,
        contact_number: formData.role.contact_number,
        operating_hours: formData.role.operating_hours,
        organization_name: formData.role.organization_name,
        organization_details: formData.role.organization_details,
        ngo_name: formData.role.ngo_name,
        mission_statement: formData.role.mission_statement,
        target_demographics: formData.role.target_demographics,
        recipient_name: formData.role.recipient_name,
        recipient_details: formData.role.recipient_details
      }

      // Send update for role details
      await onUpdateRoleDetails(roleData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving changes')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      basic: { ...user },
      role: { ...roleSpecificDetails }
    })
    onClose()
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
          {basicInfoCompleted && (
            <button
              type="button"
              className={`px-4 py-2 ${activeTab === 'role' ? 'border-b-2 border-rose-500 text-rose-500' : 'text-gray-600'}`}
              onClick={handleTabChange('role')}
              disabled={isSubmitting || !basicInfoCompleted}
            >
              Role Details
            </button>
          )}
        </div>

        {error && (
          <div className="text-red-500 text-sm mb-4">
            {error}
          </div>
        )}

        <div>
          {activeTab === 'basic' ? (
            <>
              <BasicInfoForm
                user={formData.basic}
                onUpdateUser={handleBasicInfoChange}
                isSubmitting={isSubmitting}
                preventSubmit
                onVerificationStatusChange={handleVerificationStatusChange}
              />
              <div className="flex justify-end gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting || emailVerificationInProgress || phoneVerificationInProgress}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                  onClick={handleSaveBasic}
                  disabled={isSubmitting || emailVerificationInProgress || phoneVerificationInProgress}
                >
                  {isSubmitting ? 'Saving...' : 'Save Basic Info'}
                </Button>
              </div>
            </>
          ) : (
            basicInfoCompleted ? (
              <>
                <RoleDetailsForm
                  role={formData.basic.role}
                  details={formData.role}
                  onUpdateDetails={handleRoleDetailsChange}
                  onUploadDocument={onUploadDocument}
                  isSubmitting={isSubmitting}
                  preventSubmit
                  onError={handleDocumentError}
                  verificationStatus={verificationStatus}
                />
                <div className="flex justify-end gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                    onClick={handleSaveRole}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Role Details'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-4 text-center">
                <p className="text-amber-600 mb-4">Please complete your basic information first.</p>
                <Button 
                  type="button" 
                  onClick={handleTabChange('basic')}
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                >
                  Go to Basic Information
                </Button>
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}