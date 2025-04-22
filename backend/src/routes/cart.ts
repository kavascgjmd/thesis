import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth';
import cartService from '../services/cartService';
import orderService from '../services/orderService';
import { UserPayload } from '../types/custom';

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

const router = Router();

const cartItemSchema = z.object({
  foodDonationId: z.number().positive(),
  donorId: z.number().positive(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
  itemTotal: z.number(), // itemTotal is required now
  status: z.string().default('ACTIVE'), // status field included

  foodType: z.string().optional(),
  foodCategory: z.string().optional(),
  donorName: z.string().optional(),
  pickupLocation: z.string().optional(),
  isFromPastEvent: z.boolean().default(false) // Default value added
});

const deliveryAddressSchema = z.object({
  deliveryAddress: z.string().min(5),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional()
});

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const cart = await cartService.getCart(req.user.id);
    return res.status(200).json({ 
      success: true, 
      cart: cart || { 
        items: [], 
        userId: req.user.id, 
        deliveryFee: 0, 
        totalAmount: 0, 
        status: 'PENDING' 
      } 
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
});

router.post('/items', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const validationResult = cartItemSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, message: 'Invalid input data', errors: validationResult.error.errors });
    }
    
    // Make sure isFromPastEvent is included with default value if not provided
    const itemData = {
      ...validationResult.data,
      isFromPastEvent: validationResult.data.isFromPastEvent !== undefined ? validationResult.data.isFromPastEvent : false
    };
    
    await cartService.addToCart(req.user.id, itemData);
    return res.status(200).json({ success: true, message: 'Item added to cart successfully' });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return res.status(500).json({ success: false, message: 'Failed to add item to cart' });
  }
});

router.put('/items/:foodDonationId', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const foodDonationId = parseInt(req.params.foodDonationId);
    const validationResult = cartItemSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, message: 'Invalid input data', errors: validationResult.error.errors });
    }

    await cartService.updateCartItem(req.user.id, foodDonationId, validationResult.data);
    return res.status(200).json({ success: true, message: 'Cart item updated successfully' });
  } catch (error) {
    console.error('Error updating cart item:', error);
    return res.status(500).json({ success: false, message: 'Failed to update cart item' });
  }
});

router.delete('/items/:foodDonationId', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    await cartService.removeFromCart(req.user.id, parseInt(req.params.foodDonationId));
    return res.status(200).json({ success: true, message: 'Item removed from cart successfully' });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove item from cart' });
  }
});

router.delete('/', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    await cartService.clearCart(req.user.id);
    return res.status(200).json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
});

router.post('/checkout', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const validationResult = deliveryAddressSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid delivery address', 
        errors: validationResult.error.errors 
      });
    }

    // 1. First persist the cart to get cartId
    const cart = await cartService.persistCart(
      req.user.id, 
      validationResult.data.deliveryAddress,
      validationResult.data.deliveryLatitude,
      validationResult.data.deliveryLongitude
    );
    
    // 2. Create order with proper fee calculation
    const orderId = await orderService.createOrderFromCart(
      cart.cartId,
      req.user.id,
      validationResult.data.deliveryAddress
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Cart checkout successfully', 
      cartId: cart.cartId,
      orderId 
    });
  } catch (error) {
    console.error('Error checking out cart:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to checkout cart' 
    });
  }
});
export default router;