import redisClient from '../redisClient';
import { query } from '../db/util';
import mapService from './mapService';
interface CartItem {
  foodDonationId: number;
  donorId: number;
  quantity: number;
  notes?: string;
  itemTotal: number; 
  status: string;
}

interface Cart {
  id?: number;  
  userId: number;
  items: CartItem[];
  deliveryAddress?: string;
  deliveryFee: number;  // Changed from string to number
  totalAmount: number; 
  status: string;
  lastAccessed?: number;
}

class CartService {
  private readonly CART_EXPIRY = 24 * 60 * 60; // 24 hours
  private readonly CART_INACTIVE_THRESHOLD = 12 * 60 * 60; // 12 hours

   private getCartKey(userId: number, cartId?: number): string {
    return cartId ? `cart:${userId}:${cartId}` : `cart:${userId}:temp`;
  }
  async cleanupOldCarts(userId: number): Promise<void> {
    try {
      const keys = await redisClient.keys(`cart:${userId}:*`);
      
      for (const key of keys) {
        if (key.endsWith(':temp')) {
          const cartData = await redisClient.get(key);
          if (cartData) {
            const cart = JSON.parse(cartData);
            // Only delete if cart is inactive for threshold period
            if (!cart.lastAccessed || 
                (Date.now() - cart.lastAccessed) / 1000 > this.CART_INACTIVE_THRESHOLD) {
              await redisClient.del(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old carts:', error);
    }
  }

  async getCart(userId: number, cartId?: number): Promise<Cart | null> {
    try {
      const cartKey = this.getCartKey(userId, cartId);
      const cartData = await redisClient.get(cartKey);
      if (!cartData) return null;

      const cart = JSON.parse(cartData);

      // Update last accessed timestamp
      cart.lastAccessed = Date.now();
      await redisClient.set(cartKey, JSON.stringify(cart), { EX: this.CART_EXPIRY });

      return {
        ...cart,
        status: cart.status || 'PENDING',
        deliveryFee: cart.deliveryFee || 0,  // Default to 0 instead of '0.00'
        totalAmount: cart.totalAmount || 0 
      };
    } catch (error) {
      console.error('Failed to get cart from Redis:', error);
      throw new Error('Failed to retrieve cart');
    }
  }
  async addToCart(userId: number, item: CartItem, cartId?: number): Promise<void> {
    try {
      // Only cleanup if creating a new cart and no existing cart is found
      const existingCart = await this.getCart(userId, cartId);
      if (!cartId && !existingCart) {
        await this.cleanupOldCarts(userId);
      }

      const cart = existingCart || {
        userId,
        items: [],
        status: 'PENDING',
        deliveryFee: 0,    // Changed from '0.00' to 0
        totalAmount: 0,  
        lastAccessed: Date.now()
      };

      // Rest of the addToCart implementation remains the same
      const foodDonation = await query(
        'SELECT quantity FROM food_donations WHERE id = $1 AND status = \'AVAILABLE\'',
        [item.foodDonationId]
      );

      if (!foodDonation.rows[0]) {
        throw new Error('Food donation not available');
      }

      if (foodDonation.rows[0].quantity < item.quantity) {
        throw new Error('Requested quantity exceeds available amount');
      }

      const existingItemIndex = cart.items.findIndex(
        i => i.foodDonationId === item.foodDonationId
      );

      if (existingItemIndex > -1) {
        const newQuantity = cart.items[existingItemIndex].quantity + item.quantity;
        if (newQuantity > foodDonation.rows[0].quantity) {
          throw new Error('Total quantity exceeds available amount');
        }
        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].itemTotal = 0;
      } else {
        cart.items.push({
          foodDonationId: item.foodDonationId,
          donorId: item.donorId,
          quantity: item.quantity,
          notes: item.notes,
          status: 'ACTIVE',
          itemTotal: 0  
        });
      }

      await redisClient.set(
        this.getCartKey(userId, cartId),
        JSON.stringify(cart),
        { EX: this.CART_EXPIRY }
      );
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      throw error;
    }
  }

  async updateCartItem(userId: number, foodDonationId: number, updates: Partial<CartItem>, cartId?: number): Promise<void> {
    try {
      const cart = await this.getCart(userId, cartId);
      if (!cart) throw new Error('Cart not found');

      const itemIndex = cart.items.findIndex(i => i.foodDonationId === foodDonationId);
      if (itemIndex === -1) throw new Error('Item not found in cart');

      // Check available quantity if updating quantity
      if (updates.quantity !== undefined) {
        const foodDonation = await query(
          'SELECT quantity FROM food_donations WHERE id = $1 AND status = \'AVAILABLE\'',
          [foodDonationId]
        );

        if (!foodDonation.rows[0]) {
          throw new Error('Food donation not available');
        }

        if (updates.quantity > foodDonation.rows[0].quantity) {
          throw new Error('Requested quantity exceeds available amount');
        }
      }

      cart.items[itemIndex] = { ...cart.items[itemIndex], ...updates };

      await redisClient.set(
        this.getCartKey(userId, cartId),
        JSON.stringify(cart),
        { EX: this.CART_EXPIRY }
      );
    } catch (error) {
      console.error('Failed to update cart item:', error);
      throw error;
    }
  }

  async removeFromCart(userId: number, foodDonationId: number, cartId?: number): Promise<void> {
    try {
      const cart = await this.getCart(userId, cartId);
      if (!cart) throw new Error('Cart not found');

      cart.items = cart.items.filter(i => i.foodDonationId !== foodDonationId);

      await redisClient.set(
        this.getCartKey(userId, cartId),
        JSON.stringify(cart),
        { EX: this.CART_EXPIRY }
      );
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      throw error;
    }
  }

  async clearCart(userId: number, cartId?: number): Promise<void> {
    try {
      await redisClient.del(this.getCartKey(userId, cartId));
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  }

  async persistCart(userId: number, deliveryAddress: string): Promise<{
    cartId: number;
    deliveryFee: number;    // Changed return type from string to number
    totalAmount: number;  
  }> {
    try {
      const cart = await this.getCart(userId);
      if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Rest of persistCart implementation remains the same
      await query('BEGIN');

      const foodDonationsResult = await query(
        `SELECT fd.id, fd.pickup_location 
         FROM food_donations fd 
         WHERE fd.id = ANY($1::int[])`,
        [cart.items.map(item => item.foodDonationId)]
      );
      const locations = [
        deliveryAddress,
        ...foodDonationsResult.rows.map(fd => fd.pickup_location)
      ];

      for (const location of locations) {
        try {
          await mapService.getCoordinates(location);
        } catch (error) {
          throw new Error(`Invalid location: ${location}`);
        }
      }
      const startingPoint = { type: 'start', location: deliveryAddress };
      const pickupPoints = foodDonationsResult.rows.map(fd => ({
        type: 'pickup' as const,
        location: fd.pickup_location,
        id: fd.id
      }));
      
      const finalDelivery = { type: 'delivery', location: deliveryAddress };
      const points = [startingPoint, ...pickupPoints, finalDelivery];

      let totalDistance = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const startCoords = await mapService.getCoordinates(points[i].location);
        const endCoords = await mapService.getCoordinates(points[i + 1].location);
        
        const distance = mapService.calculateDistance(
          startCoords.lat,
          startCoords.lng,
          endCoords.lat,
          endCoords.lng
        );
        totalDistance += distance;
      }

      const deliveryFee = Math.round(totalDistance * 2);  // Round to nearest integer

      const cartResult = await query(
        `INSERT INTO carts (
          user_id, 
          status, 
          delivery_address,
          delivery_fee,
          total_amount,
          created_at
        )
        VALUES ($1, 'pending', $2, $3, $4, NOW())
        RETURNING id`,
        [
          userId,
          deliveryAddress,
          deliveryFee,
          deliveryFee
        ]
      );

      const cartId = cartResult.rows[0].id;

      // Update Redis cart with the database ID
      cart.id = cartId;
      await redisClient.set(
        this.getCartKey(userId, cartId),
        JSON.stringify(cart),
        { EX: this.CART_EXPIRY }
      );

      // Clear the temporary cart
      await this.clearCart(userId);

      for (const item of cart.items) {
        const foodDonation = await query(
          'SELECT quantity, status FROM food_donations WHERE id = $1 AND status = \'AVAILABLE\' FOR UPDATE',
          [item.foodDonationId]
        );

        if (!foodDonation.rows[0] || foodDonation.rows[0].quantity < item.quantity) {
          throw new Error(`Insufficient quantity available for food donation ${item.foodDonationId}`);
        }

        await query(
          `INSERT INTO cart_items (
            cart_id, 
            food_donation_id,
            quantity,
            status,
            notes,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())`,
          [cartId, item.foodDonationId, item.quantity, 'ACTIVE', item.notes]
        );

        await query(
          `UPDATE food_donations 
           SET quantity = quantity - $1,
               status = CASE 
                 WHEN quantity - $1 <= 0 THEN 'UNAVAILABLE' 
                 ELSE status 
               END
           WHERE id = $2`,
          [item.quantity, item.foodDonationId]
        );
      }

      await query('COMMIT');

      return {
        cartId,
        deliveryFee,
        totalAmount: deliveryFee
      };
    } catch (error) {
      await query('ROLLBACK');
      console.error('Failed to persist cart:', error);
      throw error;
    }
  }
}

export default new CartService();