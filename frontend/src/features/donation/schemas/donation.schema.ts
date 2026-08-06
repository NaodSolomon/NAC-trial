import { z } from 'zod';

export const donationSchema = z.object({
  amount: z.number().min(1, 'Minimum donation is $1'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export type DonationFormData = z.infer<typeof donationSchema>;
