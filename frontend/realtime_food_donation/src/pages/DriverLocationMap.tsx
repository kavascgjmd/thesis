import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../components/ui/card/Card';

interface DriverLocationMapProps {
  orderId: number;
  driverLocation?: {
    lat: number;
    lng: number;
    timestamp: number;
  };
  route?: {
    path: Array<{lat: number, lng: number}>;
    totalDistance: number;
    estimatedDuration: number;
  };
  deliveryAddress: string;
  items: Array<{
    pickup_location: string;
  }>;
}

// Define window with Google Maps properties
declare global {
  interface Window {
    initMap?: () => void; // Make initMap optional so it can be deleted
    google: any;
  }
}

const DriverLocationMap: React.FC<DriverLocationMapProps> = ({ 
  orderId, 
  driverLocation, 
  route,
  deliveryAddress,
  items
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [markers, setMarkers] = useState<{ [key: string]: google.maps.Marker }>({});

  // Load Google Maps script dynamically
  useEffect(() => {
    // Define initMap before setting up the script
    window.initMap = () => {
      setMapLoaded(true);
    };

    if (typeof window !== 'undefined' && !window.google?.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      
      return () => {
        if (script.parentNode) {
          document.head.removeChild(script);
        }
        // Now this works because initMap is defined as optional
        delete window.initMap;
      };
    } else if (window.google?.maps) {
      setMapLoaded(true);
    }
  }, []);

  // Initialize map once script is loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    
    // Default center (can be set to delivery address or first pickup location)
    const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // San Francisco as fallback
    
    const mapInstance = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: defaultCenter,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
    });
    
    const directionsRendererInstance = new google.maps.DirectionsRenderer({
      map: mapInstance,
      suppressMarkers: true, // We'll create custom markers
      polylineOptions: {
        strokeColor: '#4285F4',
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    });
    
    setMap(mapInstance);
    setDirectionsRenderer(directionsRendererInstance);
  }, [mapLoaded]);

  // Update map with route and locations when data changes
  useEffect(() => {
    if (!map || !directionsRenderer) return;
    
    // Clear previous markers
    Object.values(markers).forEach(marker => marker.setMap(null));
    const newMarkers: { [key: string]: google.maps.Marker } = {};
    
    // If we have a route with path points
    if (route && route.path && route.path.length > 0) {
      // Create a directions service request
      const directionsService = new google.maps.DirectionsService();
      const waypoints = route.path.slice(1, -1).map(point => ({
        location: new google.maps.LatLng(point.lat, point.lng),
        stopover: true
      }));
      
      const origin = new google.maps.LatLng(route.path[0].lat, route.path[0].lng);
      const destination = new google.maps.LatLng(
        route.path[route.path.length - 1].lat, 
        route.path[route.path.length - 1].lng
      );
      
      directionsService.route({
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false
      }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          directionsRenderer.setDirections(result);
          
          // Add marker for each pickup location
          items.forEach((item, index) => {
            // This would ideally use the geocoded location of the pickup address
            // Here we're using the route path points as an approximation
            if (route.path[index]) {
              const position = new google.maps.LatLng(route.path[index].lat, route.path[index].lng);
              newMarkers[`pickup-${index}`] = new google.maps.Marker({
                position: position,
                map: map,
                icon: {
                  url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                  scaledSize: new google.maps.Size(32, 32)
                },
                title: `Pickup: ${item.pickup_location}`
              });
            }
          });
          
          // Add delivery location marker (destination)
          newMarkers['delivery'] = new google.maps.Marker({
            position: destination,
            map: map,
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
              scaledSize: new google.maps.Size(32, 32)
            },
            title: `Delivery: ${deliveryAddress}`
          });
          
          // Center the map to fit all markers and route
          const bounds = new google.maps.LatLngBounds();
          route.path.forEach(point => {
            bounds.extend(new google.maps.LatLng(point.lat, point.lng));
          });
          map.fitBounds(bounds);
        }
      });
    }
    
    // Add driver marker if location is available
    if (driverLocation) {
      const driverPosition = new google.maps.LatLng(driverLocation.lat, driverLocation.lng);
      
      // Custom driver marker
      newMarkers['driver'] = new google.maps.Marker({
        position: driverPosition,
        map: map,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(40, 40)
        },
        title: 'Driver Location',
        animation: google.maps.Animation.DROP,
        zIndex: 10 // Keep driver marker on top
      });
      
      // If we don't have a route, center on driver
      if (!route || !route.path || route.path.length === 0) {
        map.setCenter(driverPosition);
        map.setZoom(15);
      }
    }
    
    setMarkers(newMarkers);
  }, [map, directionsRenderer, route, driverLocation, deliveryAddress, items]);

  // Set up polling for driver location updates
  useEffect(() => {
    if (!orderId) return;
    
    const fetchDriverLocation = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/driver-location`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.location) {
            // Update driver location state if it's different from current
            if (!driverLocation || 
                driverLocation.lat !== data.location.lat || 
                driverLocation.lng !== data.location.lng) {
              // This would trigger the map update via props
              console.log("Driver location updated:", data.location);
              // We're not updating state here as it should come from parent component
            }
          }
        }
      } catch (error) {
        console.error("Error fetching driver location:", error);
      }
    };
    
    // Only start polling if we have an order with a driver assigned
    if (orderId && markers['driver']) {
      const intervalId = setInterval(fetchDriverLocation, 15000); // Every 15 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [orderId, driverLocation, markers]);

  return (
    <Card className="p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Live Tracking</h2>
      <div 
        ref={mapRef} 
        className="w-full h-80 rounded-md bg-gray-100"
        aria-label="Map showing driver location and delivery route"
      >
        {!mapLoaded && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
          </div>
        )}
      </div>
      
      {driverLocation && (
        <div className="mt-3 text-sm text-gray-600">
          Last updated: {new Date(driverLocation.timestamp).toLocaleTimeString()}
        </div>
      )}
      
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
          <span className="text-sm">Driver</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
          <span className="text-sm">Pickup Points</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
          <span className="text-sm">Delivery Address</span>
        </div>
      </div>
    </Card>
  );
};

// Replace with your actual API base URL
const API_BASE_URL = 'http://localhost:3000/api';

export default DriverLocationMap;