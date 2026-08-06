import Image from 'next/image';

interface SponsorLogosProps {
  logos: { src: string; alt: string }[];
}

export default function SponsorLogos({ logos }: SponsorLogosProps) {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {logos.map((logo, index) => (
            <div
              key={index}
              className="flex items-center justify-center p-4 opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                width={150}
                height={80}
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
