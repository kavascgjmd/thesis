import  { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card/Card';
import axios from 'axios';



interface EarningsSummary {
  today: number;
  weekly: number;
  monthly: number;
  total_deliveries: number;
  average_rating: number;
}
const EarningsPage = () => {
    const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  
    useEffect(() => {
      const fetchEarnings = async () => {
        try {
          const response = await axios.get(`http://localhost:3000/api/earnings?period=${selectedPeriod}`, {
            withCredentials: true
          });
          if (response.data.success) {
            setEarnings(response.data.earnings);
          }
        } catch (err) {
          setError('Failed to fetch earnings data');
          console.error('Error fetching earnings:', err);
        } finally {
          setLoading(false);
        }
      };
  
      fetchEarnings();
    }, [selectedPeriod]);
  
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
          <h1 className="text-2xl font-semibold text-gray-900">Earnings</h1>
          <p className="text-gray-500">Track your delivery earnings and statistics</p>
        </div>
  
        <div className="mb-6">
          <select
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="daily">Today</option>
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
          </select>
        </div>
  
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
  
        {earnings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Today</span>
                    <span className="font-semibold">₹{earnings.today}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">This Week</span>
                    <span className="font-semibold">₹{earnings.weekly}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">This Month</span>
                    <span className="font-semibold">₹{earnings.monthly}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle>Performance Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Deliveries</span>
                    <span className="font-semibold">{earnings.total_deliveries}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Rating</span>
                    <span className="font-semibold">{earnings.average_rating.toFixed(1)} ★</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };
  export default EarningsPage;