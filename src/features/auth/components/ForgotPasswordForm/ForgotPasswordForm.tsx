'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, InlineNotification, Stack, TextInput } from '@carbon/react';
import { ArrowRight, Email } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useRequestPasswordReset } from '../../api/mutations';
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from '../../model/credentials';
import styles from './ForgotPasswordForm.module.scss';

/** F0 forgot password: request a reset link, then a "check your email" confirmation. */
export function ForgotPasswordForm() {
  const request = useRequestPasswordReset();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(({ email }) => request.mutate(email));

  if (request.isSuccess) {
    return (
      <Stack gap={6}>
        <InlineNotification
          kind="success"
          title="Check your email"
          subtitle={`If an account uses ${getValues('email')}, we’ve sent a link to reset your password. It works for 1 hour.`}
          lowContrast
          hideCloseButton
        />
        <div className={styles.actions}>
          <Button
            as={Link}
            href={routes.resetPassword(`demo-${request.data.sentAt}`)}
            renderIcon={ArrowRight}
          >
            Open the reset link (prototype)
          </Button>
          <Button
            kind="tertiary"
            renderIcon={Email}
            onClick={() => request.mutate(getValues('email'))}
            disabled={request.isPending}
          >
            Send again
          </Button>
        </div>
        <p className={styles.alt}>
          Remembered it? <Link href={routes.login}>Log in</Link>
        </p>
      </Stack>
    );
  }

  return (
    <Form onSubmit={onSubmit} noValidate aria-label="Reset your password">
      <Stack gap={6}>
        {request.isError ? (
          <InlineNotification
            kind="error"
            title="Couldn’t send the link"
            subtitle={toUserMessage(request.error)}
            lowContrast
            hideCloseButton
          />
        ) : null}
        <TextInput
          id="forgot-email"
          labelText="Email"
          type="email"
          autoComplete="email"
          helperText="The email you use to log in."
          invalid={Boolean(errors.email)}
          invalidText={errors.email?.message}
          {...register('email')}
        />
        <div className={styles.actions}>
          <Button type="submit" renderIcon={ArrowRight} disabled={request.isPending}>
            Send reset link
          </Button>
          <Link href={routes.login}>Back to log in</Link>
        </div>
      </Stack>
    </Form>
  );
}
