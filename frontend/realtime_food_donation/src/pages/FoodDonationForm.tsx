import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card/Card';
import { Alert, AlertDescription } from '../components/ui/alert/Alert';
import { Button } from '../components/ui/button/Button';
import { Input } from '../components/ui/input/Input';
import { Label } from '../components/ui/label/Label';
import { Textarea } from '../components/ui/textarea/TextArea';

const foodDonationSchema = z.object({
  food_type: z.string().min(3, "Food type must be at least 3 characters").max(50, "Food type must be less than 50 characters"),
  quantity: z.number().positive("Quantity must be a positive number"),
  expiration_time: z.string().min(1, "Expiration time is required"),
  pickup_location: z.string().min(5, "Pickup location must be at least 5 characters").max(255, "Pickup location is too long"),
  availability_schedule: z.string().min(5, "Availability schedule must be at least 5 characters").max(255, "Availability schedule is too long"),
});

type FoodDonationForm = z.infer<typeof foodDonationSchema>;

const DonorFoodForm = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FoodDonationForm>({
    resolver: zodResolver(foodDonationSchema),
  });

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

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (servings)</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Number of servings"
              {...register('quantity', { valueAsNumber: true })}
              className={errors.quantity ? 'border-red-500' : ''}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500">{errors.quantity.message}</p>
            )}
          </div>

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
            <Textarea
              id="pickup_location"
              placeholder="Detailed pickup location"
              {...register('pickup_location')}
              className={errors.pickup_location ? 'border-red-500' : ''}
            />
            {errors.pickup_location && (
              <p className="text-sm text-red-500">{errors.pickup_location.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability_schedule">Availability Schedule</Label>
            <Textarea
              id="availability_schedule"
              placeholder="e.g., Monday-Friday, 9 AM - 5 PM"
              {...register('availability_schedule')}
              className={errors.availability_schedule ? 'border-red-500' : ''}
            />
            {errors.availability_schedule && (
              <p className="text-sm text-red-500">{errors.availability_schedule.message}</p>
            )}
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