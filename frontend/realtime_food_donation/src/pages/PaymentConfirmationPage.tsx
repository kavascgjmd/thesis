import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock, Truck, Package, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert/Alert';
import { Card } from '../components/ui/card/Card';
import { Button } from '../components/ui/button/Button';
import DriverDetails from './DriverDetailsPage';
import DriverLocationMap from './DriverLocationMap';

const API_BASE_URL = 'http://localhost:3000/api';

interface OrderDetails {
  id: number;
  orderStatus: string;
  paymentStatus: string;
  deliveryFee: string;
  totalAmount: string;
  deliveryAddress: string;
  items: Array<{
    food_type: string;
    donor_name: string;
    quantity: number;
    pickup_location: string;
  }>;
  route?: {
    path: Array<{lat: number, lng: number}>;
    totalDistance: number;
    estimatedDuration: number;
  };
  driverLocation?: {
    lat: number;
    lng: number;
    timestamp: number;
  };
  deliveryStatus?: string;
  driver?: {
    id: number;
    name: string;
    phone: string;
    email?: string;
    rating?: number;
    avatar?: string;
  };
}

const PaymentConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError('Order ID not found');
      setLoading(false);
      return;
    }

    fetchOrderDetails(parseInt(orderId));
  }, [orderId]);

  // Refresh order details every 30 seconds for tracking
  useEffect(() => {
    if (!orderId || !paymentConfirmed) return;
    
    const intervalId = setInterval(() => {
      fetchOrderDetails(parseInt(orderId));
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [orderId, paymentConfirmed]);

  const fetchOrderDetails = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      const data = await response.json();
      if (data.success) {
        setOrder(data.order);
      } else {
        setError(data.message || 'Failed to fetch order details');
      }
    } catch (err) {
      setError('Error loading order details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmPayment = async () => {
    try {
      // This is just a dummy payment confirmation
      // In a real app, you would integrate with a payment gateway
      setLoading(true);
      
      // Simulate API call for payment confirmation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPaymentConfirmed(true);
      setLoading(false);
      
      // Refresh order details after payment
      if (orderId) {
        fetchOrderDetails(parseInt(orderId));
      }
    } catch (err) {
      setError('Payment processing failed');
      setLoading(false);
    }
  };

  const renderPaymentDetails = () => {
    if (!order) return null;
    
    const deliveryFee = parseFloat(order.deliveryFee) || 0;
    const distanceFee = order.route ? order.route.totalDistance * 0.5 : 0; // $0.50 per km
    const totalAmount = deliveryFee + distanceFee;
    
    return (
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Base Delivery Fee:</span>
            <span>${deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Distance Fee ({order.route?.totalDistance.toFixed(1) || 0} km × $0.50/km):</span>
            <span>${distanceFee.toFixed(2)}</span>
          </div>
          <div className="h-px bg-gray-200 my-2"></div>
          <div className="flex justify-between font-bold">
            <span>Total Amount:</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        {!paymentConfirmed && (
          <Button 
            className="w-full mt-6 bg-green-600 hover:bg-green-700"
            onClick={handleConfirmPayment}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </Button>
        )}
        
        {paymentConfirmed && (
          <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-md flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Payment confirmed successfully!
          </div>
        )}
      </Card>
    );
  };

  const renderOrderStatus = () => {
    if (!order) return null;
    
    const getStatusStep = () => {
      if (order.orderStatus === 'completed') return 4;
      if (order.deliveryStatus === 'delivered') return 4;
      if (order.deliveryStatus === 'in_transit') return 3;
      if (order.deliveryStatus === 'picked_up') return 2;
      if (order.deliveryStatus === 'assigned') return 1;
      return 0;
    };

    const currentStep = getStatusStep();
    
    return (
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Order Status</h2>
        
        <div className="relative">
          {/* Progress bar */}
          <div className="absolute left-6 top-1 h-full w-0.5 bg-gray-200 z-0" />
          
          {/* Status steps */}
          <div className="space-y-8 relative z-10">
            <div className="flex items-start">
              <div className={`rounded-full p-2 ${currentStep >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                <Clock className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h3 className="font-medium">Order Placed</h3>
                <p className="text-sm text-gray-500">Your donation pickup request has been received</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className={`rounded-full p-2 ${currentStep >= 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                <Truck className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h3 className="font-medium">Driver Assigned</h3>
                <p className="text-sm text-gray-500">A driver has been assigned to your donation</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className={`rounded-full p-2 ${currentStep >= 2 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                <Package className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h3 className="font-medium">Food Picked Up</h3>
                <p className="text-sm text-gray-500">Food has been collected from donors</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className={`rounded-full p-2 ${currentStep >= 3 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                <MapPin className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h3 className="font-medium">In Transit</h3>
                <p className="text-sm text-gray-500">Food is being delivered to the NGO</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className={`rounded-full p-2 ${currentStep >= 4 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h3 className="font-medium">Delivered</h3>
                <p className="text-sm text-gray-500">Food has been delivered to the NGO</p>
              </div>
            </div>
          </div>
        </div>
        
        {order.route && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="font-medium mb-2">Delivery Details</h3>
            <p className="text-sm">
              <span className="font-medium">Estimated Time:</span> {Math.ceil(order.route.estimatedDuration)} minutes
            </p>
            <p className="text-sm">
              <span className="font-medium">Distance:</span> {order.route.totalDistance.toFixed(1)} km
            </p>
          </div>
        )}
      </Card>
    );
  };

  const renderOrderItems = () => {
    if (!order || !order.items) return null;
    
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.items.map((item, index) => (
            <div key={index} className="p-3 border rounded-md">
              <div className="flex justify-between">
                <h3 className="font-medium">{item.food_type}</h3>
                <span className="text-sm">Qty: {item.quantity}</span>
              </div>
              <p className="text-sm text-gray-500">From: {item.donor_name}</p>
              <p className="text-sm text-gray-500">Pickup Location: {item.pickup_location}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  if (loading && !order) {
    return (
      <div className="container mx-auto max-w-4xl p-4 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/donations')}>
          Return to Donations
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Order #{orderId}</h1>
        <Button 
          variant="outline"
          onClick={() => navigate('/donations')}
        >
          Back to Donations
        </Button>
      </div>
      
      {renderPaymentDetails()}
      
      {paymentConfirmed && (
        <>
          {/* Show driver details if assigned */}
          {order?.driver && order.deliveryStatus && 
            ['assigned', 'picked_up', 'in_transit'].includes(order.deliveryStatus) && (
            <DriverDetails driver={order.driver} />
          )}
          
          {/* Show live tracking map if driver has a location and there's a route */}
          {order?.driver && order.driverLocation && order.route && (
            <DriverLocationMap
              orderId={order.id}
              driverLocation={order.driverLocation}
              route={order.route}
              deliveryAddress={order.deliveryAddress}
              items={order.items}
            />
          )}
          
          {renderOrderStatus()}
          {renderOrderItems()}
        </>
      )}
    </div>
  );
};

export default PaymentConfirmationPage;