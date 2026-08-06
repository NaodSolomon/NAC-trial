import Image from 'next/image';
import Link from 'next/link';

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card w-full rounded-xl border p-6 shadow-xl sm:p-8">
      <Link href="/" className="mx-auto mb-7 block w-fit" aria-label="Nehemiah Autism Center home">
        <Image
          src="/images/logo.png"
          alt="Nehemiah Autism Center"
          width={180}
          height={50}
          priority
        />
      </Link>
      <h1 className="text-heading text-center text-2xl font-semibold sm:text-3xl">{title}</h1>
      <p className="text-foreground mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed">
        {description}
      </p>
      <div className="mt-7">{children}</div>
    </div>
  );
}
