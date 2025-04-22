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
        this.BASE_DELIVERY_FEE = 0; // Base fee for delivery
        this.PER_KM_RATE = 0.5; // Rate per kilometer
        this.ADDITIONAL_STOP_FEE = 1; // Additional fee per pickup stop
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
                // Fetch additional information for each food donation in the cart
                if (cart.items && cart.items.length > 0) {
                    const foodDonationIds = cart.items.map((item) => item.foodDonationId);
                    // Query to get food donation details with donor information
                    const donationsResult = yield (0, util_1.query)(`SELECT 
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
          WHERE fd.id = ANY($1::int[])`, [foodDonationIds]);
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
                    cart.items = cart.items.map((item) => {
                        const details = donationDetailsMap.get(item.foodDonationId);
                        if (details) {
                            return Object.assign(Object.assign({}, item), { foodType: details.foodType, foodCategory: details.foodCategory, donorName: details.donorName, pickupLocation: details.pickupLocation, servings: details.servings, weightKg: details.weightKg, packageSize: details.packageSize });
                        }
                        return item;
                    });
                }
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
                    deliveryFee: 0,
                    totalAmount: 0,
                    lastAccessed: Date.now()
                };
                // Get the food donation with new structure
                const foodDonation = yield (0, util_1.query)(`SELECT 
          food_category, 
          servings, 
          weight_kg, 
          quantity, 
          status 
        FROM food_donations 
        WHERE id = $1 AND status = 'AVAILABLE'`, [item.foodDonationId]);
                if (!foodDonation.rows[0]) {
                    throw new Error('Food donation not available');
                }
                // Check if the requested quantity exceeds available amount based on food category
                const fd = foodDonation.rows[0];
                let availableQuantity;
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
                if (availableQuantity < item.quantity) {
                    throw new Error('Requested quantity exceeds available amount');
                }
                const existingItemIndex = cart.items.findIndex(i => i.foodDonationId === item.foodDonationId);
                if (existingItemIndex > -1) {
                    const newQuantity = cart.items[existingItemIndex].quantity + item.quantity;
                    if (newQuantity > availableQuantity) {
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
                        itemTotal: 0,
                        foodType: item.foodType,
                        foodCategory: item.foodCategory,
                        donorName: item.donorName,
                        pickupLocation: item.pickupLocation,
                        isFromPastEvent: item.isFromPastEvent
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
                    const foodDonation = yield (0, util_1.query)(`SELECT 
            food_category, 
            servings, 
            weight_kg, 
            quantity, 
            status 
          FROM food_donations 
          WHERE id = $1 AND status = 'AVAILABLE'`, [foodDonationId]);
                    if (!foodDonation.rows[0]) {
                        throw new Error('Food donation not available');
                    }
                    const fd = foodDonation.rows[0];
                    let availableQuantity;
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
                    if (updates.quantity > availableQuantity) {
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
    persistCart(userId, deliveryAddress, deliveryLatitude, deliveryLongitude) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cart = yield this.getCart(userId);
                if (!cart || cart.items.length === 0) {
                    throw new Error('Cart is empty');
                }
                yield (0, util_1.query)('BEGIN');
                const foodDonationsResult = yield (0, util_1.query)(`SELECT fd.id, fd.pickup_location, fd.food_category, fd.servings, fd.weight_kg, fd.quantity 
         FROM food_donations fd 
         WHERE fd.id = ANY($1::int[])`, [cart.items.map(item => item.foodDonationId)]);
                const locations = [
                    deliveryAddress,
                    ...foodDonationsResult.rows.map(fd => fd.pickup_location)
                ];
                // Validate all locations
                for (const location of locations) {
                    try {
                        yield mapService_1.default.getCoordinates(location);
                    }
                    catch (error) {
                        throw new Error(`Invalid location: ${location}`);
                    }
                }
                // Calculate delivery route and fee using proper routing algorithm
                const startingPoint = { type: 'start', location: deliveryAddress };
                const pickupPoints = foodDonationsResult.rows.map(fd => ({
                    type: 'pickup',
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
                    ? { lat: deliveryLatitude, lng: deliveryLongitude, address: deliveryAddress }
                    : yield mapService_1.default.getCoordinates(deliveryAddress);
                routePoints.push({
                    id: 0,
                    type: 'pickup',
                    location: startCoords,
                    description: 'Driver Starting Point'
                });
                // Add all food pickup locations
                for (const point of pickupPoints) {
                    const coords = yield mapService_1.default.getCoordinates(point.location);
                    routePoints.push({
                        id: point.id,
                        type: 'pickup',
                        location: coords,
                        description: `Pickup: ${point.id}`
                    });
                }
                // Add delivery address as final destination
                routePoints.push({
                    id: 999,
                    type: 'delivery',
                    location: startCoords,
                    description: 'Customer Delivery Location'
                });
                // Use approximateRouteCalculation to match the algorithm used in actual delivery
                const routeResult = mapService_1.default.calculateApproximateRoute(routePoints);
                totalDistance = routeResult.totalDistance;
                // Calculate delivery fee based on distance and number of stops
                const numberOfStops = pickupPoints.length;
                const distanceFee = Math.round(this.PER_KM_RATE * totalDistance);
                const stopsFee = numberOfStops * this.ADDITIONAL_STOP_FEE;
                const deliveryFee = this.BASE_DELIVERY_FEE + distanceFee + stopsFee;
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
                    deliveryFee // totalAmount is currently the same as deliveryFee
                ]);
                const cartId = cartResult.rows[0].id;
                // Update Redis cart with the database ID
                cart.id = cartId;
                yield redisClient_1.default.set(this.getCartKey(userId, cartId), JSON.stringify(cart), { EX: this.CART_EXPIRY });
                // Clear the temporary cart
                yield this.clearCart(userId);
                // Process each item in the cart
                for (const item of cart.items) {
                    const foodDonation = yield (0, util_1.query)(`SELECT 
            food_category, 
            servings, 
            weight_kg, 
            quantity, 
            status 
          FROM food_donations 
          WHERE id = $1 AND status = 'AVAILABLE' 
          FOR UPDATE`, [item.foodDonationId]);
                    if (!foodDonation.rows[0]) {
                        throw new Error(`Food donation ${item.foodDonationId} is not available`);
                    }
                    const fd = foodDonation.rows[0];
                    let availableQuantity;
                    let updateQuery;
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
                    yield (0, util_1.query)(`INSERT INTO cart_items (
            cart_id, 
            food_donation_id,
            quantity,
            status,
            notes,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())`, [cartId, item.foodDonationId, item.quantity, 'ACTIVE', item.notes]);
                    // Update food donation with appropriate field based on category
                    yield (0, util_1.query)(updateQuery, [item.quantity, item.foodDonationId]);
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
