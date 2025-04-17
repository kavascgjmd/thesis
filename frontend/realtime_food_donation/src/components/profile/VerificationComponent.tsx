import React, { useState, useEffect } from 'react'
import { User, RoleSpecificDetails } from '../../types/user'
import { Input } from '../ui/input/Input'
import { Button } from '../ui/button/Button'
import { Alert } from '../ui/alert/Alert'
import { FileUpload } from '../ui/fileUpload/FileUpload'
import axios from 'axios'

interface VerificationSectionProps {
  user: User
  roleSpecificDetails: RoleSpecificDetails
  onUpdateDetails: (details: any) => void
}

type VerificationStatus = {
  isVerified: boolean
  canPlaceOrders: boolean
  message: string
  verificationDate?: string
  latestLog?: {
    status: string
    verification_notes: string
    created_at: string
  }
}

export const VerificationSection: React.FC<VerificationSectionProps> = ({
  user,
  roleSpecificDetails,
  onUpdateDetails
}) => {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({})
  const [isSaving, setIsSaving] = useState(false)

  const upperRole = user.role.toUpperCase()
  
  // Fetch verification status on component mount
  useEffect(() => {
    fetchVerificationStatus()
  }, [])

  const fetchVerificationStatus = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/profile/verification-status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (response.data.success) {
        setVerificationStatus({
          isVerified: response.data.is_verified,
          canPlaceOrders: response.data.can_place_orders,
          message: response.data.message,
          verificationDate: response.data.verification_date,
          latestLog: response.data.latest_log
        })
      } else {
        setError(response.data.message || 'Failed to fetch verification status')
      }
    } catch (err) {
      setError('Error checking verification status')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (field: string, file: File | null) => {
    setUploadFiles(prev => ({
      ...prev,
      [field]: file
    }))
  }

  const handleTextChange = (field: string, value: string) => {
    onUpdateDetails({
      ...roleSpecificDetails,
      [field]: value
    })
  }

  const uploadDocument = async (fieldName: string, file: File): Promise<string> => {
    if (!file) return ''

    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            reject('Failed to read file')
            return
          }

          const base64Data = e.target.result.toString()
          const fileType = file.type

          // Call the endpoint to upload document
          const response = await axios.post('/api/uploads/document', {
            folder: upperRole === 'NGO' ? 'ngo-documents' : 'recipient-documents',
            id: user.id,
            documentType: fieldName,
            base64Document: base64Data,
            fileType
          }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })

          if (response.data.success) {
            resolve(response.data.url)
          } else {
            reject(response.data.message || 'Failed to upload document')
          }
        } catch (err) {
          reject('Error uploading document')
        }
      }
      reader.onerror = () => reject('Error reading file')
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    
    try {
      // Create updated details object
      let updatedDetails = { ...roleSpecificDetails }
      
      // Upload all selected files and update the details object
      for (const [fieldName, file] of Object.entries(uploadFiles)) {
        if (file) {
          const documentUrl = await uploadDocument(fieldName, file)
          updatedDetails = {
            ...updatedDetails,
            [fieldName]: documentUrl
          }
        }
      }
      
      // Submit updated data
      const response = await axios.put('/api/profile/role-details', updatedDetails, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (response.data.success) {
        // Update local state with response data
        onUpdateDetails(response.data.details)
        
        // Refresh verification status
        fetchVerificationStatus()
        
        // Reset file upload states
        setUploadFiles({})
      } else {
        setError(response.data.message || 'Failed to update verification details')
      }
    } catch (err) {
      setError('Error submitting verification details')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  if (upperRole === 'DONOR') {
    return null // Donors don't need verification
  }

  // Show loading indicator
  if (loading) {
    return <div className="mt-6 p-4">Loading verification status...</div>
  }

  // Render verification status section
  return (
    <div className="mt-6 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Account Verification Status
      </h2>
      
      {/* Status Section */}
      <div className={`p-4 rounded-md mb-6 ${verificationStatus?.isVerified ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <div className="flex items-center">
          <div className={`flex-shrink-0 h-5 w-5 rounded-full ${verificationStatus?.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <div className="ml-3">
            <h3 className={`text-lg font-medium ${verificationStatus?.isVerified ? 'text-green-800' : 'text-yellow-800'}`}>
              {verificationStatus?.isVerified ? 'Verified Account' : 'Verification Pending'}
            </h3>
            <p className={`mt-1 ${verificationStatus?.isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
              {verificationStatus?.message}
            </p>
            {verificationStatus?.latestLog && (
              <div className="mt-2 text-sm">
                <p><span className="font-medium">Status:</span> {verificationStatus.latestLog.status}</p>
                {verificationStatus.latestLog.verification_notes && (
                  <p><span className="font-medium">Notes:</span> {verificationStatus.latestLog.verification_notes}</p>
                )}
                <p><span className="font-medium">Last Updated:</span> {new Date(verificationStatus.latestLog.created_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Show error message if any */}
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}
      
      {/* Verification Documents Form */}
      <form onSubmit={handleSubmit} className="grid gap-4">
        <h3 className="text-lg font-medium text-gray-800">Verification Documents</h3>
        <p className="text-sm text-gray-600 mb-4">
          {upperRole === 'NGO' 
            ? 'Please provide the following documents to verify your NGO. Your account will need to be verified by our admin team before you can place orders.'
            : 'Please provide valid ID and proof of need to verify your account. Your account will need to be verified by our admin team before you can place orders.'}
        </p>
        
        {upperRole === 'NGO' && (
          <>
            <div className="grid gap-2">
              <label className="text-sm font-medium">NGO Type</label>
              <Input
                value={(roleSpecificDetails as any).ngoType || ''}
                onChange={(e) => handleTextChange('ngoType', e.target.value)}
                placeholder="e.g., Educational, Healthcare, Food Relief"
                disabled={isSaving || verificationStatus?.isVerified}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Registration Number</label>
              <Input
                value={(roleSpecificDetails as any).registrationNumber || ''}
                onChange={(e) => handleTextChange('registrationNumber', e.target.value)}
                placeholder="NGO Registration Number"
                disabled={isSaving || verificationStatus?.isVerified}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Registration Certificate</label>
              <FileUpload
                accept="image/*,.pdf"
                onChange={(file) => handleFileChange('registrationCertificate', file)}
                disabled={isSaving || verificationStatus?.isVerified}
                fileName={uploadFiles['registrationCertificate']?.name || ''}
              />
              {(roleSpecificDetails as any).registrationCertificate && (
                <p className="text-xs text-green-600">Document already uploaded</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">PAN Number</label>
              <Input
                value={(roleSpecificDetails as any).panNumber || ''}
                onChange={(e) => handleTextChange('panNumber', e.target.value)}
                placeholder="PAN Number"
                disabled={isSaving || verificationStatus?.isVerified}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">PAN Card Image</label>
              <FileUpload
                accept="image/*,.pdf"
                onChange={(file) => handleFileChange('panCardImage', file)}
                disabled={isSaving || verificationStatus?.isVerified}
                fileName={uploadFiles['panCardImage']?.name || ''}
              />
              {(roleSpecificDetails as any).panCardImage && (
                <p className="text-xs text-green-600">Document already uploaded</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">FCRA Number (Optional)</label>
              <Input
                value={(roleSpecificDetails as any).fcraNumber || ''}
                onChange={(e) => handleTextChange('fcraNumber', e.target.value)}
                placeholder="FCRA Number (if applicable)"
                disabled={isSaving || verificationStatus?.isVerified}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">FCRA Certificate (Optional)</label>
              <FileUpload
                accept="image/*,.pdf"
                onChange={(file) => handleFileChange('fcraCertificate', file)}
                disabled={isSaving || verificationStatus?.isVerified}
                fileName={uploadFiles['fcraCertificate']?.name || ''}
              />
              {(roleSpecificDetails as any).fcraCertificate && (
                <p className="text-xs text-green-600">Document already uploaded</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tax Exemption Certificate (Optional)</label>
              <FileUpload
                accept="image/*,.pdf"
                onChange={(file) => handleFileChange('taxExemptionCertificate', file)}
                disabled={isSaving || verificationStatus?.isVerified}
                fileName={uploadFiles['taxExemptionCertificate']?.name || ''}
              />
              {(roleSpecificDetails as any).taxExemptionCertificate && (
                <p className="text-xs text-green-600">Document already uploaded</p>
              )}
            </div>
          </>
        )}
        
        {upperRole === 'RECIPIENT' && (
          <>
            <div className="grid gap-2">
              <label className="text-sm font-medium">ID Type</label>
              <Input
                value={(roleSpecificDetails as any).idType || ''}
                onChange={(e) => handleTextChange('idType', e.target.value)}
                placeholder="e.g., Aadhar Card, PAN Card, Voter ID"
                disabled={isSaving || verificationStatus?.isVerified}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">ID Number</label>
              <Input
                value={(roleSpecificDetails as any).idNumber || ''}
                onChange={(e) => handleTextChange('idNumber', e.target.value)}
                placeholder="ID Number"
                disabled={isSaving || verificationStatus?.isVerified}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">ID Document (Image)</label>
              <FileUpload
                accept="image/*,.pdf"
                onChange={(file) => handleFileChange('idImage', file)}
                disabled={isSaving || verificationStatus?.isVerified}
                fileName={uploadFiles['idImage']?.name || ''}
              />
              {(roleSpecificDetails as any).idImage && (
                <p className="text-xs text-green-600">Document already uploaded</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Detailed Address</label>
              <Input
                value={(roleSpecificDetails as any).address || ''}
                onChange={(e) => handleTextChange('address', e.target.value)}
                placeholder="Full Address with Postal Code"
                disabled={isSaving || verificationStatus?.isVerified}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Proof of Need</label>
              <FileUpload
                accept="image/*,.pdf"
                onChange={(file) => handleFileChange('proofOfNeed', file)}
                disabled={isSaving || verificationStatus?.isVerified}
                fileName={uploadFiles['proofOfNeed']?.name || ''}
              />
              {(roleSpecificDetails as any).proofOfNeed && (
                <p className="text-xs text-green-600">Document already uploaded</p>
              )}
            </div>
          </>
        )}
        
        {/* Submit Button - only show if not verified yet */}
        {!verificationStatus?.isVerified && (
          <Button 
            type="submit"
            className="mt-4"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Submit Verification Documents'}
          </Button>
        )}
      </form>
      
      {/* Place order restriction message */}
      {!verificationStatus?.canPlaceOrders && (
        <div className="mt-6 p-4 bg-blue-50 text-blue-700 rounded-md">
          <h4 className="font-medium">Note:</h4>
          <p>You will be able to place orders once your account is verified. An admin will review your documents and approve your account.</p>
        </div>
      )}
    </div>
  )
}