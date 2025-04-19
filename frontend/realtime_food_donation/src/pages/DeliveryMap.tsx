import React, { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: any) => any;
        Marker: new (options: any) => any;
        InfoWindow: new (options: any) => any;
        LatLng: new (lat: number, lng: number) => any;
        DirectionsService: new () => any;
        DirectionsRenderer: new (options?: any) => any;
        DirectionsResult: any;
        DirectionsStatus: any;
        TravelMode: { DRIVING: string };
        Size: new (width: number, height: number) => any;
      }
    };
  }
}

interface MapPoint {
  lat: number;
  lng: number;
  address?: string;
  description?: string;
  type?: string;
}

interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

interface OrderDetails {
  id: number;
  orderStatus: string;
  route?: {
    path: MapPoint[];
    totalDistance: number;
    estimatedDuration: number;
  };
  driverLocation?: DriverLocation;
}

interface DeliveryMapProps {
  order: OrderDetails;
  pickupPoint: MapPoint | null;
  deliveryPoint: MapPoint | null;
  waypoints: MapPoint[];
  driverLocation?: DriverLocation;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({ 
  order, 
  pickupPoint, 
  deliveryPoint, 
  waypoints, 
  driverLocation 
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const driverMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const infoWindowRefs = useRef<any[]>([]);
  const boundsRef = useRef<any>(null);

  // Load Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const googleMapsScript = document.createElement('script');
    googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
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
    if (mapLoaded && mapRef.current) {
      initializeMap();
    }
  }, [mapLoaded]);

  // Update map when order data changes
  useEffect(() => {
    if (mapLoaded && googleMapRef.current) {
      updateMap();
    }
  }, [order, pickupPoint, deliveryPoint, waypoints, driverLocation, mapLoaded]);

  // Listen for navigation events from parent
  useEffect(() => {
    const handleMapNavigate = (event: CustomEvent) => {
      if (!googleMapRef.current) return;
      
      const { type, point, index } = event.detail;
      
      switch (type) {
        case 'pickup':
          navigateToPoint(point, 'Pickup Location', 'green');
          break;
        case 'delivery':
          navigateToPoint(point, 'Delivery Location', 'red');
          break;
        case 'driver':
          navigateToPoint(point, 'Driver Location', 'blue');
          break;
        case 'waypoint':
          navigateToPoint(point, point.description || `Waypoint ${index + 1}`, 'blue');
          break;
        case 'fullRoute':
          fitMapToAllPoints();
          break;
      }
    };

    window.addEventListener('mapNavigate', handleMapNavigate as EventListener);
    return () => {
      window.removeEventListener('mapNavigate', handleMapNavigate as EventListener);
    };
  }, []);

  const initializeMap = () => {
    if (!mapRef.current) return;
  
    const { google } = window;
    
    try {
      // Default center (can be overridden later)
      const defaultCenter = { lat: 0, lng: 0 };
      
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
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
      
      // Create a bounds object to fit all points
      boundsRef.current = new google.maps.LatLngBounds();
      
      updateMap();
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  };

  const navigateToPoint = (point: MapPoint, title: string, color: string) => {
    if (!googleMapRef.current || !point) return;
    
    const { google } = window;
    
    // Close any open info windows
    infoWindowRefs.current.forEach(infoWindow => infoWindow.close());
    
    // Center map on the point
    googleMapRef.current.setCenter({ lat: point.lat, lng: point.lng });
    googleMapRef.current.setZoom(16); // Zoom in closely
    
    // Find and open info window for the point
    const pointMarker = markerRefs.current.find(marker => {
      const position = marker.getPosition();
      return position.lat() === point.lat && position.lng() === point.lng;
    });
    
    if (pointMarker) {
      // Create a new info window if needed
      const infoWindow = new google.maps.InfoWindow({
        content: `<div class="font-sans p-2">
                    <div class="font-medium text-${color}-700">${title}</div>
                    ${point.address ? `<div class="text-sm">${point.address}</div>` : ''}
                  </div>`
      });
      
      infoWindow.open(googleMapRef.current, pointMarker);
      infoWindowRefs.current.push(infoWindow);
    }
  };

  const fitMapToAllPoints = () => {
    if (!googleMapRef.current || !boundsRef.current) return;
    
    // Close any open info windows
    infoWindowRefs.current.forEach(infoWindow => infoWindow.close());
    
    googleMapRef.current.fitBounds(boundsRef.current);
    
    // Slightly zoom out to provide context
    const currentZoom = googleMapRef.current.getZoom();
    if (currentZoom > 16) {
      googleMapRef.current.setZoom(currentZoom - 1);
    }
  };

  const updateMap = () => {
    if (!mapLoaded || !googleMapRef.current) return;
    
    const { google } = window;
  
    try {
      // Clear existing markers and info windows
      if (markerRefs.current.length) {
        markerRefs.current.forEach(marker => marker.setMap(null));
        markerRefs.current = [];
      }
      
      if (infoWindowRefs.current.length) {
        infoWindowRefs.current.forEach(infoWindow => infoWindow.close());
        infoWindowRefs.current = [];
      }
      
      // Reset bounds
      boundsRef.current = new google.maps.LatLngBounds();
      
      // Collect valid points for routing
      const allPoints: MapPoint[] = [];
      const validWaypoints: any[] = [];
      
      // Pickup point (green)
      if (pickupPoint) {
        allPoints.push(pickupPoint);
        boundsRef.current.extend(new google.maps.LatLng(pickupPoint.lat, pickupPoint.lng));
        
        const pickupMarker = new google.maps.Marker({
          position: { lat: pickupPoint.lat, lng: pickupPoint.lng },
          map: googleMapRef.current,
          title: 'Pickup Location',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
            scaledSize: new google.maps.Size(36, 36)
          },
          zIndex: 100
        });
        
        const pickupInfoWindow = new google.maps.InfoWindow({
          content: `<div class="font-sans p-2">
                    <div class="font-medium text-green-700">Pickup Location</div>
                    <div class="text-sm">${pickupPoint.address || 'Food Donor Location'}</div>
                  </div>`
        });
        
        pickupMarker.addListener('click', () => {
          infoWindowRefs.current.forEach(infoWindow => infoWindow.close());
          pickupInfoWindow.open(googleMapRef.current, pickupMarker);
        });
        
        markerRefs.current.push(pickupMarker);
        infoWindowRefs.current.push(pickupInfoWindow);
        
        // Automatically open pickup info window initially if no driver
        if (!driverLocation) {
          pickupInfoWindow.open(googleMapRef.current, pickupMarker);
        }
      }
      
      // Delivery point (red)
      if (deliveryPoint) {
        allPoints.push(deliveryPoint);
        boundsRef.current.extend(new google.maps.LatLng(deliveryPoint.lat, deliveryPoint.lng));
        
        const deliveryMarker = new google.maps.Marker({
          position: { lat: deliveryPoint.lat, lng: deliveryPoint.lng },
          map: googleMapRef.current,
          title: 'Delivery Location',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(36, 36)
          },
          zIndex: 100
        });
        
        const deliveryInfoWindow = new google.maps.InfoWindow({
          content: `<div class="font-sans p-2">
                    <div class="font-medium text-red-700">Delivery Location</div>
                    <div class="text-sm">${deliveryPoint.address || 'NGO / Recipient Location'}</div>
                  </div>`
        });
        
        deliveryMarker.addListener('click', () => {
          infoWindowRefs.current.forEach(infoWindow => infoWindow.close());
          deliveryInfoWindow.open(googleMapRef.current, deliveryMarker);
        });
        
        markerRefs.current.push(deliveryMarker);
        infoWindowRefs.current.push(deliveryInfoWindow);
      }
      
      // Waypoint markers (blue)
      if (waypoints && waypoints.length > 0) {
        waypoints.forEach((point, idx) => {
          allPoints.push(point);
          boundsRef.current.extend(new google.maps.LatLng(point.lat, point.lng));
          validWaypoints.push({
            location: new google.maps.LatLng(point.lat, point.lng),
            stopover: true
          });
          
          const marker = new google.maps.Marker({
            position: { lat: point.lat, lng: point.lng },
            map: googleMapRef.current,
            title: point.description || `Waypoint ${idx + 1}`,
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new google.maps.Size(32, 32)
            }
          });
          
          const infoContent = `<div class="font-sans p-2">
                              <div class="font-medium text-blue-700">${point.description || `Waypoint ${idx + 1}`}</div>
                              ${point.address ? `<div class="text-sm">${point.address}</div>` : ''}
                            </div>`;
          
          const infoWindow = new google.maps.InfoWindow({
            content: infoContent
          });
          
          marker.addListener('click', () => {
            infoWindowRefs.current.forEach(infoWindow => infoWindow.close());
            infoWindow.open(googleMapRef.current, marker);
          });
          
          markerRefs.current.push(marker);
          infoWindowRefs.current.push(infoWindow);
        });
      }
  
      // Add or update driver marker if driver location is available
      if (driverLocation?.lat && driverLocation?.lng) {
        boundsRef.current.extend(new google.maps.LatLng(driverLocation.lat, driverLocation.lng));
        
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setMap(null);
        }
        
        driverMarkerRef.current = new google.maps.Marker({
          position: { lat: driverLocation.lat, lng: driverLocation.lng },
          map: googleMapRef.current,
          title: 'Driver Current Location',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/truck.png',
            scaledSize: new google.maps.Size(40, 40)
          },
          animation: google.maps.Animation.BOUNCE,
          zIndex: 1000
        });
        
        const driverInfoWindow = new google.maps.InfoWindow({
          content: `<div class="font-sans p-2">
                      <div class="font-medium text-blue-800">Driver's Current Location</div>
                      <div class="text-sm">Last updated: ${new Date(driverLocation.timestamp).toLocaleTimeString()}</div>
                    </div>`
        });
        
        driverMarkerRef.current.addListener('click', () => {
          infoWindowRefs.current.forEach(infoWindow => infoWindow.close());
          driverInfoWindow.open(googleMapRef.current, driverMarkerRef.current);
        });
        
        infoWindowRefs.current.push(driverInfoWindow);
        // Automatically open driver info window
        driverInfoWindow.open(googleMapRef.current, driverMarkerRef.current);
        
        // Center map on driver location by default
        googleMapRef.current.setCenter({
          lat: driverLocation.lat,
          lng: driverLocation.lng
        });
      } else if (allPoints.length > 0) {
        // If no driver location, fit map to show all points
        googleMapRef.current.fitBounds(boundsRef.current);
      }
  
      // Draw route using Directions API if we have valid points
      if (allPoints.length >= 2) {
        const directionsService = new google.maps.DirectionsService();
        
        const origin = allPoints[0];
        const destination = allPoints[allPoints.length - 1];
        
        directionsService.route({
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(destination.lat, destination.lng),
          waypoints: validWaypoints,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING
        }, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRendererRef.current.setDirections(result);
          } else {
            console.error("Directions request failed with status:", status);
          }
        });
      }
    } catch (error) {
      console.error("Error updating map:", error);
    }
  };

  return (
    <div className="relative">
      {/* Map container */}
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
  );
};

export default DeliveryMap;