// JOBFORGE Frontend - Site Configuration

export const APP_CONFIG = {
  siteName: 'JOBFORGE',
  siteDescription: 'Remote job aggregation platform',
  pagination: {
    defaultLimit: 12,
    defaultPage: 1,
  },
  filters: {
    keyword: {
      minLength: 2,
      placeholder: 'Search jobs...',
    },
  },
} as const;
