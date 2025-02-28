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
const driverAuthMiddleware_1 = require("../middlewares/driverAuthMiddleware");
const orderService_1 = __importDefault(require("../services/orderService"));
const router = (0, express_1.Router)();
// Routes that require user authentication
router.use('/my-orders', auth_1.authMiddleware);
router.post('/', auth_1.authMiddleware);
router.get('/:id', auth_1.authMiddleware);
// Admin only routes
router.use(['/admin', '/:id/driver'], auth_1.authMiddleware);
// Driver routes - using specific driver authentication
router.use(['/driver', '/:id/status'], driverAuthMiddleware_1.driverAuthMiddleware);
const createOrderSchema = zod_1.z.object({
    cartId: zod_1.z.number().positive(),
    deliveryAddress: zod_1.z.string().min(5)
});
const assignDriverSchema = zod_1.z.object({
    driverId: zod_1.z.number().positive()
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['assigned', 'picked_up', 'in_transit', 'delivered']),
    location: zod_1.z.object({
        lat: zod_1.z.number(),
        lng: zod_1.z.number()
    }).optional()
});
// Get all orders with optional status filtering (admin only)
router.get('/admin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user || typeof user.id !== 'number' || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const status = req.query.status;
        const orders = yield orderService_1.default.getAllOrders(status);
        return res.status(200).json({ success: true, orders });
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
}));
// Get driver orders with optional status filtering
router.get('/driver', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const driver = req.driver;
        if (!driver || typeof driver.id !== 'number') {
            return res.status(401).json({ success: false, message: 'Driver not authenticated' });
        }
        const status = req.query.status;
        // Handle comma-separated status values
        if (status && status.includes(',')) {
            const statusList = status.split(',').map(s => s.trim());
            const orders = yield orderService_1.default.getOrdersByMultipleStatuses(statusList, driver.id);
            return res.status(200).json({ success: true, orders });
        }
        else {
            const orders = yield orderService_1.default.getAllOrders(status, driver.id);
            return res.status(200).json({ success: true, orders });
        }
    }
    catch (error) {
        console.error('Error fetching driver orders:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch driver orders' });
    }
}));
// General orders endpoint with status filtering (for drivers)
router.get('/', driverAuthMiddleware_1.driverAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const driver = req.driver;
        if (!driver || typeof driver.id !== 'number') {
            return res.status(401).json({ success: false, message: 'Driver not authenticated' });
        }
        const status = req.query.status;
        // Handle comma-separated status values
        if (status && status.includes(',')) {
            const statusList = status.split(',').map(s => s.trim());
            const orders = yield orderService_1.default.getOrdersByMultipleStatuses(statusList, driver.id);
            return res.status(200).json({ success: true, orders });
        }
        else {
            const orders = yield orderService_1.default.getAllOrders(status, driver.id);
            return res.status(200).json({ success: true, orders });
        }
    }
    catch (error) {
        console.error('Error fetching driver orders:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch driver orders' });
    }
}));
// Get user orders
router.get('/my-orders', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user || typeof user.id !== 'number') {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const orders = yield orderService_1.default.getUserOrders(user.id);
        return res.status(200).json({ success: true, orders });
    }
    catch (error) {
        console.error('Error fetching user orders:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch user orders' });
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
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
        const orderId = yield orderService_1.default.createOrderFromCart(validationResult.data.cartId, user.id, validationResult.data.deliveryAddress);
        return res.status(201).json({ success: true, message: 'Order created successfully', orderId });
    }
    catch (error) {
        console.error('Error creating order:', error);
        return res.status(500).json({ success: false, message: 'Failed to create order' });
    }
}));
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user || typeof user.id !== 'number' || typeof user.role !== 'string') {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const orderId = parseInt(req.params.id);
        if (isNaN(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid order ID' });
        }
        const order = yield orderService_1.default.getOrderById(orderId);
        // Check permissions - only the order owner or admin can view
        if (order.userId !== user.id && user.role !== 'admin' && user.role !== 'driver') {
            return res.status(403).json({ success: false, message: 'You do not have permission to view this order' });
        }
        // Format the response according to the client's expected interface
        const formattedOrder = {
            id: order.id,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            deliveryFee: order.deliveryFee,
            totalAmount: order.totalAmount,
            deliveryAddress: order.deliveryAddress,
            items: order.items.map(item => ({
                food_type: item.foodType,
                donor_name: item.donorName,
                quantity: item.quantity,
                pickup_location: item.pickupLocation
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
    }
    catch (error) {
        console.error('Error fetching order:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch order details' });
    }
}));
// Driver specific order view
router.get('/driver/:id', driverAuthMiddleware_1.driverAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const driver = req.driver;
        if (!driver || typeof driver.id !== 'number') {
            return res.status(401).json({ success: false, message: 'Driver not authenticated' });
        }
        const orderId = parseInt(req.params.id);
        if (isNaN(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid order ID' });
        }
        const order = yield orderService_1.default.getOrderById(orderId);
        // Check if this order is assigned to this driver
        const isAssigned = yield orderService_1.default.isOrderAssignedToDriver(orderId, driver.id);
        if (!isAssigned) {
            return res.status(403).json({ success: false, message: 'This order is not assigned to you' });
        }
        return res.status(200).json({ success: true, order });
    }
    catch (error) {
        console.error('Error fetching driver order:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch order details' });
    }
}));
router.post('/:id/driver', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
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
        yield orderService_1.default.assignDriverToOrder(orderId, validationResult.data.driverId);
        return res.status(200).json({ success: true, message: 'Driver assigned successfully' });
    }
    catch (error) {
        console.error('Error assigning driver:', error);
        return res.status(500).json({ success: false, message: 'Failed to assign driver' });
    }
}));
// Modified to make this work for drivers calling directly
router.post('/:id/status', driverAuthMiddleware_1.driverAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const driver = req.driver;
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
                yield orderService_1.default.assignDriverToOrder(orderId, driver.id);
            }
            catch (assignError) {
                console.error('Error auto-assigning driver:', assignError);
                return res.status(500).json({ success: false, message: 'Failed to accept delivery request' });
            }
            return res.status(200).json({ success: true, message: 'Order assigned successfully' });
        }
        // For other statuses, verify this driver is assigned to the order
        const isAssigned = yield orderService_1.default.isOrderAssignedToDriver(orderId, driver.id);
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
        yield orderService_1.default.updateDeliveryStatus(orderId, validationResult.data.status, validationResult.data.location);
        // If location is provided, log it to driver history
        if (validationResult.data.location) {
            yield orderService_1.default.logDriverLocationHistory(driver.id, validationResult.data.location.lat, validationResult.data.location.lng);
        }
        return res.status(200).json({ success: true, message: 'Delivery status updated successfully' });
    }
    catch (error) {
        console.error('Error updating delivery status:', error);
        return res.status(500).json({ success: false, message: 'Failed to update delivery status' });
    }
}));
exports.default = router;
