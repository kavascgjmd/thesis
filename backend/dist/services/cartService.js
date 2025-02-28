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
const redisClient_1 = __importDefault(require("../redisClient"));
const util_1 = require("../db/util");
const mapService_1 = __importDefault(require("./mapService"));
class CartService {
    constructor() {
        this.CART_EXPIRY = 24 * 60 * 60; // 24 hours
        this.CART_INACTIVE_THRESHOLD = 12 * 60 * 60; // 12 hours
    }
    getCartKey(userId, cartId) {
        return cartId ? `cart:${userId}:${cartId}` : `cart:${userId}:temp`;
    }
    cleanupOldCarts(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const keys = yield redisClient_1.default.keys(`cart:${userId}:*`);
                for (const key of keys) {
                    if (key.endsWith(':temp')) {
                        const cartData = yield redisClient_1.default.get(key);
                        if (cartData) {
                            const cart = JSON.parse(cartData);
                            // Only delete if cart is inactive for threshold period
                            if (!cart.lastAccessed ||
                                (Date.now() - cart.lastAccessed) / 1000 > this.CART_INACTIVE_THRESHOLD) {
                                yield redisClient_1.default.del(key);
                            }
                        }
                    }
                }
            }
            catch (error) {
                console.error('Failed to cleanup old carts:', error);
            }
        });
    }
    getCart(userId, cartId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cartKey = this.getCartKey(userId, cartId);
                const cartData = yield redisClient_1.default.get(cartKey);
                if (!cartData)
                    return null;
                const cart = JSON.parse(cartData);
                // Update last accessed timestamp
                cart.lastAccessed = Date.now();
                yield redisClient_1.default.set(cartKey, JSON.stringify(cart), { EX: this.CART_EXPIRY });
                return Object.assign(Object.assign({}, cart), { status: cart.status || 'PENDING', deliveryFee: cart.deliveryFee || 0, totalAmount: cart.totalAmount || 0 });
            }
            catch (error) {
                console.error('Failed to get cart from Redis:', error);
                throw new Error('Failed to retrieve cart');
            }
        });
    }
    addToCart(userId, item, cartId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Only cleanup if creating a new cart and no existing cart is found
                const existingCart = yield this.getCart(userId, cartId);
                if (!cartId && !existingCart) {
                    yield this.cleanupOldCarts(userId);
                }
                const cart = existingCart || {
                    userId,
                    items: [],
                    status: 'PENDING',
                    deliveryFee: 0, // Changed from '0.00' to 0
                    totalAmount: 0,
                    lastAccessed: Date.now()
                };
                // Rest of the addToCart implementation remains the same
                const foodDonation = yield (0, util_1.query)('SELECT quantity FROM food_donations WHERE id = $1 AND status = \'AVAILABLE\'', [item.foodDonationId]);
                if (!foodDonation.rows[0]) {
                    throw new Error('Food donation not available');
                }
                if (foodDonation.rows[0].quantity < item.quantity) {
                    throw new Error('Requested quantity exceeds available amount');
                }
                const existingItemIndex = cart.items.findIndex(i => i.foodDonationId === item.foodDonationId);
                if (existingItemIndex > -1) {
                    const newQuantity = cart.items[existingItemIndex].quantity + item.quantity;
                    if (newQuantity > foodDonation.rows[0].quantity) {
                        throw new Error('Total quantity exceeds available amount');
                    }
                    cart.items[existingItemIndex].quantity = newQuantity;
                    cart.items[existingItemIndex].itemTotal = 0;
                }
                else {
                    cart.items.push({
                        foodDonationId: item.foodDonationId,
                        donorId: item.donorId,
                        quantity: item.quantity,
                        notes: item.notes,
                        status: 'ACTIVE',
                        itemTotal: 0
                    });
                }
                yield redisClient_1.default.set(this.getCartKey(userId, cartId), JSON.stringify(cart), { EX: this.CART_EXPIRY });
            }
            catch (error) {
                console.error('Failed to add item to cart:', error);
                throw error;
            }
        });
    }
    updateCartItem(userId, foodDonationId, updates, cartId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cart = yield this.getCart(userId, cartId);
                if (!cart)
                    throw new Error('Cart not found');
                const itemIndex = cart.items.findIndex(i => i.foodDonationId === foodDonationId);
                if (itemIndex === -1)
                    throw new Error('Item not found in cart');
                // Check available quantity if updating quantity
                if (updates.quantity !== undefined) {
                    const foodDonation = yield (0, util_1.query)('SELECT quantity FROM food_donations WHERE id = $1 AND status = \'AVAILABLE\'', [foodDonationId]);
                    if (!foodDonation.rows[0]) {
                        throw new Error('Food donation not available');
                    }
                    if (updates.quantity > foodDonation.rows[0].quantity) {
                        throw new Error('Requested quantity exceeds available amount');
                    }
                }
                cart.items[itemIndex] = Object.assign(Object.assign({}, cart.items[itemIndex]), updates);
                yield redisClient_1.default.set(this.getCartKey(userId, cartId), JSON.stringify(cart), { EX: this.CART_EXPIRY });
            }
            catch (error) {
                console.error('Failed to update cart item:', error);
                throw error;
            }
        });
    }
    removeFromCart(userId, foodDonationId, cartId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cart = yield this.getCart(userId, cartId);
                if (!cart)
                    throw new Error('Cart not found');
                cart.items = cart.items.filter(i => i.foodDonationId !== foodDonationId);
                yield redisClient_1.default.set(this.getCartKey(userId, cartId), JSON.stringify(cart), { EX: this.CART_EXPIRY });
            }
            catch (error) {
                console.error('Failed to remove item from cart:', error);
                throw error;
            }
        });
    }
    clearCart(userId, cartId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield redisClient_1.default.del(this.getCartKey(userId, cartId));
            }
            catch (error) {
                console.error('Failed to clear cart:', error);
                throw error;
            }
        });
    }
    persistCart(userId, deliveryAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cart = yield this.getCart(userId);
                if (!cart || cart.items.length === 0) {
                    throw new Error('Cart is empty');
                }
                // Rest of persistCart implementation remains the same
                yield (0, util_1.query)('BEGIN');
                const foodDonationsResult = yield (0, util_1.query)(`SELECT fd.id, fd.pickup_location 
         FROM food_donations fd 
         WHERE fd.id = ANY($1::int[])`, [cart.items.map(item => item.foodDonationId)]);
                const locations = [
                    deliveryAddress,
                    ...foodDonationsResult.rows.map(fd => fd.pickup_location)
                ];
                for (const location of locations) {
                    try {
                        yield mapService_1.default.getCoordinates(location);
                    }
                    catch (error) {
                        throw new Error(`Invalid location: ${location}`);
                    }
                }
                const startingPoint = { type: 'start', location: deliveryAddress };
                const pickupPoints = foodDonationsResult.rows.map(fd => ({
                    type: 'pickup',
                    location: fd.pickup_location,
                    id: fd.id
                }));
                const finalDelivery = { type: 'delivery', location: deliveryAddress };
                const points = [startingPoint, ...pickupPoints, finalDelivery];
                let totalDistance = 0;
                for (let i = 0; i < points.length - 1; i++) {
                    const startCoords = yield mapService_1.default.getCoordinates(points[i].location);
                    const endCoords = yield mapService_1.default.getCoordinates(points[i + 1].location);
                    const distance = mapService_1.default.calculateDistance(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng);
                    totalDistance += distance;
                }
                const deliveryFee = Math.round(totalDistance * 2); // Round to nearest integer
                const cartResult = yield (0, util_1.query)(`INSERT INTO carts (
          user_id, 
          status, 
          delivery_address,
          delivery_fee,
          total_amount,
          created_at
        )
        VALUES ($1, 'pending', $2, $3, $4, NOW())
        RETURNING id`, [
                    userId,
                    deliveryAddress,
                    deliveryFee,
                    deliveryFee
                ]);
                const cartId = cartResult.rows[0].id;
                // Update Redis cart with the database ID
                cart.id = cartId;
                yield redisClient_1.default.set(this.getCartKey(userId, cartId), JSON.stringify(cart), { EX: this.CART_EXPIRY });
                // Clear the temporary cart
                yield this.clearCart(userId);
                for (const item of cart.items) {
                    const foodDonation = yield (0, util_1.query)('SELECT quantity, status FROM food_donations WHERE id = $1 AND status = \'AVAILABLE\' FOR UPDATE', [item.foodDonationId]);
                    if (!foodDonation.rows[0] || foodDonation.rows[0].quantity < item.quantity) {
                        throw new Error(`Insufficient quantity available for food donation ${item.foodDonationId}`);
                    }
                    yield (0, util_1.query)(`INSERT INTO cart_items (
            cart_id, 
            food_donation_id,
            quantity,
            status,
            notes,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())`, [cartId, item.foodDonationId, item.quantity, 'ACTIVE', item.notes]);
                    yield (0, util_1.query)(`UPDATE food_donations 
           SET quantity = quantity - $1,
               status = CASE 
                 WHEN quantity - $1 <= 0 THEN 'UNAVAILABLE' 
                 ELSE status 
               END
           WHERE id = $2`, [item.quantity, item.foodDonationId]);
                }
                yield (0, util_1.query)('COMMIT');
                return {
                    cartId,
                    deliveryFee,
                    totalAmount: deliveryFee
                };
            }
            catch (error) {
                yield (0, util_1.query)('ROLLBACK');
                console.error('Failed to persist cart:', error);
                throw error;
            }
        });
    }
}
exports.default = new CartService();
