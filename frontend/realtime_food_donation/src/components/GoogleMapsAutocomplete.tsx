import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Crosshair, Map as MapIcon, X } from 'lucide-react';

interface GoogleMapsAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

export const GoogleMapsAutocomplete: React.FC<GoogleMapsAutocompleteProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Enter your address'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const [googleMap, setGoogleMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);

  useEffect(() => {
    // Load Google Maps API
    const loadGoogleMapsAPI = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setupAutocompleteIfPossible();
        setIsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = () => {
        setupAutocompleteIfPossible();
        setIsLoaded(true);
      };
      script.onerror = () => {
        setError('Failed to load Google Maps API');
      };
      document.head.appendChild(script);

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    };

    loadGoogleMapsAPI();
  }, []);

  useEffect(() => {
    if (isMapModalOpen && isLoaded && mapRef.current) {
      initializeMap();
    }
  }, [isMapModalOpen, isLoaded]);

  const setupAutocompleteIfPossible = () => {
    if (!inputRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    try {
      // Use the old Autocomplete API since PlaceAutocompleteElement has issues
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
          // User entered the name of a place that was not suggested
          return;
        }

        const address = place.formatted_address || '';
        const coordinates = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };

        onChange(address, coordinates);
      });
    } catch (error) {
      console.error('Error setting up Google Maps Autocomplete:', error);
      setError('Could not initialize address search. Please enter address manually.');
    }
  };

  const initializeMap = () => {
    if (!window.google || !window.google.maps || !mapRef.current) return;

    const defaultLocation = { lat: 40.7128, lng: -74.006 }; // Default to New York
    
    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 13,
      fullscreenControl: false,
      mapTypeControl: false,
    });

    setGoogleMap(map);

    const newMarker = new window.google.maps.Marker({
      position: defaultLocation,
      map: map,
      draggable: true,
    });

    setMarker(newMarker);

    // If we have coordinates, center the map there
    if (value) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: value }, (results, status) => {
        if (status === "OK" && results && results[0] && results[0].geometry) {
          const location = results[0].geometry.location;
          map.setCenter(location);
          newMarker.setPosition(location);
        }
      });
    }

    // Add click event to map
    map.addListener('click', (e: any) => {
      newMarker.setPosition(e.latLng);
    });

    // Add dragend event to marker
    newMarker.addListener('dragend', () => {
      const position = newMarker.getPosition();
      const coordinates = {
        lat: position.lat(),
        lng: position.lng(),
      };
      reverseGeocode(coordinates);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        reverseGeocode(coordinates);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setError('Could not get your current location');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const reverseGeocode = (coordinates: Coordinates) => {
    if (!window.google || !window.google.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: coordinates }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        onChange(results[0].formatted_address, coordinates);
      } else {
        setError('Could not find address for this location');
      }
    });
  };

  const openMapModal = () => {
    setIsMapModalOpen(true);
  };

  const closeMapModal = () => {
    setIsMapModalOpen(false);
  };

  const confirmLocationFromMap = () => {
    if (marker) {
      const position = marker.getPosition();
      const coordinates = {
        lat: position.lat(),
        lng: position.lng(),
      };
      reverseGeocode(coordinates);
      closeMapModal();
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 text-[15px] ${className}`}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      
      {!isLoaded && !error && (
        <p className="mt-1 text-sm text-gray-500">Loading address search...</p>
      )}
      
      <div className="mt-2 flex space-x-2">
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={!isLoaded || isGettingLocation || disabled}
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
        >
          <Crosshair className="h-4 w-4 mr-2" />
          {isGettingLocation ? 'Getting location...' : 'Use current location'}
        </button>
        
        <button
          type="button"
          onClick={openMapModal}
          disabled={!isLoaded || disabled}
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
        >
          <MapIcon className="h-4 w-4 mr-2" />
          Pick on map
        </button>
      </div>

      {/* Map Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Select Location</h3>
              <button 
                onClick={closeMapModal}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div 
              ref={mapRef} 
              className="w-full h-96 rounded-md bg-gray-100"
            ></div>
            
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={closeMapModal}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmLocationFromMap}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add type definition for google maps
declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: any) => any;
        Marker: new (options: any) => any;
        Geocoder: new () => any;
        places: {
          Autocomplete: new (input: HTMLInputElement, options?: any) => any;
        };
        event: {
          addListener: (instance: any, eventName: string, handler: Function) => void;
        };
      };
    };
  }
}