import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../components/ui/card/Card';
import DeliveryMap from './DeliveryMap'; // New separate map component

const API_BASE_URL = 'http://localhost:3000/api';

interface OrderDetails {
  id: number;
  orderStatus: string;
  deliveryAddress: string;
  items: any[];
  route?: {
    path: Array<{
      lat: number;
      lng: number;
      address?: string;
      description?: string;
      type?: string;
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
}

interface DriverInfo {
  id: number;
  name: string;
  phone: string;
  email?: string;
  rating?: number;
  avatar?: string;
}

interface OrderTrackingProps {
  orderId?: string;
  driver?: DriverInfo;
}

const OrderTracking: React.FC<OrderTrackingProps> = ({ orderId, driver }) => {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial order details and then poll for updates
  useEffect(() => {
    const fetchData = () => fetchOrderDetails();
    fetchData();

    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [orderId]);

  const normalizeOrderData = (backendOrder: any): OrderDetails => {
    return {
      ...backendOrder,
      route: backendOrder.route ? {
        ...backendOrder.route,
        path: backendOrder.route.path.map((point: any) => ({
          lat: point.lat || (point.location && point.location.lat),
          lng: point.lng || (point.location && point.location.lng),
          address: point.address || (point.location && point.location.address),
          description: point.description,
          type: point.type
        }))
      } : undefined
    };
  };

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      const data = await response.json();
      if (data.success) {
        // Normalize the data structure
        const normalizedOrder = normalizeOrderData(data.order);
        setOrder(normalizedOrder);
      } else {
        setError(data.message || 'Failed to fetch order details');
      }
    } catch (err) {
      setError('Error loading order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = () => {
    if (!order) return 0;
    
    const statusMap: Record<string, number> = {
      'pending': 0,
      'assigned': 1,
      'picked_up': 2,
      'in_transit': 2,
      'delivered': 3
    };
    
    return statusMap[order.deliveryStatus || 'pending'] || 0;
  };

  // Render driver information card
  const renderDriverInfo = () => {
    if (!driver) return null;
    
    return (
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Driver Information</h2>
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {driver.avatar ? (
              <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
            ) : (
              <Truck className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div className="ml-4">
            <h3 className="font-medium">{driver.name}</h3>
            <p className="text-sm text-gray-500">{driver.phone}</p>
            {driver.rating && (
              <div className="flex items-center mt-1">
                <div className="text-yellow-400 text-sm mr-1">★</div>
                <span className="text-sm">{driver.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // Render tracking map
  const renderTrackingMap = () => {
    if (!order || !order.route) return null;
    
    const hasPickupPoint = order.route.path && order.route.path.length > 0;
    const hasDeliveryPoint = order.route.path && order.route.path.length > 1;
    const hasWaypoints = order.route.path && order.route.path.length > 2;
    const hasDriverLocation = order.driverLocation?.lat && order.driverLocation?.lng;
    
    // Get points for map navigation
    const pickupPoint = hasPickupPoint ? order.route.path[0] : null;
    const deliveryPoint = hasDeliveryPoint ? order.route.path[order.route.path.length - 1] : null;
    const waypoints = hasWaypoints ? order.route.path.slice(1, -1) : [];
    
    return (
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Delivery Route</h2>
        
        {/* Location summary boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Pickup location box */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center text-green-700 mb-2">
              <MapPin className="h-5 w-5 mr-2" />
              <span className="font-medium">Pickup Location</span>
            </div>
            <div className="text-sm text-gray-700">
              {pickupPoint?.address || 'Food Donor Location'}
            </div>
          </div>
          
          {/* Delivery location box */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center text-red-700 mb-2">
              <Package className="h-5 w-5 mr-2" />
              <span className="font-medium">Delivery Destination</span>
            </div>
            <div className="text-sm text-gray-700">
              {deliveryPoint?.address || 'NGO / Recipient Location'}
            </div>
          </div>
        </div>
        
        {/* Driver's current location box - only shown when available */}
        {order.driverLocation && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
            <div className="flex items-center text-blue-700 mb-2">
              <Truck className="h-5 w-5 mr-2" />
              <span className="font-medium">Driver's Current Location</span>
            </div>
            <div className="text-sm text-gray-700">
              Last updated: {new Date(order.driverLocation.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
        
        {/* Map component */}
        <DeliveryMap 
          order={order}
          pickupPoint={pickupPoint}
          deliveryPoint={deliveryPoint}
          waypoints={waypoints}
          driverLocation={order.driverLocation}
        />
        
        {/* Map navigation buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {hasPickupPoint && (
            <button 
              className="flex items-center px-3 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-md text-sm transition-colors"
              onClick={() => window.dispatchEvent(new CustomEvent('mapNavigate', { detail: { type: 'pickup', point: pickupPoint } }))}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Go to Pickup
            </button>
          )}
          
          {hasDeliveryPoint && (
            <button 
              className="flex items-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-sm transition-colors"
              onClick={() => window.dispatchEvent(new CustomEvent('mapNavigate', { detail: { type: 'delivery', point: deliveryPoint } }))}
            >
              <Package className="h-4 w-4 mr-1" />
              Go to Destination
            </button>
          )}
          
          {hasDriverLocation && (
            <button 
              className="flex items-center px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md text-sm transition-colors"
              onClick={() => window.dispatchEvent(new CustomEvent('mapNavigate', { detail: { type: 'driver', point: { lat: order.driverLocation?.lat, lng: order.driverLocation?.lng } } }))}
            >
              <Truck className="h-4 w-4 mr-1" />
              Track Driver
            </button>
          )}
          
          {waypoints.length > 0 && waypoints.map((waypoint, index) => (
            <button 
              key={`waypoint-${index}`}
              className="flex items-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-md text-sm transition-colors"
              onClick={() => window.dispatchEvent(new CustomEvent('mapNavigate', { detail: { type: 'waypoint', point: waypoint, index } }))}
            >
              <MapPin className="h-4 w-4 mr-1" />
              {waypoint.description || `Waypoint ${index + 1}`}
            </button>
          ))}
          
          <button 
            className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent('mapNavigate', { detail: { type: 'fullRoute' } }))}
          >
            <Package className="h-4 w-4 mr-1" />
            View Full Route
          </button>
        </div>
        
        {/* Map legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm p-2 bg-gray-50 rounded">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            <span>Pickup Location</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
            <span>Delivery Destination</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
            <span>Waypoints</span>
          </div>
          <div className="flex items-center">
            <Truck className="w-4 h-4 text-blue-800 mr-2" />
            <span>Driver Location</span>
          </div>
        </div>

        {order.route && (
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Total Distance:</span>
              <span>{order.route.totalDistance.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Estimated Duration:</span>
              <span>{Math.round(order.route.estimatedDuration)} minutes</span>
            </div>
          </div>
        )}
      </Card>
    );
  };

  // Render order status
  const renderOrderStatus = () => {
    if (!order) return null;
    
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
              <div className={`rounded-full p-2 ${currentStep >= 3 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h3 className="font-medium">Delivered</h3>
                <p className="text-sm text-gray-500">Food has been delivered to the NGO</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (loading && !order) {
    return (
      <div className="flex justify-center my-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {driver && renderDriverInfo()}
      {renderTrackingMap()}
      {renderOrderStatus()}
    </>
  );
};

export default OrderTracking;