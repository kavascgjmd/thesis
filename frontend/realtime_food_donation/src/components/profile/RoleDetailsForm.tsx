import React, { useEffect, useState } from 'react'
import { Input } from '../ui/input/Input'
import { Select } from '../ui/select/Select'
import { User } from '../../types/user'

// Backend expected types matching Zod schemas
interface DonorDetails {
  donor_type: 'INDIVIDUAL' | 'RESTAURANT' | 'CORPORATE'
  organization_name: string
  organization_details?: string
  contact_person: string
  contact_number: string
  operating_hours: string
}

interface NgoDetails {
  ngo_name: string
  mission_statement: string
  contact_person: string
  contact_number: string
  operating_hours: string
  target_demographics: string
}

interface RecipientDetails {
  recipient_name: string
  recipient_details: string
  contact_person: string
  contact_number: string
}

// Frontend form state types (camelCase)
interface DonorFormState {
  donorType: 'INDIVIDUAL' | 'RESTAURANT' | 'CORPORATE'
  organizationName: string
  organizationDetails?: string
  contactPerson: string
  contactNumber: string
  operatingHours: string
}

interface NgoFormState {
  ngoName: string
  missionStatement: string
  contactPerson: string
  contactNumber: string
  operatingHours: string
  targetDemographics: string
}

interface RecipientFormState {
  recipientName: string
  recipientDetails: string
  contactPerson: string
  contactNumber: string
}

type RoleSpecificDetails = DonorFormState | NgoFormState | RecipientFormState

interface RoleDetailsFormProps {
  role: User['role']
  details: RoleSpecificDetails
  onUpdateDetails: (details: any) => void
  isSubmitting?: boolean
  preventSubmit?: boolean
  onError?: (error: string) => void
}

export const RoleDetailsForm: React.FC<RoleDetailsFormProps> = ({
  role,
  details,
  onUpdateDetails,
  isSubmitting,
  preventSubmit,
  onError
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Transform camelCase to snake_case for API and ensure uppercase enum values
  const transformToDonorDetails = (formState: DonorFormState): DonorDetails => ({
    donor_type: formState.donorType.toUpperCase() as DonorDetails['donor_type'],
    organization_name: formState.organizationName,
    organization_details: formState.organizationDetails || '',
    contact_person: formState.contactPerson,
    contact_number: formState.contactNumber,
    operating_hours: formState.operatingHours
  })

  const transformToNgoDetails = (formState: NgoFormState): NgoDetails => ({
    ngo_name: formState.ngoName,
    mission_statement: formState.missionStatement,
    contact_person: formState.contactPerson,
    contact_number: formState.contactNumber,
    operating_hours: formState.operatingHours,
    target_demographics: formState.targetDemographics
  })

  const transformToRecipientDetails = (formState: RecipientFormState): RecipientDetails => ({
    recipient_name: formState.recipientName,
    recipient_details: formState.recipientDetails,
    contact_person: formState.contactPerson,
    contact_number: formState.contactNumber
  })

  const validateField = (field: string, value: string): string => {
    if (!value) {
      return `${field} is required`
    }
    return ''
  }

  const handleFieldChange = (field: string, value: string) => {
    const error = validateField(field, value)
    setErrors(prev => ({
      ...prev,
      [field]: error
    }))
    onUpdateDetails({ ...details, [field]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let transformedData
    let validationErrors: Record<string, string> = {}
    
    const upperRole = role.toUpperCase()
    
    try {
      switch (upperRole) {
        case 'DONOR':
          const donorState = details as DonorFormState
          if (!donorState.donorType) validationErrors.donorType = 'Donor type is required'
          if (!donorState.organizationName) validationErrors.organizationName = 'Organization name is required'
          if (!donorState.contactPerson) validationErrors.contactPerson = 'Contact person is required'
          if (!donorState.contactNumber) validationErrors.contactNumber = 'Contact number is required'
          if (!donorState.operatingHours) validationErrors.operatingHours = 'Operating hours is required'
          
          if (Object.keys(validationErrors).length === 0) {
            transformedData = transformToDonorDetails(donorState)
          }
          break

        case 'NGO':
          const ngoState = details as NgoFormState
          if (!ngoState.ngoName) validationErrors.ngoName = 'NGO name is required'
          if (!ngoState.missionStatement) validationErrors.missionStatement = 'Mission statement is required'
          if (!ngoState.contactPerson) validationErrors.contactPerson = 'Contact person is required'
          if (!ngoState.contactNumber) validationErrors.contactNumber = 'Contact number is required'
          if (!ngoState.operatingHours) validationErrors.operatingHours = 'Operating hours is required'
          if (!ngoState.targetDemographics) validationErrors.targetDemographics = 'Target demographics is required'
          
          if (Object.keys(validationErrors).length === 0) {
            transformedData = transformToNgoDetails(ngoState)
          }
          break

        case 'RECIPIENT':
          const recipientState = details as RecipientFormState
          if (!recipientState.recipientName) validationErrors.recipientName = 'Recipient name is required'
          if (!recipientState.recipientDetails) validationErrors.recipientDetails = 'Recipient details is required'
          if (!recipientState.contactPerson) validationErrors.contactPerson = 'Contact person is required'
          if (!recipientState.contactNumber) validationErrors.contactNumber = 'Contact number is required'
          
          if (Object.keys(validationErrors).length === 0) {
            transformedData = transformToRecipientDetails(recipientState)
          }
          break

        default:
          throw new Error('Invalid role')
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
        onError?.('Please fill in all required fields')
        return
      }

      // Only call onUpdateDetails with the transformed data
      if (transformedData) {
        onUpdateDetails(transformedData)
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const upperRole = role.toUpperCase()

  if (upperRole === 'DONOR') {
    const donorDetails = details as DonorFormState
    return (
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Donor Type *</label>
          <Select
            value={donorDetails.donorType || ''}
            onChange={(e) => handleFieldChange('donorType', e.target.value)}
            disabled={isSubmitting}
            error={errors.donorType}
          >
            <option value="">Select donor type</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="RESTAURANT">Restaurant</option>
            <option value="CORPORATE">Corporate</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Organization Name *</label>
          <Input
            value={donorDetails.organizationName || ''}
            onChange={(e) => handleFieldChange('organizationName', e.target.value)}
            disabled={isSubmitting}
            error={errors.organizationName}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Organization Details</label>
          <Input
            value={donorDetails.organizationDetails || ''}
            onChange={(e) => handleFieldChange('organizationDetails', e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Contact Person *</label>
          <Input
            value={donorDetails.contactPerson || ''}
            onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
            disabled={isSubmitting}
            error={errors.contactPerson}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Contact Number *</label>
          <Input
            value={donorDetails.contactNumber || ''}
            onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
            disabled={isSubmitting}
            error={errors.contactNumber}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Operating Hours *</label>
          <Input
            value={donorDetails.operatingHours || ''}
            onChange={(e) => handleFieldChange('operatingHours', e.target.value)}
            placeholder="e.g., Mon-Fri 9AM-5PM"
            disabled={isSubmitting}
            error={errors.operatingHours}
          />
        </div>
        {!preventSubmit && (
          <button 
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={isSubmitting || Object.keys(errors).length > 0}
          >
            {isSubmitting ? 'Saving...' : 'Save Details'}
          </button>
        )}
      </form>
    )
  }

  if (upperRole === 'NGO') {
    const ngoDetails = details as NgoFormState
    return (
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">NGO Name *</label>
          <Input
            value={ngoDetails.ngoName || ''}
            onChange={(e) => handleFieldChange('ngoName', e.target.value)}
            disabled={isSubmitting}
            error={errors.ngoName}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Mission Statement *</label>
          <Input
            value={ngoDetails.missionStatement || ''}
            onChange={(e) => handleFieldChange('missionStatement', e.target.value)}
            disabled={isSubmitting}
            error={errors.missionStatement}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Contact Person *</label>
          <Input
            value={ngoDetails.contactPerson || ''}
            onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
            disabled={isSubmitting}
            error={errors.contactPerson}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Contact Number *</label>
          <Input
            value={ngoDetails.contactNumber || ''}
            onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
            disabled={isSubmitting}
            error={errors.contactNumber}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Operating Hours *</label>
          <Input
            value={ngoDetails.operatingHours || ''}
            onChange={(e) => handleFieldChange('operatingHours', e.target.value)}
            disabled={isSubmitting}
            error={errors.operatingHours}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Target Demographics *</label>
          <Input
            value={ngoDetails.targetDemographics || ''}
            onChange={(e) => handleFieldChange('targetDemographics', e.target.value)}
            disabled={isSubmitting}
            error={errors.targetDemographics}
          />
        </div>
        {!preventSubmit && (
          <button 
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={isSubmitting || Object.keys(errors).length > 0}
          >
            {isSubmitting ? 'Saving...' : 'Save Details'}
          </button>
        )}
      </form>
    )
  }

  if (upperRole === 'RECIPIENT') {
    const recipientDetails = details as RecipientFormState
    return (
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Recipient Name *</label>
          <Input
            value={recipientDetails.recipientName || ''}
            onChange={(e) => handleFieldChange('recipientName', e.target.value)}
            disabled={isSubmitting}
            error={errors.recipientName}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Recipient Details *</label>
          <Input
            value={recipientDetails.recipientDetails || ''}
            onChange={(e) => handleFieldChange('recipientDetails', e.target.value)}
            disabled={isSubmitting}
            error={errors.recipientDetails}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Contact Person *</label>
          <Input
            value={recipientDetails.contactPerson || ''}
            onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
            disabled={isSubmitting}
            error={errors.contactPerson}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Contact Number *</label>
          <Input
            value={recipientDetails.contactNumber || ''}
            onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
            disabled={isSubmitting}
            error={errors.contactNumber}
          />
        </div>
        {!preventSubmit && (
          <button 
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={isSubmitting || Object.keys(errors).length > 0}
          >
            {isSubmitting ? 'Saving...' : 'Save Details'}
          </button>
        )}
      </form>
    )
  }

  return null
}