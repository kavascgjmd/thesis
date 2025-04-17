import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, AlertCircle, Search, Upload, FileImage, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
const BASE_URL = 'http://localhost:3000';
type UserRole = 'Admin' | 'Donor' | 'NGO' | 'Recipient';
import { GoogleMapsAutocomplete } from '../components/GoogleMapsAutocomplete';

// Interface for country data
interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

interface FormData {
  username: string;
  password: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  role: UserRole | '';
  address: string;
  otp: string;
  profile_picture: File | null;
  profile_picture_base64: string | null;
}

interface SignUpModalProps {
  onClose: () => void;
  setIsAuthenticated: (value: boolean) => void;
}

export const SignUpModal: React.FC<SignUpModalProps> = ({ onClose, setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resendDisabled, setResendDisabled] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    email: '',
    countryCode: '+1', // Default country code
    phoneNumber: '',
    role: '',
    address: '',
    otp: '',
    profile_picture: null,
    profile_picture_base64: null
  });

  // Fetch countries data
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        // Option 1: Fetch from a hosted API
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
        
        // Set default country (US)
        const defaultCountry = countryList.find(country => country.code === 'US');
        if (defaultCountry) {
          setSelectedCountry(defaultCountry);
          setFormData(prev => ({
            ...prev,
            countryCode: defaultCountry.dialCode
          }));
        }
      } catch (error) {
        console.error('Failed to fetch countries:', error);
        // Fallback to a predefined list if API fails
        setCountries(fallbackCountries);
        const defaultCountry = fallbackCountries.find(country => country.code === 'US');
        if (defaultCountry) {
          setSelectedCountry(defaultCountry);
          setFormData(prev => ({
            ...prev,
            countryCode: defaultCountry.dialCode
          }));
        }
      }
    };

    fetchCountries();
  }, []);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Fallback country list in case API is unavailable
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

  const [validationStates, setValidationStates] = useState({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const passwordRequirements = [
    { key: 'minLength', label: 'Minimum 8 characters', test: (pass: string) => pass.length >= 8 },
    { key: 'uppercase', label: 'Contains uppercase letter', test: (pass: string) => /[A-Z]/.test(pass) },
    { key: 'lowercase', label: 'Contains lowercase letter', test: (pass: string) => /[a-z]/.test(pass) },
    { key: 'number', label: 'Contains number', test: (pass: string) => /\d/.test(pass) },
    { key: 'special', label: 'Contains special character', test: (pass: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pass) },
  ];

  // Filter countries based on search query
  const filteredCountries = searchQuery 
    ? countries.filter(country => 
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        country.dialCode.includes(searchQuery)
      )
    : countries;

  // Get full phone with country code
  const getFullPhone = (): string => {
    return `${formData.countryCode}${formData.phoneNumber}`;
  };

  const updatePasswordValidation = (password: string) => {
    setValidationStates({
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  const selectCountry = (country: Country) => {
    setSelectedCountry(country);
    setFormData(prev => ({
      ...prev,
      countryCode: country.dialCode
    }));
    setCountryDropdownOpen(false);
    setSearchQuery('');
  };

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'profile_picture' && 'files' in e.target && e.target.files?.[0]) {
      const file = e.target.files[0];
      setImageUploadError(null);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setImageUploadError('Unsupported file type. Please upload a JPEG, PNG, GIF, or WEBP image.');
        return;
      }

      // Validate file size (client-side validation, server will also validate)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setImageUploadError(`File size exceeds 5MB limit. Large images will be stored locally instead of S3.`);
      }

      // Create a preview
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);

      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      setFormData(prev => ({
        ...prev,
        profile_picture: file,
        profile_picture_base64: base64
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));

      if (name === 'password') {
        updatePasswordValidation(value);
      }
    }
  };

  const clearProfilePicture = () => {
    setFormData(prev => ({
      ...prev,
      profile_picture: null,
      profile_picture_base64: null
    }));
    setImagePreview(null);
    setImageUploadError(null);
  };

  const isPasswordValid = (): boolean => {
    return Object.values(validationStates).every(state => state);
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Create payload object with combined phone number
      const payload = {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        phone: getFullPhone(), // Send the combined phone number to the backend
        role: formData.role,
        address: formData.address,
        profile_picture: formData.profile_picture_base64
      };

      const response = await axios.post(`${BASE_URL}/api/user/signup`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });

      if (response.data.status === 'success') {
        setStep(2);
        setTimeLeft(600);
      }
    } catch (err: any) {
      console.error('Signup error:', err.response?.data || err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerification = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${BASE_URL}/api/user/verify-otp`, {
        phone: getFullPhone(), // Use the combined phone number here too
        otp: formData.otp
      }, {
        withCredentials: true
      });

      if (response.data.message === 'Registration successful. You are now signed in.') {
        setIsAuthenticated(true);
        onClose();
        navigate('/profile', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setIsLoading(true);
    setResendDisabled(true);

    try {
      await axios.post('/api/resend-otp', {
        phone: getFullPhone() // Use the combined phone number
      }, {
        withCredentials: true
      });
      setTimeLeft(600);
      setTimeout(() => setResendDisabled(false), 30000);
    } catch (err: any) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-content bg-white w-[420px] rounded-lg shadow-xl p-6 relative animate-modalFade overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close-button absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          disabled={isLoading}
        >
          <X className="h-5 w-5" />
        </button>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
            {error}
          </div>
        )}

        {step === 1 ? (
          <>
            <h2 className="text-[22px] font-medium text-gray-800 mb-6">Sign up</h2>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <input
                  type="text"
                  name="username"
                  placeholder="Full Name"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                  required
                  disabled={isLoading}
                />
                <button 
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req) => (
                    <div key={req.key} className="flex items-center text-xs">
                      {validationStates[req.key as keyof typeof validationStates] ? (
                        <Check className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                      )}
                      <span className={validationStates[req.key as keyof typeof validationStates] ? 'text-green-500' : 'text-red-500'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phone number with country code dropdown */}
              <div className="grid grid-cols-3 gap-2">
                <div className="relative country-dropdown">
                  <button
                    type="button"
                    onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px] flex items-center justify-between"
                    disabled={isLoading}
                  >
                    {selectedCountry ? (
                      <div className="flex items-center">
                        <img 
                          src={selectedCountry.flag} 
                          alt={selectedCountry.name} 
                          className="w-6 h-4 mr-2 object-cover" 
                        />
                        <span>{selectedCountry.dialCode}</span>
                      </div>
                    ) : (
                      '+1'
                    )}
                  </button>

                  {countryDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-64 max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
                      <div className="sticky top-0 bg-white p-2 border-b">
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search countries..."
                            className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md text-sm"
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
                              className="w-6 h-4 mr-2 object-cover" 
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
                <div className="col-span-2">
                  <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="Phone Number"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                  required
                  disabled={isLoading}
                >
                  <option value="">Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Donor">Donor</option>
                  <option value="NGO">NGO</option>
                  <option value="Recipient">Recipient</option>
                </select>
              </div>

              <div>
                <GoogleMapsAutocomplete
                  value={formData.address}
                  onChange={(address, coordinates) => {
                    setFormData(prev => ({
                      ...prev,
                      address,
                    }));
                  }}
                  disabled={isLoading}
                  placeholder="Enter your address"
                />
              </div>

              {/* Enhanced profile picture upload with preview */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
                
                {imagePreview ? (
                  <div className="relative mt-2">
                    <img 
                      src={imagePreview} 
                      alt="Profile preview" 
                      className="w-32 h-32 object-cover rounded-full mx-auto border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={clearProfilePicture}
                      className="absolute top-0 right-1/3 bg-red-500 text-white rounded-full p-1"
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-gray-500 mb-1" />
                        <p className="mb-2 text-sm text-gray-500">Click to upload</p>
                        <p className="text-xs text-gray-500">JPEG, PNG, GIF, or WEBP</p>
                      </div>
                      <input 
                        type="file"
                        name="profile_picture"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleChange}
                        className="hidden"
                        disabled={isLoading}
                      />
                    </label>
                  </div>
                )}
                
                {imageUploadError && (
                  <p className="text-xs text-amber-600 mt-1">{imageUploadError}</p>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  Images over 5MB will be stored locally instead of in S3.
                </p>
              </div>

              <button
                type="submit"
                disabled={!isPasswordValid() || isLoading}
                className="w-full bg-red-500 text-white py-3 rounded-md hover:bg-red-600 transition-colors font-medium text-[15px] disabled:bg-red-300"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-[22px] font-medium text-gray-800 mb-6">Enter OTP</h2>
            <p className="text-sm text-gray-600 mb-4">
              Verification code has been sent to your phone number {getFullPhone()}. 
              Please enter the code below. Valid for {formatTime(timeLeft)}.
            </p>
            <form onSubmit={handleOTPVerification} className="space-y-4">
              <input
                type="text"
                name="otp"
                placeholder="Enter OTP"
                value={formData.otp}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                required
                disabled={isLoading}
              />
              <button
                type="submit"
                className="w-full bg-red-500 text-white py-3 rounded-md hover:bg-red-600 transition-colors font-medium text-[15px] disabled:bg-red-300"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <button
                onClick={handleResendOTP}
                className="text-red-500 hover:text-red-600 text-[15px]"
                disabled={resendDisabled || isLoading || timeLeft > 0}
              >
                Resend OTP {resendDisabled && '(wait 30s)'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};