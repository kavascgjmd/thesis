import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert/Alert';

declare global {
  interface Window {
    google: any;
  }
}

const API_BASE_URL = 'http://localhost:3000/api';

interface OrderDetails {
  id: number;
  orderStatus: string;
  deliveryAddress: string;
  items: any[];
  route?: {
    path: Array<{
      location: {
        lat: number;
        lng: number;
        address: string;
      };
      description: string;
      type: string;
    }>;
    waypoints: any[];
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

const OrderTracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const driverMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  // Poll for updates
  useEffect(() => {
    const fetchData = () => fetchOrderDetails();
    fetchData();

    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      if (!orderId) return;
      
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setOrder(data.order);
        setError(null);
        setLoading(false);
        
        if (mapLoaded && data.order.route) {
          updateMap(data.order);
        }
      } else {
        setError('Failed to fetch order details');
        setLoading(false);
      }
    } catch (err) {
      setError('Error loading order details');
      setLoading(false);
    }
  };

  // Load Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const googleMapsScript = document.createElement('script');
    googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`;
    googleMapsScript.async = true;
    googleMapsScript.defer = true;
    window.document.body.appendChild(googleMapsScript);

    googleMapsScript.addEventListener('load', () => {
      setMapLoaded(true);
    });

    return () => {
      googleMapsScript.removeEventListener('load', () => {
        setMapLoaded(true);
      });
    };
  }, []);

  // Initialize map once loaded
  useEffect(() => {
    if (mapLoaded && order?.route && mapRef.current) {
      initializeMap();
    }
  }, [mapLoaded, order]);

  const initializeMap = () => {
    if (!order?.route || !mapRef.current) return;

    const { google } = window;
    
    // Find center point for the map
    const firstPoint = order.route.path[0].location;
    
    googleMapRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: firstPoint.lat, lng: firstPoint.lng },
      zoom: 12,
      mapTypeControl: false,
    });

    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#3b82f6',
        strokeWeight: 5,
        strokeOpacity: 0.7
      }
    });
    
    directionsRendererRef.current.setMap(googleMapRef.current);
    
    updateMap(order);
  };

  const updateMap = (orderData: OrderDetails) => {
    if (!mapLoaded || !orderData.route || !googleMapRef.current) return;
    
    const { google } = window;

    // Clear existing markers
    if (markerRefs.current.length) {
      markerRefs.current.forEach(marker => marker.setMap(null));
      markerRefs.current = [];
    }

    // Create markers for all stops
    orderData.route.path.forEach((point, index) => {
      const isFirst = index === 0;
      const isLast = index === orderData.route!.path.length - 1;
      
      let icon = {
        url: isFirst 
          ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
          : isLast 
            ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
            : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      };

      const marker = new google.maps.Marker({
        position: { lat: point.location.lat, lng: point.location.lng },
        map: googleMapRef.current,
        title: point.description,
        icon
      });
      
      markerRefs.current.push(marker);
      
      const infoWindow = new google.maps.InfoWindow({
        content: `<div class="font-sans p-1">
          <div class="font-medium">${point.description}</div>
          <div class="text-sm text-gray-600">${point.location.address}</div>
        </div>`
      });
      
      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current, marker);
      });
    });

    // Add driver marker if available
    if (orderData.driverLocation) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
      }
      
      driverMarkerRef.current = new google.maps.Marker({
        position: { 
          lat: orderData.driverLocation.lat, 
          lng: orderData.driverLocation.lng 
        },
        map: googleMapRef.current,
        title: 'Driver Location',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/truck.png',
          scaledSize: new google.maps.Size(32, 32)
        },
        zIndex: 1000
      });
    }

    // Draw route
    const directionsService = new google.maps.DirectionsService();
    
    if (orderData.route.path.length >= 2) {
      const origin = orderData.route.path[0].location;
      const destination = orderData.route.path[orderData.route.path.length - 1].location;
      const waypoints = orderData.route.path.slice(1, -1).map(point => ({
        location: new google.maps.LatLng(point.location.lat, point.location.lng),
        stopover: true
      }));
      
      directionsService.route({
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING
      }, (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
        if (status === "OK" && result) {
          directionsRendererRef.current.setDirections(result);
        }
      });
      
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Order Not Found</AlertTitle>
          <AlertDescription>We couldn't find the order details. Please check your order ID.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentStep = getStatusStep();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800 mb-2 sm:mb-0">Track Order #{order.id}</h1>
            <div className="flex items-center">
              <Clock className="text-blue-500 h-5 w-5 mr-2" />
              <span className="text-gray-600">Estimated Delivery: {order.route ? 
                `${Math.round(order.route.estimatedDuration)} minutes` : 
                'Calculating...'}</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <div className="relative">
              <div className="overflow-hidden h-2 mb-6 text-xs flex rounded bg-blue-100">
                <div 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                ></div>
              </div>
              <div className="flex text-sm justify-between px-1">
                <div className={`flex flex-col items-center ${currentStep >= 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`rounded-full transition duration-500 ease-in-out h-8 w-8 flex items-center justify-center ${currentStep >= 0 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="mt-1">Order Received</div>
                </div>
                
                <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`rounded-full transition duration-500 ease-in-out h-8 w-8 flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="mt-1">Driver Assigned</div>
                </div>
                
                <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`rounded-full transition duration-500 ease-in-out h-8 w-8 flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="mt-1">Pickup & Transit</div>
                </div>
                
                <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`rounded-full transition duration-500 ease-in-out h-8 w-8 flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div className="mt-1">Delivered</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">Delivery Status</h2>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-start">
                {currentStep === 0 && (
                  <>
                    <Package className="text-blue-500 h-5 w-5 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium">Order received</p>
                      <p className="text-gray-600 text-sm">Your order has been confirmed and is being processed.</p>
                    </div>
                  </>
                )}
                
                {currentStep === 1 && (
                  <>
                    <Truck className="text-blue-500 h-5 w-5 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium">Driver assigned</p>
                      <p className="text-gray-600 text-sm">A driver has been assigned to your order and will begin pickup soon.</p>
                    </div>
                  </>
                )}
                
                {currentStep === 2 && (
                  <>
                    <MapPin className="text-blue-500 h-5 w-5 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium">In transit</p>
                      <p className="text-gray-600 text-sm">
                        Your donations are being picked up and will be delivered to the NGO shortly.
                      </p>
                    </div>
                  </>
                )}
                
                {currentStep === 3 && (
                  <>
                    <CheckCircle className="text-green-500 h-5 w-5 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium">Delivered</p>
                      <p className="text-gray-600 text-sm">
                        Your donations have been successfully delivered to the NGO.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">Delivery Route</h2>
            <div 
              ref={mapRef}
              className="w-full h-64 sm:h-80 md:h-96 rounded-lg shadow-sm bg-gray-100"
            >
              {!mapLoaded && (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="animate-spin mr-2 h-5 w-5 border-b-2 border-gray-500 rounded-full"></div>
                  Loading map...
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">Order Details</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Delivery Address:</span>
                <span className="font-medium text-right">{order.deliveryAddress}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{order.items.length}</span>
              </div>
              {order.route && (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Total Distance:</span>
                    <span className="font-medium">{order.route.totalDistance.toFixed(2)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Duration:</span>
                    <span className="font-medium">{Math.round(order.route.estimatedDuration)} minutes</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate(`/payment/${orderId}`)}
            className="w-full bg-gray-100 text-gray-800 py-3 px-4 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            Back to Order Summary
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;