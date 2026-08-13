const requiredUrls = [
  ['NEXT_PUBLIC_API_URL', { allowPath: true }],
  ['NEXT_PUBLIC_SITE_URL', { allowPath: false }],
  ['NEXT_PUBLIC_STORAGE_ORIGIN', { allowPath: false }],
  ['MEDIA_IMAGE_ORIGIN', { allowPath: false }],
];

for (const [name, policy] of requiredUrls) {
  validatePublicHttpsUrl(process.env[name], name, policy);
}

for (const value of (process.env.NEXT_PUBLIC_MEDIA_HOSTS ?? '').split(',')) {
  if (value.trim()) {
    validatePublicHttpsUrl(value.trim(), 'NEXT_PUBLIC_MEDIA_HOSTS', { allowPath: false });
  }
}

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL);
if (!apiUrl.pathname.replace(/\/+$/, '').endsWith('/api/v1')) {
  throw new Error('NEXT_PUBLIC_API_URL must end with /api/v1');
}

function validatePublicHttpsUrl(value, name, { allowPath }) {
  if (!value?.trim()) throw new Error(`${name} is required when building the production image`);

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }

  const hostname = url.hostname.toLowerCase();
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost');

  if (url.protocol !== 'https:' || isLocal || url.username || url.password) {
    throw new Error(`${name} must use a credential-free, non-local HTTPS URL`);
  }
  if (url.search || url.hash || (!allowPath && url.pathname !== '/')) {
    throw new Error(`${name} must be an origin without a path, query, or fragment`);
  }
}
