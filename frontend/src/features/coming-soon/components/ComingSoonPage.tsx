'use client';

import { type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Countdown from 'react-countdown';

interface CountdownRendererProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function CountdownRenderer({ days, hours, minutes, seconds }: CountdownRendererProps) {
  const blocks = [
    { value: days, label: 'Days' },
    { value: hours, label: 'Hours' },
    { value: minutes, label: 'Minutes' },
    { value: seconds, label: 'Seconds' },
  ];

  return (
    <div className="mt-8 flex gap-4">
      {blocks.map((block) => (
        <div
          key={block.label}
          className="rounded-lg bg-white/10 px-6 py-4 text-center backdrop-blur"
        >
          <p className="text-3xl font-bold md:text-5xl">{String(block.value).padStart(2, '0')}</p>
          <p className="text-sm uppercase tracking-wider text-white/70">{block.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function ComingSoonPage() {
  const launchDate = new Date('2026-06-01T00:00:00');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center text-center text-white">
      {/* Background */}
      <Image
        src="/images/home_1_slider_1.jpg"
        alt="Coming soon background"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-black/70" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4">
        <Image src="/images/logo.png" alt="Nehemiah" width={180} height={50} />

        <h1 className="mt-8 font-serif text-5xl font-bold text-white md:text-7xl">Coming Soon</h1>
        <p className="mt-4 max-w-lg text-lg text-white/80">
          We are working hard to bring you something amazing. Stay tuned for updates and be the
          first to know when we launch.
        </p>

        {/* Countdown */}
        <Countdown
          date={launchDate}
          renderer={({ days, hours, minutes, seconds }) => (
            <CountdownRenderer
              days={days}
              hours={hours}
              minutes={minutes}
              seconds={seconds}
            />
          )}
        />

        {/* Newsletter */}
        <form onSubmit={handleSubmit} className="mt-10 flex w-full max-w-md">
          <input
            type="email"
            aria-label="Email address"
            placeholder="Enter your email"
            required
            className="flex-1 rounded-l px-4 py-3 text-text-dark outline-none"
          />
          <button
            type="submit"
            className="rounded-r bg-primary px-6 py-3 text-sm font-semibold uppercase text-white transition hover:bg-primary-hover"
          >
            Notify Me
          </button>
        </form>

        {/* Back to Home */}
        <Link
          href="/"
          className="mt-8 text-sm text-white/70 transition hover:text-white"
        >
          &larr; Back to Home
        </Link>
      </div>
    </main>
  );
}
