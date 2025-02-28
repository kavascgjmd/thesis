import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card/Card";
import { Button } from "../components/ui/button/Button";
import { Clock, MapPin, Utensils, Users, Building, Phone, Plus, Minus, ShoppingCart } from 'lucide-react';
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
  operating_hours: string;
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

  useEffect(() => {
    fetchFoodDetails();
    fetchCart();
  }, [id]);

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

  const handleQuantityChange = async (change: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!food) return;
  
    const currentCartItem = cartItems.find(item => item.foodDonationId === food.id);
    const currentQuantity = currentCartItem?.quantity || 0;
    const newQuantity = currentQuantity + change;
  
    if (newQuantity < 0 || newQuantity > food.quantity) return;
  
    try {
      if (newQuantity === 0) {
        await fetch(`${API_BASE_URL}/cart/items/${food.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } else if (currentCartItem) {
        await fetch(`${API_BASE_URL}/cart/items/${food.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            quantity: newQuantity,
            itemTotal: Number(newQuantity)
          })
        });
      } else {
        const cartItem = {
          foodDonationId: food.id,
          donorId: food.donor_id,
          quantity: newQuantity,
          itemTotal: Number(newQuantity),
          foodType: food.food_type,
          donorName: food.donor_name,
          pickupLocation: food.pickup_location
        };
  
        await fetch(`${API_BASE_URL}/cart/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  const formatDateTime = (datetime: string): string => {
    return new Date(datetime).toLocaleString();
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
              <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded">
                {food.status}
              </span>
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
                  <span>Available: {food.quantity} servings</span>
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
              <button
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                onClick={(e) => handleQuantityChange(-1, e)}
                disabled={getCartQuantity(food.id) === 0}
              >
                <Minus className="w-6 h-6" />
              </button>
              <span className="w-12 text-center text-xl">
                {getCartQuantity(food.id)}
              </span>
              <button
                className="p-2 rounded-full hover:bg-gray-100"
                onClick={(e) => handleQuantityChange(1, e)}
                disabled={food.quantity <= getCartQuantity(food.id)}
              >
                <Plus className="w-6 h-6" />
              </button>
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