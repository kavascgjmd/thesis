import React, { useEffect, useState } from 'react'
import { Input } from '../ui/input/Input'
import { Select } from '../ui/select/Select'
import { User } from '../../types/user'
import { FileUpload } from '../ui/fileUpload/FileUpload'
import { Textarea } from '../ui/textarea/TextArea'

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
  // New verification fields
  ngo_type?: string
  registration_number?: string
  registration_certificate?: string
  pan_number?: string
  pan_card_image?: string
  fcra_number?: string
  fcra_certificate?: string
  tax_exemption_certificate?: string
  annual_reports_link?: string
  storage_capacity_kg?: number
  vehicle_capacity_kg?: number
  priority_level?: number
  // Array fields
  food_preferences?: string[]
}

interface RecipientDetails {
  recipient_name: string
  recipient_details: string
  contact_person: string
  contact_number: string
  // New verification fields
  id_type?: string
  id_number?: string
  id_image?: string
  address?: string
  proof_of_need?: string
}

type RoleSpecificDetails = DonorDetails | NgoDetails | RecipientDetails

interface RoleDetailsFormProps {
  role: User['role']
  details: RoleSpecificDetails
  onUpdateDetails: (details: any) => void
  onUploadDocument?: (documentType: string, file: File) => Promise<string | boolean>
  isSubmitting?: boolean
  preventSubmit?: boolean
  onError?: (error: string) => void
  verificationStatus?: {
    is_verified: boolean
    can_place_orders: boolean
    message: string
  }
}

// Helper function to convert camelCase to snake_case
const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper function to convert form values to snake_case format
const convertToSnakeCase = (data: Record<string, any>): Record<string, any> => {
  const snakeCaseData: Record<string, any> = {};

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (value !== null && value !== undefined) {
        snakeCaseData[camelToSnakeCase(key)] = value;
      }
    }
  }

  return snakeCaseData;
}

export const RoleDetailsForm: React.FC<RoleDetailsFormProps> = ({
  role,
  details,
  onUpdateDetails,
  onUploadDocument,
  isSubmitting,
  preventSubmit,
  onError,
  verificationStatus
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<Record<string, File | null>>({})

  const validateField = (field: string, value: string): string => {
    if (!value && ['contact_person', 'contact_number'].includes(field)) {
      return `${field.replace(/_/g, ' ')} is required`
    }
    return ''
  }


  const shouldBeNumber = (field: string): boolean => {
    const numericFields = [
      'storage_capacity_kg', 
      'vehicle_capacity_kg', 
      'priority_level', 
      'latitude', 
      'longitude'
    ];
    return numericFields.includes(field);
  }
  // Update handle field change to use snake_case keys
  const handleFieldChange = (field: string, value: string | string[]) => {
    // Convert camelCase field name to snake_case
    const snakeField = camelToSnakeCase(field);
    
    // Determine if this field should be stored as a number
    let processedValue: string | number | string[] = value;
    
    if (typeof value === 'string') {
      const error = validateField(snakeField, value);
      setErrors(prev => ({
        ...prev,
        [snakeField]: error
      }));
      
      // Convert string to number for numeric fields
      if (shouldBeNumber(snakeField) && value !== '') {
        processedValue = parseFloat(value);
      }
    }

    // Update the form state with snake_case keys and properly typed values
    const update = { [snakeField]: processedValue };
    onUpdateDetails({ ...details, ...update });
  }
  const DocumentUploadStatus = ({ documentType, verificationStatus }) => {
    const isPending = verificationStatus && !verificationStatus.is_verified;

    return (
      <div className={`mt-2 text-sm ${isPending ? 'text-yellow-600' : 'text-green-600'}`}>
        {isPending ? (
          <p>
            <span className="inline-block mr-1">⏳</span>
            Document uploaded and pending admin verification via email
          </p>
        ) : (
          <p>
            <span className="inline-block mr-1">✓</span>
            Document verified
          </p>
        )}
      </div>
    );
  };
  const handleFileUpload = async (field: string, file: File | null) => {
    if (file) {
      setFiles(prev => ({
        ...prev,
        [field]: file
      }));

      const documentType = camelToSnakeCase(field);

      if (onUploadDocument && ['registration_certificate', 'pan_card_image', 'fcra_certificate',
        'tax_exemption_certificate', 'id_image', 'proof_of_need'].includes(documentType)) {
        try {
          const documentUrl = await onUploadDocument(documentType, file);

          if (typeof documentUrl === 'string') {
            // Add success notification about admin verification
            onUpdateDetails({
              ...details,
              [documentType]: documentUrl,
              [`${documentType}_pending`]: true  // Add flag for pending verification
            });

            // Show toast or notification
            alert("Document uploaded successfully. An admin will verify your document via email.");
            return;
          }
        } catch (error) {
          console.error(`Error uploading ${field}:`, error);
          onError?.(error instanceof Error ? error.message : `Error uploading ${field}`);
        }
      }

      // Fallback to base64 preview if document upload handler fails or isn't provided
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Use snake_case key
        onUpdateDetails({ ...details, [camelToSnakeCase(field)]: base64String });
      };
      reader.readAsDataURL(file);
    } else {
      setFiles(prev => ({
        ...prev,
        [field]: null
      }));
      // Use snake_case key
      onUpdateDetails({ ...details, [camelToSnakeCase(field)]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let validationErrors: Record<string, string> = {}
    const upperRole = role.toUpperCase()

    try {
      // Validate form data based on role and build validation errors
      // Note: We'll update the validation to use snake_case keys

      // Convert form data to snake_case throughout
      if (Object.keys(validationErrors).length === 0) {
        // Create deep copy of details object with all keys in snake_case
        const snakeCaseData = convertToSnakeCase(details);
        onUpdateDetails(snakeCaseData);
      } else {
        setErrors(validationErrors);
        onError?.('Please fill in all required fields correctly');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'An error occurred');
    }
  }

  const upperRole = role.toUpperCase()

  // Helper function to get value from details using either camelCase or snake_case key
  const getValue = (key: string): any => {
    const snakeKey = camelToSnakeCase(key);
    // Try snake_case key first, then camelCase key as fallback
    return details[snakeKey as keyof typeof details] !== undefined
      ? details[snakeKey as keyof typeof details]
      : details[key as keyof typeof details];
  }

  if (upperRole === 'DONOR') {
    return (
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="max-h-[70vh] overflow-y-auto pr-2 mb-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Donor Type *</label>
            <Select
              value={getValue('donorType') || ''}
              onChange={(e) => handleFieldChange('donorType', e.target.value)}
              disabled={isSubmitting}
              error={errors.donor_type}
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
              value={getValue('organizationName') || ''}
              onChange={(e) => handleFieldChange('organizationName', e.target.value)}
              disabled={isSubmitting}
              error={errors.organization_name}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Organization Details</label>
            <Textarea
              value={getValue('organizationDetails') || ''}
              onChange={(e) => handleFieldChange('organizationDetails', e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Contact Person *</label>
            <Input
              value={getValue('contactPerson') || ''}
              onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
              disabled={isSubmitting}
              error={errors.contact_person}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Contact Number *</label>
            <Input
              value={getValue('contactNumber') || ''}
              onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
              disabled={isSubmitting}
              error={errors.contact_number}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Operating Hours *</label>
            <Input
              value={getValue('operatingHours') || ''}
              onChange={(e) => handleFieldChange('operatingHours', e.target.value)}
              placeholder="e.g., Mon-Fri 9AM-5PM"
              disabled={isSubmitting}
              error={errors.operating_hours}
            />
          </div>
        </div>
        {!preventSubmit && (
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50 sticky bottom-0"
            disabled={isSubmitting || Object.keys(errors).length > 0}
          >
            {isSubmitting ? 'Saving...' : 'Save Details'}
          </button>
        )}
      </form>
    )
  }

  if (upperRole === 'NGO') {
    return (
      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Verification status banner */}
        {verificationStatus && (
          <div className={`p-4 mb-4 rounded-md ${verificationStatus.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            <p className="font-semibold">{verificationStatus.is_verified ? 'Verified' : 'Pending Verification'}</p>
            <p className="text-sm">{verificationStatus.message}</p>
            {!verificationStatus.is_verified && (
              <p className="text-sm mt-2">
                An administrator has been notified via email and will review your documents.
                You'll receive an email notification once your verification is complete.
              </p>
            )}
          </div>
        )}
  
        <div className="max-h-[70vh] overflow-y-auto pr-2 mb-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">NGO Name *</label>
            <Input
              value={getValue('ngoName') || ''}
              onChange={(e) => handleFieldChange('ngoName', e.target.value)}
              disabled={isSubmitting}
              error={errors.ngo_name}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Mission Statement *</label>
            <Textarea
              value={getValue('missionStatement') || ''}
              onChange={(e) => handleFieldChange('missionStatement', e.target.value)}
              disabled={isSubmitting}
              error={errors.mission_statement}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Contact Person *</label>
            <Input
              value={getValue('contactPerson') || ''}
              onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
              disabled={isSubmitting}
              error={errors.contact_person}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Contact Number *</label>
            <Input
              value={getValue('contactNumber') || ''}
              onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
              disabled={isSubmitting}
              error={errors.contact_number}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Operating Hours *</label>
            <Input
              value={getValue('operatingHours') || ''}
              onChange={(e) => handleFieldChange('operatingHours', e.target.value)}
              disabled={isSubmitting}
              error={errors.operating_hours}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Target Demographics *</label>
            <Textarea
              value={getValue('targetDemographics') || ''}
              onChange={(e) => handleFieldChange('targetDemographics', e.target.value)}
              disabled={isSubmitting}
              error={errors.target_demographics}
              rows={3}
            />
          </div>
  
          {/* New capacity and preferences section */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Capacity & Preferences</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Storage Capacity (kg)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={getValue('storageCapacityKg') || ''}
                  onChange={(e) => handleFieldChange('storageCapacityKg', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter your maximum storage capacity"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Vehicle Capacity (kg)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={getValue('vehicleCapacityKg') || ''}
                  onChange={(e) => handleFieldChange('vehicleCapacityKg', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter your vehicle transport capacity"
                />
              </div>
            </div>
  
            <div className="grid gap-2 mt-4">
              <label className="text-sm font-medium">Food Preferences</label>
              <div className="grid grid-cols-2 gap-2">
                {['Baked Goods', 'Dairy Products', 'Fruits', 'Meat', 'Vegetables', 'South Indian Breakfast', 'Snack', 'Rice and Biryani Dishes', 'Other'].map((preference) => (
                  <div key={preference} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`pref-${preference}`}
                      checked={Array.isArray(getValue('foodPreferences')) && getValue('foodPreferences').includes(preference)}
                      onChange={(e) => {
                        const currentPrefs = Array.isArray(getValue('foodPreferences')) ? [...getValue('foodPreferences')] : [];
                        if (e.target.checked) {
                          handleFieldChange('foodPreferences', [...currentPrefs, preference]);
                        } else {
                          handleFieldChange('foodPreferences', currentPrefs.filter(pref => pref !== preference));
                        }
                      }}
                      disabled={isSubmitting}
                      className="mr-2"
                    />
                    <label htmlFor={`pref-${preference}`} className="text-sm">{preference}</label>
                  </div>
                ))}
              </div>
            </div>
  
            <div className="grid gap-2 mt-4">
              <label className="text-sm font-medium">Priority Level</label>
              <Select
                value={getValue('priorityLevel') || '1'}
                onChange={(e) => handleFieldChange('priorityLevel', e.target.value)}
                disabled={isSubmitting}
              >
                <option value="1">Low (1)</option>
                <option value="2">Medium (2)</option>
                <option value="3">High (3)</option>
                <option value="4">Critical (4)</option>
                <option value="5">Emergency (5)</option>
              </Select>
              <p className="text-xs text-gray-500">Higher priority levels may receive donations first during high demand periods.</p>
            </div>
          </div>
  
          {/* Verification Section */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Verification Documents</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide the following documents for verification. Your account will be verified by an administrator.
            </p>
  
            <div className="grid gap-6">
              <div className="grid gap-2">
                <label className="text-sm font-medium">NGO Type</label>
                <Select
                  value={getValue('ngoType') || ''}
                  onChange={(e) => handleFieldChange('ngoType', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select NGO type</option>
                  <option value="TRUST">Trust</option>
                  <option value="SOCIETY">Society</option>
                  <option value="SECTION_8">Section 8 Company</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
  
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Registration Number</label>
                  <Input
                    value={getValue('registrationNumber') || ''}
                    onChange={(e) => handleFieldChange('registrationNumber', e.target.value)}
                    disabled={isSubmitting}
                    error={errors.registration_number}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Registration Certificate</label>
                  <FileUpload
                    onChange={(file) => handleFileUpload('registrationCertificate', file)}
                    currentFile={files.registrationCertificate}
                    accept="image/*,application/pdf"
                    disabled={isSubmitting}
                    error={errors.registration_certificate}
                    previewUrl={typeof getValue('registrationCertificate') === 'string' && getValue('registrationCertificate').startsWith('data:')
                      ? getValue('registrationCertificate')
                      : undefined}
                  />
                  {getValue('registrationCertificate') && (
                    <DocumentUploadStatus
                      documentType="registration_certificate"
                      verificationStatus={verificationStatus}
                    />
                  )}
                </div>
              </div>
  
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">PAN Number</label>
                  <Input
                    value={getValue('panNumber') || ''}
                    onChange={(e) => handleFieldChange('panNumber', e.target.value)}
                    disabled={isSubmitting}
                    error={errors.pan_number}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">PAN Card Image</label>
                  <FileUpload
                    onChange={(file) => handleFileUpload('panCardImage', file)}
                    currentFile={files.panCardImage}
                    accept="image/*"
                    disabled={isSubmitting}
                    error={errors.pan_card_image}
                    previewUrl={typeof getValue('panCardImage') === 'string' && getValue('panCardImage').startsWith('data:')
                      ? getValue('panCardImage')
                      : undefined}
                  />
                  {getValue('panCardImage') && (
                    <DocumentUploadStatus
                      documentType="panCardImage"
                      verificationStatus={verificationStatus}
                    />
                  )}
                </div>
              </div>
  
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">FCRA Number (if applicable)</label>
                  <Input
                    value={getValue('fcraNumber') || ''}
                    onChange={(e) => handleFieldChange('fcraNumber', e.target.value)}
                    disabled={isSubmitting}
                    error={errors.fcra_number}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">FCRA Certificate</label>
                  <FileUpload
                    onChange={(file) => handleFileUpload('fcraCertificate', file)}
                    currentFile={files.fcraCertificate}
                    accept="image/*,application/pdf"
                    disabled={isSubmitting}
                    error={errors.fcra_certificate}
                    previewUrl={typeof getValue('fcraCertificate') === 'string' && getValue('fcraCertificate').startsWith('data:')
                      ? getValue('fcraCertificate')
                      : undefined}
                  />
                  {getValue('fcraCertificate') && (
                    <DocumentUploadStatus
                      documentType="fcraCertificate"
                      verificationStatus={verificationStatus}
                    />
                  )}
                </div>
              </div>
  
              <div className="grid gap-2">
                <label className="text-sm font-medium">Tax Exemption Certificate (if applicable)</label>
                <FileUpload
                  onChange={(file) => handleFileUpload('taxExemptionCertificate', file)}
                  currentFile={files.taxExemptionCertificate}
                  accept="image/*,application/pdf"
                  disabled={isSubmitting}
                  error={errors.tax_exemption_certificate}
                  previewUrl={typeof getValue('taxExemptionCertificate') === 'string' && getValue('taxExemptionCertificate').startsWith('data:')
                    ? getValue('taxExemptionCertificate')
                    : undefined}
                />
                {getValue('taxExemptionCertificate') && (
                  <DocumentUploadStatus
                    documentType="taxExemptionCertificate"
                    verificationStatus={verificationStatus}
                  />
                )}
              </div>
  
              <div className="grid gap-2">
                <label className="text-sm font-medium">Annual Reports Link (if applicable)</label>
                <Input
                  value={getValue('annualReportsLink') || ''}
                  onChange={(e) => handleFieldChange('annualReportsLink', e.target.value)}
                  placeholder="https://example.com/annual-reports"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        </div>
  
        {!preventSubmit && (
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50 mt-6"
            disabled={isSubmitting || Object.keys(errors).some(key => errors[key] !== '')}
          >
            {isSubmitting ? 'Saving...' : verificationStatus?.is_verified ? 'Update Details' : 'Submit for Verification'}
          </button>
        )}
      </form>
    )
  }

  if (upperRole === 'RECIPIENT') {
    return (
      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Verification status banner */}
        {verificationStatus && (
          <div className={`p-4 mb-4 rounded-md ${verificationStatus.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            <p className="font-semibold">{verificationStatus.is_verified ? 'Verified' : 'Pending Verification'}</p>
            <p className="text-sm">{verificationStatus.message}</p>
            {!verificationStatus.is_verified && (
              <p className="text-sm mt-2">
                An administrator has been notified via email and will review your documents.
                You'll receive an email notification once your verification is complete.
              </p>
            )}
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto pr-2 mb-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Recipient Name *</label>
            <Input
              value={getValue('recipientName') || ''}
              onChange={(e) => handleFieldChange('recipientName', e.target.value)}
              disabled={isSubmitting}
              error={errors.recipient_name}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Recipient Details *</label>
            <Textarea
              value={getValue('recipientDetails') || ''}
              onChange={(e) => handleFieldChange('recipientDetails', e.target.value)}
              disabled={isSubmitting}
              error={errors.recipient_details}
              rows={3}
              placeholder="Describe your organization and the people it serves"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Contact Person *</label>
            <Input
              value={getValue('contactPerson') || ''}
              onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
              disabled={isSubmitting}
              error={errors.contact_person}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Contact Number *</label>
            <Input
              value={getValue('contactNumber') || ''}
              onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
              disabled={isSubmitting}
              error={errors.contact_number}
            />
          </div>

          {/* Verification Section */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Verification Documents</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide the following documents for verification. Your account will be verified by an administrator.
            </p>

            <div className="grid gap-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">ID Type</label>
                  <Select
                    value={getValue('idType') || ''}
                    onChange={(e) => handleFieldChange('idType', e.target.value)}
                    disabled={isSubmitting}
                    error={errors.id_type}
                  >
                    <option value="">Select ID type</option>
                    <option value="AADHAR">Aadhar Card</option>
                    <option value="VOTER">Voter ID</option>
                    <option value="PAN">PAN Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">ID Number</label>
                  <Input
                    value={getValue('idNumber') || ''}
                    onChange={(e) => handleFieldChange('idNumber', e.target.value)}
                    disabled={isSubmitting}
                    error={errors.id_number}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">ID Image</label>
                <FileUpload
                  onChange={(file) => handleFileUpload('idImage', file)}
                  currentFile={files.idImage}
                  accept="image/*"
                  disabled={isSubmitting}
                  error={errors.id_image}
                  previewUrl={typeof getValue('idImage') === 'string' && getValue('idImage').startsWith('data:')
                    ? getValue('idImage')
                    : undefined}
                />
                {getValue('idImage') && (
                  <DocumentUploadStatus
                    documentType="idImage"
                    verificationStatus={verificationStatus}
                  />
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Address</label>
                <Textarea
                  value={getValue('address') || ''}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  disabled={isSubmitting}
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Proof of Need</label>
                <Textarea
                  value={getValue('proofOfNeed') || ''}
                  onChange={(e) => handleFieldChange('proofOfNeed', e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  placeholder="Explain why your organization needs food donations"
                />
              </div>
            </div>
          </div>
        </div>

        {!preventSubmit && (
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50 mt-6"
            disabled={isSubmitting || Object.keys(errors).some(key => errors[key] !== '')}
          >
            {isSubmitting ? 'Saving...' : verificationStatus?.is_verified ? 'Update Details' : 'Submit for Verification'}
          </button>
        )}
      </form>
    )
  }

  return null
}