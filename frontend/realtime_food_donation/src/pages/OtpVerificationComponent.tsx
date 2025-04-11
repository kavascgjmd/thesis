import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button/Button';
import { Input } from '../components/ui/input/Input';

interface OtpVerificationProps {
  onVerify: (otp: string) => Promise<void>;
  onCancel: () => void;
  fieldName: string;
  isLoading: boolean;
}

export const OtpVerification: React.FC<OtpVerificationProps> = ({ 
  onVerify, 
  onCancel, 
  fieldName,
  isLoading
}) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft]);

  // Format time as mm:ss
  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleVerify = async () => {
    if (!otp) {
      setError('Please enter the verification code');
      return;
    }
    
    if (timeLeft <= 0) {
      setError('Verification code has expired. Please request a new one.');
      return;
    }
    
    try {
      setError(null);
      await onVerify(otp);
    } catch (err: any) {
      console.error(`OTP verification error for ${fieldName}:`, err);
      setError(err.message || 'Failed to verify code');
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-md border my-4">
      <h3 className="text-lg font-medium mb-3">Verify {fieldName}</h3>
      <p className="text-sm text-gray-600 mb-1">
        Please enter the verification code sent to your {fieldName.toLowerCase() === 'email' ? 'email address' : 'phone number'}
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Code expires in: <span className={timeLeft < 60 ? "text-rose-500 font-medium" : ""}>{formatTime()}</span>
      </p>
      
      <div className="space-y-4">
        <div>
          <Input
            value={otp}
            onChange={(e) => {
              // Only allow digits
              const value = e.target.value.replace(/[^\d]/g, '');
              setOtp(value);
              setError(null);
            }}
            placeholder="Enter verification code"
            disabled={isLoading || timeLeft <= 0}
            error={error}
            maxLength={6}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && otp) {
                e.preventDefault();
                handleVerify();
              }
            }}
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-rose-500 hover:bg-rose-600 text-white"
            disabled={isLoading || !otp || timeLeft <= 0}
            onClick={handleVerify}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </div>
      </div>
    </div>
  );
};