'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  SkeletonText,
  Stack,
  TextInput,
} from '@carbon/react';
import { Save } from '@carbon/icons-react';
import type { Role } from '@/features/auth';
import {
  OptionMultiSelect,
  useClientOnboarding,
  useTaxonomy,
  useUpdateClientOnboarding,
  type ClientInterests,
} from '@/features/onboarding';
import { toUserMessage } from '@/shared/api';
import { AsyncBoundary, ErrorState } from '@/shared/ui';
import { useProfile, useUpdateProfile } from '../../api/queries';
import {
  profileFormSchema,
  TIMEZONES,
  type Profile,
  type ProfileFormValues,
} from '../../model/profile.schema';
import styles from './Settings.module.scss';

export function ProfilePanel({ role }: { role: Exclude<Role, 'admin'> }) {
  const profile = useProfile();
  return (
    <>
      <section className={styles.section} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className={styles.sectionTitle}>
          {role === 'expert' ? 'Account details' : 'Your details'}
        </h2>
        <AsyncBoundary
          query={profile}
          errorTitle="Couldn’t load your details"
          loading={<SkeletonText paragraph lineCount={6} />}
        >
          {(data) => <ProfileForm profile={data} role={role} />}
        </AsyncBoundary>
      </section>
      {role === 'client' ? <ResearchInterests /> : null}
    </>
  );
}

function ProfileForm({ profile, role }: { profile: Profile; role: Exclude<Role, 'admin'> }) {
  const update = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: profile.name,
      title: profile.title,
      organisation: profile.organisation,
      phone: profile.phone,
      timezone: profile.timezone,
    },
  });

  const onSubmit = handleSubmit((values) =>
    update.mutate(values, { onSuccess: (saved) => reset({ ...values, ...saved }) }),
  );

  return (
    <Form onSubmit={onSubmit} noValidate aria-labelledby="profile-heading">
      <Stack gap={6}>
        {update.isSuccess && !isDirty ? (
          <InlineNotification
            kind="success"
            title="Details saved"
            lowContrast
            onCloseButtonClick={() => update.reset()}
          />
        ) : null}
        {update.isError ? (
          <InlineNotification
            kind="error"
            title="Couldn’t save your details"
            subtitle={`${toUserMessage(update.error)} Your changes are still here.`}
            lowContrast
            onCloseButtonClick={() => update.reset()}
          />
        ) : null}
        <TextInput
          id="profile-name"
          labelText="Full name"
          autoComplete="name"
          helperText={role === 'expert' ? 'Only Proptyop staff see your name.' : undefined}
          className={styles.field}
          invalid={Boolean(errors.name)}
          invalidText={errors.name?.message}
          {...register('name')}
        />
        <TextInput
          id="profile-title"
          labelText={role === 'expert' ? 'Headline' : 'Job title'}
          className={styles.field}
          invalid={Boolean(errors.title)}
          invalidText={errors.title?.message}
          {...register('title')}
        />
        <TextInput
          id="profile-organisation"
          labelText="Organisation (optional)"
          autoComplete="organization"
          className={styles.field}
          invalid={Boolean(errors.organisation)}
          invalidText={errors.organisation?.message}
          {...register('organisation')}
        />
        <TextInput
          id="profile-email"
          labelText="Email"
          value={profile.email}
          readOnly
          helperText="To change your email, contact support. We’ll verify the new address."
          className={styles.field}
        />
        <TextInput
          id="profile-phone"
          labelText="Phone (optional)"
          type="tel"
          autoComplete="tel"
          placeholder="+966 50 123 4567"
          helperText="Only used for urgent account issues."
          className={styles.field}
          invalid={Boolean(errors.phone)}
          invalidText={errors.phone?.message}
          {...register('phone')}
        />
        <Select
          id="profile-timezone"
          labelText="Time zone"
          helperText="Deadlines and interview times show in this zone."
          className={styles.field}
          invalid={Boolean(errors.timezone)}
          invalidText={errors.timezone?.message}
          {...register('timezone')}
        >
          {TIMEZONES.map((tz) => (
            <SelectItem key={tz.id} value={tz.id} text={tz.label} />
          ))}
        </Select>
        <div className={styles.actions}>
          <Button type="submit" renderIcon={Save} disabled={!isDirty || update.isPending}>
            Save details
          </Button>
          {isDirty ? (
            <Button kind="ghost" onClick={() => reset()} disabled={update.isPending}>
              Discard changes
            </Button>
          ) : null}
        </div>
      </Stack>
    </Form>
  );
}

function ResearchInterests() {
  const onboarding = useClientOnboarding();
  return (
    <section className={styles.section} aria-labelledby="interests-heading">
      <div>
        <h2 id="interests-heading" className={styles.sectionTitle}>
          Research interests
        </h2>
        <p className={styles.help}>Used to suggest library reports and new research.</p>
      </div>
      <AsyncBoundary
        query={onboarding}
        errorTitle="Couldn’t load your research interests"
        loading={<SkeletonText paragraph lineCount={3} />}
      >
        {(data) => <InterestsForm interests={data.interests} />}
      </AsyncBoundary>
    </section>
  );
}

function InterestsForm({ interests }: { interests: ClientInterests }) {
  const taxonomy = useTaxonomy();
  const update = useUpdateClientOnboarding();
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ClientInterests>({ defaultValues: interests });

  if (taxonomy.isPending) return <SkeletonText paragraph lineCount={3} />;
  if (taxonomy.isError) {
    return (
      <ErrorState message={toUserMessage(taxonomy.error)} onRetry={() => void taxonomy.refetch()} />
    );
  }

  return (
    <Form
      noValidate
      aria-labelledby="interests-heading"
      onSubmit={handleSubmit((values) =>
        update.mutate({ interests: values }, { onSuccess: () => reset(values) }),
      )}
    >
      <Stack gap={6}>
        {update.isSuccess && !isDirty ? (
          <InlineNotification
            kind="success"
            title="Research interests saved"
            lowContrast
            onCloseButtonClick={() => update.reset()}
          />
        ) : null}
        {update.isError ? (
          <InlineNotification
            kind="error"
            title="Couldn’t save your interests"
            subtitle={toUserMessage(update.error)}
            lowContrast
            onCloseButtonClick={() => update.reset()}
          />
        ) : null}
        <Controller
          control={control}
          name="industryIds"
          render={({ field }) => (
            <OptionMultiSelect
              id="settings-industries"
              titleText="Industries"
              placeholder="Search industries"
              options={taxonomy.data.industries}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="regionIds"
          render={({ field }) => (
            <OptionMultiSelect
              id="settings-regions"
              titleText="Regions"
              placeholder="Search regions"
              options={taxonomy.data.regions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <div className={styles.actions}>
          <Button type="submit" renderIcon={Save} disabled={!isDirty || update.isPending}>
            Save interests
          </Button>
        </div>
      </Stack>
    </Form>
  );
}
