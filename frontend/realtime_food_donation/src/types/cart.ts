export interface CartItem {
  foodDonationId: number;
  donorId: number;
  quantity: number;
  itemTotal: string; 
  status: string; 
  notes?: string;
  cartId: number; 
  }
  
  export interface Cart {
    userId: number;
    items: CartItem[];
    deliveryAddress?: string;
  }