import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Clock, Package, ChevronRight, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card/Card';
import axios from 'axios';

// Types
interface DeliveryHistory {
  id: number;
  delivery_address: string;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
  completed_at: string;
  order_status: string;
  customer_name: string;
  rating?: number;
}


// DeliveryHistoryPage Component
const DeliveryHistoryPage = () => {
  const [deliveries, setDeliveries] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchDeliveryHistory = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/orders/history', {
          withCredentials: true
        });
        if (response.data.success) {
          setDeliveries(response.data.orders);
        }
      } catch (err) {
        setError('Failed to fetch delivery history');
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryHistory();
  }, []);

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.delivery_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || delivery.order_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Delivery History</h1>
        <p className="text-gray-500">View your past deliveries and earnings</p>
      </div>

      <div className="mb-6 flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search deliveries..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <select
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {filteredDeliveries.map((delivery) => (
          <Card key={delivery.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">Order #{delivery.id}</span>
                  </div>
                  <p className="text-gray-600">{delivery.delivery_address}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(delivery.completed_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      ₹{delivery.delivery_fee}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    delivery.order_status === 'delivered' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {delivery.order_status}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DeliveryHistoryPage;
// EarningsPage Component
