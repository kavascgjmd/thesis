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
const util_1 = require("../db/util");
const axios_1 = __importDefault(require("axios"));
class MapService {
    constructor() {
        this.GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    }
    // Get coordinates from address using Google Maps Geocoding API
    getCoordinates(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get('https://maps.googleapis.com/maps/api/geocode/json', {
                    params: {
                        address,
                        key: this.GOOGLE_MAPS_API_KEY
                    }
                });
                console.log(response.data);
                if (response.data.status !== 'OK') {
                    throw new Error(`Geocoding failed: ${response.data.status}`);
                }
                const location = response.data.results[0].geometry.location;
                return {
                    lat: location.lat,
                    lng: location.lng,
                    address: response.data.results[0].formatted_address
                };
            }
            catch (error) {
                console.error('Geocoding error:', error);
                throw new Error('Failed to get coordinates');
            }
        });
    }
    // Calculate optimal route with Google Directions API for more accurate results
    calculateOptimalRoute(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get delivery address from order
                const orderResult = yield (0, util_1.query)(`SELECT o.delivery_address, o.cart_id, c.created_at as cart_created_at 
         FROM orders o
         JOIN carts c ON o.cart_id = c.id
         WHERE o.id = $1`, [orderId]);
                if (!orderResult.rows.length) {
                    throw new Error('Order not found');
                }
                const { delivery_address: deliveryAddress, cart_id: cartId, cart_created_at: cartCreatedAt } = orderResult.rows[0];
                const deliveryLocation = yield this.getCoordinates(deliveryAddress);
                // Get food pickup locations from cart items with donor address
                const foodLocationsResult = yield (0, util_1.query)(`SELECT fd.id,  fd.pickup_location, d.organization_name as donor_name
         FROM cart_items ci
         JOIN food_donations fd ON ci.food_donation_id = fd.id
         JOIN donors d ON fd.donor_id = d.id
         JOIN users u ON d.user_id = u.id
         WHERE ci.cart_id = $1 
         AND ci.created_at >= $2`, [cartId, cartCreatedAt]);
                console.log(foodLocationsResult);
                if (!foodLocationsResult.rows.length) {
                    throw new Error('No food items found for this order');
                }
                // Prepare all points for route calculation
                const points = [];
                // Add delivery address as starting point
                points.push({
                    id: 0,
                    type: 'pickup',
                    location: deliveryLocation,
                    description: 'Driver Starting Point'
                });
                // Add all food pickup locations
                for (let i = 0; i < foodLocationsResult.rows.length; i++) {
                    const foodItem = foodLocationsResult.rows[i];
                    console.log('foodLocations');
                    console.log(foodItem.pickup_location);
                    const loc = yield this.getCoordinates(foodItem.pickup_location);
                    points.push({
                        id: foodItem.id,
                        type: 'pickup',
                        location: loc,
                        description: `Pickup: ${foodItem.donor_name}`
                    });
                }
                // Add delivery address as final destination
                points.push({
                    id: 999,
                    type: 'delivery',
                    location: deliveryLocation,
                    description: 'Customer Delivery Location'
                });
                // Use Google Directions API for routing if we have fewer than 23 waypoints
                let path = [];
                let totalDistance = 0;
                let estimatedDuration = 0;
                if (points.length <= 25) {
                    try {
                        const result = yield this.getDirectionsFromGoogle(points);
                        path = result.path;
                        totalDistance = result.totalDistance;
                        estimatedDuration = result.estimatedDuration;
                    }
                    catch (error) {
                        console.warn('Failed to get directions from Google, falling back to approximate method:', error);
                        const result = this.calculateApproximateRoute(points);
                        path = result.path;
                        totalDistance = result.totalDistance;
                        estimatedDuration = result.estimatedDuration;
                    }
                }
                else {
                    // Fall back to approximate method if too many waypoints
                    const result = this.calculateApproximateRoute(points);
                    path = result.path;
                    totalDistance = result.totalDistance;
                    estimatedDuration = result.estimatedDuration;
                }
                // Prepare waypoints for client-side rendering
                const waypoints = path.slice(1, -1).map(point => ({
                    location: point.location,
                    stopover: true
                }));
                // Save route to database
                yield this.saveRouteToDatabase(orderId, path, totalDistance, estimatedDuration);
                return {
                    path,
                    totalDistance,
                    estimatedDuration,
                    waypoints
                };
            }
            catch (error) {
                console.error('Failed to calculate optimal route:', error);
                throw error;
            }
        });
    }
    // Get directions using Google Directions API
    getDirectionsFromGoogle(points) {
        return __awaiter(this, void 0, void 0, function* () {
            // Origin is the first point
            const origin = `${points[0].location.lat},${points[0].location.lng}`;
            // Destination is the last point
            const destination = `${points[points.length - 1].location.lat},${points[points.length - 1].location.lng}`;
            // Waypoints are all points in between
            const waypoints = points.slice(1, -1).map(point => `${point.location.lat},${point.location.lng}`).join('|');
            const response = yield axios_1.default.get('https://maps.googleapis.com/maps/api/directions/json', {
                params: {
                    origin,
                    destination,
                    waypoints: `optimize:true|${waypoints}`, // Ask Google to optimize the waypoint order
                    key: this.GOOGLE_MAPS_API_KEY
                }
            });
            if (response.data.status !== 'OK') {
                throw new Error(`Directions API failed: ${response.data.status}`);
            }
            // Extract the optimized waypoint order
            const waypointOrder = response.data.routes[0].waypoint_order;
            const legs = response.data.routes[0].legs;
            // Reorder the points based on the optimized waypoint order
            const optimizedPath = [points[0]]; // Start with origin
            // Add waypoints in the optimized order
            waypointOrder.forEach((index) => {
                optimizedPath.push(points[index + 1]); // +1 because waypoints start from index 1 in our points array
            });
            // Add destination
            optimizedPath.push(points[points.length - 1]);
            // Calculate total distance and duration
            let totalDistance = 0;
            let totalDuration = 0;
            legs.forEach((leg) => {
                totalDistance += leg.distance.value / 1000; // Convert meters to kilometers
                totalDuration += leg.duration.value / 60; // Convert seconds to minutes
            });
            return {
                path: optimizedPath,
                totalDistance,
                estimatedDuration: totalDuration
            };
        });
    }
    // Calculate approximate route using nearest neighbor algorithm
    calculateApproximateRoute(points) {
        // Calculate distance matrix
        const distanceMatrix = [];
        for (let i = 0; i < points.length; i++) {
            distanceMatrix[i] = [];
            for (let j = 0; j < points.length; j++) {
                if (i === j) {
                    distanceMatrix[i][j] = 0;
                }
                else {
                    distanceMatrix[i][j] = this.calculateDistance(points[i].location.lat, points[i].location.lng, points[j].location.lat, points[j].location.lng);
                }
            }
        }
        // Get optimized path indices
        const pathIndices = this.nearestNeighborTSP(distanceMatrix, 0);
        // Create actual path and calculate total distance
        const path = pathIndices.map(index => points[index]);
        let totalDistance = 0;
        for (let i = 0; i < pathIndices.length - 1; i++) {
            totalDistance += distanceMatrix[pathIndices[i]][pathIndices[i + 1]];
        }
        const estimatedDuration = totalDistance / 30 * 60; // Assuming 30 km/h average speed, convert to minutes
        return {
            path,
            totalDistance,
            estimatedDuration
        };
    }
    // Calculate distance between two points using Haversine formula
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(value) {
        return value * Math.PI / 180;
    }
    // Nearest Neighbor algorithm for TSP approximation
    nearestNeighborTSP(distanceMatrix, startIndex) {
        const n = distanceMatrix.length;
        const visited = new Array(n).fill(false);
        const path = [startIndex];
        visited[startIndex] = true;
        for (let i = 1; i < n; i++) {
            const lastNode = path[path.length - 1];
            let minDistance = Infinity;
            let nextNode = -1;
            for (let j = 0; j < n; j++) {
                if (!visited[j] && distanceMatrix[lastNode][j] < minDistance) {
                    minDistance = distanceMatrix[lastNode][j];
                    nextNode = j;
                }
            }
            if (nextNode !== -1) {
                path.push(nextNode);
                visited[nextNode] = true;
            }
        }
        return path;
    }
    // Save calculated route to database
    saveRouteToDatabase(orderId, route, totalDistance, estimatedDuration) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const roundedDistance = Math.round(totalDistance);
                const roundedDuration = Math.round(estimatedDuration);
                // Create route record
                const routeResult = yield (0, util_1.query)(`INSERT INTO delivery_routes (
          order_id,
          total_distance,
          estimated_duration,
          created_at
        )
        VALUES ($1, $2, $3, NOW())
        RETURNING id`, [orderId, roundedDistance, roundedDuration]);
                const routeId = routeResult.rows[0].id;
                // Save route points (rest of the code remains the same)
                for (let i = 0; i < route.length; i++) {
                    const point = route[i];
                    yield (0, util_1.query)(`INSERT INTO route_points (
            route_id,
            point_order,
            point_type,
            location_id,
            latitude,
            longitude,
            address,
            description,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`, [
                        routeId,
                        i,
                        point.type,
                        point.id,
                        point.location.lat,
                        point.location.lng,
                        point.location.address,
                        point.description
                    ]);
                }
            }
            catch (error) {
                console.error('Failed to save route to database:', error);
                throw error;
            }
        });
    }
    // Update driver's current location
    updateDriverLocation(driverId, lat, lng) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // First, check if there's a record in the last 30 seconds to prevent redundant updates
                const recentRecordResult = yield (0, util_1.query)(`SELECT id FROM driver_locations 
         WHERE driver_id = $1 
         AND timestamp > NOW() - INTERVAL '30 seconds'`, [driverId]);
                // Only insert if no recent record exists or if position has changed significantly
                if (recentRecordResult.rows.length === 0) {
                    yield (0, util_1.query)(`INSERT INTO driver_locations (
            driver_id,
            latitude,
            longitude,
            timestamp,
            created_at
          )
          VALUES ($1, $2, $3, NOW(), NOW())`, [driverId, lat, lng]);
                }
            }
            catch (error) {
                console.error('Failed to update driver location:', error);
                throw error;
            }
        });
    }
    // Get driver's current location
    getDriverLocation(driverId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield (0, util_1.query)(`SELECT 
          driver_id,
          latitude,
          longitude,
          EXTRACT(EPOCH FROM timestamp) as timestamp
         FROM driver_locations
         WHERE driver_id = $1
         ORDER BY timestamp DESC
         LIMIT 1`, [driverId]);
                if (!result.rows.length) {
                    return null;
                }
                const location = result.rows[0];
                return {
                    driverId,
                    lat: parseFloat(location.latitude),
                    lng: parseFloat(location.longitude),
                    timestamp: parseInt(location.timestamp)
                };
            }
            catch (error) {
                console.error('Failed to get driver location:', error);
                throw error;
            }
        });
    }
    // Get delivery route for an order
    getDeliveryRoute(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const routeResult = yield (0, util_1.query)(`SELECT id, total_distance, estimated_duration
         FROM delivery_routes
         WHERE order_id = $1
         ORDER BY created_at DESC
         LIMIT 1`, [orderId]);
                if (!routeResult.rows.length) {
                    return null;
                }
                const routeId = routeResult.rows[0].id;
                const totalDistance = parseFloat(routeResult.rows[0].total_distance);
                const estimatedDuration = parseFloat(routeResult.rows[0].estimated_duration);
                const pointsResult = yield (0, util_1.query)(`SELECT 
          point_order,
          point_type,
          location_id,
          latitude,
          longitude,
          address,
          description
         FROM route_points
         WHERE route_id = $1
         ORDER BY point_order`, [routeId]);
                if (!pointsResult.rows.length) {
                    return null;
                }
                const path = pointsResult.rows.map(row => ({
                    id: row.location_id,
                    type: row.point_type,
                    location: {
                        lat: parseFloat(row.latitude),
                        lng: parseFloat(row.longitude),
                        address: row.address
                    },
                    description: row.description
                }));
                // Prepare waypoints for Google Maps
                const waypoints = path.slice(1, -1).map(point => ({
                    location: point.location,
                    stopover: true
                }));
                return {
                    path,
                    totalDistance,
                    estimatedDuration,
                    waypoints
                };
            }
            catch (error) {
                console.error('Failed to get delivery route:', error);
                throw error;
            }
        });
    }
    // Get ETA for delivery
    getEstimatedDeliveryTime(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const route = yield this.getDeliveryRoute(orderId);
                if (!route) {
                    return null;
                }
                // Get current driver location
                const deliveryResult = yield (0, util_1.query)('SELECT driver_id FROM deliveries WHERE request_id = $1', [orderId]);
                if (!deliveryResult.rows.length || !deliveryResult.rows[0].driver_id) {
                    return route.estimatedDuration; // Return original estimate if no driver assigned
                }
                const driverId = deliveryResult.rows[0].driver_id;
                const driverLocation = yield this.getDriverLocation(driverId);
                if (!driverLocation) {
                    return route.estimatedDuration;
                }
                // Find nearest point in the route to driver's current location
                let minDistance = Infinity;
                let nearestPointIndex = 0;
                for (let i = 0; i < route.path.length; i++) {
                    const distance = this.calculateDistance(driverLocation.lat, driverLocation.lng, route.path[i].location.lat, route.path[i].location.lng);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestPointIndex = i;
                    }
                }
                // Calculate remaining distance to customer's location
                let remainingDistance = 0;
                for (let i = nearestPointIndex; i < route.path.length - 1; i++) {
                    remainingDistance += this.calculateDistance(route.path[i].location.lat, route.path[i].location.lng, route.path[i + 1].location.lat, route.path[i + 1].location.lng);
                }
                // Calculate remaining time based on average speed (30 km/h)
                const remainingTime = remainingDistance / 30 * 60; // minutes
                return remainingTime;
            }
            catch (error) {
                console.error('Failed to get estimated delivery time:', error);
                return null;
            }
        });
    }
}
exports.default = new MapService();
