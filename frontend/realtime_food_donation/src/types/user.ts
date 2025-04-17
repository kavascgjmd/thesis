export interface User {
  username: string
  email: string
  phone: string
  address: string
  role: 'DONOR' | 'NGO' | 'RECIPIENT'
  profile_picture: string
  created_at: string
  updated_at: string
  is_verified?: boolean
  can_place_orders?: boolean
  verification_message?: string
}
  
export interface RoleSpecificDetails {
  // Donor fields
  donor_type?: string
  organization_name?: string
  organization_details?: string
  contact_person?: string
  contact_number?: string
  operating_hours?: string
  
  // NGO fields
  ngo_name?: string
  mission_statement?: string
  target_demographics?: string
  
  // Recipient fields
  recipient_name?: string
  recipient_details?: string
}