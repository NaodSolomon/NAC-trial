export function TeaserHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
      <p className="text-foreground mt-3">{description}</p>
    </div>
  );
}
