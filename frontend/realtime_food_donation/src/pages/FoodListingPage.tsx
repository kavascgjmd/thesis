import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card/Card";
import { Clock, MapPin, Utensils, Users, ShoppingCart } from 'lucide-react';
import CartSidebar from './CartSidebar';
import { Input } from '../components/ui/input/Input';
import { Button } from '../components/ui/button/Button';

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

const FoodListingPage: React.FC = () => {
  const [foods, setFoods] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartQuantities, setCartQuantities] = useState<Record<number, number>>({});
  const navigate = useNavigate();

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
    let maxQuantity = 0;
    if (food.food_category === 'Cooked Meal') {
      maxQuantity = food.servings || 0;
    } else if (food.food_category === 'Raw Ingredients') {
      maxQuantity = Math.floor(food.weight_kg || 0);
    } else if (food.food_category === 'Packaged Items') {
      maxQuantity = food.quantity || 0;
    }
    
    if (quantity <= 0 || quantity > maxQuantity) {
      alert(`Please enter a valid quantity between 1 and ${maxQuantity}`);
      return;
    }
    
    try {
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

  const getCartQuantity = (foodId: number) => {
    const cartItem = cartItems.find(item => item.foodDonationId === foodId);
    return cartItem?.quantity || 0;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Available Food Donations</h1>
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Cart ({cartItems.length})</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {foods.map((food) => (
          <Card 
            key={food.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/food/${food.id}`)}
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span className="text-xl">{food.food_type}</span>
                <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded">
                  {food.food_category}
                </span>
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
                <span>Available: {renderQuantityInfo(food)}</span>
              </div>
              
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

              <div 
                className="flex items-center justify-between gap-2 mt-4"
                onClick={e => e.stopPropagation()}
              >
                <Input
                  type="number"
                  min="0"
                  max={
                    food.food_category === 'Cooked Meal' ? food.servings :
                    food.food_category === 'Raw Ingredients' ? Math.floor(food.weight_kg || 0) :
                    food.quantity
                  }
                  value={cartQuantities[food.id] || getCartQuantity(food.id) || ''}
                  onChange={(e) => handleQuantityInputChange(food.id, e.target.value)}
                  className="w-20"
                  placeholder="Qty"
                />
                <Button
                  onClick={(e) => handleAddToCart(food, e)}
                  className="ml-2"
                >
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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