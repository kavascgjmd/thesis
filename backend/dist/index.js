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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '../.env' });
console.log(process.env.TWILIO_ACCOUNT_SID);
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const rateLimiterMiddleware_1 = __importDefault(require("./middlewares/rateLimiterMiddleware"));
const tables_1 = require("./db/tables");
const user_1 = __importDefault(require("./routes/user"));
const profile_1 = __importDefault(require("./routes/profile"));
const food_1 = __importDefault(require("./routes/food"));
const cart_1 = __importDefault(require("./routes/cart"));
const order_1 = __importDefault(require("./routes/order"));
const driver_1 = __importDefault(require("./routes/driver"));
const app = (0, express_1.default)();
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, tables_1.createAllTables)();
            console.log('All tables created successfully');
        }
        catch (error) {
            console.error('Error creating tables:', error);
        }
    });
})();
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
app.use((0, cookie_parser_1.default)());
app.use(rateLimiterMiddleware_1.default);
app.use('/api/user', user_1.default);
app.use('/api/profile', profile_1.default);
app.use('/api/foods', food_1.default);
app.use('/api/cart', cart_1.default);
app.use('/api/orders', order_1.default);
app.use('/api/driver', driver_1.default);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
