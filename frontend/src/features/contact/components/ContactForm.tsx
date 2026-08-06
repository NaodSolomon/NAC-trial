'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { contactSchema, type ContactFormData } from '@/features/contact/schemas/contact.schema';

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = () => {
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="name">Your Name</Label>
        <Input id="name" placeholder="Enter your name" {...register('name')} className="mt-1" />
        {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          {...register('email')}
          className="mt-1"
        />
        {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          placeholder="Enter subject"
          {...register('subject')}
          className="mt-1"
        />
        {errors.subject && (
          <p className="mt-1 text-sm text-destructive">{errors.subject.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Write your message..."
          rows={6}
          {...register('message')}
          className="mt-1"
        />
        {errors.message && (
          <p className="mt-1 text-sm text-destructive">{errors.message.message}</p>
        )}
      </div>

      <button
        type="submit"
        className="rounded bg-primary px-8 py-3 font-semibold uppercase text-white transition hover:bg-primary-hover"
      >
        Send Message
      </button>
    </form>
  );
}
