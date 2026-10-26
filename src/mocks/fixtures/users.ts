import type { PersonaId, User } from '@/features/auth';

export const USERS: Record<PersonaId, User> = {
  ayesha: {
    id: 'usr_ayesha',
    personaId: 'ayesha',
    role: 'client',
    name: 'Ayesha Rahman',
    title: 'Investment analyst',
    organisation: 'Meridian Gulf Capital',
    email: 'ayesha.rahman@meridiangulf.example',
    emailVerified: true,
    provider: 'email',
  },
  bilal: {
    id: 'usr_bilal',
    personaId: 'bilal',
    role: 'client',
    name: 'Bilal Haddad',
    title: 'Franchise owner',
    organisation: 'Haddad Hospitality',
    email: 'bilal@haddadhospitality.example',
    emailVerified: true,
    provider: 'email',
  },
  sara: {
    id: 'usr_sara',
    personaId: 'sara',
    role: 'expert',
    name: 'Sara Al-Mansouri',
    title: 'Former supply-chain manager, F&B',
    organisation: 'Independent expert',
    email: 'sara.almansouri@mail.example',
    emailVerified: true,
    provider: 'email',
  },
  ops: {
    id: 'usr_ops',
    personaId: 'ops',
    role: 'admin',
    name: 'Umer',
    title: 'Project manager',
    organisation: 'Xpert Network',
    email: 'paltu@xpertnetwork.example',
    emailVerified: true,
    provider: 'email',
  },
};

export const PERSONA_SUMMARY: Record<PersonaId, string> = {
  ayesha: 'P1 · Investor researching a company before investing',
  bilal: 'P1b · Planning a café franchise in a new region',
  sara: 'P2 · Expert earning from interviews',
  ops: 'P3 · Project manager turning client emails into booked expert calls',
};
