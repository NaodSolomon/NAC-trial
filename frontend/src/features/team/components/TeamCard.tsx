import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Twitter, Linkedin } from 'lucide-react';

interface TeamCardProps {
  image: string;
  name: string;
  role: string;
  slug: string;
  social?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export default function TeamCard({ image, name, role, slug, social }: TeamCardProps) {
  return (
    <div>
      <div className="group relative overflow-hidden rounded-lg">
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image src={image} alt={name} fill className="object-cover" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex gap-3">
            {social?.facebook && (
              <a
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/40"
              >
                <Facebook size={18} />
              </a>
            )}
            {social?.twitter && (
              <a
                href={social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/40"
              >
                <Twitter size={18} />
              </a>
            )}
            {social?.linkedin && (
              <a
                href={social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/40"
              >
                <Linkedin size={18} />
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 text-center">
        <Link href={`/team/${slug}`} className="font-serif font-semibold text-heading">
          {name}
        </Link>
        <p className="text-sm text-foreground">{role}</p>
      </div>
    </div>
  );
}
