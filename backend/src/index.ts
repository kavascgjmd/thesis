import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
console.log(process.env.TWILIO_ACCOUNT_SID);
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from './middlewares/rateLimiterMiddleware';
import { createAllTables } from './db/tables';
import userRoutes from './routes/user';
import profileRoutes from './routes/profile';
import foodRoutes from './routes/food';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/order';
import driverRoutes from './routes/driver';

const app = express();

(async function () {
    try {
        await createAllTables();
        console.log('All tables created successfully');
    } catch (error) {
        console.error('Error creating tables:', error);
    }
})();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(rateLimit);

app.use('/api/user', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/driver', driverRoutes);
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
