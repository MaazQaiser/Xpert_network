'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Form,
  InlineNotification,
  PasswordInput,
  Popover,
  PopoverContent,
  Stack,
  TextInput,
} from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useLogin } from '../../api/useLogin';
import { loginFormSchema, type LoginFormValues } from '../../model/credentials';
import { DEMO_ACCOUNTS } from '../../model/personas';
import { ROLE_HOME, type LoginInput, type OAuthResult } from '../../model/session.schema';
import { AccountList } from '../AccountList/AccountList';
import { OAuthButtons } from '../OAuthButtons/OAuthButtons';
import styles from './LoginForm.module.scss';

type LoginFormProps = {
  /** Admins use a separate login realm (PRODUCT_PLAN F0, F11). */
  realm: 'app' | 'admin';
};

export function LoginForm({ realm }: LoginFormProps) {
  const router = useRouter();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const accounts = DEMO_ACCOUNTS.filter((a) =>
    realm === 'admin' ? a.role === 'admin' : a.role !== 'admin',
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onBlur',
    defaultValues: { email: accounts[0]?.email ?? '', password: '' },
  });

  const signIn = async (input: LoginInput) => {
    setFormError(null);
    try {
      const session = await login.mutateAsync(input);
      // Unverified accounts and unfinished onboarding are redirected by the role guard.
      if (session.user) router.push(ROLE_HOME[session.user.role]);
    } catch (error) {
      setFormError(toUserMessage(error));
    }
  };

  const onSubmit = handleSubmit(({ email, password }) => signIn({ email, password, realm }));
  const onOAuth = ({ user }: OAuthResult) => router.push(ROLE_HOME[user.role]);

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
          {realm === 'app' ? (
            <Link href={routes.forgotPassword} className={styles.forgot}>
              Forgot password?
            </Link>
          ) : null}
          <div className={styles.actions}>
            <Button
              type="submit"
              size="md"
              className={styles.submit}
              disabled={isSubmitting || login.isPending}
            >
              Log in
            </Button>
            {realm === 'app' ? (
              <p className={styles.signUp}>
                New to Xpert Network? <Link href={routes.signUp}>Create an account</Link>
              </p>
            ) : null}
          </div>
        </Stack>
      </Form>

      {realm === 'app' ? (
        <section aria-label="Other ways to log in">
          <OAuthButtons role={null} onSuccess={onOAuth} />
        </section>
      ) : null}

      {/* Prototype shortcut, tucked into the bottom-right corner so the form stays clean. */}
      <div className={styles.demoCorner}>
        <Popover
          open={demoOpen}
          align="top-end"
          caret={false}
          dropShadow
          onRequestClose={() => setDemoOpen(false)}
        >
          <Button
            kind="secondary"
            size="md"
            aria-expanded={demoOpen}
            aria-controls="demo-accounts"
            onClick={() => setDemoOpen((open) => !open)}
          >
            Demo accounts
          </Button>
          <PopoverContent id="demo-accounts">
            <div className={styles.demoPanel}>
              <h2 className={styles.demoHeading}>Demo accounts</h2>
              <p className={styles.demoHelp}>Skip the form and continue as a test persona.</p>
              <div className={styles.demoList}>
                <AccountList
                  label="Demo accounts"
                  items={accounts.map((a) => ({
                    id: a.personaId,
                    name: a.name,
                    detail: a.summary,
                  }))}
                  disabled={login.isPending}
                  onSelect={(id) => {
                    const account = accounts.find((a) => a.personaId === id);
                    if (account) void signIn({ personaId: account.personaId });
                  }}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
