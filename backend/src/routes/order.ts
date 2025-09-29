import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth';
import { driverAuthMiddleware } from '../middlewares/driverAuthMiddleware';
import orderService from '../services/orderService';
import { UserPayload, DriverPayload } from '../types/custom';

const router = Router();

// Routes that require user authentication only
router.use('/my-orders', authMiddleware);
router.post('/', authMiddleware);

// Admin only routes
router.use(['/admin', '/:id/driver'], authMiddleware);

// Driver routes - using specific driver authentication
router.use(['/driver', '/:id/status'], driverAuthMiddleware);

// Separate user and driver routes for order details
router.get('/user/:id', authMiddleware, getOrderForUser);
router.get('/driver/:id', driverAuthMiddleware, getOrderForDriver);

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

const updatePaymentSchema = z.object({
  paymentStatus: z.enum(['pending', 'confirmed', 'paid', 'failed'])
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
    const paymentStatus = req.query.paymentStatus as string | undefined;
  
    
    // Handle comma-separated status values
    if (status && status.includes(',')) {
      const statusList = status.split(',').map(s => s.trim());
      const orders = await orderService.getOrdersByMultipleStatuses(statusList, driver.id, paymentStatus);
      return res.status(200).json({ success: true, orders });
    } else {
      const orders = await orderService.getAllOrders(status, driver.id, paymentStatus);
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

// Separate route handler for users
async function getOrderForUser(req: Request, res: Response): Promise<any> {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    
    const user = req.user as UserPayload;
    if (!user || typeof user.id !== 'number') {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const order = await orderService.getOrderById(orderId);
    
    // Check if user owns the order or is an admin
    if (order.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to view this order' 
      });
    }

    // Format the response according to the client's expected interface
    const formattedOrder = formatOrderResponse(order);
    
    return res.status(200).json({ success: true, order: formattedOrder });
  } catch (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
}

// Separate route handler for drivers
async function getOrderForDriver(req: Request, res: Response): Promise<any> {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    
    const driver = req.driver as DriverPayload;
    if (!driver || typeof driver.id !== 'number') {
      return res.status(401).json({ success: false, message: 'Driver not authenticated' });
    }
    
    // Check if this order is assigned to this driver
    const isAssigned = await orderService.isOrderAssignedToDriver(orderId, driver.id);
    if (!isAssigned) {
      return res.status(403).json({ 
        success: false, 
        message: 'This order is not assigned to you' 
      });
    }
    
    const order = await orderService.getOrderById(orderId);
    
    // Format the response according to the client's expected interface
    const formattedOrder = formatOrderResponse(order);
    
    return res.status(200).json({ success: true, order: formattedOrder });
  } catch (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
}

// Helper function to format order response consistently
function formatOrderResponse(order: any) {
  return {
    id: order.id,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    deliveryAddress: order.deliveryAddress,
    items: order.items.map((item: any) => ({
      food_type: item.foodType,
      food_category: item.foodCategory,
      donor_name: item.donorName,
      quantity: item.quantity,
      servings: item.servings,
      weightKg: item.weightKg,
      packageSize: item.packageSize,
      pickupLocation: item.pickupLocation,
      expirationTime: item.expirationTime
    })),
    route: order.route ? {
      path: order.route.path.map((point: any) => ({
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
}

router.post('/:id/payment', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user as UserPayload;
    if (!user || typeof user.id !== 'number') {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const validationResult = updatePaymentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input data', 
        errors: validationResult.error.errors 
      });
    }

    // Get order to verify ownership
    const order = await orderService.getOrderById(orderId);
    if (order.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this order' 
      });
    }

    // Update payment status
    await orderService.updatePaymentStatus(orderId, validationResult.data.paymentStatus);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Payment status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update payment status' });
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