import type { OAuthProvider } from '@/features/auth';

export type OAuthIdentity = { name: string; email: string; title: string; organisation: string };

/**
 * Accounts the mocked Google / LinkedIn account chooser offers. Some match demo personas
 * (log in), others are new (sign up). Names are fictional.
 */
export const OAUTH_IDENTITIES: Record<OAuthProvider, OAuthIdentity[]> = {
  google: [
    {
      name: 'Ayesha Rahman',
      email: 'ayesha.rahman@meridiangulf.example',
      title: 'Investment analyst',
      organisation: 'Meridian Gulf Capital',
    },
    {
      name: 'Layla Nasser',
      email: 'layla.nasser@gmail.example',
      title: '',
      organisation: '',
    },
  ],
  linkedin: [
    {
      name: 'Sara Al-Mansouri',
      email: 'sara.almansouri@mail.example',
      title: 'Former supply-chain manager, F&B',
      organisation: 'Independent expert',
    },
    {
      name: 'Karim Aziz',
      email: 'karim.aziz@mail.example',
      title: 'Former regional operations director, QSR',
      organisation: 'Independent consultant',
    },
  ],
};
