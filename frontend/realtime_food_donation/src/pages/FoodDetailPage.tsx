import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card/Card";
import { Button } from "../components/ui/button/Button";
import { Input } from "../components/ui/input/Input";
import { Clock, MapPin, Utensils, Users, Building, Phone, ShoppingCart } from 'lucide-react';
import CartSidebar from './CartSidebar';

const API_BASE_URL = 'http://localhost:3000/api';

interface FoodDonation {
  id: number;
  donor_id: number;
  food_type: string;
  food_category: string; // New field
  servings?: number;      // For Cooked Meals
  weight_kg?: number;     // For Raw Ingredients
  quantity?: number;      // For Packaged Items
  package_size?: string;  // For Packaged Items
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
  foodCategory: string; // New field
  donorName: string;
  pickupLocation: string;
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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!food) return;
  
    // Check if valid quantity
    let maxQuantity = 0;
    if (food.food_category === 'Cooked Meal') {
      maxQuantity = food.servings || 0;
    } else if (food.food_category === 'Raw Ingredients') {
      maxQuantity = Math.floor(food.weight_kg || 0);
    } else if (food.food_category === 'Packaged Items') {
      maxQuantity = food.quantity || 0;
    }
    
    if (cartQuantity <= 0 || cartQuantity > maxQuantity) {
      alert(`Please enter a valid quantity between 1 and ${maxQuantity}`);
      return;
    }
    
    try {
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
          pickupLocation: food.pickup_location
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
    }
  };

  const formatDateTime = (datetime: string): string => {
    return new Date(datetime).toLocaleString();
  };

  const renderQuantityInfo = (food: FoodDonation) => {
    switch (food.food_category) {
      case 'Cooked Meal':
        return `${food.servings} servings`;
      case 'Raw Ingredients':
        return `${food.weight_kg} kg`;
      case 'Packaged Items':
        return `${food.quantity} × ${food.package_size}`;
      default:
        return `${food.quantity} units`;
    }
  };

  const getMaxQuantity = (food: FoodDonation) => {
    if (food.food_category === 'Cooked Meal') {
      return food.servings;
    } else if (food.food_category === 'Raw Ingredients') {
      return Math.floor(food.weight_kg || 0);
    } else {
      return food.quantity;
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

      <div className="max-w-3xl mx-auto">
        <Card className="mb-6">
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
                  <span>Available: {renderQuantityInfo(food)}</span>
                </div>
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
                />
                <Button
                  onClick={handleAddToCart}
                  className="ml-2"
                >
                  Add to Cart
                </Button>
              </div>
            </div>
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