import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface PageBannerProps {
  title: string;
  breadcrumbs: { label: string; href?: string }[];
  backgroundImage?: string;
}

export default function PageBanner({ title, breadcrumbs, backgroundImage }: PageBannerProps) {
  return (
    <section className="relative flex min-h-[300px] items-center justify-center py-24">
      {backgroundImage && (
        <div className="absolute inset-0">
          <Image src={backgroundImage} alt={title} fill className="object-cover" priority />
        </div>
      )}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 text-center">
        <h1 className="font-serif text-4xl font-medium md:text-5xl" style={{ color: 'white' }}>
          {title}
        </h1>

        <nav className="mt-4 flex items-center justify-center gap-1">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-4 w-4 text-white/60" />}
              {crumb.href ? (
                <Link href={crumb.href} className="text-white/80 transition hover:text-white">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-white">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>
    </section>
  );
}
