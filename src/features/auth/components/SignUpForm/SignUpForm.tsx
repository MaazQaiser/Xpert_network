'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Checkbox,
  Form,
  InlineNotification,
  PasswordInput,
  Stack,
  TextInput,
} from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useSignUp } from '../../api/mutations';
import { signUpFormSchema, type SignUpFormValues } from '../../model/credentials';
import {
  ROLE_HOME,
  ROLE_ONBOARDING,
  type OAuthResult,
  type SignUpRole,
} from '../../model/session.schema';
import { OAuthButtons } from '../OAuthButtons/OAuthButtons';
import { PasswordRules } from '../PasswordRules/PasswordRules';
import { ROLE_CHOICES } from '../RoleSelect/RoleSelect';
import styles from './SignUpForm.module.scss';

/** F0 sign-up, step 2: Google / Apple (mocked) or email + password for the chosen role. */
export function SignUpForm({ role }: { role: SignUpRole }) {
  const router = useRouter();
  const signUp = useSignUp();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '', password: '', acceptTerms: false },
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(async ({ name, email, password: pw }) => {
    setFormError(null);
    try {
      await signUp.mutateAsync({ role, name, email, password: pw });
      router.push(routes.verifyEmail);
    } catch (error) {
      setFormError(toUserMessage(error));
    }
  });

  const onOAuth = ({ user, isNew }: OAuthResult) => {
    const next = isNew && user.role !== 'admin' ? ROLE_ONBOARDING[user.role] : ROLE_HOME[user.role];
    router.push(next);
  };

  return (
    <div className={styles.root}>
      <p className={styles.role}>
        Signing up as: <strong>{ROLE_CHOICES[role].title}</strong>{' '}
        <Link href={routes.signUp}>Change</Link>
      </p>

      <OAuthButtons role={role} onSuccess={onOAuth} />

      <p className={styles.divider}>
        <span>or with your email</span>
      </p>

      <Form onSubmit={onSubmit} noValidate aria-label="Create your account">
        <Stack gap={6}>
          {formError ? (
            <InlineNotification
              kind="error"
              title="Couldn’t create your account"
              subtitle={formError}
              lowContrast
              onCloseButtonClick={() => setFormError(null)}
            />
          ) : null}
          <TextInput
            id="sign-up-name"
            labelText="Full name"
            autoComplete="name"
            invalid={Boolean(errors.name)}
            invalidText={errors.name?.message}
            {...register('name')}
          />
          <TextInput
            id="sign-up-email"
            labelText={role === 'client' ? 'Work email' : 'Email'}
            type="email"
            autoComplete="email"
            helperText="We’ll send a link to confirm it’s yours."
            invalid={Boolean(errors.email)}
            invalidText={errors.email?.message}
            {...register('email')}
          />
          <div>
            <PasswordInput
              id="sign-up-password"
              labelText="Password"
              autoComplete="new-password"
              aria-describedby="sign-up-password-rules"
              invalid={Boolean(errors.password)}
              invalidText={errors.password?.message}
              {...register('password')}
            />
            <PasswordRules id="sign-up-password-rules" value={password} />
          </div>
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field }) => (
              <div>
                <Checkbox
                  id="sign-up-terms"
                  labelText="I agree to the terms of use and privacy notice"
                  checked={field.value}
                  onChange={(_, { checked }) => field.onChange(checked)}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.acceptTerms)}
                  invalidText={errors.acceptTerms?.message}
                />
              </div>
            )}
          />
          <div className={styles.actions}>
            <Button
              type="submit"
              renderIcon={ArrowRight}
              disabled={isSubmitting || signUp.isPending}
            >
              Create account
            </Button>
            <p className={styles.alt}>
              Already have an account? <Link href={routes.login}>Log in</Link>
            </p>
          </div>
        </Stack>
      </Form>
    </div>
  );
}
