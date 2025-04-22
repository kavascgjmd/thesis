// driverAuthMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface DriverPayload {
  id: number;
  role: 'driver';
}

export const driverAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies.token || 
    req.headers.authorization?.replace('Bearer ', '') ||
    req.header('x-auth-token');
  
  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;  
  }
 
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { id: string };

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
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid token' });
  }
};