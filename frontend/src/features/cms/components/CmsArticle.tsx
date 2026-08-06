import { cmsParagraphs } from '../sanitize-cms';

export function CmsArticle({ content }: { content: string }) {
  const paragraphs = cmsParagraphs(content);
  if (!paragraphs.length) {
    return <p className="text-foreground">Content will be available soon.</p>;
  }
  return (
    <div className="space-y-5">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-foreground text-lg leading-8">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
