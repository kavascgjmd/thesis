import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useProfile } from '../../hooks/useProfile';
import { toUpper } from 'lodash';

const BASE_URL = 'http://localhost:3000';

interface FoodDonation {
  id: number;
  food_type: string;
  food_category: string;
  event_is_over: boolean;
  servings?: number;
  weight_kg?: number;
  quantity?: number;
  package_size?: string;
  total_quantity?: number;
  event_type?: string;
  preparation_method?: string;
  pricing?: string;
  number_of_guests?: number;
  expiration_time: string;
  pickup_location: string;
  status: string;
  remaining_quantity?: number;
  // New fields from backend
  total_ordered?: number;
  predicted_total?: number;
}

interface MarkEventOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation: FoodDonation | null;
  onSubmit: (id: number, actualWasteQuantity: number) => Promise<void>;
}

const MarkEventOverModal: React.FC<MarkEventOverModalProps> = ({ isOpen, onClose, donation, onSubmit }) => {
  const [actualWasteQuantity, setActualWasteQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (donation) {
      // Initialize with the predicted total amount (servings + pending orders)
      setActualWasteQuantity(donation.predicted_total || donation.servings || 0);
    }
  }, [donation]);

  if (!isOpen || !donation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(donation.id, actualWasteQuantity);
      onClose();
    } catch (error) {
      console.error("Error marking event as over:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Mark Event as Over</h2>
        <p className="mb-4">
          Please enter the actual food waste quantity after the event.
          This will update your donation and determine how food is distributed to pending orders.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Food Waste Quantity (servings)
            </label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded"
              value={actualWasteQuantity}
              onChange={(e) => setActualWasteQuantity(Number(e.target.value))}
              min={0}
              required
            />
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              <strong>Initial prediction:</strong> {donation.servings} servings
            </p>
            
            {donation.total_ordered && donation.total_ordered > 0 && (
              <p className="text-sm text-gray-600">
                <strong>Total ordered:</strong> {donation.total_ordered} servings
              </p>
            )}
            {donation.predicted_total && (
              <p className="text-sm font-medium text-gray-700">
                <strong>Total predicted amount:</strong> {donation.predicted_total} servings
              </p>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-500 text-white rounded hover:bg-rose-600"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DonorFoodDonations: React.FC = () => {
  const { user } = useProfile();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDonation, setSelectedDonation] = useState<FoodDonation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/foods/donor-donations`, {
        withCredentials: true
      });
      if (response.data.success) {
        setDonations(response.data.donations);
      } else {
        setError('Failed to load donations');
      }
    } catch (err) {
      console.error('Error fetching donations:', err);
      setError('Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && toUpper(user.role) === 'DONOR') {
      fetchDonations();
    }
  }, [user]);

  const handleMarkEventOver = (donation: FoodDonation) => {
    setSelectedDonation(donation);
    setIsModalOpen(true);
  };

  const submitEventOver = async (id: number, actualWasteQuantity: number) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/api/foods/${id}/mark-event-over`,
        { actual_waste_quantity: actualWasteQuantity },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        // Refresh the list after update
        fetchDonations();
      } else {
        setError(response.data.message || 'Failed to update donation');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update donation';
      setError(errorMessage);
      throw err;
    }
  };
    
  // Check if user exists before accessing its properties
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
          </div>
        </div>
      </div>
    );
  }
  
  // Now we can safely access user.role
  if (toUpper(user.role) !== 'DONOR') {
    return <div className="p-6">Only donors can access this page.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Food Donations</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {donations.length === 0 ? (
              <div className="col-span-full text-center p-6 bg-white rounded-lg shadow">
                No donations found. Create a new food donation to get started.
              </div>
            ) : (
              donations.map(donation => (
                <div key={donation.id} className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-bold">{donation.food_type}</h3>
                  <p className="text-sm text-gray-600">{donation.food_category}</p>
                  
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      donation.event_is_over ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {donation.event_is_over ? 'Food Available' : 'Upcoming Event'}
                    </span>
                  </div>
                  
                  <div className="mt-3 space-y-1 text-sm">
                    {donation.event_is_over ? (
                      <>
                        {donation.servings && <p>Servings: {donation.servings}</p>}
                        {donation.weight_kg && <p>Weight: {donation.weight_kg} kg</p>}
                        
                        {donation.remaining_quantity !== undefined && <p>Remaining: {donation.remaining_quantity}</p>}
                      </>
                    ) : (
                      <>
                        <p>Event Type: {donation.event_type}</p>
                        <p>Expected Guests: {donation.number_of_guests}</p>
                                         
                        
                          <p className="font-medium">Predicted: {donation.predicted_total} servings</p>
                       
                      </>
                    )}
                    <p>Expires: {new Date(donation.expiration_time).toLocaleDateString()}</p>
                    <p>Location: {donation.pickup_location}</p>
                  </div>
                  
                  <div className="mt-4">
                    {!donation.event_is_over && (
                      <button
                        onClick={() => handleMarkEventOver(donation)}
                        className="w-full px-4 py-2 bg-rose-500 text-white rounded hover:bg-rose-600"
                      >
                        Mark Event as Over
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      <MarkEventOverModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        donation={selectedDonation}
        onSubmit={submitEventOver}
      />
    </div>
  );
};