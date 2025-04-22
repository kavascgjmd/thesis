"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middlewares/auth");
const cartService_1 = __importDefault(require("../services/cartService"));
const orderService_1 = __importDefault(require("../services/orderService"));
const router = (0, express_1.Router)();
const cartItemSchema = zod_1.z.object({
    foodDonationId: zod_1.z.number().positive(),
    donorId: zod_1.z.number().positive(),
    quantity: zod_1.z.number().positive(),
    notes: zod_1.z.string().optional(),
    itemTotal: zod_1.z.number(), // itemTotal is required now
    status: zod_1.z.string().default('ACTIVE'), // status field included
    isFromPastEvent: zod_1.z.boolean().optional() // Added isFromPastEvent flag
});
const deliveryAddressSchema = zod_1.z.object({
    deliveryAddress: zod_1.z.string().min(5)
});
router.use(auth_1.authMiddleware);
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const cart = yield cartService_1.default.getCart(req.user.id);
        return res.status(200).json({ success: true, cart: cart || { items: [] } });
    }
    catch (error) {
        console.error('Error fetching cart:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch cart' });
    }
}));
router.post('/items', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const validationResult = cartItemSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({ success: false, message: 'Invalid input data', errors: validationResult.error.errors });
        }
        yield cartService_1.default.addToCart(req.user.id, validationResult.data);
        return res.status(200).json({ success: true, message: 'Item added to cart successfully' });
    }
    catch (error) {
        console.error('Error adding item to cart:', error);
        return res.status(500).json({ success: false, message: 'Failed to add item to cart' });
    }
}));
router.put('/items/:foodDonationId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const foodDonationId = parseInt(req.params.foodDonationId);
        const validationResult = cartItemSchema.partial().safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({ success: false, message: 'Invalid input data', errors: validationResult.error.errors });
        }
        yield cartService_1.default.updateCartItem(req.user.id, foodDonationId, validationResult.data);
        return res.status(200).json({ success: true, message: 'Cart item updated successfully' });
    }
    catch (error) {
        console.error('Error updating cart item:', error);
        return res.status(500).json({ success: false, message: 'Failed to update cart item' });
    }
}));
router.delete('/items/:foodDonationId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        yield cartService_1.default.removeFromCart(req.user.id, parseInt(req.params.foodDonationId));
        return res.status(200).json({ success: true, message: 'Item removed from cart successfully' });
    }
    catch (error) {
        console.error('Error removing item from cart:', error);
        return res.status(500).json({ success: false, message: 'Failed to remove item from cart' });
    }
}));
router.delete('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        yield cartService_1.default.clearCart(req.user.id);
        return res.status(200).json({ success: true, message: 'Cart cleared successfully' });
    }
    catch (error) {
        console.error('Error clearing cart:', error);
        return res.status(500).json({ success: false, message: 'Failed to clear cart' });
    }
}));
router.post('/checkout', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
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
        const cart = yield cartService_1.default.persistCart(req.user.id, validationResult.data.deliveryAddress);
        // 2. Create order with proper fee calculation
        const orderId = yield orderService_1.default.createOrderFromCart(cart.cartId, req.user.id, validationResult.data.deliveryAddress);
        return res.status(200).json({
            success: true,
            message: 'Cart checked out successfully',
            cartId: cart.cartId,
            orderId
        });
    }
    catch (error) {
        console.error('Error checking out cart:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to checkout cart'
        });
    }
}));
exports.default = router;
