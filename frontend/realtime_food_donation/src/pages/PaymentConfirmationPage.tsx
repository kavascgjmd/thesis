import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert/Alert';
import { Card } from '../components/ui/card/Card';
import { Button } from '../components/ui/button/Button';
import OrderTracking from './OrderTracking';
import KommunicateChat from '../components/chat';

const API_BASE_URL = 'http://localhost:3000/api';

// USD to INR conversion rate
const USD_TO_INR_RATE = 84;

// Helper function to convert USD to INR
const usdToInr = (amount: number): number => {
  return amount * USD_TO_INR_RATE;
};

interface OrderItem {
  foodDonationId?: number;
  food_type?: string;
  foodType?: string;
  food_category?: string;
  foodCategory?: string;
  donorId?: number;
  quantity: number;
  itemTotal?: string;
  donor_name?: string;
  donorName?: string;
  donorContact?: {
    person: string;
    number: string;
  };
  pickup_location?: string;
  pickupLocation?: string;
  expirationTime?: Date | string;
  servings?: number;
  weightKg?: number;
  weight_kg?: number;
  packageSize?: string;
  package_size?: string;
}

interface OrderDetails {
  id: number;
  orderStatus: string;
  paymentStatus: string;
  deliveryFee: string;
  totalAmount: string;
  deliveryAddress: string;
  items: OrderItem[];
  route?: {
    path: Array<{
      lat: number;
      lng: number;
      address?: string;
      description?: string;
      type?: 'pickup' | 'delivery';
    }>;
    waypoints?: any[];
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

  // Normalize the backend data structure to what our component expects
  const normalizeOrderData = (backendOrder: any): OrderDetails => {
    // Map items to ensure consistent property access
    const normalizedItems = backendOrder.items.map((item: any) => ({
      foodDonationId: item.foodDonationId,
      foodType: item.food_type || item.foodType,
      foodCategory: item.food_category || item.foodCategory,
      donorId: item.donorId,
      quantity: item.quantity,
      itemTotal: item.itemTotal,
      donorName: item.donor_name || item.donorName,
      donorContact: item.donorContact,
      pickupLocation: item.pickup_location || item.pickupLocation,
      expirationTime: item.expirationTime,
      servings: item.servings,
      weightKg: item.weightKg || item.weight_kg,
      packageSize: item.packageSize || item.package_size
    }));

    // Return normalized order with consistent property names
    return {
      id: backendOrder.id,
      orderStatus: backendOrder.orderStatus,
      paymentStatus: backendOrder.paymentStatus,
      deliveryFee: backendOrder.deliveryFee,
      totalAmount: backendOrder.totalAmount,
      deliveryAddress: backendOrder.deliveryAddress,
      items: normalizedItems,
      route: backendOrder.route,
      driverLocation: backendOrder.driverLocation,
      deliveryStatus: backendOrder.deliveryStatus,
      driver: backendOrder.driver
    };
  };

  const fetchOrderDetails = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/orders/user/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      if (data.success) {
        console.log("Fetched order:", data.order);
        // Normalize data before setting state
        const normalizedOrder = normalizeOrderData(data.order);
        setOrder(normalizedOrder);

        // Check if payment is already confirmed from the server
        if (normalizedOrder.paymentStatus === 'confirmed' || normalizedOrder.paymentStatus === 'paid') {
          setPaymentConfirmed(true);
        }
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
      setLoading(true);

      // Update the payment status on the server
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ paymentStatus: 'confirmed' })
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      // Update local state to show payment confirmed
      setPaymentConfirmed(true);

      // Refresh order details after payment
      if (orderId) {
        fetchOrderDetails(parseInt(orderId));
      }
    } catch (err) {
      setError('Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentDetails = () => {
    if (!order) return null;

    // Use the deliveryFee directly from the backend
    const deliveryFee = parseFloat(order.deliveryFee) || 0;

    // Convert to INR
    const deliveryFeeInr = usdToInr(deliveryFee);

    // Check if this order is waiting for donor approval
    const isPendingDonorApproval = order.orderStatus === 'pending_donor_approval';

    return (
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Payment Details</h2>

        {isPendingDonorApproval && (
          <Alert className="mb-4 bg-yellow-50">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-700">
              Awaiting Donor Approval
            </AlertTitle>
            <AlertDescription className="text-yellow-600">
              This order includes items from upcoming events. The order will be processed after donor confirmation when the event is completed.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Delivery Fee ({order.route?.totalDistance.toFixed(1) || 0} km):</span>
            <span>₹{deliveryFeeInr.toFixed(2)}</span>
          </div>
          <div className="h-px bg-gray-200 my-2"></div>
          <div className="flex justify-between font-bold">
            <span>Total Amount:</span>
            <span>₹{deliveryFeeInr.toFixed(2)}</span>
          </div>
        </div>

        {!paymentConfirmed && order.paymentStatus !== 'confirmed' && order.paymentStatus !== 'paid' && (
          <Button
            className="w-full mt-6 bg-green-600 hover:bg-green-700"
            onClick={handleConfirmPayment}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </Button>
        )}

        {(paymentConfirmed || order.paymentStatus === 'confirmed' || order.paymentStatus === 'paid') && (
          <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-md flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Payment confirmed successfully!
            {isPendingDonorApproval && (
              <span className="ml-1 text-sm text-amber-600">
                (Order will be processed after donor approval)
              </span>
            )}
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
                <h3 className="font-medium">{item.foodType}</h3>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded-full text-gray-700">{item.foodCategory}</span>
              </div>
              <p className="text-sm text-gray-500">From: {item.donorName}</p>
              <p className="text-sm text-gray-500">Pickup Location: {item.pickupLocation}</p>

              {/* Conditional rendering based on food category */}
              {item.foodCategory === 'Cooked Meal' && item.servings && (
                <p className="text-sm mt-1">Servings: {item.servings}</p>
              )}
              {item.foodCategory === 'Raw Ingredients' && item.weightKg && (
                <p className="text-sm mt-1">Weight: {item.weightKg} kg</p>
              )}
              {item.foodCategory === 'Packaged Items' && item.packageSize && (
                <p className="text-sm mt-1">Package Size: {item.packageSize}</p>
              )}
              {/* Keep quantity for backward compatibility */}
              {item.quantity && (
                <p className="text-sm mt-1">Quantity: {item.quantity}</p>
              )}
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

      {/* If payment is confirmed, show tracking component */}
      {(paymentConfirmed || order?.paymentStatus === 'confirmed' || order?.paymentStatus === 'paid') && (
        <>
          {/* Only show tracking if not pending donor approval */}
          {order?.orderStatus !== 'pending_donor_approval' && (
            <OrderTracking orderId={orderId} driver={order?.driver} />
          )}
          {/* Just show the order items in this component */}
          {renderOrderItems()}
        </>
      )}
      <KommunicateChat />
    </div>
  );
};

export default PaymentConfirmationPage;