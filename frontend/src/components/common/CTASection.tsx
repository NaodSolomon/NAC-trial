import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';

interface CTASectionProps {
  title: string;
  buttonLabel: string;
  buttonHref: string;
  backgroundImage?: string;
}

export default function CTASection({
  title,
  buttonLabel,
  buttonHref,
  backgroundImage,
}: CTASectionProps) {
  return (
    <section className="relative bg-primary py-20 text-center text-white">
      {backgroundImage && (
        <>
          <Image
            src={backgroundImage}
            alt="Call to action background"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white">
          <Play className="h-6 w-6 text-white" />
        </div>
        <h2 className="mb-8 font-serif text-3xl font-bold md:text-4xl">{title}</h2>
        <Link
          href={buttonHref}
          className="inline-block rounded bg-white px-8 py-3 text-sm font-semibold uppercase text-primary transition hover:bg-gray-100"
        >
          {buttonLabel}
        </Link>
      </div>
    </section>
  );
}
