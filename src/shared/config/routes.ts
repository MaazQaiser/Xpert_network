/** Route builders. Use these instead of string literals in links. */
export const routes = {
  landing: '/',
  login: '/login',
  signUp: '/sign-up',
  signUpAs: (role: 'client' | 'expert') => `/sign-up?role=${role}`,
  roleSelect: '/role-select',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',
  resetPassword: (token: string) => `/reset-password?token=${encodeURIComponent(token)}`,
  designSystem: '/design-system',
  client: {
    home: '/home',
    ask: '/ask',
    brief: (briefId: string) => `/ask/${briefId}`,
    library: '/library',
    companies: '/companies',
    report: (itemId: string) => `/library/${itemId}`,
    reportRead: (itemId: string) => `/library/${itemId}/read`,
    requests: '/requests',
    request: (requestId: string) => `/requests/${requestId}`,
    workspace: '/workspace',
    wallet: '/wallet',
    settings: '/settings',
    onboarding: '/onboarding',
  },
  expert: {
    home: '/expert/home',
    calls: '/expert/calls',
    call: (callId: string) => `/expert/calls/${callId}`,
    session: (callId: string) => `/expert/calls/${callId}/session`,
    interview: (interviewId: string) => `/expert/interviews/${interviewId}`,
    earnings: '/expert/earnings',
    profile: '/expert/profile',
    onboarding: '/expert/onboarding',
    pending: '/expert/pending',
  },
  admin: {
    login: '/admin/login',
    home: '/admin/home',
    inbox: '/admin/inbox',
    inboxRequest: (requestId: string) => `/admin/inbox/${requestId}`,
    projects: '/admin/projects',
    project: (projectId: string) => `/admin/projects/${projectId}`,
    projectStep: (
      projectId: string,
      step:
        | 'brief'
        | 'match'
        | 'shortlist'
        | 'responses'
        | 'availability'
        | 'client'
        | 'pick'
        | 'sync'
        | 'booking'
        | 'call',
    ) => `/admin/projects/${projectId}/${step}`,
    clients: '/admin/clients',
    experts: '/admin/experts',
    expert: (expertId: string) => `/admin/experts/${expertId}`,
    outreach: '/admin/outreach',
    scheduling: '/admin/scheduling',
    calls: '/admin/calls',
    callReview: (callId: string) => `/admin/calls/${callId}`,
    callRoom: (callId: string) => `/admin/calls/${callId}/room`,
    knowledge: '/admin/knowledge',
    report: (callId: string) => `/admin/knowledge/${callId}`,
  },
} as const;
