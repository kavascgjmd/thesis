import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card/Card";
import { Clock, MapPin, Utensils, Users, ShoppingCart, Calendar, AlertCircle } from 'lucide-react';
import CartSidebar from './CartSidebar';
import { Input } from '../components/ui/input/Input';
import { Button } from '../components/ui/button/Button';
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

const FoodListingPage: React.FC = () => {
  const [foods, setFoods] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartQuantities, setCartQuantities] = useState<Record<number, number>>({});
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'past' | 'upcoming'>('all');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Determine if cart has past or upcoming event items
  const hasPastEventItems = cartItems.some(item => item.isFromPastEvent);
  const hasUpcomingEventItems = cartItems.some(item => !item.isFromPastEvent);

  useEffect(() => {
    fetchFoods();
    fetchCart();
  }, []);

  const fetchFoods = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/foods`, {
        credentials: 'include', 
      });
      const data = await response.json();
      if (data.success) {
        setFoods(data.foods);
      }
    } catch (error) {
      console.error('Error fetching foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        const items = data.cart.items || [];
        setCartItems(items);
        
        // Initialize cart quantities state object
        const quantities: Record<number, number> = {};
        items.forEach((item: CartItem) => {
          quantities[item.foodDonationId] = item.quantity;
        });
        setCartQuantities(quantities);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const handleQuantityInputChange = (foodId: number, value: string) => {
    const newQuantity = parseInt(value) || 0;
    setCartQuantities({
      ...cartQuantities,
      [foodId]: newQuantity
    });
  };

  const handleAddToCart = async (food: FoodDonation, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const quantity = cartQuantities[food.id] || 0;
    
    // Check if valid quantity
    let maxQuantity = getMaxQuantity(food);
    
    if (quantity <= 0 || quantity > maxQuantity) {
      setError(`Please enter a valid quantity between 1 and ${maxQuantity}`);
      return;
    }

    // Check if mixing past and upcoming events
    if (hasPastEventItems && !food.event_is_over) {
      setError("You can't mix items from past and upcoming events. Please complete your current order first.");
      return;
    }

    if (hasUpcomingEventItems && food.event_is_over) {
      setError("You can't mix items from past and upcoming events. Please complete your current order first.");
      return;
    }
    
    try {
      setError(null);
      const currentCartItem = cartItems.find(item => item.foodDonationId === food.id);
      
      if (quantity === 0 && currentCartItem) {
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
            quantity: quantity,
            itemTotal: Number(quantity)
          })
        });
      } else {
        // Add to cart
        const cartItem = {
          foodDonationId: food.id,
          donorId: food.donor_id,
          quantity: quantity,
          itemTotal: Number(quantity),
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

  const getCartQuantity = (foodId: number) => {
    const cartItem = cartItems.find(item => item.foodDonationId === foodId);
    return cartItem?.quantity || 0;
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
      return food.total_quantity || 0;
    }
  };

  const renderQuantityInfo = (food: FoodDonation) => {
    const quantityLabel = food.event_is_over ? "Actual" : "Predicted";
    
    if (!food.event_is_over) {
      // For upcoming events, show predicted quantity
      return `${quantityLabel}: ${food.total_quantity || 0} units`;
    }
    
    // For past events, show actual quantities based on food category
    switch (food.food_category) {
      case 'Cooked Meal':
        return `${quantityLabel}: ${food.servings} servings`;
      case 'Raw Ingredients':
        return `${quantityLabel}: ${food.weight_kg} kg`;
      case 'Packaged Items':
        return `${quantityLabel}: ${food.quantity} × ${food.package_size}`;
      default:
        return `${quantityLabel}: ${food.quantity} units`;
    }
  };

  // Filter foods based on selected event type
  const filteredFoods = foods.filter(food => {
    if (eventTypeFilter === 'all') return true;
    if (eventTypeFilter === 'past') return food.event_is_over;
    if (eventTypeFilter === 'upcoming') return !food.event_is_over;
    return true;
  });

  // Check if item can be added to cart based on current cart contents
  const canAddToCart = (food: FoodDonation) => {
    if (cartItems.length === 0) return true;
    if (food.event_is_over) return !hasUpcomingEventItems;
    return !hasPastEventItems;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Available Food Donations</h1>
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

      {/* Event type filter */}
      <div className="flex gap-4 mb-6">
        <Button 
          variant={eventTypeFilter === 'all' ? 'default' : 'outline'} 
          onClick={() => setEventTypeFilter('all')}
        >
          All Events
        </Button>
        <Button 
          variant={eventTypeFilter === 'past' ? 'default' : 'outline'} 
          onClick={() => setEventTypeFilter('past')}
        >
          Past Events
        </Button>
        <Button 
          variant={eventTypeFilter === 'upcoming' ? 'default' : 'outline'} 
          onClick={() => setEventTypeFilter('upcoming')}
        >
          Upcoming Events
        </Button>
      </div>
      
      {/* Event type disclaimer for upcoming events */}
      {eventTypeFilter === 'upcoming' && (
        <Alert className="mb-6 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700">Upcoming Event Notice</AlertTitle>
          <AlertDescription className="text-yellow-600">
            Ordering from upcoming events doesn't guarantee the exact quantities. Final amounts will be determined 
            by the donor after the event and will only be delivered once the event is over.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFoods.map((food) => {
          const isAvailable = canAddToCart(food);
          
          return (
            <Card 
              key={food.id} 
              className={`hover:shadow-lg transition-shadow cursor-pointer ${!isAvailable ? 'opacity-60' : ''}`}
              onClick={() => navigate(`/food/${food.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span className="text-xl">{food.food_type}</span>
                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded">
                      {food.food_category}
                    </span>
                    <span className={`text-sm px-2 py-1 rounded ${food.event_is_over ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                      {food.event_is_over ? 'Past Event' : 'Upcoming Event'}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              
              {food.image && (
                <img 
                  src="/api/placeholder/400/200"
                  alt={food.food_type}
                  className="w-full h-48 object-cover"
                />
              )}
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  <span>{renderQuantityInfo(food)}</span>
                </div>
                
                {!food.event_is_over && food.event_type && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Event Type: {food.event_type.replace('_', ' ')}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Expires: {new Date(food.expiration_time).toLocaleString()}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{food.pickup_location}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Schedule: {food.availability_schedule}</span>
                </div>

                {!food.event_is_over && (
                  <div className="text-xs text-amber-600 italic mt-1">
                    *Final quantities will be determined after the event
                  </div>
                )}

                <div 
                  className="flex items-center justify-between gap-2 mt-4"
                  onClick={e => e.stopPropagation()}
                >
                  <Input
                    type="number"
                    min="0"
                    max={getMaxQuantity(food)}
                    value={cartQuantities[food.id] || getCartQuantity(food.id) || ''}
                    onChange={(e) => handleQuantityInputChange(food.id, e.target.value)}
                    className="w-20"
                    placeholder="Qty"
                    disabled={!isAvailable}
                  />
                  <Button
                    onClick={(e) => handleAddToCart(food, e)}
                    className="ml-2"
                    disabled={!isAvailable}
                  >
                    {isAvailable ? 'Add to Cart' : 'Unavailable'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)}
        onCartUpdate={fetchCart}
      />
    </div>
  );
};

export default FoodListingPage;