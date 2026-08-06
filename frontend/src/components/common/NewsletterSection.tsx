'use client';

import { type FormEvent } from 'react';

export default function NewsletterSection() {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <section className="bg-primary py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 md:flex-row">
        <div>
          <h2 className="font-serif text-2xl font-bold uppercase text-white md:text-3xl">
            Subscribe Newsletter
          </h2>
          <p className="mt-2 text-sm text-white/80">
            Get the latest updates and offers directly in your inbox.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="email"
            placeholder="Enter your email"
            required
            className="min-w-[250px] flex-1 rounded-l px-4 py-3 text-text-dark outline-none"
          />
          <button
            type="submit"
            className="rounded-r bg-text-dark px-6 py-3 text-sm font-semibold uppercase text-white transition hover:bg-black"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
