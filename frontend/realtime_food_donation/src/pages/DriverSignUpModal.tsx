import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

interface DriverFormData {
  username: string;
  password: string;
  email: string;
  phone: string;
  address: string;
  otp: string;
  profile_picture: File | null;
  profile_picture_base64: string | null;
  // Driver specific fields
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  service_area: string;
  max_delivery_distance: number;
}

interface DriverSignUpModalProps {
  onClose: () => void;
  setIsAuthenticated: (value: boolean) => void;
}

export const DriverSignUpModal: React.FC<DriverSignUpModalProps> = ({ onClose, setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resendDisabled, setResendDisabled] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  
  const [formData, setFormData] = useState<DriverFormData>({
    username: '',
    password: '',
    email: '',
    phone: '',
    address: '',
    otp: '',
    profile_picture: null,
    profile_picture_base64: null,
    vehicle_type: '',
    vehicle_number: '',
    license_number: '',
    service_area: '',
    max_delivery_distance: 0
  });

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

  const updatePasswordValidation = (password: string) => {
    setValidationStates({
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'profile_picture' && 'files' in e.target && e.target.files?.[0]) {
      const file = e.target.files[0];
      
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
        [name]: name === 'max_delivery_distance' ? Number(value) : value,
      }));

      if (name === 'password') {
        updatePasswordValidation(value);
      }
    }
  };

  const isPasswordValid = (): boolean => {
    return Object.values(validationStates).every(state => state);
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        phone: formData.phone,
        role: 'DRIVER',
        address: formData.address,
        profile_picture: formData.profile_picture_base64,
        vehicle_type: formData.vehicle_type,
        vehicle_number: formData.vehicle_number,
        license_number: formData.license_number,
        service_area: formData.service_area,
        max_delivery_distance: formData.max_delivery_distance
      };

      const response = await axios.post(`${BASE_URL}/api/driver/signup`, payload, {
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
      const response = await axios.post(`${BASE_URL}/api/driver/verify-otp`, {
        phone: formData.phone,
        otp: formData.otp
      }, {
        withCredentials: true
      });

      if (response.data.message === 'Registration successful. You can now sign in.') {
        setIsAuthenticated(true);
        onClose();
        navigate('/driver/profile', { replace: true });
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
      await axios.post(`${BASE_URL}/api/driver/resend-otp`, {
        phone: formData.phone
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
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm overflow-hidden"
      onClick={handleBackdropClick}
    >
      <div 
        className="modal-content bg-white w-[480px] rounded-lg shadow-xl relative animate-modalFade max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="modal-close-button absolute right-4 top-4 text-gray-400 hover:text-gray-600 z-10"
          disabled={isLoading}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <h2 className="text-2xl font-medium text-gray-800 mb-6">Driver Sign up</h2>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-4">
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

                  <div>
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                      required
                      disabled={isLoading}
                    />
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

                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                    required
                    disabled={isLoading}
                  />

                  <textarea
                    name="address"
                    placeholder="Address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                    rows={3}
                    disabled={isLoading}
                  />

                  <select
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                    required
                    disabled={isLoading}
                  >
                    <option value="">Select Vehicle Type</option>
                    <option value="Bike">Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Car">Car</option>
                    <option value="Van">Van</option>
                  </select>

                  <input
                    type="text"
                    name="vehicle_number"
                    placeholder="Vehicle Number"
                    value={formData.vehicle_number}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                    required
                    disabled={isLoading}
                  />

                  <input
                    type="text"
                    name="license_number"
                    placeholder="License Number"
                    value={formData.license_number}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                    required
                    disabled={isLoading}
                  />

                  <input
                    type="text"
                    name="service_area"
                    placeholder="Service Area"
                    value={formData.service_area}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                    required
                    disabled={isLoading}
                  />

                  <input
                    type="number"
                    name="max_delivery_distance"
                    placeholder="Maximum Delivery Distance (km)"
                    value={formData.max_delivery_distance}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                    required
                    disabled={isLoading}
                    min="1"
                  />

                 <input
                    type="file"
                    name="profile_picture"
                    accept="image/*"
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px]"
                    disabled={isLoading}
                  />
                </div>

                <div className="pt-4 pb-2">
                  <button
                    type="submit"
                    disabled={!isPasswordValid() || isLoading}
                    className="w-full bg-red-500 text-white py-3 rounded-md hover:bg-red-600 transition-colors font-medium text-[15px] disabled:bg-red-300"
                  >
                    {isLoading ? 'Creating account...' : 'Create Driver Account'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-[22px] font-medium text-gray-800 mb-6">Verify Your Phone Number</h2>
              <p className="text-sm text-gray-600 mb-4">
                We've sent a verification code to your phone number. Please enter it below.
                Code expires in {formatTime(timeLeft)}.
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
    </div>
  );
};

export default DriverSignUpModal;