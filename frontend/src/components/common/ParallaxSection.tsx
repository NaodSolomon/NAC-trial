'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ParallaxSectionProps {
  backgroundImage: string;
  children: React.ReactNode;
  className?: string;
  overlayOpacity?: number;
}

export default function ParallaxSection({
  backgroundImage,
  children,
  className,
  overlayOpacity = 0.6,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <motion.div className="absolute inset-0 -top-[15%] -bottom-[15%]" style={{ y }}>
        <Image
          src={backgroundImage}
          alt=""
          fill
          className="object-cover"
        />
      </motion.div>

      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
