/** Route builders. Use these instead of string literals in links. */
export const routes = {
  landing: '/',
  login: '/login',
  signUp: '/sign-up',
  roleSelect: '/role-select',
  client: {
    home: '/home',
    ask: '/ask',
    brief: (briefId: string) => `/ask/${briefId}`,
    library: '/library',
    report: (itemId: string) => `/library/${itemId}`,
    requests: '/requests',
    request: (requestId: string) => `/requests/${requestId}`,
    workspace: '/workspace',
    wallet: '/wallet',
    settings: '/settings',
  },
  expert: {
    home: '/expert/home',
    calls: '/expert/calls',
    earnings: '/expert/earnings',
    profile: '/expert/profile',
  },
  admin: {
    login: '/admin/login',
    dashboard: '/admin/dashboard',
    briefs: '/admin/briefs',
    experts: '/admin/experts',
    interviews: '/admin/interviews',
    finance: '/admin/finance',
  },
} as const;
