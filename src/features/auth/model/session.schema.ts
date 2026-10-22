import { z } from 'zod';

export const roleSchema = z.enum(['client', 'expert', 'admin']);
export type Role = z.infer<typeof roleSchema>;

/** Roles a person can sign up for. Admins are created internally. */
export const signUpRoleSchema = z.enum(['client', 'expert']);
export type SignUpRole = z.infer<typeof signUpRoleSchema>;

/** Test personas from PRODUCT_PLAN §3. */
export const personaIdSchema = z.enum(['ayesha', 'bilal', 'sara', 'ops']);
export type PersonaId = z.infer<typeof personaIdSchema>;

export const authProviderSchema = z.enum(['email', 'google', 'apple']);
export type AuthProvider = z.infer<typeof authProviderSchema>;

export const userSchema = z.object({
  id: z.string(),
  /** Set for the seeded demo personas; null for accounts created through sign-up. */
  personaId: personaIdSchema.nullable(),
  role: roleSchema,
  name: z.string(),
  title: z.string(),
  organisation: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  provider: authProviderSchema,
});
export type User = z.infer<typeof userSchema>;

export const sessionSchema = z.object({ user: userSchema.nullable() });
export type Session = z.infer<typeof sessionSchema>;

export const loginRealmSchema = z.enum(['app', 'admin']);
export type LoginRealm = z.infer<typeof loginRealmSchema>;

/** Log in as a demo persona (toolbar, demo buttons) or with email + password. */
export const loginInputSchema = z.union([
  z.object({ personaId: personaIdSchema }),
  z.object({ email: z.string(), password: z.string(), realm: loginRealmSchema }),
]);
export type LoginInput = z.infer<typeof loginInputSchema>;

export const signUpInputSchema = z.object({
  role: signUpRoleSchema,
  name: z.string(),
  email: z.string(),
  password: z.string(),
});
export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const oauthProviderSchema = z.enum(['google', 'apple']);
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;

/** One account offered by the (mocked) provider's account chooser. */
export const oauthAccountSchema = z.object({ name: z.string(), email: z.string() });
export type OAuthAccount = z.infer<typeof oauthAccountSchema>;

export const oauthInputSchema = z.object({
  provider: oauthProviderSchema,
  accountEmail: z.string(),
  /** Set when signing up; logging in keeps the role the account already has. */
  role: signUpRoleSchema.nullable(),
});
export type OAuthInput = z.infer<typeof oauthInputSchema>;

export const oauthResultSchema = z.object({ user: userSchema, isNew: z.boolean() });
export type OAuthResult = z.infer<typeof oauthResultSchema>;

export const authUserResultSchema = z.object({ user: userSchema });
export const sentAtSchema = z.object({ sentAt: z.string() });

export const passwordResetInputSchema = z.object({ email: z.string() });
export const passwordResetConfirmSchema = z.object({ token: z.string(), password: z.string() });

export const ROLE_HOME: Record<Role, string> = {
  client: '/home',
  expert: '/expert/home',
  admin: '/admin/home',
};

export const ROLE_LOGIN: Record<Role, string> = {
  client: '/login',
  expert: '/login',
  admin: '/admin/login',
};

/** Where a new account goes once its email is verified (F1, F7). */
export const ROLE_ONBOARDING: Record<SignUpRole, string> = {
  client: '/onboarding',
  expert: '/expert/onboarding',
};
