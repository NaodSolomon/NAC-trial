'use client';

import { useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Slide {
  image: string;
  title: string;
  subtitle: string;
  primaryButton?: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
}

interface HeroSliderProps {
  slides: Slide[];
}

export default function HeroSlider({ slides }: HeroSliderProps) {
  const prefersReducedMotion = useReducedMotion();
  const plugins = useMemo(
    () => (prefersReducedMotion ? [] : [Autoplay({ delay: 6000, stopOnInteraction: false })]),
    [prefersReducedMotion],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, plugins);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  const selectedIndex = emblaApi?.selectedScrollSnap() ?? 0;

  return (
    <section
      className="relative w-full overflow-hidden"
      ref={emblaRef}
      aria-roledescription="carousel"
    >
      <div className="flex">
        {slides.map((slide, index) => (
          <div
            key={index}
            className="relative min-h-[600px] min-w-0 flex-[0_0_100%] lg:min-h-[700px]"
          >
            <Image
              src={slide.image}
              alt={slide.title.replace(/<[^>]*>/g, '')}
              fill
              className="object-cover"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/70" />
            <div className="relative z-10 flex min-h-[600px] items-center lg:min-h-[700px]">
              <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16">
                <div className="max-w-2xl">
                  <h1
                    className="font-serif text-4xl leading-tight font-bold text-white md:text-5xl lg:text-6xl"
                    dangerouslySetInnerHTML={{ __html: slide.title }}
                  />
                  <p className="mt-6 text-lg text-white/90 md:text-xl">{slide.subtitle}</p>
                </div>
                <div className="mt-8 flex gap-4">
                  {slide.primaryButton && (
                    <Link
                      href={slide.primaryButton.href}
                      className="bg-primary hover:bg-primary-hover rounded px-8 py-3 text-sm font-semibold text-white uppercase transition"
                    >
                      {slide.primaryButton.label}
                    </Link>
                  )}
                  {slide.secondaryButton && (
                    <Link
                      href={slide.secondaryButton.href}
                      className="hover:text-text-dark rounded border-2 border-white px-8 py-3 text-sm font-semibold text-white uppercase transition hover:bg-white"
                    >
                      {slide.secondaryButton.label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => scrollTo(index)}
            aria-current={index === selectedIndex ? 'true' : undefined}
            className="inline-flex size-11 items-center justify-center rounded-full"
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-3 rounded-full transition-colors',
                index === selectedIndex ? 'bg-primary' : 'bg-white/60',
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
