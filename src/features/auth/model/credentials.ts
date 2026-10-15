import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;

/** Password rules, shown as a checklist under the field (UX_PRINCIPLES §5). */
export const PASSWORD_RULES: { id: string; label: string; test: (value: string) => boolean }[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'letter', label: 'A letter', test: (v) => /[A-Za-z]/.test(v) },
  { id: 'number', label: 'A number', test: (v) => /\d/.test(v) },
];

export const emailField = z.email('Enter an email address like name@company.com.');

export const newPasswordField = z
  .string()
  .min(1, 'Create a password.')
  .refine(
    (value) => PASSWORD_RULES.every((rule) => rule.test(value)),
    `Use at least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`,
  );

export const signUpFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.'),
  email: emailField,
  password: newPasswordField,
  acceptTerms: z.boolean().refine((v) => v, 'Accept the terms to create your account.'),
});
export type SignUpFormValues = z.infer<typeof signUpFormSchema>;

export const loginFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.'),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const forgotPasswordFormSchema = z.object({ email: emailField });
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export const resetPasswordFormSchema = z
  .object({ password: newPasswordField, confirm: z.string().min(1, 'Repeat your new password.') })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'The passwords don’t match. Check both fields.',
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

/** "ayesha.rahman@meridiangulf.example" → "a•••••@meridiangulf.example" for notices. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 1)}•••••@${domain}`;
}
