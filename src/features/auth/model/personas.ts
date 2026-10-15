import type { PersonaId, Role } from './session.schema';

/** Demo accounts shown on the login screens (prototype only). */
export const DEMO_ACCOUNTS: {
  personaId: PersonaId;
  role: Role;
  name: string;
  email: string;
  summary: string;
}[] = [
  {
    personaId: 'ayesha',
    role: 'client',
    name: 'Ayesha Rahman',
    email: 'ayesha.rahman@meridiangulf.example',
    summary: 'Investment analyst researching a company',
  },
  {
    personaId: 'bilal',
    role: 'client',
    name: 'Bilal Haddad',
    email: 'bilal@haddadhospitality.example',
    summary: 'Franchise owner planning a new region',
  },
  {
    personaId: 'sara',
    role: 'expert',
    name: 'Sara Al-Mansouri',
    email: 'sara.almansouri@mail.example',
    summary: 'Expert giving interviews',
  },
  {
    personaId: 'ops',
    role: 'admin',
    name: 'Omar Siddiqui',
    email: 'omar@proptyop.example',
    summary: 'Research operations admin',
  },
];
