import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import axios from 'axios';

// Map marker colors
const MARKER_COLORS = {
  pickup: '#2563eb', // Blue
  delivery: '#dc2626', // Red
  driver: '#16a34a'  // Green
};

// TypeScript interfaces
interface Location {
  lat: number;
  lng: number;
}

interface RouteStep {
  instructions: string;
  start_location: google.maps.LatLng;
}

interface NavigationInfo {
  distance: string;
  duration: string;
  nextStep: string;
  remainingSteps: string[];
}

interface OrderItem {
  pickupLocation: string;
}

interface RouteData {
  deliveryStatus: string;
  deliveryAddress: string;
  items: OrderItem[];
  route?: any; // Replace with more specific type if known
}

interface DeliveryMapProps {
  orderId: number;
  driverLocation: Location | null;
  showFullRoute?: boolean;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({ orderId, driverLocation, showFullRoute = true }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const navigationControlRef = useRef<HTMLDivElement | null>(null);
  const streetViewPanoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(driverLocation || null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [navigationMode, setNavigationMode] = useState<boolean>(false);
  const [streetViewMode, setStreetViewMode] = useState<boolean>(false);
  const [navigationInfo, setNavigationInfo] = useState<NavigationInfo>({
    distance: '',
    duration: '',
    nextStep: '',
    remainingSteps: []
  });

  // Initialize Google Maps when component mounts
  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    } else {
      initializeMap();
    }
  }, []);

  // Initialize the map
  const initializeMap = () => {
    if (!mapRef.current) return;

    const newMap = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20.5937, lng: 78.9629 }, // Default center (India)
      zoom: 12,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false
    });

    mapInstanceRef.current = newMap;
    
    // Initialize the DirectionsRenderer
    const directionsRendererInstance = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true, // We'll add custom markers
      polylineOptions: {
        strokeColor: '#2563eb',
        strokeWeight: 5,
        strokeOpacity: 0.7
      }
    });
    directionsRendererInstance.setMap(newMap);
    directionsRendererRef.current = directionsRendererInstance;

    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          newMap.setCenter(location);
        },
        (err) => {
          console.error('Error getting current location:', err);
          setError('Unable to get your current location');
        }
      );
    }

    // Fetch order route data
    fetchRouteData();

    // Add navigation button on the map - only done once
    const navigationControlDiv = document.createElement('div');
    navigationControlDiv.className = 'absolute bottom-4 right-4 bg-white rounded-full p-3 shadow-lg';
    navigationControlDiv.style.cursor = 'pointer';
    navigationControlDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>';
    
    navigationControlDiv.addEventListener('click', () => {
      startInAppNavigation();
    });
    
    newMap.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(navigationControlDiv);
    navigationControlRef.current = navigationControlDiv;
  };

  // Fetch route data for the order
  const fetchRouteData = async () => {
    if (!orderId) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/orders/driver/${orderId}`, {
        withCredentials: true
      });
      
      if (response.data.success && response.data.order) {
        setRouteData(response.data.order);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error fetching route data:', err);
      setError('Failed to load route data');
      setIsLoading(false);
    }
  };

  // Watch for changes in current location
  useEffect(() => {
    let watchId: number;
    let orientationListener: (event: DeviceOrientationEvent) => void;
    
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);
          // Update driver location on server
          if (routeData) {
            updateDriverLocation(newLocation);
          }
          
          // Update driver marker position
          updateDriverMarker(newLocation);

          // Update navigation if in navigation mode
          if (navigationMode) {
            updateNavigationInfo(newLocation);
            
            // Update street view if active
            if (streetViewMode && streetViewPanoramaRef.current) {
              streetViewPanoramaRef.current.setPosition(newLocation);
              if (heading !== null) {
                streetViewPanoramaRef.current.setPov({
                  heading: heading,
                  pitch: 0
                });
              }
            }
          }
        },
        (err) => {
          console.error('Error watching position:', err);
        },
        { 
          enableHighAccuracy: true, 
          maximumAge: 30000, 
          timeout: 27000 
        }
      );
      
      if (window.DeviceOrientationEvent) {
        orientationListener = (event: DeviceOrientationEvent) => {
          if (event.alpha !== null) {
            const newHeading = event.alpha;
            setHeading(newHeading);
            updateDriverMarkerRotation(newHeading);
            
            // Update street view heading if active
            if (streetViewMode && streetViewPanoramaRef.current) {
              streetViewPanoramaRef.current.setPov({
                heading: newHeading,
                pitch: 0
              });
            }
          }
        };
        window.addEventListener('deviceorientation', orientationListener);
      }
    }
    
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (orientationListener) window.removeEventListener('deviceorientation', orientationListener);
    };
  }, [routeData, navigationMode, streetViewMode]);

  // Update driver location on server with proper status
  const updateDriverLocation = async (location: Location) => {
    if (!orderId || !location || !routeData) return;
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || ''}/orders/${orderId}/status`,
        {
          status: routeData.deliveryStatus || 'in_transit',
          location: location
        },
        { withCredentials: true }
      );
  
    } catch (err) {
      console.error('Error updating driver location:', err);
    }
  };

  // Update driver marker position
  const updateDriverMarker = (location: Location) => {
    const driverMarker = markersRef.current.find(marker => marker.getTitle() === 'You');
    if (driverMarker) {
      driverMarker.setPosition(location);
    }
  };

  // Update driver marker rotation
  const updateDriverMarkerRotation = (newHeading: number) => {
    const driverMarker = markersRef.current.find(marker => marker.getTitle() === 'You');
    if (driverMarker && driverMarker.getIcon()) {
      const icon = {...(driverMarker.getIcon() as google.maps.Symbol)};
      icon.rotation = newHeading;
      driverMarker.setIcon(icon);
    }
  };

  // Update route and markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !routeData || !routeData.route || !directionsRendererRef.current || !currentLocation) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    const map = mapInstanceRef.current;
    const directionsRenderer = directionsRendererRef.current;
    
    // Create DirectionsService for routing
    const directionsService = new window.google.maps.DirectionsService();
    
    // Prepare waypoints from the route
    const pickupPoints = routeData.items.map(item => item.pickupLocation);
    
    // Create unique pickup points (in case there are duplicates)
    const uniquePickupPoints = [...new Set(pickupPoints)];
    
    uniquePickupPoints.forEach(location => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: location }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const marker = new window.google.maps.Marker({
            position: results[0].geometry.location,
            map: map,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: MARKER_COLORS.pickup,
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: '#FFFFFF',
              scale: 10
            },
            title: 'Pickup'
          });
          markersRef.current.push(marker);
        }
      });
    });
    
    // Create marker for delivery location
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: routeData.deliveryAddress }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const marker = new window.google.maps.Marker({
          position: results[0].geometry.location,
          map: map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: MARKER_COLORS.delivery,
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#FFFFFF',
            scale: 10
          },
          title: 'Delivery'
        });
        markersRef.current.push(marker);
      }
    });
    
    // Create marker for driver's current location
    const driverMarker = new window.google.maps.Marker({
      position: currentLocation,
      map: map,
      icon: {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        fillColor: MARKER_COLORS.driver,
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: '#FFFFFF',
        scale: 6,
        rotation: heading,
      },
      title: 'You'
    });
    markersRef.current.push(driverMarker);
    
    // Calculate route based on current status
    if (showFullRoute) {
      const origin = currentLocation;
      let destination: string;
      let waypoints: google.maps.DirectionsWaypoint[] = [];
      
      if (routeData.deliveryStatus === 'assigned') {
        // If status is assigned, route to first pickup
        destination = uniquePickupPoints[0];
        // If there are multiple pickups, add the rest as waypoints
        const remainingPickups = uniquePickupPoints.slice(1);
        // Add delivery location as the final waypoint
        remainingPickups.push(routeData.deliveryAddress);
        
        waypoints = remainingPickups.map(point => ({ location: point, stopover: true }));
      } else if (routeData.deliveryStatus === 'picked_up' || routeData.deliveryStatus === 'in_transit') {
        // If order is picked up, route directly to delivery
        destination = routeData.deliveryAddress;
      } else {
        // Default case (shouldn't normally happen)
        destination = routeData.deliveryAddress;
      }
    
      directionsService.route({
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
        } else {
          console.error('Directions request failed:', status);
        }
      });
    }
  }, [currentLocation, routeData, heading, showFullRoute]);

  // Toggle street view mode
  const toggleStreetView = () => {
    if (!mapInstanceRef.current || !currentLocation) return;
    
    if (!streetViewMode) {
      // Initialize Street View panorama
      const panorama = new window.google.maps.StreetViewPanorama(
        mapRef.current as HTMLElement,
        {
          position: currentLocation,
          pov: { heading: heading, pitch: 0 },
          zoom: 1,
          visible: true,
          motionTracking: true,
          motionTrackingControl: true,
          linksControl: false,
          panControl: false,
          enableCloseButton: false,
          fullscreenControl: false,
          addressControl: false
        }
      );
      
      mapInstanceRef.current.setStreetView(panorama);
      streetViewPanoramaRef.current = panorama;
      setStreetViewMode(true);
      
      // Check if Street View imagery is available at this location
      const streetViewService = new window.google.maps.StreetViewService();
      streetViewService.getPanorama({ location: currentLocation, radius: 50 }, (data, status) => {
        if (status !== 'OK') {
          // No Street View available at this location
          console.warn('No Street View imagery available at this location');
          // You could show a message to the user here if desired
        }
      });
    } else {
      // Exit Street View
      if (mapInstanceRef.current && streetViewPanoramaRef.current) {
        streetViewPanoramaRef.current.setVisible(false);
        setStreetViewMode(false);
      }
    }
  };

  // Start in-app navigation
  const startInAppNavigation = () => {
    if (!routeData || !currentLocation || !mapInstanceRef.current) return;
    
    setNavigationMode(true);
    const map = mapInstanceRef.current;
    
    // Change map view for navigation mode
    map.setOptions({
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      tilt: 45,
      heading: heading,
      zoom: 17
    });
    
    // Center map on driver's location and follow
    map.setCenter(currentLocation);
    
    // Get destination based on current status
    const destination = routeData.deliveryStatus === 'assigned' 
      ? routeData.items[0].pickupLocation  // Navigate to first pickup
      : routeData.deliveryAddress;  // Navigate to delivery
      
    // Get directions with detailed instructions
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route({
      origin: currentLocation,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: false,
    }, (result, status) => {
      if (status === 'OK' && result) {
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result);
        }
        
        // Extract navigation information
        const route = result.routes[0];
        const leg = route.legs[0];
        
        // Get total distance and duration
        setNavigationInfo({
          distance: leg.distance?.text || '',
          duration: leg.duration?.text || '',
          nextStep: leg.steps[0]?.instructions || "Start driving",
          remainingSteps: leg.steps.slice(1).map(step => step.instructions)
        });
      }
    });
  };

  // Update navigation information as driver moves
  const updateNavigationInfo = (location: Location) => {
    if (!directionsRendererRef.current?.getDirections()) return;
    
    const directions = directionsRendererRef.current.getDirections();
    if (!directions) return;
    
    const route = directions.routes[0];
    const leg = route.legs[0];
    
    // Update map center to follow driver
    if (mapInstanceRef.current && !streetViewMode) {
      mapInstanceRef.current.setCenter(location);
    }
    
    // Find the next step based on current location
    // This is a simple implementation - a more sophisticated approach would
    // calculate the closest route segment to the driver's position
    let closestStepIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < leg.steps.length; i++) {
      const step = leg.steps[i];
      const stepStartPoint = step.start_location;
      
      // Calculate distance to step start
      const distance = getDistanceFromLatLonInM(
        location.lat, location.lng,
        stepStartPoint.lat(), stepStartPoint.lng()
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestStepIndex = i;
      }
    }
    
    // Update navigation info
    setNavigationInfo({
      distance: leg.distance?.text || '',
      duration: leg.duration?.text || '',
      nextStep: leg.steps[closestStepIndex]?.instructions || "Continue driving",
      remainingSteps: leg.steps.slice(closestStepIndex + 1).map(step => step.instructions)
    });
  };

  // Helper function to calculate distance between coordinates
  const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d * 1000; // Distance in m
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI/180);
  };

  // Exit navigation mode
  const exitNavigation = () => {
    setNavigationMode(false);
    
    // Exit street view if active
    if (streetViewMode) {
      if (streetViewPanoramaRef.current) {
        streetViewPanoramaRef.current.setVisible(false);
      }
      setStreetViewMode(false);
    }
    
    // Reset map view
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setOptions({
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        tilt: 0,
        zoom: 12
      });
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center">
        <div className="mr-2">⚠️</div>
        {error}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      )}
      
      {/* Increased map height */}
      <div ref={mapRef} className="w-full h-96 rounded-lg"></div>
      
      {/* Navigation panel that appears in navigation mode */}
      {navigationMode && (
        <div className="bg-white rounded-lg shadow-lg p-4 mt-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">Navigation</h3>
            <div className="flex space-x-2">
              <button 
                onClick={toggleStreetView}
                className={`px-3 py-1 rounded-md ${streetViewMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                {streetViewMode ? 'Map View' : 'Street View'}
              </button>
              <button 
                onClick={exitNavigation}
                className="text-gray-500 hover:text-gray-700"
              >
                Exit
              </button>
            </div>
          </div>
          
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">{navigationInfo.distance} remaining</span>
            <span className="text-gray-600">{navigationInfo.duration}</span>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md mb-3">
            <div 
              className="text-blue-800" 
              dangerouslySetInnerHTML={{ __html: navigationInfo.nextStep }}
            />
          </div>
          
          {navigationInfo.remainingSteps.length > 0 && (
            <div className="border-t pt-2">
              <p className="text-xs text-gray-500 mb-1">Upcoming:</p>
              <ul className="text-sm text-gray-700">
                {navigationInfo.remainingSteps.slice(0, 2).map((step, index) => (
                  <li key={index} className="mb-1 text-gray-600" dangerouslySetInnerHTML={{ __html: step }} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {!navigationMode && (
        <button 
          onClick={startInAppNavigation}
          className="absolute bottom-4 left-4 bg-blue-600 text-white py-2 px-4 rounded-md flex items-center space-x-2 shadow-lg"
        >
          <Navigation size={18} />
          <span>Navigate</span>
        </button>
      )}
      
      {!navigationMode && (
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-600 mr-2"></div>
            <span className="text-sm text-gray-600">Pickup</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-600 mr-2"></div>
            <span className="text-sm text-gray-600">Delivery</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-600 mr-2"></div>
            <span className="text-sm text-gray-600">Your Location</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryMap;