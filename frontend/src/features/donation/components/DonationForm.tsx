'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  donationSchema,
  type DonationFormData,
} from '@/features/donation/schemas/donation.schema';

const presetAmounts = [25, 50, 100, 250, 500];

export function DonationForm() {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
  });

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setValue('amount', amount, { shouldValidate: true });
  };

  const onSubmit = () => {
    reset();
    setSelectedPreset(null);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Preset Amount Buttons */}
      <div>
        <Label className="mb-3 block">Select Amount</Label>
        <div className="flex flex-wrap gap-3">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => handlePresetClick(amount)}
              className={cn(
                'rounded px-6 py-3 font-semibold transition',
                selectedPreset === amount
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-dark hover:bg-gray-200',
              )}
            >
              ${amount}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div>
        <Label htmlFor="amount">Custom Amount ($)</Label>
        <Input
          id="amount"
          type="number"
          placeholder="Enter custom amount"
          {...register('amount', { valueAsNumber: true })}
          onChange={(e) => {
            setSelectedPreset(null);
            register('amount', { valueAsNumber: true }).onChange(e);
          }}
          className="mt-1"
        />
        {errors.amount && <p className="mt-1 text-sm text-destructive">{errors.amount.message}</p>}
      </div>

      {/* Personal Info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="First name"
            {...register('firstName')}
            className="mt-1"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Last name"
            {...register('lastName')}
            className="mt-1"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Email address"
            {...register('email')}
            className="mt-1"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="phone">Phone (Optional)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Phone number"
            {...register('phone')}
            className="mt-1"
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <Label htmlFor="message">Message (Optional)</Label>
        <Textarea
          id="message"
          placeholder="Leave a message..."
          rows={4}
          {...register('message')}
          className="mt-1"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full rounded bg-primary py-3 text-lg font-semibold uppercase text-white transition hover:bg-primary-hover"
      >
        Donate Now
      </button>
    </form>
  );
}
