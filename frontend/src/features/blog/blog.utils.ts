export function blogImage(value: string | null, index = 0): string {
  if (value?.startsWith('/')) return value;
  const storageOrigin = process.env.NEXT_PUBLIC_STORAGE_ORIGIN;
  if (value && storageOrigin && value.startsWith(storageOrigin + '/')) return value;
  return '/images/blog_' + ((index % 4) + 1) + '.jpg';
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
