import React from 'react'
import { Input } from '../ui/input/Input'
import { User } from '../../types/user'
import { useState } from 'react'
import { Button } from '../ui/button/Button'




interface BasicInfoFormProps {
  user: User
  onUpdateUser: (user: Partial<User>) => void
  isSubmitting?: boolean
  preventSubmit?: boolean
}

export const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ 
  user, 
  onUpdateUser,
  isSubmitting,
  preventSubmit 
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    validateForm()
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!user.username) {
      newErrors.username = 'Username is required'
    }
    
    if (!user.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(user.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFieldChange = (field: keyof User, value: string) => {
    // Clear error when field is edited
    setErrors(prev => ({ ...prev, [field]: '' }))
    
    onUpdateUser({ 
      [field]: value.trim()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Username *</label>
        <Input
          value={user.username || ''}
          onChange={(e) => handleFieldChange('username', e.target.value)}
          disabled={isSubmitting}
          error={errors.username}
          required
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Email *</label>
        <Input
          value={user.email || ''}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          disabled={isSubmitting}
          error={errors.email}
          type="email"
          required
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Phone</label>
        <Input
          value={user.phone || ''}
          onChange={(e) => handleFieldChange('phone', e.target.value)}
          disabled={isSubmitting}
          type="tel"
          placeholder="Enter phone number"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Address</label>
        <Input
          value={user.address || ''}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          disabled={isSubmitting}
          placeholder="Enter address"
        />
      </div>
      {!preventSubmit && (
        <div className="flex justify-end mt-4">
          <Button
            type="submit"
            disabled={isSubmitting || Object.keys(errors).length > 0}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </form>
  )
}
