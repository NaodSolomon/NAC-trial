type QueryParameters = Readonly<Record<string, unknown>>;

export const queryKeys = {
  settings: {
    all: ['settings'] as const,
    public: () => ['settings', 'public'] as const,
  },
  navigation: {
    all: ['navigation'] as const,
    public: () => ['navigation', 'public'] as const,
  },
  cms: {
    all: ['cms'] as const,
    page: (slug: string, languageCode = 'en') => ['cms', 'page', slug, languageCode] as const,
    adminList: (parameters: QueryParameters = {}) => ['cms', 'admin', parameters] as const,
  },
  seo: {
    all: ['seo'] as const,
    page: (slug: string, languageCode = 'en') => ['seo', slug, languageCode] as const,
  },
  blog: {
    all: ['blog'] as const,
    publicList: (parameters: QueryParameters = {}) => ['blog', 'public', parameters] as const,
    detail: (slug: string) => ['blog', 'detail', slug] as const,
    adminList: (parameters: QueryParameters = {}) => ['blog', 'admin', parameters] as const,
  },
  events: {
    all: ['events'] as const,
    publicList: (parameters: QueryParameters = {}) => ['events', 'public', parameters] as const,
    detail: (slugOrId: string) => ['events', 'detail', slugOrId] as const,
    adminList: (parameters: QueryParameters = {}) => ['events', 'admin', parameters] as const,
  },
  gallery: {
    all: ['gallery'] as const,
    publicList: (parameters: QueryParameters = {}) => ['gallery', 'public', parameters] as const,
    adminList: (parameters: QueryParameters = {}) => ['gallery', 'admin', parameters] as const,
  },
  engagement: {
    all: ['engagement'] as const,
    contact: (languageCode = 'en') => ['engagement', 'contact', languageCode] as const,
    volunteer: (languageCode = 'en') => ['engagement', 'volunteer', languageCode] as const,
    testimonials: (parameters: QueryParameters = {}) =>
      ['engagement', 'testimonials', parameters] as const,
    adminContact: (parameters: QueryParameters = {}) =>
      ['engagement', 'admin', 'contact', parameters] as const,
    adminVolunteers: (parameters: QueryParameters = {}) =>
      ['engagement', 'admin', 'volunteers', parameters] as const,
    adminTestimonials: (parameters: QueryParameters = {}) =>
      ['engagement', 'admin', 'testimonials', parameters] as const,
    // Subscriber addresses must never be passed into this key.
    adminNewsletter: (parameters: QueryParameters = {}) =>
      ['engagement', 'admin', 'newsletter', parameters] as const,
  },
  resources: {
    all: ['resources'] as const,
    publicList: (parameters: QueryParameters = {}) => ['resources', 'public', parameters] as const,
    adminList: (parameters: QueryParameters = {}) => ['resources', 'admin', parameters] as const,
  },
  search: {
    all: ['search'] as const,
    results: (term: string, parameters: QueryParameters = {}) =>
      ['search', term, parameters] as const,
  },
  donations: {
    all: ['donations'] as const,
    runtime: () => ['donations', 'runtime'] as const,
    gateways: () => ['donations', 'gateways'] as const,
    detail: (id: string) => ['donations', id] as const,
    adminList: (parameters: QueryParameters = {}) => ['donations', 'admin', parameters] as const,
  },
  administrators: {
    all: ['administrators'] as const,
    list: (parameters: QueryParameters = {}) => ['administrators', parameters] as const,
    detail: (id: string) => ['administrators', id] as const,
  },
  sessions: {
    all: ['admin-sessions'] as const,
    list: (parameters: QueryParameters = {}) => ['admin-sessions', parameters] as const,
  },
  auditLogs: {
    all: ['audit-logs'] as const,
    list: (parameters: QueryParameters = {}) => ['audit-logs', parameters] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    summary: (parameters: QueryParameters = {}) => ['analytics', 'summary', parameters] as const,
  },
} as const;
