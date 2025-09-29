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
  
  // New NGO verification fields and capacity fields
  ngo_type?: string
  registration_number?: string
  registration_certificate?: string
  pan_number?: string
  pan_card_image?: string
  fcra_number?: string
  fcra_certificate?: string
  tax_exemption_certificate?: string
  annual_reports_link?: string
  
  // NGO capacity fields - these should be numbers not strings
  storage_capacity_kg?: number
  vehicle_capacity_kg?: number
  priority_level?: number
  food_preferences?: string[]
  latitude?: number
  longitude?: number
  
  // Recipient fields
  recipient_name?: string
  recipient_details?: string
  id_type?: string
  id_number?: string
  id_image?: string
  proof_of_need?: string
}