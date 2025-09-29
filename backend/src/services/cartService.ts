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
  foodType?: string;
  foodCategory?: string;
  donorName?: string;
  pickupLocation?: string;
  isFromPastEvent: boolean; // Changed from optional to required

}

interface Cart {
  id?: number;  
  userId: number;
  items: CartItem[];
  deliveryAddress?: string;
  deliveryFee: number;
  totalAmount: number; 
  status: string;
  lastAccessed?: number;
}

class CartService {
  private readonly CART_EXPIRY = 24 * 60 * 60; // 24 hours
  private readonly CART_INACTIVE_THRESHOLD = 12 * 60 * 60; // 12 hours
  private readonly BASE_DELIVERY_FEE = 0; // Base fee for delivery
  private readonly PER_KM_RATE = 0.5; // Rate per kilometer
  private readonly ADDITIONAL_STOP_FEE = 1; // Additional fee per pickup stop

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
  
      // Fetch additional information for each food donation in the cart
      if (cart.items && cart.items.length > 0) {
        const foodDonationIds = cart.items.map((item: CartItem) => item.foodDonationId);
        
        // Query to get food donation details with donor information
        const donationsResult = await query(
          `SELECT 
            fd.id AS food_donation_id, 
            fd.food_type,
            fd.food_category,
            fd.pickup_location,
            fd.servings,
            fd.weight_kg,
            fd.package_size,
            u.username AS donor_name
          FROM food_donations fd
          JOIN donors d ON fd.donor_id = d.id
          JOIN users u ON d.user_id = u.id
          WHERE fd.id = ANY($1::int[])`,
          [foodDonationIds]
        );
        
        // Create a map for quick lookup
        const donationDetailsMap = new Map();
        donationsResult.rows.forEach(row => {
          donationDetailsMap.set(row.food_donation_id, {
            foodType: row.food_type,
            foodCategory: row.food_category,
            pickupLocation: row.pickup_location,
            servings: row.servings,
            weightKg: row.weight_kg,
            packageSize: row.package_size,
            donorName: row.donor_name
          });
        });
        
        // Enrich cart items with donation details
        cart.items = cart.items.map((item: CartItem) => {
          const details = donationDetailsMap.get(item.foodDonationId);
          if (details) {
            return {
              ...item,
              foodType: details.foodType,
              foodCategory: details.foodCategory,
              donorName: details.donorName,
              pickupLocation: details.pickupLocation,
              servings: details.servings,
              weightKg: details.weightKg,
              packageSize: details.packageSize,
              isFromPastEvent: item.isFromPastEvent !== undefined ? item.isFromPastEvent : false // Ensure this field exists
            };
          }
          return {
            ...item,
            isFromPastEvent: item.isFromPastEvent !== undefined ? item.isFromPastEvent : false // Ensure this field exists
          };
        });
      }
  
      return {
        ...cart,
        status: cart.status || 'PENDING',
        deliveryFee: cart.deliveryFee || 0,
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
        deliveryFee: 0,
        totalAmount: 0,  
        lastAccessed: Date.now()
      };

      // Get the food donation with new structure
      const foodDonation = await query(
        `SELECT 
          food_category, 
          servings, 
          weight_kg, 
          quantity, 
          status 
        FROM food_donations 
        WHERE id = $1 AND status = 'AVAILABLE'`,
        [item.foodDonationId]
      );

      if (!foodDonation.rows[0]) {
        throw new Error('Food donation not available');
      }
   

      // Check if the requested quantity exceeds available amount based on food category
      const fd = foodDonation.rows[0];
      let availableQuantity: number;

      switch (fd.food_category) {
        case 'Cooked Meal':
          availableQuantity = fd.servings || 0;
          break;
        case 'Raw Ingredients':
          availableQuantity = Math.floor(fd.weight_kg || 0);
          break;
        case 'Packaged Items':
          availableQuantity = fd.quantity || 0;
          break;
        default:
          availableQuantity = fd.quantity || 0;
      }
      if(item.isFromPastEvent === undefined || !item.isFromPastEvent){
        availableQuantity = fd.servings;
      }
      if (availableQuantity < item.quantity) {
        throw new Error('Requested quantity exceeds available amount');
      }

      const existingItemIndex = cart.items.findIndex(
        i => i.foodDonationId === item.foodDonationId
      );

      if (existingItemIndex > -1) {
        const newQuantity = cart.items[existingItemIndex].quantity + item.quantity;
        if (newQuantity > availableQuantity) {
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
          itemTotal: 0,
          foodType: item.foodType,
          foodCategory: item.foodCategory,
          donorName: item.donorName,
          pickupLocation: item.pickupLocation,
          isFromPastEvent: item.isFromPastEvent !== undefined ? item.isFromPastEvent : false // Ensure default value

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
          `SELECT 
            food_category, 
            servings, 
            weight_kg, 
            quantity, 
            status 
          FROM food_donations 
          WHERE id = $1 AND status = 'AVAILABLE'`,
          [foodDonationId]
        );

        if (!foodDonation.rows[0]) {
          throw new Error('Food donation not available');
        }

        const fd = foodDonation.rows[0];
        let availableQuantity: number;

        switch (fd.food_category) {
          case 'Cooked Meal':
            availableQuantity = fd.servings || 0;
            break;
          case 'Raw Ingredients':
            availableQuantity = Math.floor(fd.weight_kg || 0);
            break;
          case 'Packaged Items':
            availableQuantity = fd.quantity || 0;
            break;
          default:
            availableQuantity = fd.quantity || 0;
        }
        if (cart.items[itemIndex].isFromPastEvent === undefined || !cart.items[itemIndex].isFromPastEvent ) {
          availableQuantity = fd.servings || 0;
        }

        if (updates.quantity > availableQuantity) {
          throw new Error('Requested quantity exceeds available amount');
        }
      }

      cart.items[itemIndex] = { ...cart.items[itemIndex], ...updates };
      
      // Ensure isFromPastEvent exists
      if (cart.items[itemIndex].isFromPastEvent === undefined) {
        cart.items[itemIndex].isFromPastEvent = false;
      }

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

  async persistCart(userId: number, deliveryAddress: string, deliveryLatitude?: number, deliveryLongitude?: number): Promise<{
    cartId: number;
    deliveryFee: number;
    totalAmount: number;  
  }> {
    try {
      const cart = await this.getCart(userId);
      if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      await query('BEGIN');

      const foodDonationsResult = await query(
        `SELECT fd.id, fd.pickup_location, fd.food_category, fd.servings, fd.weight_kg, fd.quantity 
         FROM food_donations fd 
         WHERE fd.id = ANY($1::int[])`,
        [cart.items.map(item => item.foodDonationId)]
      );
      
      const locations = [
        deliveryAddress,
        ...foodDonationsResult.rows.map(fd => fd.pickup_location)
      ];

      // Validate all locations
      for (const location of locations) {
        try {
          await mapService.getCoordinates(location);
        } catch (error) {
          throw new Error(`Invalid location: ${location}`);
        }
      }

      // Calculate delivery route and fee using proper routing algorithm
      const startingPoint = { type: 'start', location: deliveryAddress };
      const pickupPoints = foodDonationsResult.rows.map(fd => ({
        type: 'pickup' as const,
        location: fd.pickup_location,
        id: fd.id
      }));
      
      const finalDelivery = { type: 'delivery', location: deliveryAddress };
      const points = [startingPoint, ...pickupPoints, finalDelivery];

      // Calculate optimal route using the proper algorithm from mapService
      let totalDistance = 0;
      let optimizedRoute;
      
      // If we have precise coordinates, use them, otherwise geocode the address
      const useProvidedCoordinates = deliveryLatitude !== undefined && deliveryLongitude !== undefined;
      
      // Prepare points for route calculation
      const routePoints = [];
      
      // Add delivery address as starting point
      const startCoords = useProvidedCoordinates
        ? { lat: deliveryLatitude!, lng: deliveryLongitude!, address: deliveryAddress }
        : await mapService.getCoordinates(deliveryAddress);
      
      routePoints.push({
        id: 0,
        type: 'pickup' as 'pickup',
        location: startCoords,
        description: 'Driver Starting Point'
      });
      
      // Add all food pickup locations
      for (const point of pickupPoints) {
        const coords = await mapService.getCoordinates(point.location);
        routePoints.push({
          id: point.id,
          type: 'pickup' as 'pickup',
          location: coords,
          description: `Pickup: ${point.id}`
        });
      }
      
      // Add delivery address as final destination
      routePoints.push({
        id: 999,
        type: 'delivery' as 'delivery',
        location: startCoords,
        description: 'Customer Delivery Location'
      });
      
      // Use approximateRouteCalculation to match the algorithm used in actual delivery
      const routeResult = mapService.calculateApproximateRoute(routePoints);
      totalDistance = routeResult.totalDistance;
      
      // Calculate delivery fee based on distance and number of stops
      const numberOfStops = pickupPoints.length;
      const distanceFee = Math.round(this.PER_KM_RATE * totalDistance);
      const stopsFee = numberOfStops * this.ADDITIONAL_STOP_FEE;
      const deliveryFee = this.BASE_DELIVERY_FEE + distanceFee + stopsFee;

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
          deliveryFee // totalAmount is currently the same as deliveryFee
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

      // Process each item in the cart
      for (const item of cart.items) {
        const foodDonation = await query(
          `SELECT 
            food_category, 
            servings, 
            weight_kg, 
            quantity, 
            status 
          FROM food_donations 
          WHERE id = $1 AND status = 'AVAILABLE' 
          FOR UPDATE`,
          [item.foodDonationId]
        );

        if (!foodDonation.rows[0]) {
          throw new Error(`Food donation ${item.foodDonationId} is not available`);
        }

        const fd = foodDonation.rows[0];
        let availableQuantity: number;
        let updateQuery: string;

        switch (fd.food_category) {
          case 'Cooked Meal':
            availableQuantity = fd.servings || 0;
            updateQuery = `
              UPDATE food_donations 
              SET servings = servings - $1,
                  status = CASE 
                    WHEN servings - $1 <= 0 THEN 'UNAVAILABLE' 
                    ELSE status 
                  END
              WHERE id = $2`;
            break;
          case 'Raw Ingredients':
            availableQuantity = Math.floor(fd.weight_kg || 0);
            updateQuery = `
              UPDATE food_donations 
              SET weight_kg = weight_kg - $1,
                  status = CASE 
                    WHEN weight_kg - $1 <= 0 THEN 'UNAVAILABLE' 
                    ELSE status 
                  END
              WHERE id = $2`;
            break;
          case 'Packaged Items':
          default:
            availableQuantity = fd.quantity || 0;
            updateQuery = `
              UPDATE food_donations 
              SET quantity = quantity - $1,
                  status = CASE 
                    WHEN quantity - $1 <= 0 THEN 'UNAVAILABLE' 
                    ELSE status 
                  END
              WHERE id = $2`;
        }

        if (availableQuantity < item.quantity) {
          throw new Error(`Insufficient quantity available for food donation ${item.foodDonationId}`);
        }

        await query(
          `INSERT INTO cart_items (
            cart_id, 
            food_donation_id,
            quantity,
            status,
            notes,
            is_from_past_event,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            cartId, 
            item.foodDonationId, 
            item.quantity, 
            'ACTIVE', 
            item.notes,
            item.isFromPastEvent || false // Include isFromPastEvent field in database insertion
          ]
        );

        // Update food donation with appropriate field based on category
        await query(updateQuery, [item.quantity, item.foodDonationId]);
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