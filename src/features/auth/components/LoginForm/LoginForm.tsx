'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  ClickableTile,
  Form,
  InlineNotification,
  PasswordInput,
  Stack,
  TextInput,
} from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { useLogin } from '../../api/useLogin';
import { DEMO_ACCOUNTS, findDemoAccount } from '../../model/personas';
import { ROLE_HOME, type PersonaId } from '../../model/session.schema';
import styles from './LoginForm.module.scss';

const loginFormSchema = z.object({
  email: z.email('Enter an email address like name@company.com.'),
  password: z.string().min(1, 'Enter your password.'),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

type LoginFormProps = {
  /** Admins use a separate login realm (PRODUCT_PLAN F0, F11). */
  realm: 'app' | 'admin';
};

export function LoginForm({ realm }: LoginFormProps) {
  const router = useRouter();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const accounts = DEMO_ACCOUNTS.filter((a) => (realm === 'admin' ? a.role === 'admin' : a.role !== 'admin'));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onBlur',
    defaultValues: { email: accounts[0]?.email ?? '', password: '' },
  });

  const signIn = async (personaId: PersonaId) => {
    setFormError(null);
    try {
      const session = await login.mutateAsync({ personaId });
      if (session.user) router.push(ROLE_HOME[session.user.role]);
    } catch (error) {
      setFormError(toUserMessage(error));
    }
  };

  const onSubmit = handleSubmit(async ({ email }) => {
    const account = findDemoAccount(email);
    if (!account) {
      setFormError('We couldn’t find an account with that email. Check it, or sign up.');
      return;
    }
    if (realm === 'app' && account.role === 'admin') {
      setFormError('Admin accounts log in through the admin console.');
      return;
    }
    if (realm === 'admin' && account.role !== 'admin') {
      setFormError('This login is for Proptyop staff. Clients and experts log in on the main site.');
      return;
    }
    await signIn(account.personaId);
  });

  return (
    <div className={styles.root}>
      <Form onSubmit={onSubmit} noValidate aria-label="Log in">
        <Stack gap={6}>
          {formError ? (
            <InlineNotification
              kind="error"
              title="Couldn’t log you in"
              subtitle={formError}
              lowContrast
              onCloseButtonClick={() => setFormError(null)}
            />
          ) : null}
          <TextInput
            id="login-email"
            labelText="Email"
            type="email"
            autoComplete="email"
            invalid={Boolean(errors.email)}
            invalidText={errors.email?.message}
            {...register('email')}
          />
          <PasswordInput
            id="login-password"
            labelText="Password"
            autoComplete="current-password"
            helperText="Prototype: any password works."
            invalid={Boolean(errors.password)}
            invalidText={errors.password?.message}
            {...register('password')}
          />
          <div className={styles.actions}>
            <Button type="submit" renderIcon={ArrowRight} disabled={isSubmitting || login.isPending}>
              Log in
            </Button>
            {realm === 'app' ? <Link href="/sign-up">Create an account</Link> : null}
          </div>
        </Stack>
      </Form>

      <section className={styles.demo} aria-labelledby="demo-accounts-heading">
        <h2 id="demo-accounts-heading" className={styles.demoHeading}>
          Demo accounts
        </h2>
        <p className={styles.demoHelp}>Skip the form and continue as a test persona.</p>
        <ul className={styles.demoList}>
          {accounts.map((account) => (
            <li key={account.personaId}>
              <ClickableTile
                className={styles.tile}
                onClick={() => void signIn(account.personaId)}
                disabled={login.isPending}
              >
                <span className={styles.tileName}>{account.name}</span>
                <span className={styles.tileSummary}>{account.summary}</span>
              </ClickableTile>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
