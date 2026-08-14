export type FrontendSecurityEnvironment = {
  NODE_ENV?: string;
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_STORAGE_ORIGIN?: string;
  NEXT_PUBLIC_MEDIA_HOSTS?: string;
};

const googleMapOrigins = [
  'https://google.com',
  'https://*.google.com',
  'https://googleusercontent.com',
  'https://*.googleusercontent.com',
];

export function buildContentSecurityPolicy(environment: FrontendSecurityEnvironment): string {
  const isProduction = environment.NODE_ENV === 'production';
  const apiOrigins = approvedOrigins([environment.NEXT_PUBLIC_API_URL]);
  const mediaOrigins = approvedOrigins([
    environment.NEXT_PUBLIC_STORAGE_ORIGIN,
    ...(environment.NEXT_PUBLIC_MEDIA_HOSTS ?? '').split(','),
  ]);
  const directives: Array<[string, ...string[]]> = [
    ['default-src', "'self'"],
    ['base-uri', "'none'"],
    ['object-src', "'none'"],
    ['frame-ancestors', "'none'"],
    ['form-action', "'self'"],
    ['script-src', "'self'", "'unsafe-inline'", ...(isProduction ? [] : ["'unsafe-eval'"])],
    ['style-src', "'self'", "'unsafe-inline'"],
    ['font-src', "'self'", 'data:'],
    ['img-src', "'self'", 'data:', 'blob:', ...mediaOrigins],
    ['media-src', "'self'", 'blob:', ...mediaOrigins],
    [
      'connect-src',
      "'self'",
      ...apiOrigins,
      ...mediaOrigins,
      ...(isProduction ? [] : ['ws:', 'wss:']),
    ],
    ['frame-src', ...googleMapOrigins],
    ['worker-src', "'self'", 'blob:'],
    ['manifest-src', "'self'"],
  ];

  if (isProduction) directives.push(['upgrade-insecure-requests']);

  return directives.map(([name, ...values]) => [name, ...new Set(values)].join(' ')).join('; ');
}

export function frontendSecurityHeaders(
  environment: FrontendSecurityEnvironment,
): Array<{ key: string; value: string }> {
  const headers = [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(environment) },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value:
        'accelerometer=(), autoplay=(), camera=(), encrypted-media=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
    { key: 'X-XSS-Protection', value: '0' },
  ];

  if (environment.NODE_ENV === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    });
  }

  return headers;
}

function approvedOrigins(values: Array<string | undefined>): string[] {
  return [
    ...new Set(
      values.flatMap((value) => {
        if (!value?.trim()) return [];
        try {
          const url = new URL(value.trim());
          return ['http:', 'https:'].includes(url.protocol) ? [url.origin] : [];
        } catch {
          return [];
        }
      }),
    ),
  ];
}
