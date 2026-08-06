import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  highlightedWord?: string;
  subtitle?: string;
  align?: 'center' | 'left';
}

export default function SectionHeading({
  title,
  highlightedWord,
  subtitle,
  align = 'center',
}: SectionHeadingProps) {
  const renderTitle = () => {
    if (!highlightedWord) {
      return title;
    }

    if (title.toLowerCase().includes(highlightedWord.toLowerCase())) {
      const parts = title.split(new RegExp(`(${highlightedWord})`, 'i'));
      return parts.map((part, index) =>
        part.toLowerCase() === highlightedWord.toLowerCase() ? (
          <span key={index} className="text-primary">
            {part}
          </span>
        ) : (
          part
        ),
      );
    }

    return (
      <>
        {title} <span className="text-primary">{highlightedWord}</span>
      </>
    );
  };

  return (
    <div className={cn('mb-10', align === 'center' ? 'text-center' : 'text-left')}>
      <h2 className="font-serif text-3xl font-medium text-heading md:text-4xl">{renderTitle()}</h2>
      <hr
        className={cn(
          'mt-4 h-0.5 w-12 border-0 bg-primary',
          align === 'center' ? 'mx-auto' : '',
        )}
      />
      {subtitle && <p className="mt-4 text-foreground">{subtitle}</p>}
    </div>
  );
}
