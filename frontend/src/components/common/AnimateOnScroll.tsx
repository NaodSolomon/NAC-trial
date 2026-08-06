'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimateOnScrollProps {
  children: React.ReactNode;
  animation?: 'fadeUp' | 'fadeLeft' | 'fadeRight' | 'fadeIn';
  delay?: number;
  duration?: number;
  className?: string;
}

const variants = {
  fadeUp: {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
  },
  fadeLeft: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  fadeRight: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
};

export default function AnimateOnScroll({
  children,
  animation = 'fadeUp',
  delay = 0,
  duration = 0.6,
  className,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();

  const variant = variants[animation];

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? variant.animate : variant.initial}
      animate={isInView || prefersReducedMotion ? variant.animate : variant.initial}
      transition={prefersReducedMotion ? { duration: 0 } : { duration, delay, ease: 'easeOut' }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
