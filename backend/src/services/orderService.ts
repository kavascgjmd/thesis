import { query } from '../db/util';
import mapService from './mapService';

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface RoutePoint {
  id: number;
  type: 'pickup' | 'delivery';
  location: Location;
  description: string;
}

interface OptimalRoute {
  path: RoutePoint[];
  totalDistance: number;
  estimatedDuration: number;
  waypoints: Array<{
    location: Location;
    stopover: boolean;
  }>;
}

interface DriverLocation {
  driverId: number;
  lat: number;
  lng: number;
  timestamp: number;
}

interface DriverDetails {
  id: number;
  name: string;
  phone: string;
  email?: string;
  rating?: number;
  avatar?: string;
}

// Updated to match the new food_donations table structure
interface FoodDonationItem {
  foodDonationId: number;
  donorId: number;
  quantity: number;
  itemTotal: string;
  foodType: string;
  foodCategory: string; // New field
  servings?: number; // For Cooked Meals
  weightKg?: number; // Changed from weight_kg
  packageSize?: string; // Changed from package_size
  donorName: string;
  donorContact: {
    person: string;
    number: string;
  };
  pickupLocation: string;
  expirationTime?: Date | string; // Added missing property
}

interface OrderDetails {
  id: number;
  cartId: number;
  userId: number;
  username: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryFee: string;
  totalAmount: string;
  deliveryAddress: string;
  orderNotes?: string;
  items: FoodDonationItem[];
  route?: OptimalRoute | null;
  driverLocation?: {
    lat: number;
    lng: number;
    timestamp: number;
  } | null;
  deliveryStatus?: string;
  driver?: DriverDetails | null;
  created_at: Date;
  updated_at: Date;
}

class OrderService {
  async createOrderFromCart(cartId: number, userId: number, deliveryAddress: string): Promise<number> {
    try {
      await query('BEGIN');
      await query(
        'DELETE FROM cart_items WHERE cart_id = $1 AND created_at < (SELECT created_at FROM carts WHERE id = $1)',
        [cartId]
      );
      // Get cart details
      const cartResult = await query(
        'SELECT total_amount, delivery_fee FROM carts WHERE id = $1 FOR UPDATE',
        [cartId]
      );
  
      if (!cartResult.rows.length) {
        throw new Error('Cart not found');
      }
  
      // Verify cart hasn't been ordered already
      const cartStatusCheck = await query(
        'SELECT status FROM carts WHERE id = $1 AND status != \'ordered\'',
        [cartId]
      );
  
      if (!cartStatusCheck.rows.length) {
        throw new Error('Cart has already been processed');
      }
  
      // Use NUMERIC type for deliveryFee and totalAmount to match the new schema
      const deliveryFee = parseFloat(cartResult.rows[0].delivery_fee);
      const totalAmount = parseFloat(cartResult.rows[0].total_amount);
  
      // Create order using the new schema with NUMERIC types
      const orderResult = await query(
        `INSERT INTO orders (
          cart_id,
          user_id,
          order_status,
          payment_status,
          payment_method,
          delivery_fee,
          total_amount,
          delivery_address,
          created_at,
          updated_at
        )
        VALUES ($1, $2, 'pending', 'pending', 'free', $3, $4, $5, NOW(), NOW())
        RETURNING id`,
        [
          cartId,
          userId,
          deliveryFee, // Now passing as NUMERIC
          totalAmount, // Now passing as NUMERIC
          deliveryAddress
        ]
      );
  
      const orderId = orderResult.rows[0].id;
  
      // Calculate and save the route
      await mapService.calculateOptimalRoute(orderId);
  
      // Update cart status
      await query(
        'UPDATE carts SET status = $1, updated_at = NOW() WHERE id = $2',
        ['ordered', cartId]
      );
  
      await query('COMMIT');
      return orderId;
    } catch (error) {
      await query('ROLLBACK');
      console.error('Failed to create order:', error);
      throw error;
    }
  }
  async updatePaymentStatus(orderId: number, paymentStatus: string): Promise<void> {
    try {
      // Validate the payment status
      const validStatuses = ['pending', 'confirmed', 'paid', 'failed'];
      if (!validStatuses.includes(paymentStatus)) {
        throw new Error('Invalid payment status');
      }
      
      // Update the payment status in the orders table
      await query(
        `UPDATE orders 
         SET payment_status = $1, 
             updated_at = NOW()
         WHERE id = $2`,
        [paymentStatus, orderId]
      );
      
  
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }
  }
  private async getDeliveryPoints(cartId: number, deliveryAddress: string): Promise<Array<{address: string, type: string}>> {
    const points = [];
    
    // Start with customer's delivery address
    points.push({
      address: deliveryAddress,
      type: 'delivery'
    });
  
    // Get pickup points from cart items
    const pickupPoints = await query(
      `SELECT DISTINCT fd.pickup_location
       FROM cart_items ci
       JOIN food_donations fd ON ci.food_donation_id = fd.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );
  
    // Add all pickup points
    pickupPoints.rows.forEach(point => {
      points.push({
        address: point.pickup_location,
        type: 'pickup'
      });
    });
  
    // End with return to customer's delivery address
    points.push({
      address: deliveryAddress,
      type: 'delivery'
    });
  
    return points;
  }
  
  private async calculateEstimatedDeliveryFee(points: Array<{address: string, type: string}>): Promise<string> {
    try {
      // Get coordinates for all points
      const coordinates = await Promise.all(
        points.map(point => mapService.getCoordinates(point.address))
      );
  
      // Calculate total distance going through all points in sequence
      let totalDistance = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        const distance = mapService.calculateDistance(
          coordinates[i].lat,
          coordinates[i].lng,
          coordinates[i + 1].lat,
          coordinates[i + 1].lng
        );
        totalDistance += distance;
      }
  
      // Estimate fee ($2 per km)
      return (totalDistance * 2).toFixed(2);
    } catch (error) {
      console.error('Error calculating estimated fee:', error);
      return '0.00'; // Default if estimation fails
    }
  }

  async getOrderById(orderId: number): Promise<OrderDetails> {
    try {
      // Updated to match the new schema
      const orderResult = await query(
        `SELECT 
          o.id, o.cart_id, o.user_id, o.order_status, o.payment_status,
          o.payment_method, o.delivery_fee, o.total_amount,
          o.delivery_address, o.order_notes, o.created_at, o.updated_at,
          d.id as delivery_id, d.driver_id, d.delivery_status,
          u.username as user_username
         FROM orders o
         LEFT JOIN deliveries d ON d.request_id = o.id
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = $1`,
        [orderId]
      );
      
      if (!orderResult.rows.length) {
        throw new Error('Order not found');
      }
      
      const order = orderResult.rows[0];
      
      // Updated query to include new food_donations fields
      const itemsResult = await query(
        `SELECT 
          ci.food_donation_id, 
          ci.donor_id, 
          ci.quantity, 
          ci.item_total,
          fd.food_type, 
          fd.food_category,
          fd.servings,
          fd.weight_kg,
          fd.package_size,
          d.organization_name as donor_name,
          d.contact_person,
          d.contact_number,
          fd.pickup_location
         FROM cart_items ci
         JOIN food_donations fd ON ci.food_donation_id = fd.id
         JOIN donors d ON fd.donor_id = d.id
         WHERE ci.cart_id = $1`,
        [order.cart_id]
      );
      
      // Get route with proper type handling
      let route: OptimalRoute | null = null;
      try {
        route = await mapService.getDeliveryRoute(orderId);
      } catch (routeError) {
        console.error('Error getting route:', routeError);
      }
      
      // Get driver location with proper type handling
      let driverLocation: DriverLocation | null = null;
      let driverDetails: DriverDetails | null = null;
      
      if (order.driver_id) {
        try {
          // Get driver details directly from the drivers table
          const driverInfo = await query(
            `SELECT 
              id, 
              username as name, 
              phone,
              email,
              rating,
              profile_picture as avatar
             FROM drivers
             WHERE id = $1`,
            [order.driver_id]
          );
          
          if (driverInfo.rows.length > 0) {
            const driver = driverInfo.rows[0];
            driverDetails = {
              id: driver.id,
              name: driver.name,
              phone: driver.phone,
              email: driver.email,
              rating: parseFloat(driver.rating) || undefined,
              avatar: driver.avatar
            };
          }
          
          // Get driver location
          const baseLocation = await mapService.getDriverLocation(order.driver_id);
          if (baseLocation) {
            driverLocation = baseLocation;
          }
        } catch (driverError) {
          console.error('Error getting driver information:', driverError);
        }
      }
      
      // Map food donations with the new fields
      const mappedItems = itemsResult.rows.map(item => {
        const baseItem = {
          foodDonationId: item.food_donation_id,
          donorId: item.donor_id,
          quantity: item.quantity,
          itemTotal: item.item_total,
          foodType: item.food_type,
          foodCategory: item.food_category, // New field
          donorName: item.donor_name,
          donorContact: {
            person: item.contact_person,
            number: item.contact_number
          },
          pickupLocation: item.pickup_location
        };

        // Add category-specific fields based on food_category
        if (item.food_category === 'Cooked Meal' && item.servings) {
          return {
            ...baseItem,
            servings: item.servings
          };
        } else if (item.food_category === 'Raw Ingredients' && item.weight_kg) {
          return {
            ...baseItem,
            weight_kg: parseFloat(item.weight_kg)
          };
        } else if (item.food_category === 'Packaged Items' && item.package_size) {
          return {
            ...baseItem,
            package_size: item.package_size
          };
        }
        
        return baseItem;
      });
      
      return {
        id: order.id,
        cartId: order.cart_id,
        userId: order.user_id,
        username: order.user_username,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        deliveryFee: order.delivery_fee,
        totalAmount: order.total_amount,
        deliveryAddress: order.delivery_address,
        orderNotes: order.order_notes,
        items: mappedItems,
        route,
        driverLocation,
        deliveryStatus: order.delivery_status,
        driver: driverDetails,
        created_at: order.created_at,
        updated_at: order.updated_at
      };
    } catch (error) {
      console.error('Failed to get order details:', error);
      throw error;
    }
  }

  async assignDriverToOrder(orderId: number, driverId: number): Promise<void> {
    try {
      // Check if driver exists in the drivers table
      const driverResult = await query(
        'SELECT id FROM drivers WHERE id = $1',
        [driverId]
      );
      
      if (!driverResult.rows.length) {
        throw new Error('Driver not found');
      }
      
      // Check if order exists
      const orderResult = await query(
        'SELECT id FROM orders WHERE id = $1',
        [orderId]
      );
      
      if (!orderResult.rows.length) {
        throw new Error('Order not found');
      }
      
      // Check if a delivery entry already exists for this order
      const deliveryResult = await query(
        'SELECT id FROM deliveries WHERE request_id = $1',
        [orderId]
      );
      if (deliveryResult.rows.length) {
        // Update existing delivery
        await query(
          `UPDATE deliveries 
           SET driver_id = $1, 
               delivery_status = 'assigned',
               updated_at = NOW()
           WHERE request_id = $2`,
          [driverId, orderId]
        );
      } else {
        // Create new delivery
        await query(
          `INSERT INTO deliveries (
            request_id,
            driver_id,
            delivery_status,
            created_at
          )
          VALUES ($1, $2, 'assigned', NOW())`,
          [orderId, driverId]
        );
      }
      
      // Update order status
      await query(
        `UPDATE orders 
         SET order_status = 'in_progress', 
             updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );
    
    } catch (error) {
      console.error('Failed to assign driver to order:', error);
      throw error;
    }
  }

  async updateDeliveryStatus(orderId: number, status: string, location?: { lat: number, lng: number }): Promise<void> {
    try {
      const validStatuses = ['assigned', 'picked_up', 'in_transit', 'delivered'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid delivery status');
      }
      
      // Get delivery and driver info
      const deliveryResult = await query(
        'SELECT id, driver_id FROM deliveries WHERE request_id = $1',
        [orderId]
      );
      
      if (!deliveryResult.rows.length) {
        throw new Error('Delivery not found for this order');
      }
      
      const delivery = deliveryResult.rows[0];
      
      // Update delivery status with the appropriate timestamps based on the new schema
      let updateQuery = `
        UPDATE deliveries 
        SET delivery_status = $1,
      `;
      
      if (status === 'picked_up') {
        updateQuery += 'pickup_time = NOW(),';
      } else if (status === 'delivered') {
        updateQuery += 'delivery_time = NOW(),';
      }
      
      updateQuery += `
        updated_at = NOW()
        WHERE id = $2
      `;
      
      await query(updateQuery, [status, delivery.id]);
      
      // Update order status if delivery is complete
      if (status === 'delivered') {
        await query(
          `UPDATE orders 
           SET order_status = 'completed',
               updated_at = NOW()
           WHERE id = $1`,
          [orderId]
        );
      }
      
      // Update driver location if provided
      if (location && delivery.driver_id) {
        await mapService.updateDriverLocation(delivery.driver_id, location.lat, location.lng);
      }
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      throw error;
    }
  }

  async getAllOrders(status?: string, driverId?: number, paymentStatus?: string): Promise<any[]> {
    try {
      let sqlQuery = `
      SELECT 
        o.id, o.cart_id, o.user_id, o.order_status, o.payment_status,
        o.payment_method, o.delivery_fee, o.total_amount,
        o.delivery_address, o.created_at, o.order_notes,
        d.id as delivery_id, d.driver_id, d.delivery_status,
        u.username as username,
        dr.username as driver_username,
        COUNT(ci.id) as item_count
      FROM orders o
      LEFT JOIN deliveries d ON d.request_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN drivers dr ON d.driver_id = dr.id
      LEFT JOIN carts c ON o.cart_id = c.id
      LEFT JOIN cart_items ci ON ci.cart_id = c.id
      WHERE 1=1
    `;
      
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        sqlQuery += ` AND o.order_status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
    
      if (paymentStatus) {
        sqlQuery += ` AND o.payment_status = $${paramIndex}`;
        params.push(paymentStatus);
        paramIndex++;
      }
    
      if (driverId && status !== 'pending') {
        sqlQuery += ` AND d.driver_id = $${paramIndex}`;
        params.push(driverId);
        paramIndex++;
      }
      
      sqlQuery += `
        GROUP BY o.id, o.cart_id, o.user_id, o.order_status, o.payment_status,
          o.payment_method, o.delivery_fee, o.total_amount, o.delivery_address, 
          o.created_at, o.order_notes, d.id, d.driver_id, d.delivery_status, u.username, dr.username
        ORDER BY o.created_at DESC
      `;
      
      const result = await query(sqlQuery, params);
      return result.rows;
    } catch (error) {
      console.error('Failed to get all orders:', error);
      throw error;
    }
  }
  
  async getOrdersByMultipleStatuses(statusList: string[], driverId?: number, paymentStatus?: string): Promise<any[]> {
    try {
      // Build the query with proper parameterization for the status list
      let sqlQuery = `
        SELECT 
          o.id, o.cart_id, o.user_id, o.order_status, o.payment_status,
          o.payment_method, o.delivery_fee, o.total_amount,
          o.delivery_address, o.created_at, o.order_notes,
          d.id as delivery_id, d.driver_id, d.delivery_status,
          u.username as username,
          dr.username as driver_username,
          COUNT(ci.id) as item_count
        FROM orders o
        JOIN deliveries d ON d.request_id = o.id
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN drivers dr ON d.driver_id = dr.id
        LEFT JOIN carts c ON o.cart_id = c.id
        LEFT JOIN cart_items ci ON ci.cart_id = c.id
        WHERE d.delivery_status = ANY($1)
      `;
        
      const params: any[] = [statusList];
      let paramIndex = 2;
        
      if (paymentStatus) {
        sqlQuery += ` AND o.payment_status = $${paramIndex}`;
        params.push(paymentStatus);
        paramIndex++;
      }
  
      if (driverId) {
        sqlQuery += ` AND d.driver_id = $${paramIndex}`;
        params.push(driverId);
        paramIndex++;
      }
        
      sqlQuery += `
        GROUP BY o.id, o.cart_id, o.user_id, o.order_status, o.payment_status,
          o.payment_method, o.delivery_fee, o.total_amount, o.delivery_address, 
          o.created_at, o.order_notes, d.id, d.driver_id, d.delivery_status, u.username, dr.username
        ORDER BY o.created_at DESC
      `;
        
      const result = await query(sqlQuery, params);
      return result.rows;
    } catch (error) {
      console.error('Failed to get orders by multiple statuses:', error);
      throw error;
    }
  }
  
  async getUserOrders(userId: number): Promise<any[]> {
    try {
      const result = await query(
        `SELECT 
          o.id, o.order_status, o.payment_status, o.payment_method,
          o.delivery_fee, o.total_amount, o.delivery_address, o.created_at,
          d.delivery_status,
          COUNT(ci.id) as item_count
         FROM orders o
         LEFT JOIN deliveries d ON d.request_id = o.id
         LEFT JOIN carts c ON o.cart_id = c.id
         LEFT JOIN cart_items ci ON ci.cart_id = c.id
         WHERE o.user_id = $1
         GROUP BY o.id, d.delivery_status
         ORDER BY o.created_at DESC`,
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Failed to get user orders:', error);
      throw error;
    }
  }

  async isOrderAssignedToDriver(orderId: number, driverId: number): Promise<boolean> {
    try {
      const result = await query(
        'SELECT id FROM deliveries WHERE request_id = $1 AND driver_id = $2',
        [orderId, driverId]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Failed to check driver assignment:', error);
      throw error;
    }
  }
  
  // Example of extending the OrderService with additional driver-specific methods:
  async getDriverCurrentLocation(driverId: number): Promise<{ lat: number, lng: number } | null> {
    try {
      return await mapService.getDriverLocation(driverId);
    } catch (error) {
      console.error('Failed to get driver location:', error);
      throw error;
    }
  }
  
  async getDriverCompletedOrders(driverId: number): Promise<any[]> {
    try {
      const result = await query(
        `SELECT 
          o.id, o.order_status, o.created_at,
          d.delivery_status, d.pickup_time, d.delivery_time,
          o.delivery_address
         FROM deliveries d
         JOIN orders o ON d.request_id = o.id
         WHERE d.driver_id = $1 AND d.delivery_status = 'delivered'
         ORDER BY d.delivery_time DESC`,
        [driverId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Failed to get driver completed orders:', error);
      throw error;
    }
  }
  
  async getDriverPendingOrders(driverId: number): Promise<any[]> {
    try {
      const result = await query(
        `SELECT 
          o.id, o.order_status, o.created_at,
          d.delivery_status, d.pickup_time,
          o.delivery_address
         FROM deliveries d
         JOIN orders o ON d.request_id = o.id
         WHERE d.driver_id = $1 AND d.delivery_status != 'delivered'
         ORDER BY o.created_at ASC`,
        [driverId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Failed to get driver pending orders:', error);
      throw error;
    }
  }
  
  // Method to log driver's location history for tracking purposes
  async logDriverLocationHistory(driverId: number, lat: number, lng: number): Promise<void> {
    try {
      await query(
        `INSERT INTO driver_location_history (
          driver_id, 
          latitude, 
          longitude, 
          timestamp
        ) VALUES ($1, $2, $3, NOW())`,
        [driverId, lat, lng]
      );
    } catch (error) {
      console.error('Failed to log driver location history:', error);
      throw error;
    }
  }
  
  // Method to get driver performance metrics
  async getDriverPerformanceMetrics(driverId: number): Promise<any> {
    try {
      // Get total delivered orders
      const deliveredResult = await query(
        `SELECT COUNT(*) as total_delivered
         FROM deliveries
         WHERE driver_id = $1 AND delivery_status = 'delivered'`,
        [driverId]
      );
      
      // Get average delivery time
      const avgTimeResult = await query(
        `SELECT AVG(
          EXTRACT(EPOCH FROM (delivery_time - pickup_time)) / 60
         ) as avg_delivery_time_minutes
         FROM deliveries
         WHERE driver_id = $1 
         AND delivery_status = 'delivered'
         AND pickup_time IS NOT NULL
         AND delivery_time IS NOT NULL`,
        [driverId]
      );
      
      // Get total distance traveled
      const distanceResult = await query(
        `SELECT SUM(distance) as total_distance
         FROM driver_trips
         WHERE driver_id = $1`,
        [driverId]
      );
      
      return {
        totalDelivered: parseInt(deliveredResult.rows[0]?.total_delivered || '0'),
        avgDeliveryTimeMinutes: parseFloat(avgTimeResult.rows[0]?.avg_delivery_time_minutes || '0'),
        totalDistanceKm: parseFloat(distanceResult.rows[0]?.total_distance || '0')
      };
    } catch (error) {
      console.error('Failed to get driver performance metrics:', error);
      throw error;
    }
  }
}

export default new OrderService();