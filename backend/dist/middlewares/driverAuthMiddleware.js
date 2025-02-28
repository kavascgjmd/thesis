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
exports.driverAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const driverAuthMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = req.cookies.token ||
        ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '')) ||
        req.header('x-auth-token');
    if (!token) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Convert string id to number for consistency
        const driverId = parseInt(decoded.id);
        if (isNaN(driverId)) {
            res.status(403).json({ success: false, message: 'Invalid driver token' });
            return;
        }
        // Set driver info in request object
        req.driver = {
            id: driverId,
            role: 'driver'
        };
        next();
    }
    catch (error) {
        res.status(403).json({ success: false, message: 'Invalid token' });
    }
});
exports.driverAuthMiddleware = driverAuthMiddleware;
