import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, TrendingUp, History, Settings, Power } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card/Card';
import axios from 'axios';

const DriverDashboard = () => {
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [driverStats, setDriverStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    rating: 0,
    pendingDeliveries: 0
  });

  const toggleAvailability = async () => {
    try {
      const response = await axios.put('http://localhost:3000/api/driver/status', {
        status: isOnline ? 'OFFLINE' : 'ONLINE'
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setIsOnline(!isOnline);
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  useEffect(() => {
    const fetchProfileCompletion = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/driver/completion', {
          withCredentials: true
        });
        if (response.data.success) {
          setProfileCompletion(response.data.completion);
        }
      } catch (error) {
        console.error('Error fetching profile completion:', error);
      }
    };

    fetchProfileCompletion();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Driver Dashboard</h1>
        <button
          onClick={toggleAvailability}
          className={`flex items-center px-4 py-2 rounded-lg ${
            isOnline ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          } text-white transition-colors`}
        >
          <Power className="w-5 h-5 mr-2" />
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {profileCompletion < 100 && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-800">Complete your profile to start accepting deliveries</p>
                <div className="mt-2 w-full bg-yellow-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
              <Link
                to="/driver/profile"
                className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
              >
                Complete Profile
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Deliveries</CardTitle>
            <History className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverStats.totalDeliveries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Earnings</CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{driverStats.totalEarnings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Rating</CardTitle>
            <Settings className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverStats.rating.toFixed(1)}/5.0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Deliveries</CardTitle>
            <Clock className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverStats.pendingDeliveries}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/driver/requests"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors flex flex-col items-center text-center"
              >
                <MapPin className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-sm font-medium">View Delivery Requests</span>
              </Link>
              <Link
                to="/driver/active-delivery"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors flex flex-col items-center text-center"
              >
                <Clock className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-sm font-medium">Active Delivery</span>
              </Link>
              <Link
                to="/driver/history"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors flex flex-col items-center text-center"
              >
                <History className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-sm font-medium">Delivery History</span>
              </Link>
              <Link
                to="/driver/earnings"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors flex flex-col items-center text-center"
              >
                <TrendingUp className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-sm font-medium">Earnings</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDashboard;