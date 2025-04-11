import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth';
import { driverAuthMiddleware, DriverPayload } from '../middlewares/driverAuthMiddleware';
import orderService from '../services/orderService';
import mapService from '../services/mapService';
import { UserPayload } from '../types/custom';
import { stat } from 'fs';

const router = Router();

// Routes that require user authentication
router.use('/my-orders', authMiddleware);
router.post('/', authMiddleware);
router.get('/:id', authMiddleware);

// Admin only routes
router.use(['/admin', '/:id/driver'], authMiddleware);

// Driver routes - using specific driver authentication
router.use(['/driver', '/:id/status'], driverAuthMiddleware);

const createOrderSchema = z.object({
  cartId: z.number().positive(),
  deliveryAddress: z.string().min(5)
});

const assignDriverSchema = z.object({
  driverId: z.number().positive()
});

const updateStatusSchema = z.object({
  status: z.enum(['assigned', 'picked_up', 'in_transit', 'delivered']),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

// Get all orders with optional status filtering (admin only)
router.get('/admin', async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user as UserPayload;
    if (!user || typeof user.id !== 'number' || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    const status = req.query.status as string | undefined;
    const orders = await orderService.getAllOrders(status);
    
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Get driver orders with optional status filtering
router.get('/driver', async (req: Request, res: Response): Promise<any> => {
  try {
    const driver = req.driver as DriverPayload;
    if (!driver || typeof driver.id !== 'number') {
      return res.status(401).json({ success: false, message: 'Driver not authenticated' });
    }
    
    const status = req.query.status as string | undefined;
    // Handle comma-separated status values
    if (status && status.includes(',')) {
      const statusList = status.split(',').map(s => s.trim());
      const orders = await orderService.getOrdersByMultipleStatuses(statusList, driver.id);
      return res.status(200).json({ success: true, orders });
    } else {
      const orders = await orderService.getAllOrders(status, driver.id);  
      return res.status(200).json({ success: true, orders });
    }
  } catch (error) {
    console.error('Error fetching driver orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch driver orders' });
  }
});

// General orders endpoint with status filtering (for drivers)
router.get('/', driverAuthMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const driver = req.driver as DriverPayload;
    if (!driver || typeof driver.id !== 'number') {
      return res.status(401).json({ success: false, message: 'Driver not authenticated' });
    }
    
    const status = req.query.status as string | undefined;
    // Handle comma-separated status values
    if (status && status.includes(',')) {
      const statusList = status.split(',').map(s => s.trim());
      const orders = await orderService.getOrdersByMultipleStatuses(statusList, driver.id);
      return res.status(200).json({ success: true, orders });
    } else {
      const orders = await orderService.getAllOrders(status, driver.id);
      return res.status(200).json({ success: true, orders });
    }
  } catch (error) {
    console.error('Error fetching driver orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch driver orders' });
  }
});

// Get user orders
router.get('/my-orders', async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user as UserPayload;
    if (!user || typeof user.id !== 'number') {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const orders = await orderService.getUserOrders(user.id);
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user orders' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user as UserPayload;
    if (!user || typeof user.id !== 'number') {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const validationResult = createOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input data', 
        errors: validationResult.error.errors 
      });
    }

    const orderId = await orderService.createOrderFromCart(
      validationResult.data.cartId,
      user.id,
      validationResult.data.deliveryAddress
    );

    return res.status(201).json({ success: true, message: 'Order created successfully', orderId });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

router.get('/:id',  async (req: Request, res: Response) : Promise<any>=> {
  try {
    const user = req.user as UserPayload;
    if (!user || typeof user.id !== 'number' || typeof user.role !== 'string') {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    
    const order = await orderService.getOrderById(orderId);
    
    // Check permissions - only the order owner or admin can view
    if (order.userId !== user.id && user.role !== 'admin' && user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this order' });
    }

    // Format the response according to the client's expected interface
    // Now including the new food donation fields
    const formattedOrder = {
      id: order.id,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      deliveryFee: order.deliveryFee,
      totalAmount: order.totalAmount,
      deliveryAddress: order.deliveryAddress,
      items: order.items.map(item => ({
        food_type: item.foodType,
        food_category: item.foodCategory, // New field
        donor_name: item.donorName,
        quantity: item.quantity,
        // Add new fields based on food category
        servings: item.servings,
        weightKg: item.weightKg,
        packageSize: item.packageSize,
        pickupLocation: item.pickupLocation,
        expirationTime: item.expirationTime
      })),
      route: order.route ? {
        path: order.route.path.map(point => ({
          lat: point.location.lat,
          lng: point.location.lng
        })),
        totalDistance: order.route.totalDistance,
        estimatedDuration: order.route.estimatedDuration
      } : undefined,
      driverLocation: order.driverLocation ? {
        lat: order.driverLocation.lat,
        lng: order.driverLocation.lng,
        timestamp: order.driverLocation.timestamp
      } : undefined,
      deliveryStatus: order.deliveryStatus,
      driver: order.driver ? {
        id: order.driver.id,
        name: order.driver.name,
        phone: order.driver.phone,
        email: order.driver.email,
        rating: order.driver.rating,
        avatar: order.driver.avatar
      } : undefined
    };
    
    return res.status(200).json({ success: true, order: formattedOrder });
  } catch (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
});
// Driver specific order view
router.get('/driver/:id', driverAuthMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const driver = req.driver as DriverPayload;
    if (!driver || typeof driver.id !== 'number') {
      return res.status(401).json({ success: false, message: 'Driver not authenticated' });
    }

    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await orderService.getOrderById(orderId);
    
    // Check if this order is assigned to this driver
    const isAssigned = await orderService.isOrderAssignedToDriver(orderId, driver.id);
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'This order is not assigned to you' });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error fetching driver order:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
});

router.post('/:id/driver', async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user as UserPayload;
    if (!user || typeof user.id !== 'number' || user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'User not authenticated or unauthorized' });
    }

    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const validationResult = assignDriverSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input data', 
        errors: validationResult.error.errors 
      });
    }

    await orderService.assignDriverToOrder(orderId, validationResult.data.driverId);
    return res.status(200).json({ success: true, message: 'Driver assigned successfully' });
  } catch (error) {
    console.error('Error assigning driver:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign driver' });
  }
});

// Modified to make this work for drivers calling directly
router.post('/:id/status', driverAuthMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const driver = req.driver as DriverPayload;
    if (!driver || typeof driver.id !== 'number') {
      return res.status(401).json({ success: false, message: 'Driver not authenticated' });
    }

    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    // If status is 'assigned', automatically assign the driver to this order
    if (req.body.status === 'assigned') {
      try {
        await orderService.assignDriverToOrder(orderId, driver.id);
      } catch (assignError) {
        console.error('Error auto-assigning driver:', assignError);
        return res.status(500).json({ success: false, message: 'Failed to accept delivery request' });
      }
      return res.status(200).json({ success: true, message: 'Order assigned successfully' });
    }

    // For other statuses, verify this driver is assigned to the order
    const isAssigned = await orderService.isOrderAssignedToDriver(orderId, driver.id);
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'This order is not assigned to you' });
    }

    const validationResult = updateStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input data', 
        errors: validationResult.error.errors 
      });
    }

    await orderService.updateDeliveryStatus(
      orderId, 
      validationResult.data.status,
      validationResult.data.location
    );
    
    // If location is provided, log it to driver history
    if (validationResult.data.location) {
      await orderService.logDriverLocationHistory(
        driver.id,
        validationResult.data.location.lat,
        validationResult.data.location.lng
      );
    }
    
    return res.status(200).json({ success: true, message: 'Delivery status updated successfully' });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update delivery status' });
  }
});

export default router;