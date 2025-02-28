import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertCircle, Clock, DollarSign, Check } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card/Card';
import axios from 'axios';

interface Order {
  id: number;
  delivery_address: string;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
  order_status: string;
  user_id: number;
  order_notes?: string;
}

const DeliveryRequestsPage = () => {
  const navigate = useNavigate(); // Move inside the component

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingOrder, setAcceptingOrder] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/orders?status=pending', {
        withCredentials: true
      });
      
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (err) {
      setError('Failed to fetch delivery requests');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Poll for new orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptOrder = async (orderId: number) => {
    setAcceptingOrder(orderId);
    try {
      await axios.post(`http://localhost:3000/api/orders/${orderId}/status`, {
        status: 'assigned'
      }, {
        withCredentials: true
      });
      
      // Remove the accepted order from the list
      setOrders(orders.filter(order => order.id !== orderId));
      navigate('/driver/active-delivery');
    } catch (err) {
      setError('Failed to accept delivery request');
      console.error('Error accepting order:', err);
    } finally {
      setAcceptingOrder(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Delivery Requests</h1>
        <button
          onClick={() => fetchOrders()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-3 text-gray-400" />
              <p>No delivery requests available at the moment</p>
              <p className="text-sm mt-1">Check back soon for new requests</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-start space-x-4">
                      <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                      <div>
                        <h3 className="font-medium text-gray-900">Delivery Address</h3>
                        <p className="text-gray-600">{order.delivery_address}</p>
                        {order.order_notes && (
                          <p className="text-sm text-gray-500 mt-1">
                            Note: {order.order_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-8">
                      <div className="flex items-center">
                        <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Delivery Fee</p>
                          <p className="font-medium">₹{order.delivery_fee}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Requested</p>
                          <p className="font-medium">{formatDateTime(order.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 flex flex-col items-end">
                    <div className="text-right mb-4">
                      <p className="text-sm text-gray-500">Order Total</p>
                      <p className="text-xl font-semibold">₹{order.total_amount}</p>
                    </div>

                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      disabled={acceptingOrder === order.id}
                      className={`flex items-center px-4 py-2 rounded-lg ${
                        acceptingOrder === order.id
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      } transition-colors`}
                    >
                      {acceptingOrder === order.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Accept Delivery
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryRequestsPage;