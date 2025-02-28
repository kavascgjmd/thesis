import React from 'react'
import { User as UserIcon, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '../ui/button/Button'
import { User } from '../../types/user'
import { Camera } from 'lucide-react'
interface ProfileHeaderProps {
  user: User
  onEdit: () => void
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, onEdit }) => {
  return (
    <div className="flex flex-wrap md:flex-nowrap gap-8">
      <div className="relative">
        <div className="w-32 h-32 bg-gray-100 rounded-full border-4 border-white overflow-hidden flex items-center justify-center">
          <UserIcon className="w-16 h-16 text-gray-400" />
        </div>
        <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md hover:bg-gray-50">
          <Camera className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{user.username}</h1>
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {user.phone}
                </div>
              )}
              {user.address && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {user.address}
                </div>
              )}
            </div>
          </div>
          <Button 
            onClick={onEdit}
            className="bg-rose-500 hover:bg-rose-600 text-white px-6"
          >
            Edit profile
          </Button>
        </div>

        <div className="mt-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {user.role}
          </span>
        </div>
      </div>
    </div>
  )
}