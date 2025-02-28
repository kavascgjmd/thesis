import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types/custom';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies.token || 
  req.headers.authorization?.replace('Bearer ', '') ||
  req.header('x-auth-token');
  
  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;  
  }
 
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as UserPayload;

    req.user = decoded; 
    next(); 
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
  }
};
