import Image from 'next/image';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

interface EventCardProps {
  image: string;
  title: string;
  description: string;
  date: string;
  slug: string;
}

export default function EventCard({ image, title, description, date, slug }: EventCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={image} alt={title} fill className="object-cover" />
        <div className="absolute bottom-0 left-0 flex items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-white">
          <Calendar size={14} />
          {date}
        </div>
      </div>
      <div className="p-6">
        <h5 className="font-serif text-lg font-semibold text-heading transition hover:text-primary">
          <Link href={`/events/${slug}`}>{title}</Link>
        </h5>
        <p className="mt-2 line-clamp-3 text-sm text-foreground">{description}</p>
        <Link
          href={`/events/${slug}`}
          className="mt-4 inline-block text-sm font-semibold uppercase text-primary transition hover:text-primary-dark"
        >
          Read More &raquo;
        </Link>
      </div>
    </div>
  );
}
