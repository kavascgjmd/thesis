import React, { useState, useEffect } from 'react'
import { Input } from '../ui/input/Input'
import { User } from '../../types/user'
import { Button } from '../ui/button/Button'
import { GoogleMapsAutocomplete } from '../GoogleMapsAutocomplete';
import { Search, ChevronDown } from 'lucide-react'

// Interface for country data
interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

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
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('')
  
  // Fallback country list
  const fallbackCountries: Country[] = [
    { name: 'United States', code: 'US', dialCode: '+1', flag: 'https://flagcdn.com/us.svg' },
    { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: 'https://flagcdn.com/gb.svg' },
    { name: 'India', code: 'IN', dialCode: '+91', flag: 'https://flagcdn.com/in.svg' },
    { name: 'Canada', code: 'CA', dialCode: '+1', flag: 'https://flagcdn.com/ca.svg' },
    { name: 'Australia', code: 'AU', dialCode: '+61', flag: 'https://flagcdn.com/au.svg' },
    { name: 'China', code: 'CN', dialCode: '+86', flag: 'https://flagcdn.com/cn.svg' },
    { name: 'Germany', code: 'DE', dialCode: '+49', flag: 'https://flagcdn.com/de.svg' },
    { name: 'France', code: 'FR', dialCode: '+33', flag: 'https://flagcdn.com/fr.svg' },
    { name: 'Japan', code: 'JP', dialCode: '+81', flag: 'https://flagcdn.com/jp.svg' },
    { name: 'Russia', code: 'RU', dialCode: '+7', flag: 'https://flagcdn.com/ru.svg' },
    { name: 'Brazil', code: 'BR', dialCode: '+55', flag: 'https://flagcdn.com/br.svg' },
    { name: 'UAE', code: 'AE', dialCode: '+971', flag: 'https://flagcdn.com/ae.svg' },
    { name: 'Singapore', code: 'SG', dialCode: '+65', flag: 'https://flagcdn.com/sg.svg' },
  ];

  // Improved parsePhoneNumber function
  const parsePhoneNumber = (fullPhone: string, countryList: Country[]) => {
    if (!fullPhone) {
      setPhoneNumber('');
      // Set default country if available
      const defaultCountry = countryList.find(country => country.code === 'US');
      if (defaultCountry) {
        setSelectedCountry(defaultCountry);
        setCountryCode(defaultCountry.dialCode);
      }
      return;
    }
    
    // Sort countries by dial code length (descending) to match longer codes first
    const sortedCountries = [...countryList].sort(
      (a, b) => b.dialCode.length - a.dialCode.length
    );
    
    for (const country of sortedCountries) {
      if (fullPhone.startsWith(country.dialCode)) {
        setSelectedCountry(country);
        setCountryCode(country.dialCode);
        setPhoneNumber(fullPhone.substring(country.dialCode.length));
        return;
      }
    }
    
    // If no matching country code found, just use the whole string as phone number
    setPhoneNumber(fullPhone);
    // Set default country if available
    const defaultCountry = countryList.find(country => country.code === 'US');
    if (defaultCountry) {
      setSelectedCountry(defaultCountry);
      setCountryCode(defaultCountry.dialCode);
    }
  };

  // Fetch countries data and set up initial values
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags');
        const data = await response.json();
        
        const countryList: Country[] = data.map((country: any) => {
          const dialCode = country.idd.root + (country.idd.suffixes?.[0] || '');
          return {
            name: country.name.common,
            code: country.cca2,
            dialCode: dialCode,
            flag: country.flags.svg
          };
        }).sort((a: Country, b: Country) => a.name.localeCompare(b.name));

        setCountries(countryList);
        
        // After countries are loaded, then parse the phone number
        if (user.phone) {
          parsePhoneNumber(user.phone, countryList);
        } else {
          // Otherwise set default country (US)
          const defaultCountry = countryList.find(country => country.code === 'US');
          if (defaultCountry) {
            setSelectedCountry(defaultCountry);
            setCountryCode(defaultCountry.dialCode);
          }
        }
      } catch (error) {
        console.error('Failed to fetch countries:', error);
        // Fallback to predefined list
        setCountries(fallbackCountries);
        
        if (user.phone) {
          parsePhoneNumber(user.phone, fallbackCountries);
        } else {
          const defaultCountry = fallbackCountries.find(country => country.code === 'US');
          if (defaultCountry) {
            setSelectedCountry(defaultCountry);
            setCountryCode(defaultCountry.dialCode);
          }
        }
      }
    };

    fetchCountries();
  }, [user.phone]); // Add user.phone to dependencies so it re-parses when changed

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (countryDropdownOpen && !target.closest('.country-dropdown')) {
        setCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [countryDropdownOpen]);

  // Filter countries based on search query
  const filteredCountries = searchQuery 
    ? countries.filter(country => 
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        country.dialCode.includes(searchQuery)
      )
    : countries;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      // Form is valid, continue with submission
      console.log('Form submitted successfully');
    }
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

  const handlePhoneChange = (value: string) => {
    // Keep track of just the number part locally
    setPhoneNumber(value);
    
    // Combine country code and phone number for the complete phone
    // Make sure countryCode is not undefined or null before combining
    const fullPhone = countryCode && value ? `${countryCode}${value}` : value;
    
    // Update the user object with the full phone
    onUpdateUser({
      phone: fullPhone
    });
  }

  const selectCountry = (country: Country) => {
    // Update the country selection and code
    setSelectedCountry(country);
    setCountryCode(country.dialCode);
    setCountryDropdownOpen(false);
    setSearchQuery('');
    
    // Update the full phone number with the new country code
    const fullPhone = phoneNumber ? `${country.dialCode}${phoneNumber}` : '';
    
    if (phoneNumber) {
      onUpdateUser({
        phone: fullPhone
      });
    }
  }

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    // Clear error when field is edited
    setErrors(prev => ({ ...prev, address: '' }))
    
    onUpdateUser({ 
      address: address.trim(),
      // You may want to store coordinates in your User type as well
      ...(coordinates && { 
        latitude: coordinates.lat,
        longitude: coordinates.lng
      })
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
      
      {/* Phone number with country code */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Phone</label>
        <div className="flex gap-2">
          <div className="relative w-1/3 country-dropdown">
            <button
              type="button"
              onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
              className="w-full h-full px-3 py-2 border rounded-md flex items-center justify-between bg-white"
              disabled={isSubmitting}
            >
              <div className="flex items-center">
                {selectedCountry ? (
                  <>
                    <img 
                      src={selectedCountry.flag} 
                      alt={selectedCountry.name} 
                      className="w-5 h-3 mr-2 object-cover" 
                    />
                    <span className="text-sm">{selectedCountry.dialCode}</span>
                  </>
                ) : (
                  <span>+1</span>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {countryDropdownOpen && (
              <div className="absolute z-10 mt-1 w-64 max-h-60 overflow-auto bg-white border rounded-md shadow-lg">
                <div className="sticky top-0 bg-white p-2 border-b">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search countries..."
                      className="w-full px-3 py-2 pl-8 border rounded-md text-sm"
                    />
                    <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="py-1">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => selectCountry(country)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                    >
                      <img 
                        src={country.flag} 
                        alt={country.name} 
                        className="w-5 h-3 mr-2 object-cover" 
                      />
                      <span className="flex-1">{country.name}</span>
                      <span className="text-gray-500">{country.dialCode}</span>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-500">No countries found</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <Input
            className="w-2/3"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            disabled={isSubmitting}
            type="tel"
            placeholder="Phone number"
          />
        </div>
      </div>
      
      <div className="grid gap-2">
        <label className="text-sm font-medium">Address</label>
        <GoogleMapsAutocomplete
          value={user.address || ''}
          onChange={handleAddressChange}
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