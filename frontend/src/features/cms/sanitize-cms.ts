const blockedBlocks = /<(script|style|iframe|object|embed|template)[^>]*>[\s\S]*?<\/\1\s*>/gi;
const htmlTag = /<[^>]*>/g;

/** Generic CMS prose uses a text-only allowlist; React performs the final HTML escaping. */
export function sanitizeCmsText(input: string): string {
  return input
    .replace(blockedBlocks, ' ')
    .replace(htmlTag, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cmsParagraphs(input: string): string[] {
  const safe = sanitizeCmsText(input);
  return safe ? safe.split(/\n{2,}/).filter(Boolean) : [];
}
