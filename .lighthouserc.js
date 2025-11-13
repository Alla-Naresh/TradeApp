module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5173'],
      startServerCommand: 'npm run start',
      numberOfRuns: 1,
      settings: {
        preset: 'desktop', // or 'mobile'
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.3 }],
        'categories:accessibility': ['error', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage', // or use 'lhci' server
    },
  },
};
