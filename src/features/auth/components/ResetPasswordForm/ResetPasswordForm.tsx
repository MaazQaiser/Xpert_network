'use client';

import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, InlineNotification, PasswordInput, Stack } from '@carbon/react';
import { isApiError, toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useConfirmPasswordReset } from '../../api/mutations';
import { resetPasswordFormSchema, type ResetPasswordFormValues } from '../../model/credentials';
import { PasswordRules } from '../PasswordRules/PasswordRules';
import styles from '../ForgotPasswordForm/ForgotPasswordForm.module.scss';

/** F0 reset password from the emailed link. `?token=expired` shows the expired-link state. */
export function ResetPasswordForm({ token }: { token: string | null }) {
  const confirm = useConfirmPasswordReset();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: 'onBlur',
    defaultValues: { password: '', confirm: '' },
  });
  const password = useWatch({ control, name: 'password' });

  const isExpired = isApiError(confirm.error) && confirm.error.code === 'link_expired';
  if (!token || isExpired) {
    return (
      <Stack gap={6}>
        <InlineNotification
          kind="warning"
          title="This link doesn’t work"
          subtitle={
            isExpired
              ? toUserMessage(confirm.error)
              : 'The reset link is incomplete. Request a new one.'
          }
          lowContrast
          hideCloseButton
        />
        <div>
          <Button as={Link} href={routes.forgotPassword}>
            Request a new link
          </Button>
        </div>
      </Stack>
    );
  }

  if (confirm.isSuccess) {
    return (
      <Stack gap={6}>
        <InlineNotification
          kind="success"
          title="Password updated"
          subtitle="Log in with your new password."
          lowContrast
          hideCloseButton
        />
        <div>
          <Button as={Link} href={routes.login}>
            Log in
          </Button>
        </div>
      </Stack>
    );
  }

  const onSubmit = handleSubmit(({ password: pw }) => confirm.mutate({ token, password: pw }));

  return (
    <Form onSubmit={onSubmit} noValidate aria-label="Choose a new password">
      <Stack gap={6}>
        {confirm.isError ? (
          <InlineNotification
            kind="error"
            title="Couldn’t update your password"
            subtitle={toUserMessage(confirm.error)}
            lowContrast
            hideCloseButton
          />
        ) : null}
        <div>
          <PasswordInput
            id="reset-password"
            labelText="New password"
            autoComplete="new-password"
            aria-describedby="reset-password-rules"
            invalid={Boolean(errors.password)}
            invalidText={errors.password?.message}
            {...register('password')}
          />
          <PasswordRules id="reset-password-rules" value={password} />
        </div>
        <PasswordInput
          id="reset-confirm"
          labelText="Repeat new password"
          autoComplete="new-password"
          invalid={Boolean(errors.confirm)}
          invalidText={errors.confirm?.message}
          {...register('confirm')}
        />
        <div className={styles.actions}>
          <Button type="submit" disabled={confirm.isPending}>
            Update password
          </Button>
        </div>
      </Stack>
    </Form>
  );
}
