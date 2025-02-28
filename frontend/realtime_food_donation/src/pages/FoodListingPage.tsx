import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card/Card";
import { Clock, MapPin, Utensils, Users, Plus, Minus, ShoppingCart } from 'lucide-react';
import CartSidebar from './CartSidebar';
const API_BASE_URL = 'http://localhost:3000/api';
interface FoodDonation {
  id: number;
  donor_id: number;
  food_type: string;
  quantity: number;
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
  itemTotal: number; // New field for decimal total
  foodType: string;
  donorName: string;
  pickupLocation: string;
}

const FoodListingPage: React.FC = () => {
  const [foods, setFoods] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
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
        setCartItems(data.cart.items || []);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };


  const handleQuantityChange = async (food: FoodDonation, change: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const currentCartItem = cartItems.find(item => item.foodDonationId === food.id);
    const currentQuantity = currentCartItem?.quantity || 0;
    const newQuantity = currentQuantity + change;
  
    if (newQuantity < 0 || newQuantity > food.quantity) return;
    
    try {
      if (newQuantity === 0) {
        await fetch(`${API_BASE_URL}/cart/items/${food.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
      } else if (currentCartItem) {
        await fetch(`${API_BASE_URL}/cart/items/${food.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ 
            quantity: newQuantity,
            itemTotal: Number(newQuantity) // Ensure it's sent as a number
          })
        });
      } else {
        const cartItem = {
          foodDonationId: food.id,
          donorId: food.donor_id,
          quantity: newQuantity,
          itemTotal: Number(newQuantity), // Initialize as number
          foodType: food.food_type,
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
                  {food.status}
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
                <span>Available: {food.quantity} servings</span>
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
                className="flex items-center justify-center gap-4 mt-4"
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                  onClick={(e) => handleQuantityChange(food, -1, e)}
                  disabled={getCartQuantity(food.id) === 0}
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-8 text-center">{getCartQuantity(food.id)}</span>
                <button
                  className="p-2 rounded-full hover:bg-gray-100"
                  onClick={(e) => handleQuantityChange(food, 1, e)}
                  disabled={food.quantity <= getCartQuantity(food.id)}
                >
                  <Plus className="w-5 h-5" />
                </button>
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
