import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert/Alert';
import { debounce } from 'lodash';
import { GoogleMapsAutocomplete } from '../components/GoogleMapsAutocomplete';

const API_BASE_URL = 'http://localhost:3000/api';

interface CartItem {
  foodDonationId: number;
  donorId: number;
  quantity?: number; // Now optional
  servings?: number; // For cooked meals
  weight_kg?: number; // For raw ingredients
  package_size?: string; // For packaged items
  notes?: string;
  foodType: string;
  foodCategory: string; // New field
  donorName: string;
  pickupLocation: string;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate: () => void;
}

const CartSidebar: React.FC<CartProps> = ({ isOpen, onClose, onCartUpdate }) => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localQuantities, setLocalQuantities] = useState<Record<number, number>>({});

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/cart`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setCart(data.cart.items || []);
        // Initialize local quantities
        const quantities: Record<number, number> = {};
        data.cart.items?.forEach((item: CartItem) => {
          if (item.quantity) {
            quantities[item.foodDonationId] = item.quantity;
          } else if (item.servings) {
            quantities[item.foodDonationId] = item.servings;
          } else {
            quantities[item.foodDonationId] = 1; // Default quantity
          }
        });
        setLocalQuantities(quantities);
        setError(null);
      } else {
        setError('Failed to fetch cart items');
      }
    } catch (err) {
      setError('Error loading cart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCart();
    }
  }, [isOpen, fetchCart]);

  // Debounced API call for quantity updates
  const debouncedUpdateQuantity = useCallback(
    debounce(async (foodDonationId: number, newQuantity: number, foodCategory: string) => {
      try {
        // Construct the payload based on food category
        let payload: any = {};
        
        if (foodCategory === 'Cooked Meal') {
          payload = { servings: newQuantity };
        } else if (foodCategory === 'Raw Ingredients') {
          // For raw ingredients, we might adjust weight based on quantity
          // This is a simplification, in real app you might have more complex logic
          payload = { quantity: newQuantity };
        } else if (foodCategory === 'Packaged Items') {
          payload = { quantity: newQuantity };
        } else {
          payload = { quantity: newQuantity }; // Default to quantity for backward compatibility
        }

        const response = await fetch(`${API_BASE_URL}/cart/items/${foodDonationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });

        if (response.ok) {
          onCartUpdate();
          await fetchCart();
        } else {
          setError('Failed to update quantity');
          // Revert local quantity on error
          setLocalQuantities(prev => ({
            ...prev,
            [foodDonationId]: cart.find(item => item.foodDonationId === foodDonationId)?.quantity || prev[foodDonationId]
          }));
        }
      } catch (err) {
        setError('Error updating cart');
      }
    }, 500),
    [cart, fetchCart, onCartUpdate]
  );

  const handleQuantityChange = (foodDonationId: number, newQuantity: number, foodCategory: string) => {
    if (newQuantity < 1) return;
    // Update local state immediately
    setLocalQuantities(prev => ({
      ...prev,
      [foodDonationId]: newQuantity
    }));
    // Debounce API call
    debouncedUpdateQuantity(foodDonationId, newQuantity, foodCategory);
  };

  const removeItem = async (foodDonationId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/items/${foodDonationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Remove from local quantities
        setLocalQuantities(prev => {
          const updated = { ...prev };
          delete updated[foodDonationId];
          return updated;
        });
        await fetchCart();
        onCartUpdate();
      } else {
        setError('Failed to remove item');
      }
    } catch (err) {
      setError('Error removing item');
    }
  };

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setDeliveryAddress(address);
    setDeliveryCoordinates(coordinates || null);
  };

  const checkout = async () => {
    if (!deliveryAddress.trim()) {
      setError('Please enter a delivery address');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(`${API_BASE_URL}/cart/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          deliveryAddress, 
          deliveryLatitude: deliveryCoordinates?.lat,
          deliveryLongitude: deliveryCoordinates?.lng
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCart([]);
        setLocalQuantities({});
        setDeliveryAddress('');
        setDeliveryCoordinates(null);
        onCartUpdate();
        onClose();
        navigate(`/payment/${data.orderId}`);
      } else {
        setError(data.message || 'Checkout failed');
      }
    } catch (err) {
      setError('Error during checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for clicking outside to close
  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Helper function to get the appropriate quantity display label based on food category
  const getQuantityLabel = (item: CartItem) => {
    switch (item.foodCategory) {
      case 'Cooked Meal':
        return 'Servings';
      case 'Raw Ingredients':
        return 'Quantity';
      case 'Packaged Items':
        return 'Items';
      default:
        return 'Quantity';
    }
  };

  // Helper function to get additional item details based on food category
  const renderItemDetails = (item: CartItem) => {
    switch (item.foodCategory) {
      case 'Cooked Meal':
        return item.servings && <p className="text-xs text-gray-500">Servings: {item.servings}</p>;
      case 'Raw Ingredients':
        return item.weight_kg && <p className="text-xs text-gray-500">Weight: {item.weight_kg} kg</p>;
      case 'Packaged Items':
        return item.package_size && <p className="text-xs text-gray-500">Package Size: {item.package_size}</p>;
      default:
        return null;
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 ${isOpen ? 'visible' : 'invisible'}`}
      onClick={handleOutsideClick}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300" />
      
      {/* Sidebar */}
      <div 
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Cart</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close cart"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingCart className="w-12 h-12 mb-2" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div 
                  key={item.foodDonationId} 
                  className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{item.foodType}</h3>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          {item.foodCategory}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">From: {item.donorName}</p>
                      <p className="text-sm text-gray-600">Pickup: {item.pickupLocation}</p>
                      {renderItemDetails(item)}
                    </div>
                    <button
                      onClick={() => removeItem(item.foodDonationId)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-start gap-2 mt-3">
                    <button
                      onClick={() => handleQuantityChange(
                        item.foodDonationId,
                        Math.max(1, (localQuantities[item.foodDonationId] || 1) - 1),
                        item.foodCategory
                      )}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center">
                      {localQuantities[item.foodDonationId] || 1}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(
                        item.foodDonationId,
                        (localQuantities[item.foodDonationId] || 1) + 1,
                        item.foodCategory
                      )}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-500 ml-1">{getQuantityLabel(item)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        {cart.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address
              </label>
              <GoogleMapsAutocomplete
                value={deliveryAddress}
                onChange={handleAddressChange}
                disabled={isProcessing}
                placeholder="Enter your delivery address"
              />
            </div>
            <button
              onClick={checkout}
              disabled={isProcessing || !deliveryAddress.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed font-medium"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Proceed to Checkout'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartSidebar;