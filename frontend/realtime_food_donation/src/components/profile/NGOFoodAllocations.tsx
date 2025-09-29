import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useProfile } from '../../hooks/useProfile';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card/Card';
import { Alert, AlertDescription } from '../ui/alert/Alert';

interface FoodAllocation {
  id: number;
  food_donation_id: number;
  allocated_quantity: number;
  allocation_status: string;
  allocated_at: string;
  accepted: boolean;
  pickup_scheduled: boolean;
  pickup_completed: boolean;
  food_type: string;
  food_category: string;
  expiration_time: string;
  pickup_location: string;
  donor_name: string;
  contact_person: string;
  contact_number: string;
}

const BASE_URL = 'http://localhost:3000';

export const NGOFoodAllocations: React.FC = () => {
  const [allocations, setAllocations] = useState<FoodAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, roleDetails } = useProfile();

  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        setLoading(true);
        
        // Only fetch allocations if user is logged in and is an NGO
        if (!user || user.role !== 'NGO') {
          setAllocations([]);
          return;
        }

        const response = await axios.get(`${BASE_URL}/api/food/allocations/user`, {
          withCredentials: true
        });

        if (response.data.success) {
          setAllocations(response.data.allocations);
        } else {
          setError('Failed to fetch allocations');
        }
      } catch (err) {
        console.error('Error fetching allocations:', err);
        setError('An error occurred while fetching your food allocations.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllocations();
  }, [user]);

  const handleAllocationAction = async (allocationId: number, action: 'ACCEPT' | 'REJECT') => {
    try {
      const response = await axios.put(
        `${BASE_URL}/api/food/allocations/${allocationId}`,
        { action },
        { withCredentials: true }
      );

      if (response.data.success) {
        // Update the local state to reflect the change
        setAllocations(prevAllocations => 
          prevAllocations.map(allocation => {
            if (allocation.id === allocationId) {
              return {
                ...allocation,
                allocation_status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
                accepted: action === 'ACCEPT'
              };
            }
            return allocation;
          })
        );
      } else {
        setError(`Failed to ${action.toLowerCase()} allocation`);
      }
    } catch (err) {
      console.error(`Error ${action.toLowerCase()}ing allocation:`, err);
      setError(`An error occurred while ${action.toLowerCase()}ing the allocation.`);
    }
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (user?.role !== 'NGO') {
    return null; // Don't render anything if user is not an NGO
  }

  if (loading) {
    return (
      <div className="min-h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Your Food Allocations</CardTitle>
      </CardHeader>
      <CardContent>
        {allocations.length === 0 ? (
          <p className="text-gray-500">You don't have any food allocations at the moment.</p>
        ) : (
          <div className="space-y-4">
            {allocations.map(allocation => (
              <div key={allocation.id} className="border rounded-md p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{allocation.food_type} - {allocation.food_category}</h3>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Quantity:</span> {allocation.allocated_quantity} kg
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Expiration:</span> {formatDate(allocation.expiration_time)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Pickup location:</span> {allocation.pickup_location}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Donor:</span> {allocation.donor_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Contact:</span> {allocation.contact_person} ({allocation.contact_number})
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      allocation.allocation_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      allocation.allocation_status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      allocation.allocation_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {allocation.allocation_status}
                    </span>
                  </div>
                </div>
                
                {allocation.allocation_status === 'PENDING' && (
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => handleAllocationAction(allocation.id, 'ACCEPT')}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleAllocationAction(allocation.id, 'REJECT')}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};