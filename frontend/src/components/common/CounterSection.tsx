'use client';

import Image from 'next/image';
import CountUp from 'react-countup';
import { useReducedMotion } from 'framer-motion';

interface CounterItem {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}

interface CounterSectionProps {
  items: CounterItem[];
  backgroundImage?: string;
}

export default function CounterSection({
  items,
  backgroundImage = '/images/counter_bg.jpg',
}: CounterSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative">
      <Image
        src={backgroundImage}
        alt="Counter background"
        fill
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {items.map((item, index) => (
            <div key={index} className="text-center text-white">
              <div className="mb-4 flex justify-center text-4xl text-primary">{item.icon}</div>
              <p className="mb-2 text-sm uppercase tracking-wider text-white/80">
                {item.label}
              </p>
              <div className="text-4xl font-bold md:text-5xl">
                {reduceMotion ? (
                  `${item.value.toLocaleString()}${item.suffix ?? ''}`
                ) : (
                  <CountUp
                    end={item.value}
                    suffix={item.suffix}
                    enableScrollSpy
                    scrollSpyOnce
                    duration={2.5}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
