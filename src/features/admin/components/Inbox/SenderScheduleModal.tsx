'use client';

import { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, ComboBox, InlineNotification, Modal, Stack, Toggle } from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { useUpdateSenderSchedule } from '../../api/queries';
import {
  allDayEveryDayForm,
  dayName,
  formToSchedule,
  scheduleToForm,
  senderName,
  senderScheduleFormSchema,
  type SenderProfile,
  type SenderScheduleForm,
} from '../../model/inbox.schema';
import styles from './SenderScheduleModal.module.scss';
import { TimeField } from './TimeField';

function timeZones(current: string): string[] {
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return zones.includes(current) ? zones : [current, ...zones];
}

/**
 * When a sender's LinkedIn messages and connection requests may go out. GetSales holds anything
 * sent outside these hours until the next window opens.
 */
export function SenderScheduleModal({
  sender,
  onClose,
}: {
  sender: SenderProfile;
  onClose: () => void;
}) {
  const update = useUpdateSenderSchedule(sender.uuid);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SenderScheduleForm>({
    resolver: zodResolver(senderScheduleFormSchema),
    defaultValues: scheduleToForm(sender.linkedinSchedule),
  });
  const timezone = useWatch({ control, name: 'timezone' });
  const days = useWatch({ control, name: 'days' });
  const zones = timeZones(timezone);

  const submit = handleSubmit((form) =>
    update.mutate(formToSchedule(form), { onSuccess: () => onClose() }),
  );

  return createPortal(
    <Modal
      open
      size="md"
      modalHeading="LinkedIn schedule"
      modalLabel={senderName(sender)}
      primaryButtonText={update.isPending ? 'Saving…' : 'Save schedule'}
      primaryButtonDisabled={update.isPending}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => void submit()}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        noValidate
      >
        <Stack gap={6}>
          <p className={styles.intro}>
            Messages and connection requests from this sender only go out during these hours.
            Anything sent outside them waits until the next window opens.
          </p>
          {update.isError ? (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Couldn’t save the schedule."
              subtitle={toUserMessage(update.error)}
            />
          ) : null}
          <div className={styles.zoneRow}>
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <ComboBox
                  id="schedule-timezone"
                  titleText="Time zone"
                  items={zones}
                  selectedItem={field.value}
                  itemToString={(zone) => zone ?? ''}
                  shouldFilterItem={({ item, inputValue }) =>
                    !inputValue || item.toLowerCase().includes(inputValue.toLowerCase())
                  }
                  onChange={({ selectedItem }) => field.onChange(selectedItem ?? '')}
                  invalid={Boolean(errors.timezone)}
                  invalidText={errors.timezone?.message}
                />
              )}
            />
            <Button
              kind="tertiary"
              size="md"
              onClick={() => reset(allDayEveryDayForm(timezone || 'Asia/Karachi'))}
            >
              24 hours, every day
            </Button>
          </div>
          <fieldset className={styles.days}>
            <legend className={styles.legend}>Hours</legend>
            {days.map((day, i) => {
              const name = dayName(day.dow);
              const dayErrors = errors.days?.[i];
              return (
                <div key={day.dow} className={styles.dayRow}>
                  <Controller
                    control={control}
                    name={`days.${i}.enabled`}
                    render={({ field }) => (
                      <Toggle
                        id={`schedule-${day.dow}-on`}
                        size="sm"
                        labelText={name}
                        hideLabel
                        toggled={field.value}
                        onToggle={(on) => field.onChange(on)}
                      />
                    )}
                  />
                  {(['start', 'end'] as const).map((edge) => (
                    <Fragment key={edge}>
                      {edge === 'end' ? (
                        <span className={styles.to} aria-hidden="true">
                          to
                        </span>
                      ) : null}
                      <Controller
                        control={control}
                        name={`days.${i}.${edge}`}
                        render={({ field }) => (
                          <TimeField
                            id={`schedule-${day.dow}-${edge}`}
                            label={`${name} ${edge === 'start' ? 'from' : 'to'}`}
                            disabled={!day.enabled}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            invalid={day.enabled && Boolean(dayErrors?.[edge])}
                            invalidText={dayErrors?.[edge]?.message}
                          />
                        )}
                      />
                    </Fragment>
                  ))}
                </div>
              );
            })}
            {errors.days?.root?.message || errors.days?.message ? (
              <p className={styles.error} role="alert">
                {errors.days?.root?.message ?? errors.days?.message}
              </p>
            ) : null}
          </fieldset>
        </Stack>
      </form>
    </Modal>,
    document.body,
  );
}
