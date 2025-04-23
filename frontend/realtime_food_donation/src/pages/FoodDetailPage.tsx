import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card/Card";
import { Button } from "../components/ui/button/Button";
import { Input } from "../components/ui/input/Input";
import { 
  Clock, 
  MapPin, 
  Utensils, 
  Users, 
  Building, 
  Phone, 
  ShoppingCart, 
  Calendar,
  PieChart,
  AlertCircle
} from 'lucide-react';
import CartSidebar from './CartSidebar';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert/Alert';

const API_BASE_URL = 'http://localhost:3000/api';

interface FoodDonation {
  id: number;
  donor_id: number;
  food_type: string;
  food_category: string;
  event_is_over: boolean; // Added to track event status
  servings?: number;
  weight_kg?: number;
  quantity?: number;
  package_size?: string;
  total_quantity?: number; // For event predictions
  event_type?: string;
  preparation_method?: string;
  pricing?: string;
  number_of_guests?: number;
  expiration_time: string;
  pickup_location: string;
  image: string | null;
  availability_schedule: string;
  status: string;
  donor_name: string;
  contact_person: string;
  contact_number: string;
  operating_hours: string;
}

interface CartItem {
  foodDonationId: number;
  donorId: number;
  quantity: number;
  itemTotal: number;
  foodType: string;
  foodCategory: string;
  donorName: string;
  pickupLocation: string;
  isFromPastEvent: boolean; // Added to track event source
}

interface ApiResponse {
  success: boolean;
  food: FoodDonation;
  message?: string;
}

const FoodDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [food, setFood] = useState<FoodDonation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartQuantity, setCartQuantity] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Determine if cart has past or upcoming event items
  const hasPastEventItems = cartItems.some(item => item.isFromPastEvent);
  const hasUpcomingEventItems = cartItems.some(item => !item.isFromPastEvent);

  useEffect(() => {
    fetchFoodDetails();
    fetchCart();
  }, [id]);

  useEffect(() => {
    if (food) {
      const existingCartItem = cartItems.find(item => item.foodDonationId === food.id);
      setCartQuantity(existingCartItem?.quantity || 0);
    }
  }, [food, cartItems]);

  const fetchFoodDetails = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/foods/${id}`, {
        credentials: 'include'
      });
      const data: ApiResponse = await response.json();
      if (data.success) {
        setFood(data.food);
      }
    } catch (error) {
      console.error('Error fetching food details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCart = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setCartItems(data.cart.items || []);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const handleQuantityInputChange = (value: string) => {
    const newQuantity = parseInt(value) || 0;
    setCartQuantity(newQuantity);
  };

  // Check if the item can be added to cart based on current cart contents
  const canAddToCart = (food: FoodDonation) => {
    if (cartItems.length === 0) return true;
    if (food.event_is_over) return !hasUpcomingEventItems;
    return !hasPastEventItems;
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!food) return;
  
    // Check if can add to cart based on event type
    if (!canAddToCart(food)) {
      setError(
        food.event_is_over
          ? "You can't mix items from past and upcoming events. Your cart currently contains items from upcoming events."
          : "You can't mix items from past and upcoming events. Your cart currently contains items from past events."
      );
      return;
    }
  
    // Check if valid quantity
    let maxQuantity = getMaxQuantity(food);
    
    if (cartQuantity <= 0 || cartQuantity > maxQuantity) {
      setError(`Please enter a valid quantity between 1 and ${maxQuantity}`);
      return;
    }
    
    try {
      setError(null);
      const currentCartItem = cartItems.find(item => item.foodDonationId === food.id);
      
      if (cartQuantity === 0 && currentCartItem) {
        // Remove from cart
        await fetch(`${API_BASE_URL}/cart/items/${food.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
      } else if (currentCartItem) {
        // Update cart
        await fetch(`${API_BASE_URL}/cart/items/${food.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ 
            quantity: cartQuantity,
            itemTotal: Number(cartQuantity)
          })
        });
      } else {
        // Add to cart
        const cartItem = {
          foodDonationId: food.id,
          donorId: food.donor_id,
          quantity: cartQuantity,
          itemTotal: Number(cartQuantity),
          foodType: food.food_type,
          foodCategory: food.food_category,
          donorName: food.donor_name,
          pickupLocation: food.pickup_location,
          isFromPastEvent: food.event_is_over
        };
    
        await fetch(`${API_BASE_URL}/cart/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(cartItem)
        });
      }
    
      await fetchCart();
    } catch (error) {
      console.error('Error updating cart:', error);
      setError('Failed to update cart');
    }
  };

  const formatDateTime = (datetime: string): string => {
    return new Date(datetime).toLocaleString();
  };

  const getMaxQuantity = (food: FoodDonation) => {
    if (food.event_is_over) {
      // Actual quantities for past events
      if (food.food_category === 'Cooked Meal') {
        return food.servings || 0;
      } else if (food.food_category === 'Raw Ingredients') {
        return Math.floor(food.weight_kg || 0);
      } else if (food.food_category === 'Packaged Items') {
        return food.quantity || 0;
      }
      return 0;
    } else {
      // Predicted quantities for upcoming events
      return food.servings || 0;
    }
  };

  const renderQuantityInfo = (food: FoodDonation) => {
    const quantityLabel = food.event_is_over ? "Actual" : "Predicted";
    
    if (!food.event_is_over) {
      // For upcoming events, show predicted quantity
      return `${quantityLabel}: ${food.servings || 0} kg`;
    }
    
    // For past events, show actual quantities based on food category
    switch (food.food_category) {
      case 'Cooked Meal':
        return `${quantityLabel}: ${food.servings} kg`;
      case 'Raw Ingredients':
        return `${quantityLabel}: ${food.weight_kg} kg`;
      case 'Packaged Items':
        return `${quantityLabel}: ${food.quantity} × ${food.package_size}`;
      default:
        return `${quantityLabel}: ${food.quantity} units`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!food) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Food donation not found</h1>
      </div>
    );
  }

  const isAvailable = canAddToCart(food);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="outline"
          onClick={() => navigate(-1)}
        >
          ← Back to Listings
        </Button>
        
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Cart ({cartItems.length})</span>
        </button>
      </div>

      {/* Event type information alert */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important Order Information</AlertTitle>
        <AlertDescription>
          You can order from either past events (available now) or upcoming events (quantities not guaranteed, delivered after event). 
          You cannot mix items from both types in the same order.
          {hasPastEventItems && " Your cart currently contains items from past events."}
          {hasUpcomingEventItems && " Your cart currently contains items from upcoming events."}
        </AlertDescription>
      </Alert>

      {/* Error alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Event type disclaimer for upcoming events */}
      {!food.event_is_over && (
        <Alert className="mb-6 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700">Upcoming Event Notice</AlertTitle>
          <AlertDescription className="text-yellow-600">
            Ordering from upcoming events doesn't guarantee the exact quantities. Final amounts will be determined 
            by the donor after the event and will only be delivered once the event is over.
          </AlertDescription>
        </Alert>
      )}

      <div className="max-w-3xl mx-auto">
        <Card className={`mb-6 ${!isAvailable ? 'opacity-60' : ''}`}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span className="text-2xl">{food.food_type}</span>
              <div className="flex gap-2">
                <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded">
                  {food.status}
                </span>
                <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded">
                  {food.food_category}
                </span>
                <span className={`text-sm px-3 py-1 rounded ${food.event_is_over ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                  {food.event_is_over ? 'Past Event' : 'Upcoming Event'}
                </span>
              </div>
            </CardTitle>
          </CardHeader>

          {food.image && (
            <img 
              src="/api/placeholder/800/400"
              alt={food.food_type}
              className="w-full h-64 object-cover"
            />
          )}

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Food Details</h3>
                <div className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  <span>{renderQuantityInfo(food)}</span>
                </div>
                
                {!food.event_is_over && (
                  <>
                    {food.event_type && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        <span>Event Type: {food.event_type.replace('_', ' ')}</span>
                      </div>
                    )}
                    {food.preparation_method && (
                      <div className="flex items-center gap-2">
                        <Utensils className="h-5 w-5" />
                        <span>Preparation: {food.preparation_method.replace('_', ' ')}</span>
                      </div>
                    )}
                    {food.number_of_guests && (
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <span>Expected Guests: {food.number_of_guests}</span>
                      </div>
                    )}
                    {food.pricing && (
                      <div className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        <span>Pricing Level: {food.pricing}</span>
                      </div>
                    )}
                  </>
                )}
                
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>Expires: {formatDateTime(food.expiration_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>Schedule: {food.availability_schedule}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Donor Information</h3>
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  <span>{food.donor_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>Contact: {food.contact_person}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  <span>{food.contact_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>{food.pickup_location}</span>
                </div>
                {food.operating_hours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>Operating Hours: {food.operating_hours}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="flex items-center justify-between gap-2">
                <Input
                  type="number"
                  min="0"
                  max={getMaxQuantity(food)}
                  value={cartQuantity || ''}
                  onChange={(e) => handleQuantityInputChange(e.target.value)}
                  className="w-24"
                  placeholder="Qty"
                  disabled={!isAvailable}
                />
                <Button
                  onClick={handleAddToCart}
                  className="ml-2"
                  disabled={!isAvailable}
                >
                  {isAvailable ? 'Add to Cart' : 'Unavailable'}
                </Button>
              </div>
            </div>

            {!food.event_is_over && (
              <div className="text-xs text-amber-600 italic mt-1 text-center">
                *Final quantities will be determined after the event
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)}
        onCartUpdate={fetchCart}
      />
    </div>
  );
};

export default FoodDetailPage;