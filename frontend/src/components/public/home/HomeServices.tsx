import { BookOpenCheck, HandHeart, UsersRound } from 'lucide-react';
import type { HomeServicesSection } from '@/features/home/home.types';

const icons = [HandHeart, BookOpenCheck, UsersRound];

export function HomeServices({ section }: { section: HomeServicesSection }) {
  return (
    <section className="bg-secondary-bg py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-3xl font-semibold sm:text-4xl">{section.heading}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {section.items.map((item, index) => {
            const Icon = icons[index % icons.length];
            return (
              <article
                key={`${item.title}-${index}`}
                className="bg-card rounded-xl border p-7 shadow-sm"
              >
                <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                <p className="text-foreground mt-3 text-sm leading-relaxed">{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
