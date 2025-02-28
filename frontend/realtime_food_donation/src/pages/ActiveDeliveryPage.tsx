import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, PhoneCall, Clock, Check, Package, Truck, Flag, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card/Card';
import axios from 'axios';

interface DeliveryLocation {
  lat: number;
  lng: number;
}

interface ActiveOrder {
  id: number;
  delivery_address: string;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
  order_status: string;
  user_id: number;
  order_notes?: string;
  customer_phone?: string;
  customer_name?: string;
}

const DeliveryStatus = {
  assigned: { icon: Package, label: 'Pickup Order', next: 'picked_up' },
  picked_up: { icon: Truck, label: 'Start Delivery', next: 'in_transit' },
  in_transit: { icon: Flag, label: 'Complete Delivery', next: 'delivered' },
  delivered: { icon: Check, label: 'Delivered', next: null }
};

// Helper type for the status keys
type StatusKey = keyof typeof DeliveryStatus;

const ActiveDeliveryPage = () => {
  const navigate = useNavigate();
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<DeliveryLocation | null>(null);

  const fetchActiveDelivery = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/orders?status=assigned,picked_up,in_transit', {
        withCredentials: true
      });
      
      if (response.data.success && response.data.orders.length > 0) {
        setActiveOrder(response.data.orders[0]); // Get the first active order
      } else {
        setActiveOrder(null);
      }
    } catch (err) {
      setError('Failed to fetch active delivery');
      console.error('Error fetching active delivery:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveDelivery();
  }, []);

  useEffect(() => {
    // Get current location when order is in transit
    if (activeOrder?.order_status === 'in_transit') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [activeOrder?.order_status]);

  const updateDeliveryStatus = async () => {
    if (!activeOrder) return;
    
    // Make sure the status is a valid key in our DeliveryStatus object
    const status = activeOrder.order_status as string;
    if (!(status in DeliveryStatus)) {
      setError(`Invalid order status: ${status}`);
      return;
    }
    
    const currentStatus = status as StatusKey;
    const nextStatus = DeliveryStatus[currentStatus].next;
    
    if (!nextStatus) return;

    setUpdating(true);
    try {
      const payload: { status: string; location?: DeliveryLocation } = {
        status: nextStatus
      };

      // Include location data if delivery is starting
      if (nextStatus === 'in_transit' && currentLocation) {
        payload.location = currentLocation;
      }

      await axios.post(
        `http://localhost:3000/api/orders/${activeOrder.id}/status`,
        payload,
        { withCredentials: true }
      );

      if (nextStatus === 'delivered') {
        navigate('/driver/dashboard');
      } else {
        await fetchActiveDelivery();
      }
    } catch (err) {
      setError('Failed to update delivery status');
      console.error('Error updating status:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Helper function to check if a status is valid and has a next state
  const canUpdateStatus = (order: ActiveOrder | null): boolean => {
    if (!order) return false;
    
    const status = order.order_status;
    return (
      status in DeliveryStatus && 
      DeliveryStatus[status as StatusKey].next !== null
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-medium mb-2">No Active Delivery</h2>
              <p className="mb-6">You don't have any active deliveries at the moment</p>
              <button
                onClick={() => navigate('/driver/requests')}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Find Deliveries
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get status information safely, defaulting to a basic package icon and label if status is invalid
  const statusInfo = (status: string) => {
    return status in DeliveryStatus 
      ? DeliveryStatus[status as StatusKey] 
      : { icon: Package, label: 'Unknown Status', next: null };
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Active Delivery</h1>
        <p className="text-gray-500">Order #{activeOrder.id}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                {['assigned', 'picked_up', 'in_transit', 'delivered'].map((status, index) => (
                  <React.Fragment key={status}>
                    <div 
                      className={`flex items-center justify-center rounded-full w-8 h-8 ${
                        activeOrder.order_status === status
                          ? 'bg-red-500 text-white'
                          : ['delivered', 'in_transit', 'picked_up'].includes(activeOrder.order_status) && 
                            ['assigned', 'picked_up', 'in_transit'].includes(status)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                    {index < 3 && (
                      <div className={`flex-1 h-1 ${
                        ['delivered', 'in_transit'].includes(activeOrder.order_status) && 
                        ['assigned', 'picked_up'].includes(status)
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900">Delivery Address</h3>
                  <p className="text-gray-600">{activeOrder.delivery_address}</p>
                  {activeOrder.order_notes && (
                    <p className="text-sm text-gray-500 mt-1">Note: {activeOrder.order_notes}</p>
                  )}
                </div>
              </div>

              {activeOrder.customer_phone && (
                <div className="flex items-center space-x-4">
                  <PhoneCall className="h-5 w-5 text-gray-400" />
                  <div>
                    <h3 className="font-medium text-gray-900">Customer Contact</h3>
                    <p className="text-gray-600">{activeOrder.customer_name}</p>
                    <p className="text-gray-600">{activeOrder.customer_phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-8">
                <div>
                  <p className="text-sm text-gray-500">Order Total</p>
                  <p className="font-semibold text-xl">₹{activeOrder.total_amount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Delivery Fee</p>
                  <p className="font-semibold text-xl">₹{activeOrder.delivery_fee}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <button
          onClick={updateDeliveryStatus}
          disabled={updating || !canUpdateStatus(activeOrder)}
          className={`w-full py-4 rounded-lg flex items-center justify-center space-x-2 ${
            updating || !canUpdateStatus(activeOrder)
              ? 'bg-gray-100 text-gray-400'
              : 'bg-red-500 hover:bg-red-600 text-white'
          } transition-colors text-lg font-medium`}
        >
          {updating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              <span>Updating...</span>
            </>
          ) : (
            <>
              {React.createElement(statusInfo(activeOrder.order_status).icon, { className: "h-5 w-5" })}
              <span>{statusInfo(activeOrder.order_status).label}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ActiveDeliveryPage;