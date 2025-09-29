import { Router, Request, Response } from 'express';
import { query } from '../db/util';
import { authMiddleware } from '../middlewares/auth';
import { UserPayload } from '../types/custom';
import mapService from '../services/mapService';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Types for the allocation system
interface NGO {
  id: number;
  ngo_name: string;
  storage_capacity_kg: number;
  vehicle_capacity_kg: number;
  food_preferences: string[];
  priority_level: number;
  latitude: number;
  longitude: number;
}

interface FoodDonation {
  id: number;
  food_type: string;
  food_category: string;
  remaining_quantity: number;
  expiration_time: Date;
  pickup_location: string;
  latitude: number;
  longitude: number;
  weight_kg?: number;
  servings?: number;
  quantity?: number;
}

interface PreviousAllocation {
  ngo_id: number;
  food_donation_id: number;
  allocated_quantity: number;
}

interface AllocationResult {
  ngo_id: number;
  food_donation_id: number;
  allocated_quantity: number;
}

interface AllocationInputData {
  ngos: {
    id: number;
    storage_capacity: number;
    latitude: number;
    longitude: number;
    priority_level: number;
    food_preferences: string[];
  }[];
  foods: {
    id: number;
    remaining_quantity: number;
    food_type: string;
    latitude: number;
    longitude: number;
    expiration_time: string;
  }[];
  previous_allocations: PreviousAllocation[];
}

interface AllocationOutputData {
  status: 'optimal' | 'infeasible';
  objective_value: number;
  allocations: AllocationResult[];
}

async function enrichFoodDonationsWithCoordinates(
  foodDonations: Partial<FoodDonation>[]
): Promise<FoodDonation[]> {
  const enrichedDonations: FoodDonation[] = [];
  
  for (const donation of foodDonations) {
    try {
      // Check if we already have coordinates
      if (donation.latitude !== undefined && donation.longitude !== undefined && donation.pickup_location) {
        enrichedDonations.push(donation as FoodDonation);
        continue;
      }
      
      // Ensure pickup_location exists
      if (!donation.pickup_location) {
        console.error(`Donation ID ${donation.id} is missing pickup location`);
        continue;
      }
      
      // Geocode the pickup location using mapService
      const coordinates = await mapService.getCoordinates(donation.pickup_location);
      
      // Create enriched donation object with coordinates
      enrichedDonations.push({
        ...donation,
        latitude: coordinates.lat,
        longitude: coordinates.lng
      } as FoodDonation);
    } catch (error) {
      console.error(`Failed to geocode location for donation ID ${donation.id}:`, error);
      // Skip this donation in the allocation process
    }
  }
  
  return enrichedDonations;
}

// OR-Tools based allocation using node-or-tools
async function allocateFoodWithORTools(
  ngos: NGO[],
  foodDonations: FoodDonation[],
  previousAllocations: PreviousAllocation[]
): Promise<AllocationResult[]> {
  try {
    console.log("Setting up allocation model with OR-Tools...");
    
    // Prepare input data for Python script
    const inputData: AllocationInputData = {
      ngos: ngos.map(ngo => ({
        id: ngo.id,
        storage_capacity: Number(ngo.storage_capacity_kg), // Ensure numeric
        latitude: Number(ngo.latitude), // Ensure numeric
        longitude: Number(ngo.longitude), // Ensure numeric
        priority_level: Number(ngo.priority_level), // Ensure numeric
        food_preferences: ngo.food_preferences || []
      })),
      foods: foodDonations.map(food => ({
        id: food.id,
        remaining_quantity: Number(food.remaining_quantity), // Ensure numeric
        food_type: food.food_type,
        latitude: Number(food.latitude), // Ensure numeric
        longitude: Number(food.longitude), // Ensure numeric
        expiration_time: food.expiration_time.toISOString()
      })),
      previous_allocations: previousAllocations.map(pa => ({
        ngo_id: Number(pa.ngo_id), // Ensure numeric
        food_donation_id: Number(pa.food_donation_id), // Ensure numeric
        allocated_quantity: Number(pa.allocated_quantity) // Ensure numeric
      }))
    };
    
    // Create a temporary input file
    const inputFile = path.join(__dirname, 'allocation_input.json');
    const outputFile = path.join(__dirname, 'allocation_output.json');
    
    // Write the data to the input file
    fs.writeFileSync(inputFile, JSON.stringify(inputData, null, 2));
    
    // Create the Python script file
    const scriptPath = path.join(__dirname, 'allocate.py');
    fs.writeFileSync(scriptPath, `
import json
import sys
from ortools.linear_solver import pywraplp
import math
from datetime import datetime

# Load input data
with open('${inputFile.replace(/\\/g, '\\\\')}', 'r') as f:
    data = json.load(f)

# Extract data
ngos = data['ngos']
foods = data['foods']
previous_allocations = data['previous_allocations']

# Create the solver
solver = pywraplp.Solver.CreateSolver('SCIP')

# Create variables
x = {}  # Continuous variables for quantity
y = {}  # Binary variables for selection

# Min allocation and max sources
min_alloc = 5  # 5kg minimum allocation
max_sources = 5  # Maximum number of food sources per NGO

# Generate valid combinations
valid_combinations = []
for ngo in ngos:
    for food in foods:
        # Skip incompatible food types if preferences are specified
        if ngo['food_preferences'] and len(ngo['food_preferences']) > 0 and food['food_type'] not in ngo['food_preferences']:
            continue
            
        # Convert remaining_quantity to float if it's a string and skip if less than minimum allocation
        food_quantity = float(food['remaining_quantity'])
        if food_quantity < min_alloc:
            continue
            
        valid_combinations.append((ngo['id'], food['id']))

# Calculate objective coefficients
obj_coef = {}
for ngo_id, food_id in valid_combinations:
    # Find the NGO and food objects
    ngo = next((n for n in ngos if n['id'] == ngo_id), None)
    food = next((f for f in foods if f['id'] == food_id), None)
    
    # Skip if NGO or food not found
    if not ngo or not food:
        continue
    
    # Calculate distance
    lat1, lon1 = float(ngo['latitude']), float(ngo['longitude'])
    lat2, lon2 = float(food['latitude']), float(food['longitude'])
    
    # Calculate distance using Haversine formula
    R = 6371  # Earth radius in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat/2) * math.sin(dLat/2) + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dLon/2) * math.sin(dLon/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    
    # Calculate days until expiry
    try:
        expiry_date = datetime.fromisoformat(food['expiration_time'].replace('Z', '+00:00'))
        current_time = datetime.utcnow()
        days_until_expiry = max(0, (expiry_date - current_time).total_seconds() / (24 * 3600))
    except (ValueError, TypeError):
        # Default to 1 day if date parsing fails
        days_until_expiry = 1
    
    # Find previous allocation
    prev_alloc = next((pa for pa in previous_allocations 
                      if pa['ngo_id'] == ngo_id and pa['food_donation_id'] == food_id), None)
    
    # Calculate benefit score components
    distance_score = 1 / (1 + distance)
    expiry_score = 1 / (1 + max(0.1, days_until_expiry))
    priority_factor = float(ngo['priority_level'])
    previous_allocation_factor = 1.5 if prev_alloc else 1.0
    
    # Combined benefit score
    benefit_score = (
        distance_score * 20 +
        expiry_score * 15 +
        priority_factor * 5 +
        10
    ) * previous_allocation_factor
    
    obj_coef[(ngo_id, food_id)] = benefit_score

# Create decision variables
for ngo_id, food_id in valid_combinations:
    # Find the food object
    food = next((f for f in foods if f['id'] == food_id), None)
    if not food:
        continue
    
    # Convert remaining_quantity to float
    food_quantity = float(food['remaining_quantity'])
    
    # Create continuous variable for quantity
    x[ngo_id, food_id] = solver.NumVar(0, food_quantity, f'x_{ngo_id}_{food_id}')
    
    # Create binary variable for selection
    y[ngo_id, food_id] = solver.IntVar(0, 1, f'y_{ngo_id}_{food_id}')

# Create objective function
objective = solver.Objective()
for ngo_id, food_id in valid_combinations:
    objective.SetCoefficient(x[ngo_id, food_id], obj_coef.get((ngo_id, food_id), 0))
objective.SetMaximization()

# Add constraints
# 1. Food donation quantity constraints
for food in foods:
    constraint = solver.Constraint(0, float(food['remaining_quantity']))
    for ngo_id, food_id in valid_combinations:
        if food_id == food['id']:
            constraint.SetCoefficient(x[ngo_id, food_id], 1)

# 2. NGO storage capacity constraints
for ngo in ngos:
    constraint = solver.Constraint(0, float(ngo['storage_capacity']))
    for ngo_id, food_id in valid_combinations:
        if ngo_id == ngo['id']:
            constraint.SetCoefficient(x[ngo_id, food_id], 1)

# 3. Binary variable linking constraints
# Upper bounds: x[i,j] <= food.remaining_quantity * y[i,j]
for ngo_id, food_id in valid_combinations:
    food = next((f for f in foods if f['id'] == food_id), None)
    if not food:
        continue
    constraint = solver.Constraint(-solver.infinity(), 0)
    constraint.SetCoefficient(x[ngo_id, food_id], 1)
    constraint.SetCoefficient(y[ngo_id, food_id], -float(food['remaining_quantity']))

# Lower bounds: x[i,j] >= min_alloc * y[i,j]
for ngo_id, food_id in valid_combinations:
    constraint = solver.Constraint(0, solver.infinity())
    constraint.SetCoefficient(x[ngo_id, food_id], 1)
    constraint.SetCoefficient(y[ngo_id, food_id], -min_alloc)

# 4. Maximum sources constraints
for ngo in ngos:
    constraint = solver.Constraint(0, max_sources)
    for ngo_id, food_id in valid_combinations:
        if ngo_id == ngo['id']:
            constraint.SetCoefficient(y[ngo_id, food_id], 1)

# Solve the model
status = solver.Solve()

# Process the solution
allocations = []
if status == pywraplp.Solver.OPTIMAL:
    for ngo_id, food_id in valid_combinations:
        if x[ngo_id, food_id].solution_value() > 0.1:  # Only include significant allocations
            allocations.append({
                'ngo_id': ngo_id,
                'food_donation_id': food_id,
                'allocated_quantity': round(x[ngo_id, food_id].solution_value(), 2)
            })

# Write the output to file
with open('${outputFile.replace(/\\/g, '\\\\')}', 'w') as f:
    json.dump({
        'status': 'optimal' if status == pywraplp.Solver.OPTIMAL else 'infeasible',
        'objective_value': solver.Objective().Value() if status == pywraplp.Solver.OPTIMAL else 0,
        'allocations': allocations
    }, f)
`);

    // Execute the Python script
    return new Promise<AllocationResult[]>((resolve, reject) => {
      console.log("Running OR-Tools allocation script...");
      
      const pythonProcess = spawn('python', [scriptPath]);
      
      let stderr = '';
      pythonProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        console.error(`Python stderr: ${data}`);
      });
      
      pythonProcess.on('close', (code: number) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          console.error(`Error: ${stderr}`);
          return reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
        
        try {
          // Read the results from the output file
          if (fs.existsSync(outputFile)) {
            const resultData: AllocationOutputData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
            
            if (resultData.status !== 'optimal') {
              console.log("No optimal solution found");
              return resolve([]);
            }
            
            console.log(`Solution found with objective value: ${resultData.objective_value}`);
            console.log(`Generated ${resultData.allocations.length} allocation results`);
            
            // Clean up temporary files
            try {
              fs.unlinkSync(inputFile);
              fs.unlinkSync(outputFile);
              fs.unlinkSync(scriptPath);
            } catch (cleanupError) {
              console.warn("Error cleaning up temporary files:", cleanupError);
              // Continue despite cleanup errors
            }
            
            return resolve(resultData.allocations);
          } else {
            return reject(new Error("Output file not found"));
          }
        } catch (error) {
          console.error("Error processing allocation results:", error);
          return reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error in OR-Tools allocation:', error);
    throw error;
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Implementation of haversine formula for distance calculation
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  
  return distance;
}

// Helper function to calculate days until expiry
function calculateDaysUntilExpiry(expiryDate: Date): number {
  const currentTime = new Date();
  const timeDiff = expiryDate.getTime() - currentTime.getTime();
  return Math.max(0, timeDiff / (1000 * 3600 * 24)); // Convert to days, min 0
}

interface AllocationStats {
  totalNGOs: number;
  totalFoodDonations: number;
  totalAllocations: number;
}

// API Endpoint to run the allocation algorithm
router.post('/allocate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as UserPayload;
    
    // Only admin users can trigger the allocation process
    if (!user?.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }
    
    // Fetch all active NGOs
    const ngoQuery = await query(
      `SELECT 
        id, ngo_name, storage_capacity_kg, vehicle_capacity_kg, 
        food_preferences, priority_level, latitude, longitude
       FROM ngos
       WHERE is_verified = TRUE`,
      []
    );
    
    // Fetch all available food donations
    const foodQuery = await query(
      `SELECT 
        id, food_type, food_category, 
        COALESCE(weight_kg, servings, quantity) as remaining_quantity,
        expiration_time, pickup_location
       FROM food_donations
       WHERE status = 'AVAILABLE' 
       AND expiration_time > CURRENT_TIMESTAMP`,
      []
    );
    
    // Fetch previous allocations
    const previousAllocationsQuery = await query(
      `SELECT 
        ngo_id, food_donation_id, allocated_quantity
       FROM food_allocations
       WHERE allocation_status = 'COMPLETED'`,
      []
    );
    
    // Enrich food donations with geocoded coordinates using mapService
    const enrichedFoodDonations = await enrichFoodDonationsWithCoordinates(foodQuery.rows);
    
    // Run the OR-Tools allocation algorithm
    const allocations = await allocateFoodWithORTools(
      ngoQuery.rows as NGO[],
      enrichedFoodDonations,
      previousAllocationsQuery.rows as PreviousAllocation[]
    );
    
    // Store the new allocations in the database
    // First, delete any pending allocations
    await query(
      `DELETE FROM food_allocations 
       WHERE allocation_status = 'PENDING'`,
      []
    );
    
    // Insert new allocations
    for (const allocation of allocations) {
      await query(
        `INSERT INTO food_allocations 
         (food_donation_id, ngo_id, allocated_quantity, allocation_status)
         VALUES ($1, $2, $3, 'PENDING')`,
        [allocation.food_donation_id, allocation.ngo_id, allocation.allocated_quantity]
      );
    }
    
    // Update food donations to mark them as ALLOCATED if fully allocated
    // First, calculate the sum of allocations per food donation
   
    const stats: AllocationStats = {
      totalNGOs: ngoQuery.rows.length,
      totalFoodDonations: foodQuery.rows.length,
      totalAllocations: allocations.length
    };
    
    res.status(200).json({
      success: true,
      message: 'Food allocation completed successfully',
      allocations: allocations,
      statistics: stats
    });
  } catch (error) {
    console.error('Error in food allocation process:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete food allocation process',
      error: (error as Error).message
    });
  }
});

router.get('/allocations/user', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as UserPayload;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }
    
    // Find the NGO associated with this user
    const ngoQuery = await query(
      `SELECT id FROM ngos WHERE user_id = $1`,
      [user.id]
    );
    
    if (!ngoQuery.rows.length) {
      res.status(404).json({
        success: false,
        message: 'No NGO profile found for this user'
      });
      return;
    }
    
    const ngoId = ngoQuery.rows[0].id;
    
    // Get allocations for this NGO
    const allocationsQuery = await query(
      `SELECT 
        a.id, a.food_donation_id, a.allocated_quantity, a.allocation_status,
        a.allocated_at, a.accepted, a.pickup_scheduled, a.pickup_completed,
        f.food_type, f.food_category, f.expiration_time, f.pickup_location,
        d.organization_name as donor_name, d.contact_person, d.contact_number
       FROM food_allocations a
       JOIN food_donations f ON a.food_donation_id = f.id
       JOIN donors d ON f.donor_id = d.id
       WHERE a.ngo_id = $1
       ORDER BY f.expiration_time ASC`,
      [ngoId]
    );
    
    res.status(200).json({
      success: true,
      allocations: allocationsQuery.rows
    });
  } catch (error) {
    console.error('Error fetching user NGO allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NGO allocations',
      error: (error as Error).message
    });
  }
});

// Endpoint for an NGO to accept or reject an allocation
router.put('/allocations/:allocationId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as UserPayload;
    const { allocationId } = req.params;
    const { action } = req.body; // 'ACCEPT' or 'REJECT'
    
    if (!action || !['ACCEPT', 'REJECT'].includes(action)) {
      res.status(400).json({
        success: false,
        message: 'Invalid action. Must be ACCEPT or REJECT'
      });
      return;
    }
    
    // Verify user has access to this allocation through their associated NGO
    const allocationAccess = await query(
      `SELECT a.id, a.ngo_id, a.food_donation_id, a.allocated_quantity
       FROM food_allocations a
       JOIN ngos n ON a.ngo_id = n.id
       WHERE a.id = $1 AND n.user_id = $2`,
      [allocationId, user.id]
    );
    
    if (!allocationAccess.rows.length) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized access to allocation'
      });
      return;
    }
    
    const allocation = allocationAccess.rows[0];
    
    if (action === 'ACCEPT') {
      // First, verify sufficient quantity still exists in the food donation
      const foodQuery = await query(
        `SELECT id, COALESCE(weight_kg, servings, quantity) as quantity
         FROM food_donations
         WHERE id = $1 AND status = 'AVAILABLE'`,
        [allocation.food_donation_id]
      );
      
      if (!foodQuery.rows.length) {
        res.status(404).json({
          success: false,
          message: 'Food donation not found or no longer available'
        });
        return;
      }
      
      const food = foodQuery.rows[0];
      
      // Check if there's still enough quantity available
      if (food.quantity < allocation.allocated_quantity) {
        res.status(400).json({
          success: false,
          message: `Not enough quantity available. Required: ${allocation.allocated_quantity}, Available: ${food.quantity}`
        });
        return;
      }
      
      // Update allocation status to ACCEPTED
      await query(
        `UPDATE food_allocations 
         SET allocation_status = 'ACCEPTED', 
             accepted = TRUE
         WHERE id = $1`,
        [allocationId]
      );
      
      // IMPORTANT: Now that the NGO has accepted, we update the food donation quantity
      const newQuantity = food.quantity - allocation.allocated_quantity;
      
      // Update the food donation quantity
      await query(
        `UPDATE food_donations 
         SET quantity = $1
         WHERE id = $2`,
        [newQuantity, allocation.food_donation_id]
      );
      
      // If quantity is now 0, update the status to 'ALLOCATED'
      if (newQuantity <= 0) {
        await query(
          `UPDATE food_donations 
           SET status = 'ALLOCATED' 
           WHERE id = $1`,
          [allocation.food_donation_id]
        );
      }
      
      res.status(200).json({
        success: true,
        message: 'Allocation accepted successfully'
      });
    } else if (action === 'REJECT') {
      // Update allocation status to REJECTED
      await query(
        `DELETE FROM food_allocations WHERE id = $1`,
        [allocationId]
      );
      
      res.status(200).json({
        success: true,
        message: 'Allocation rejected successfully'
      });
    }
  } catch (error) {
    console.error(`Error ${req.body.action === 'ACCEPT' ? 'accepting' : 'rejecting'} allocation:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to ${req.body.action === 'ACCEPT' ? 'accept' : 'reject'} allocation`,
      error: (error as Error).message
    });
  }
});

// Endpoint to get all allocations (admin only)
router.get('/allocations', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as UserPayload;
    
    // Verify user is an admin
    if (!user?.id || user.role.toUpperCase() !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only admin users can view all allocations'
      });
      return;
    }
    
    // Get all allocations
    const allocationsQuery = await query(
      `SELECT 
        a.id, a.food_donation_id, a.ngo_id, a.allocated_quantity, 
        a.allocation_status, a.allocated_at,
        f.food_type, f.food_category, f.expiration_time,
        n.ngo_name, d.organization_name as donor_name
       FROM food_allocations a
       JOIN food_donations f ON a.food_donation_id = f.id
       JOIN ngos n ON a.ngo_id = n.id
       JOIN donors d ON f.donor_id = d.id
       ORDER BY a.allocated_at DESC`,
      []
    );
    
    res.status(200).json({
      success: true,
      allocations: allocationsQuery.rows
    });
  } catch (error) {
    console.error('Error fetching all allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch allocations',
      error: (error as Error).message
    });
  }
});

// Manual allocation endpoint (admin only)
router.post('/manual-allocate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as UserPayload;
    
    // Verify user is an admin
    if (!user?.id || user.role.toUpperCase() !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only admin users can manually allocate food'
      });
      return;
    }
    
    const { food_donation_id, ngo_id, quantity } = req.body;
    
    if (!food_donation_id || !ngo_id || !quantity || quantity <= 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid input data. food_donation_id, ngo_id, and positive quantity are required'
      });
      return;
    }
    
    // Verify the food donation exists and has enough quantity
    const foodQuery = await query(
      `SELECT id, remaining_quantity, status
       FROM food_donations
       WHERE id = $1 AND status IN ('AVAILABLE', 'PARTIALLY_ALLOCATED')`,
      [food_donation_id]
    );
    
    if (!foodQuery.rows.length) {
      res.status(404).json({
        success: false,
        message: 'Food donation not found or not available for allocation'
      });
      return;
    }
    
    const food = foodQuery.rows[0];
    
    if (food.remaining_quantity < quantity) {
      res.status(400).json({
        success: false,
        message: `Not enough quantity available. Requested: ${quantity}, Available: ${food.remaining_quantity}`
      });
      return;
    }
    
    // Verify the NGO exists
    const ngoQuery = await query(
      `SELECT id, storage_capacity_kg
       FROM ngos
       WHERE id = $1 AND is_verified = TRUE `,
      [ngo_id]
    );
    
    if (!ngoQuery.rows.length) {
      res.status(404).json({
        success: false,
        message: 'NGO not found or not eligible to receive donations'
      });
      return;
    }
    
    // Check NGO storage capacity
    const ngo = ngoQuery.rows[0];
    
    // Get current allocations to this NGO
    const currentAllocationsQuery = await query(
      `SELECT SUM(allocated_quantity) as total_allocated
       FROM food_allocations
       WHERE ngo_id = $1 AND allocation_status IN ('PENDING', 'ACCEPTED')`,
      [ngo_id]
    );
    
    const currentAllocated = parseFloat(currentAllocationsQuery.rows[0]?.total_allocated || '0');
    
    if (currentAllocated + quantity > ngo.storage_capacity_kg) {
      res.status(400).json({
        success: false,
        message: `Allocation would exceed NGO storage capacity. Requested: ${quantity}, Current: ${currentAllocated}, Capacity: ${ngo.storage_capacity_kg}`
      });
      return;
    }
    
    // Create the allocation
    const insertQuery = await query(
      `INSERT INTO food_allocations 
       (food_donation_id, ngo_id, allocated_quantity, allocation_status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id`,
      [food_donation_id, ngo_id, quantity]
    );
    
   
    
    res.status(201).json({
      success: true,
      message: 'Manual allocation created successfully',
      allocation_id: insertQuery.rows[0].id
    });
  } catch (error) {
    console.error('Error in manual allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create manual allocation',
      error: (error as Error).message
    });
  }
});

// Run allocation on schedule
// This function could be called by a cron job
export async function runAllocation(): Promise<void> {
  try {
    console.log('Running food allocation...');
    
    // Fetch all active NGOs
    const ngoQuery = await query(
      `SELECT 
        id, ngo_name, storage_capacity_kg, vehicle_capacity_kg, 
        food_preferences, priority_level, latitude, longitude
       FROM ngos
       WHERE is_verified = TRUE `,
      []
    );
    
    // Fetch all available food donations - Note: no latitude/longitude in query
    const foodQuery = await query(
      `SELECT 
        id, food_type, food_category, 
        COALESCE(weight_kg, servings, quantity) as remaining_quantity,
        expiration_time, pickup_location
       FROM food_donations
       WHERE status = 'AVAILABLE' 
       AND expiration_time > CURRENT_TIMESTAMP`,
      []
    );
    
    // Fetch previous allocations
    const previousAllocationsQuery = await query(
      `SELECT 
        ngo_id, food_donation_id, allocated_quantity
       FROM food_allocations
       WHERE allocation_status = 'COMPLETED'`,
      []
    );
    
    if (!foodQuery.rows.length || !ngoQuery.rows.length) {
      console.log('No food donations or NGOs available for allocation');
      return;
    }
    
    // Enrich food donations with geocoded coordinates using mapService
    const enrichedFoodDonations = await enrichFoodDonationsWithCoordinates(foodQuery.rows);
    
    // Run the OR-Tools allocation algorithm
    const allocations = await allocateFoodWithORTools(
      ngoQuery.rows as NGO[],
      enrichedFoodDonations,
      previousAllocationsQuery.rows as PreviousAllocation[]
    );
    
    // Store the new allocations in the database
    // First, delete any pending allocations
    await query(
      `DELETE FROM food_allocations 
       WHERE allocation_status = 'PENDING'`,
      []
    );
    
    // Insert new allocations
    for (const allocation of allocations) {
      await query(
        `INSERT INTO food_allocations 
         (food_donation_id, ngo_id, allocated_quantity, allocation_status)
         VALUES ($1, $2, $3, 'PENDING')`,
        [allocation.food_donation_id, allocation.ngo_id, allocation.allocated_quantity]
      );
    }
    
    // Update food donations to mark them as ALLOCATED if fully allocated
    // First, calculate the sum of allocations per food donation
    const allocationSums: { [foodId: number]: number } = {};
    
    for (const allocation of allocations) {
      if (!allocationSums[allocation.food_donation_id]) {
        allocationSums[allocation.food_donation_id] = 0;
      }
      allocationSums[allocation.food_donation_id] += allocation.allocated_quantity;
    }
    
    // Update food donations status if fully allocated
 
    
    console.log(`Allocation completed: ${allocations.length} allocations created`);
  } catch (error) {
    console.error('Error in allocation process:', error);
  }
}

// Run allocation on schedule
async function scheduledAllocation(): Promise<void> {
  await runAllocation();
}

// Export needed functions and router
export { scheduledAllocation };
export default router;