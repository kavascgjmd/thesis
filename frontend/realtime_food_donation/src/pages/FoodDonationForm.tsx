import React ,{ useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card/Card';
import { Alert, AlertDescription } from '../components/ui/alert/Alert';
import { Button } from '../components/ui/button/Button';
import { Input } from '../components/ui/input/Input';
import { Label } from '../components/ui/label/Label';
import { GoogleMapsAutocomplete } from '../components/GoogleMapsAutocomplete';
import { RadioGroup, RadioGroupItem } from '../components/ui/alert/RadioGroup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select/Select';

// Updated schema to handle different food categories and structured availability schedule
const foodDonationSchema = z.object({
  food_type: z.string().min(3, "Food type must be at least 3 characters").max(50, "Food type must be less than 50 characters"),
  food_category: z.enum(["Cooked Meal", "Raw Ingredients", "Packaged Items"], {
    required_error: "Please select a food category",
  }),
  // Fields for different categories - properly handled as optional
  servings: z.union([
    z.number().positive("Number of servings must be positive"),
    z.string().transform(val => val === "" ? undefined : Number(val))
  ]).optional(),
  weight_kg: z.union([
    z.number().positive("Weight must be positive"), 
    z.string().transform(val => val === "" ? undefined : Number(val))
  ]).optional(),
  quantity: z.union([
    z.number().positive("Quantity must be positive"),
    z.string().transform(val => val === "" ? undefined : Number(val))
  ]).optional(),
  package_size: z.string().optional(),
  expiration_time: z.string().min(1, "Expiration time is required"),
  pickup_location: z.string().min(5, "Pickup location must be at least 5 characters").max(255, "Pickup location is too long"),
  
  // New fields for structured availability schedule
  start_day: z.string().min(1, "Start day is required"),
  end_day: z.string().min(1, "End day is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  
  // Keep the original field for backend compatibility
  availability_schedule: z.string(),
  
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).superRefine((data, ctx) => {
  // Better conditional validation based on food category
  if (data.food_category === "Cooked Meal" && 
      (data.servings === undefined || data.servings <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Number of servings is required for Cooked Meals",
      path: ["servings"]
    });
  }
  
  if (data.food_category === "Raw Ingredients" && 
      (data.weight_kg === undefined || data.weight_kg <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Weight in kg is required for Raw Ingredients",
      path: ["weight_kg"]
    });
  }
  
  if (data.food_category === "Packaged Items") {
    if (data.quantity === undefined || data.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quantity is required for Packaged Items",
        path: ["quantity"]
      });
    }
    
    if (!data.package_size || data.package_size.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Package size is required for Packaged Items",
        path: ["package_size"]
      });
    }
  }
});

type FoodDonationForm = z.infer<typeof foodDonationSchema>;

// Day options for the select
const dayOptions = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

// Function to format day and time into the required format
const formatAvailabilitySchedule = (startDay: string, endDay: string, startTime: string, endTime: string): string => {
  // Capitalize first letter of day abbreviations
  const formatDay = (day: string) => day.charAt(0).toUpperCase() + day.slice(1, 3);
  
  // Format time to ensure proper AM/PM format
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour.toString().padStart(2, '0')}:${minutes}${ampm}`;
  };

  return `${formatDay(startDay)}-${formatDay(endDay)} ${formatTime(startTime)}-${formatTime(endTime)}`;
};

const DonorFoodForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FoodDonationForm>({
    resolver: zodResolver(foodDonationSchema),
    defaultValues: {
      food_type: '',
      food_category: undefined,
      servings: undefined,
      weight_kg: undefined,
      quantity: undefined,
      package_size: '',
      expiration_time: '',
      pickup_location: '',
      start_day: 'mon',
      end_day: 'fri',
      start_time: '09:00',
      end_time: '17:00',
      availability_schedule: 'Mon-Fri 09:00AM-05:00PM',
    }
  });

  // Watch the food category to show/hide relevant fields
  const selectedFoodCategory = watch('food_category');
  
  // Watch schedule fields to update availability_schedule
  const startDay = watch('start_day');
  const endDay = watch('end_day');
  const startTime = watch('start_time');
  const endTime = watch('end_time');

  // Update availability_schedule when schedule fields change
  React.useEffect(() => {
    if (startDay && endDay && startTime && endTime) {
      const formattedSchedule = formatAvailabilitySchedule(startDay, endDay, startTime, endTime);
      setValue('availability_schedule', formattedSchedule);
    }
  }, [startDay, endDay, startTime, endTime, setValue]);

  const handlePickupLocationChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setValue('pickup_location', address, { shouldValidate: true });
    
    // Store coordinates if available
    if (coordinates) {
      setValue('latitude', coordinates.lat);
      setValue('longitude', coordinates.lng);
    }
  };

  const onSubmit = async (data: FoodDonationForm) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('http://localhost:3000/api/foods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create food donation');
      }

      setSuccess(true);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create food donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6">
      <CardHeader>
        <CardTitle>Create Food Donation</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
            <AlertDescription>Food donation created successfully!</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="food_type">Food Type</Label>
            <Input
              id="food_type"
              placeholder="e.g., Fresh Vegetables, Prepared Meals"
              {...register('food_type')}
              className={errors.food_type ? 'border-red-500' : ''}
            />
            {errors.food_type && (
              <p className="text-sm text-red-500">{errors.food_type.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Food Category</Label>
            <Controller
              name="food_category"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Cooked Meal" id="cooked_meal" />
                    <Label htmlFor="cooked_meal">Cooked Meal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Raw Ingredients" id="raw_ingredients" />
                    <Label htmlFor="raw_ingredients">Raw Ingredients</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Packaged Items" id="packaged_items" />
                    <Label htmlFor="packaged_items">Packaged Items</Label>
                  </div>
                </RadioGroup>
              )}
            />
            {errors.food_category && (
              <p className="text-sm text-red-500">{errors.food_category.message}</p>
            )}
          </div>

          {/* Conditional fields based on food category */}
          {selectedFoodCategory === "Cooked Meal" && (
            <div className="space-y-2">
              <Label htmlFor="servings">Number of Servings</Label>
              <Input
                id="servings"
                type="number"
                placeholder="e.g., 10"
                {...register('servings', { valueAsNumber: true })}
                className={errors.servings ? 'border-red-500' : ''}
              />
              {errors.servings && (
                <p className="text-sm text-red-500">{errors.servings.message}</p>
              )}
            </div>
          )}

          {selectedFoodCategory === "Raw Ingredients" && (
            <div className="space-y-2">
              <Label htmlFor="weight_kg">Weight (kg)</Label>
              <Input
                id="weight_kg"
                type="number"
                step="0.01"
                placeholder="e.g., 5.5"
                {...register('weight_kg', { valueAsNumber: true })}
                className={errors.weight_kg ? 'border-red-500' : ''}
              />
              {errors.weight_kg && (
                <p className="text-sm text-red-500">{errors.weight_kg.message}</p>
              )}
            </div>
          )}

          {selectedFoodCategory === "Packaged Items" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="e.g., 12"
                  {...register('quantity', { valueAsNumber: true })}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500">{errors.quantity.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="package_size">Package Size</Label>
                <Input
                  id="package_size"
                  placeholder="e.g., 500g, 1L, Small box"
                  {...register('package_size')}
                  className={errors.package_size ? 'border-red-500' : ''}
                />
                {errors.package_size && (
                  <p className="text-sm text-red-500">{errors.package_size.message}</p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="expiration_time">Expiration Time</Label>
            <Input
              id="expiration_time"
              type="datetime-local"
              {...register('expiration_time')}
              className={errors.expiration_time ? 'border-red-500' : ''}
            />
            {errors.expiration_time && (
              <p className="text-sm text-red-500">{errors.expiration_time.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup_location">Pickup Location</Label>
            <GoogleMapsAutocomplete
              value={watch('pickup_location') || ''}
              onChange={handlePickupLocationChange}
              disabled={isSubmitting}
              placeholder="Enter pickup location"
            />
            {errors.pickup_location && (
              <p className="text-sm text-red-500">{errors.pickup_location.message}</p>
            )}
          </div>

          {/* New structured availability schedule section */}
          <div className="space-y-4">
            <Label>Availability Schedule</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_day">Start Day</Label>
                <Controller
                  name="start_day"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select start day" />
                      </SelectTrigger>
                      <SelectContent>
                        {dayOptions.map(day => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.start_day && (
                  <p className="text-sm text-red-500">{errors.start_day.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_day">End Day</Label>
                <Controller
                  name="end_day"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select end day" />
                      </SelectTrigger>
                      <SelectContent>
                        {dayOptions.map(day => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.end_day && (
                  <p className="text-sm text-red-500">{errors.end_day.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  {...register('start_time')}
                  className={errors.start_time ? 'border-red-500' : ''}
                />
                {errors.start_time && (
                  <p className="text-sm text-red-500">{errors.start_time.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  {...register('end_time')}
                  className={errors.end_time ? 'border-red-500' : ''}
                />
                {errors.end_time && (
                  <p className="text-sm text-red-500">{errors.end_time.message}</p>
                )}
              </div>
            </div>
            
            <div className="mt-2 text-sm text-gray-500">
              Format: {watch('availability_schedule')}
            </div>
            
            {/* Hidden field to store formatted availability schedule */}
            <input type="hidden" {...register('availability_schedule')} />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Donation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DonorFoodForm;