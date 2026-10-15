import { z } from 'zod';

export const roleSchema = z.enum(['client', 'expert', 'admin']);
export type Role = z.infer<typeof roleSchema>;

/** Test personas from PRODUCT_PLAN §3. */
export const personaIdSchema = z.enum(['ayesha', 'bilal', 'sara', 'ops']);
export type PersonaId = z.infer<typeof personaIdSchema>;

export const userSchema = z.object({
  id: z.string(),
  personaId: personaIdSchema,
  role: roleSchema,
  name: z.string(),
  title: z.string(),
  organisation: z.string(),
  email: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const sessionSchema = z.object({ user: userSchema.nullable() });
export type Session = z.infer<typeof sessionSchema>;

export const loginInputSchema = z.object({ personaId: personaIdSchema });
export type LoginInput = z.infer<typeof loginInputSchema>;

export const ROLE_HOME: Record<Role, string> = {
  client: '/home',
  expert: '/expert/home',
  admin: '/admin/dashboard',
};

export const ROLE_LOGIN: Record<Role, string> = {
  client: '/login',
  expert: '/login',
  admin: '/admin/login',
};
