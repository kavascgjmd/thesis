import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/util';
import { authMiddleware } from '../middlewares/auth';
import { UserPayload } from '../types/custom';

const router = Router();

// First create the base object schema
const baseFoodDonationSchema = z.object({
  food_type: z.string().min(3).max(50),
  food_category: z.enum(['Cooked Meal', 'Raw Ingredients', 'Packaged Items']),
  // Different fields based on food category
  servings: z.number().positive().optional(),
  weight_kg: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  package_size: z.string().optional(),
  expiration_time: z.coerce.date(),
  pickup_location: z.string().min(5).max(255),
  image: z.string().nullable().optional(),
  availability_schedule: z.string().min(5).max(255)
});

// Then create the validation schema with refinement
const foodDonationSchema = baseFoodDonationSchema.refine(data => {
  // Validate that the appropriate quantity field is provided based on food category
  if (data.food_category === 'Cooked Meal' && data.servings === undefined) {
    return false;
  }
  if (data.food_category === 'Raw Ingredients' && data.weight_kg === undefined) {
    return false;
  }
  if (data.food_category === 'Packaged Items' && (data.quantity === undefined || data.package_size === undefined)) {
    return false;
  }
  return true;
}, {
  message: "Required quantity fields missing for selected food category"
});

// Get all available food donations
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const foodQuery = await query(
      `SELECT 
        f.*,
        d.organization_name as donor_name,
        d.contact_person,
        d.contact_number
       FROM food_donations f
       JOIN donors d ON f.donor_id = d.id
       WHERE f.status = 'AVAILABLE'
       AND f.expiration_time > CURRENT_TIMESTAMP
       ORDER BY f.expiration_time ASC`,
      []
    );

    res.status(200).json({
      success: true,
      foods: foodQuery.rows
    });
  } catch (error) {
    console.error('Error fetching food donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch food donations'
    });
  }
});

// Get specific food donation details
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const foodQuery = await query(
      `SELECT 
        f.*,
        d.organization_name as donor_name,
        d.contact_person,
        d.contact_number,
        d.operating_hours
       FROM food_donations f
       JOIN donors d ON f.donor_id = d.id
       WHERE f.id = $1`,
      [id]
    );

    if (!foodQuery.rows[0]) {
      res.status(404).json({
        success: false,
        message: 'Food donation not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      food: foodQuery.rows[0]
    });
  } catch (error) {
    console.error('Error fetching food donation details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch food donation details'
    });
  }
});

// Create new food donation (donors only)
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as UserPayload;
    
    // Verify user is a donor
    if (!user?.id || user.role.toUpperCase() !== 'DONOR') {
      res.status(403).json({
        success: false,
        message: 'Only donors can create food donations'
      });
      return;
    }

    // Get donor details
    const donorQuery = await query(
      'SELECT id FROM donors WHERE user_id = $1',
      [user.id]
    );

    if (!donorQuery.rows[0]) {
      res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
      return;
    }

    // Validate input
    const validationResult = foodDonationSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: validationResult.error.errors
      });
      return;
    }

    const { 
      food_type,
      food_category,
      servings,
      weight_kg,
      quantity,
      package_size,
      expiration_time, 
      pickup_location, 
      image, 
      availability_schedule 
    } = validationResult.data;

    // Create food donation with new fields
    const insertQuery = await query(
      `INSERT INTO food_donations 
       (donor_id, food_type, food_category, servings, weight_kg, quantity, package_size, expiration_time, pickup_location, image, availability_schedule, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'AVAILABLE')
       RETURNING *`,
      [
        donorQuery.rows[0].id, 
        food_type, 
        food_category, 
        servings, 
        weight_kg, 
        quantity, 
        package_size,
        expiration_time, 
        pickup_location, 
        image, 
        availability_schedule
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Food donation created successfully',
      food: insertQuery.rows[0]
    });
  } catch (error) {
    console.error('Error creating food donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create food donation'
    });
  }
});

// Update food donation (donors only)
router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as UserPayload;
    const { id } = req.params;

    // Verify user is a donor
    if (!user?.id || user.role.toUpperCase() !== 'DONOR') {
      res.status(403).json({
        success: false,
        message: 'Only donors can update food donations'
      });
      return;
    }

    // Check if donation exists and belongs to donor
    const donorQuery = await query(
      `SELECT f.* FROM food_donations f
       JOIN donors d ON f.donor_id = d.id
       WHERE f.id = $1 AND d.user_id = $2`,
      [id, user.id]
    );

    if (!donorQuery.rows[0]) {
      res.status(404).json({
        success: false,
        message: 'Food donation not found or unauthorized'
      });
      return;
    }

    // Validate input
   // In the update route
const validationResult = baseFoodDonationSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: validationResult.error.errors
      });
      return;
    }

    const updateData = validationResult.data;
    
    // Convert object to array of fields and values for dynamic SQL
    const updates = Object.entries(updateData)
      .filter(([_, value]) => value !== undefined)
      .map(([key, _], index) => `${key} = $${index + 1}`);
    const values = Object.values(updateData).filter(value => value !== undefined);

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
      return;
    }

    const updateQuery = await query(
      `UPDATE food_donations 
       SET ${updates.join(', ')}
       WHERE id = $${values.length + 1}
       RETURNING *`,
      [...values, id]
    );

    res.status(200).json({
      success: true,
      message: 'Food donation updated successfully',
      food: updateQuery.rows[0]
    });
  } catch (error) {
    console.error('Error updating food donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update food donation'
    });
  }
});

// Delete food donation (donors only)
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as UserPayload;
    const { id } = req.params;

    // Verify user is a donor
    if (!user?.id || user.role.toUpperCase() !== 'DONOR') {
      res.status(403).json({
        success: false,
        message: 'Only donors can delete food donations'
      });
      return;
    }

    // Check if donation exists and belongs to donor
    const donorQuery = await query(
      `SELECT f.* FROM food_donations f
       JOIN donors d ON f.donor_id = d.id
       WHERE f.id = $1 AND d.user_id = $2`,
      [id, user.id]
    );

    if (!donorQuery.rows[0]) {
      res.status(404).json({
        success: false,
        message: 'Food donation not found or unauthorized'
      });
      return;
    }

    await query(
      'DELETE FROM food_donations WHERE id = $1',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Food donation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting food donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete food donation'
    });
  }
});

export default router;