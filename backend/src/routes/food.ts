import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/util';
import { authMiddleware } from '../middlewares/auth';
import { UserPayload } from '../types/custom';
import { exec } from 'child_process';
import path from 'path';
import axios from 'axios';

const router = Router();

interface LocationClassification {
  type: 'Urban' | 'Rural' | 'Suburban';
  confidence: number;
}

interface GooglePlace {
  types?: string[];
  // Add other properties you need from the Place API response
  name?: string;
  vicinity?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    }
  };
}

async function classifyLocation(address: string): Promise<LocationClassification> {
  try {
    // Get your API key from environment variables for security
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not found in environment variables');
      return { type: 'Urban', confidence: 0 }; // Default to urban if no API key
    }
    
    // First get geocoding information for the address
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const geocodeResponse = await axios.get(geocodeUrl);
    
    if (geocodeResponse.data.status !== 'OK' || !geocodeResponse.data.results.length) {
      console.error('Geocoding failed:', geocodeResponse.data.status);
      return { type: 'Urban', confidence: 0 }; // Default to urban on error
    }
    
    // Extract location and get place details
    const location = geocodeResponse.data.results[0].geometry.location;
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=1000&key=${apiKey}`;
    const placeResponse = await axios.get(placeDetailsUrl);
    
    if (placeResponse.data.status !== 'OK') {
      console.error('Places API failed:', placeResponse.data.status);
      return { type: 'Urban', confidence: 0 }; // Default to urban on error
    }
    
    // Analyze nearby places to determine urban/suburban/rural classification
    const places = placeResponse.data.results;
    
    // Simple classification logic:
    // - Many places (> 15) and types like 'point_of_interest' -> Urban
    // - Medium number of places (5-15) with residential areas -> Suburban
    // - Few places (< 5) -> Rural
    
    if (places.length > 15) {
      return { type: 'Urban', confidence: 0.9 };
    } else if (places.length >= 5) {
      // Check if there are residential areas
      const hasResidential = places.some((place: GooglePlace) => 
        place.types && (
          place.types.includes('residential_area') || 
          place.types.includes('neighborhood') ||
          place.types.includes('housing_development')
        )
      );
      
      return hasResidential 
        ? { type: 'Suburban', confidence: 0.8 }
        : { type: 'Urban', confidence: 0.7 };
    } else {
      return { type: 'Rural', confidence: 0.8 };
    }
  } catch (error) {
    console.error('Error classifying location:', error);
    return { type: 'Urban', confidence: 0 }; // Default to urban on error
  }
}

// First create the base object schema with new event fields
const baseFoodDonationSchema = z.object({
  food_type: z.string().min(3).max(50),
  food_category: z.enum(['Cooked Meal', 'Raw Ingredients', 'Packaged Items']),
  
  // Event flag
  event_is_over: z.boolean().default(true),
  
  // Original fields for leftover food
  servings: z.number().optional(), // Remove .positive() to allow 0 values
  weight_kg: z.number().optional(), // Remove .positive() to allow 0 values
  quantity: z.number().optional(), // Remove .positive() to allow 0 values
  package_size: z.string().optional(),
  
  // New event-specific fields - updated to match frontend
  total_quantity: z.number().positive().optional(),
  event_type: z.enum(['Wedding', 'Birthday', 'Social Gathering', 'Corporate Gathering']).optional(),
  preparation_method: z.enum(['Buffet', 'Sit-down Dinner']).optional(),
  pricing: z.enum(['High', 'Low', 'Moderate']).optional(),
  number_of_guests: z.number().positive().optional(),
  
  expiration_time: z.coerce.date(),
  pickup_location: z.string().min(5).max(255),
  image: z.string().nullable().optional(),
  availability_schedule: z.string().min(5).max(255)
});

// Then create the validation schema with refinement
const foodDonationSchema = baseFoodDonationSchema.refine(data => {
  if (data.event_is_over) {
    // Validate leftover food fields
    if (data.food_category === 'Cooked Meal' && data.servings === undefined) {
      return false;
    }
    if (data.food_category === 'Raw Ingredients' && data.weight_kg === undefined) {
      return false;
    }
    if (data.food_category === 'Packaged Items' && (data.quantity === undefined || data.package_size === undefined)) {
      return false;
    }
    
    // Add positive number check for fields when event_is_over is true
    if (data.food_category === 'Cooked Meal' && (data.servings === undefined || data.servings <= 0)) {
      return false;
    }
    if (data.food_category === 'Raw Ingredients' && (data.weight_kg === undefined || data.weight_kg <= 0)) {
      return false;
    }
    if (data.food_category === 'Packaged Items' && (data.quantity === undefined || data.quantity <= 0)) {
      return false;
    }
  } else {
    // Validate event food fields
    if (data.total_quantity === undefined) {
      return false;
    }
    if (data.event_type === undefined) {
      return false;
    }
    if (data.preparation_method === undefined) {
      return false;
    }
    if (data.pricing === undefined) {
      return false;
    }
    if (data.number_of_guests === undefined) {
      return false;
    }
    
    // For upcoming events, allow servings, weight_kg, and quantity to be 0 or undefined
  }
  return true;
}, {
  message: "Required fields missing based on food type and event status"
});


const predictFoodWaste = async (eventData: any): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      // Log the original event data
      console.log("Original event data for prediction:", eventData);
      
      // Create a properly mapped object for the Python model
      const mappedEventData = {
        // Map fields to match exactly what the Python model expects
        food_type: eventData.food_type,
        event_type: eventData.event_type,
        number_of_guests: eventData.number_of_guests,
        total_quantity: eventData.total_quantity,
        preparation_method: eventData.preparation_method,
        pricing: eventData.pricing,
        location_type: eventData.location_type || 'Urban'
      };
      
      // Log the mapped data being sent to Python
      console.log("Mapped data for Python prediction:", mappedEventData);
      
      // Convert the event data to JSON with double quotes
      const eventDataJson = JSON.stringify(mappedEventData);
      
      // Path to the Python script (adjust as needed)
      const scriptPath = path.join(__dirname, '../../fwp/app.py');
      
      // FIXED: Properly escape JSON for command-line use
      // Use double quotes around the JSON and escape inner quotes
      exec(`python "${scriptPath}" "${eventDataJson.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing Python script: ${error}`);
          console.error(`stderr: ${stderr}`);
          reject(error);
          return;
        }
        
        // Log the full Python output for debugging
        if (stderr) {
          console.log("Python debug output:", stderr);
        }
        
        try {
          // Extract just the JSON part from stdout - this is the fix
          const jsonMatch = stdout.match(/\{.*\}/);
          if (!jsonMatch) {
            throw new Error("No valid JSON found in Python output");
          }
          
          const jsonOutput = jsonMatch[0];
          console.log("Extracted JSON:", jsonOutput);
          
          // Parse the extracted JSON from the Python script
          const result = JSON.parse(jsonOutput);
          console.log("Parsed result:", result);
          resolve(result.predicted_waste_kg);
        } catch (e) {
          console.error(`Failed to parse Python script output: ${e}`);
          console.error(`stdout: ${stdout}`);
          reject(e);
        }
      });
    } catch (e) {
      console.error("Error preparing prediction data:", e);
      reject(e);
    }
  });
};

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
      success: false,message: 'Failed to fetch food donation details'
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

    // Create a copy of the request body that we can modify
    const requestBody = { ...req.body };

    // If this is an upcoming event (event_is_over = false), predict the food waste
    if (requestBody.event_is_over === false) {
      try {
        // Get location classification if pickup_location is provided
        let locationType = 'Urban'; // Default
        if (requestBody.pickup_location) {
          const locationData = await classifyLocation(requestBody.pickup_location);
          locationType = locationData.type;
        }
        
        console.log(`Location classified as: ${locationType}`);
        
        // Call the Python script to predict food waste with the correct mapping
        const predictedWasteKg = await predictFoodWaste({
          food_type: requestBody.food_type,
          event_type: requestBody.event_type,
          number_of_guests: requestBody.number_of_guests, // Will map to attendees_count in Python
          total_quantity: requestBody.total_quantity,     // Will map to quantity_of_food in Python 
          preparation_method: requestBody.preparation_method,
          pricing: requestBody.pricing,
          location_type: locationType.toLowerCase() // Make sure it's lowercase as expected by model
        });
        
        console.log(`Predicted waste: ${predictedWasteKg} kg`);
        
        requestBody.servings = Math.round(predictedWasteKg);
      
      
      } catch (predictionError) {
        console.error('Error predicting food waste:', predictionError);
        // Continue without prediction if it fails
      }
    }

    // Validate input with the potentially modified request body
   const validationResult = foodDonationSchema.safeParse(requestBody);
if (!validationResult.success) {
  console.log('Validation error details:', JSON.stringify(validationResult.error, null, 2));
  res.status(400).json({
    success: false,
    message: 'Invalid input data',
    errors: validationResult.error.errors,
    formData: requestBody // Include the submitted data for comparison
  });
  return;
}
    const { 
      food_type,
      food_category,
      event_is_over,
      servings,
      weight_kg,
      quantity,
      package_size,
      total_quantity,
      event_type,
      preparation_method,
      pricing,
      number_of_guests,
      expiration_time, 
      pickup_location, 
      image, 
      availability_schedule 
    } = validationResult.data;

    // Create food donation with new fields
    const insertQuery = await query(
      `INSERT INTO food_donations 
       (donor_id, food_type, food_category, event_is_over, servings, weight_kg, 
        quantity, package_size, total_quantity, event_type, preparation_method, 
        pricing, number_of_guests, expiration_time, pickup_location, image, availability_schedule, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'AVAILABLE')
       RETURNING *`,
      [
        donorQuery.rows[0].id, 
        food_type, 
        food_category,
        event_is_over,
        servings, 
        weight_kg, 
        quantity, 
        package_size,
        total_quantity,
        event_type,
        preparation_method,
        pricing,
        number_of_guests,
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

// Modified predictFoodWaste function in food.ts routes file


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

    // Create a copy of the request body that we can modify
    const requestBody = { ...req.body };

    // If this is an upcoming event (event_is_over = false), predict the food waste
    if (requestBody.event_is_over === false) {
      try {
        // Get location classification if pickup_location is provided
        let locationType = 'Urban'; // Default
        if (requestBody.pickup_location) {
          const locationData = await classifyLocation(requestBody.pickup_location);
          locationType = locationData.type;
        }
        
        console.log(`Location classified as: ${locationType}`);
        
        // Call the Python script to predict food waste with the correct mapping
        const predictedWasteKg = await predictFoodWaste({
          food_type: requestBody.food_type,
          event_type: requestBody.event_type,
          number_of_guests: requestBody.number_of_guests, // Will map to attendees_count in Python
          total_quantity: requestBody.total_quantity,     // Will map to quantity_of_food in Python 
          preparation_method: requestBody.preparation_method,
          pricing: requestBody.pricing,
          location_type: locationType.toLowerCase() // Make sure it's lowercase as expected by model
        });
        
        console.log(`Predicted waste: ${predictedWasteKg} kg`);
        
       
        requestBody.servings = Math.round(predictedWasteKg);
       
        }catch (predictionError) {
        console.error('Error predicting food waste:', predictionError);
        // Continue without prediction if it fails
      }
    }

    // Validate input with partial fields allowed
    const validationResult = baseFoodDonationSchema.partial().safeParse(requestBody);
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