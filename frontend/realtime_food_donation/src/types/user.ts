export interface User {
    username: string
    email: string
    phone: string
    address: string
    role: 'DONOR' | 'NGO' | 'RECIPIENT'
    profilePicture: string
    created_at: string;
    updated_at: string;
   }
  
  export interface RoleSpecificDetails {
    // Donor fields
    donorType?: string
    organizationName?: string
    organizationDetails?: string
    contactPerson?: string
    contactNumber?: string
    operatingHours?: string
    
    // NGO fields
    ngoName?: string
    missionStatement?: string
    targetDemographics?: string
    
    // Recipient fields
    recipientName?: string
    recipientDetails?: string
  }