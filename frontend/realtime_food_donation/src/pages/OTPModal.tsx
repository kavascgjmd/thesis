import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { X } from 'lucide-react';

interface OTPFormData {
  otp: string;
}

export const OTPModal: React.FC<{
  email: string;
  onClose: () => void;
  onVerify: (otp: string) => void;
}> = ({ email, onClose, onVerify }) => {
  const [formData, setFormData] = useState<OTPFormData>({
    otp: '',
  });
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [canResend, setCanResend] = useState<boolean>(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onVerify(formData.otp);
  };

  const handleResendOTP = () => {
    setTimeLeft(600);
    setCanResend(false);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-overlay fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div 
        className="modal-content bg-white w-[480px] rounded-lg shadow-xl relative animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="modal-close-button absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-8">
          <h2 className="text-[32px] font-medium mb-4">Enter OTP</h2>
          <p className="text-gray-600 mb-8">
            Verification code has been sent to {email}.
            <br />Please enter the code to complete signup.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <input
                type="text"
                name="otp"
                placeholder="Enter OTP"
                value={formData.otp}
                onChange={handleChange}
                className="w-full p-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-gray-400 text-center tracking-[0.5em] text-xl"
                required
                maxLength={6}
              />
              <div className="text-center text-2xl font-medium text-gray-700">
                {formatTime(timeLeft)}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#ef4f5f] text-white p-3 rounded-md hover:bg-[#d63848] transition-colors font-medium"
            >
              Proceed
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={handleResendOTP}
              disabled={!canResend}
              className={`text-[#ef4f5f] hover:text-[#d63848] font-medium ${!canResend && 'opacity-50 cursor-not-allowed'}`}
            >
              {canResend ? "Resend Now" : "Wait before requesting new OTP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
