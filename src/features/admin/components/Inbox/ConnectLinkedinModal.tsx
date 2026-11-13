'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  ComboBox,
  InlineLoading,
  InlineNotification,
  Modal,
  ProgressIndicator,
  ProgressStep,
  RadioButton,
  RadioButtonGroup,
  Stack,
} from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import {
  adminKeys,
  useDisconnectLinkedin,
  useLinkedinSession,
  useOpenCloudBrowser,
  useProxyCountries,
  useSetSenderProxy,
} from '../../api/queries';
import { senderName, type ProxyCountry, type SenderProfile } from '../../model/inbox.schema';
import styles from './Inbox.module.scss';

type Step = 'proxy' | 'sign-in' | 'browser';

// Past this, the check says it's slow (it keeps going).
const SLOW_CHECK_MS = 3 * 60 * 1000;

/**
 * Connect a sender's LinkedIn without leaving the app:
 * 1. choose a proxy country, which gives the sender a cloud browser there;
 * 2. sign in to LinkedIn on GetSales' sign-in page for that browser, shown here, and press its
 *    own "I have logged in" (it saves the login and starts the browser; closing the page from
 *    outside doesn't, so the app has no button of its own for this);
 * 3. once the browser starts, the page closes and the session is checked until it's connected.
 */
export function ConnectLinkedinModal({
  sender,
  onClose,
}: {
  sender: SenderProfile;
  onClose: () => void;
}) {
  const name = senderName(sender);
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(sender.cloudBrowser ? 'sign-in' : 'proxy');
  const [country, setCountry] = useState<ProxyCountry | null>(null);
  const [countryMissing, setCountryMissing] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  // When the browser last started before this sign-in; a later start means it was pressed.
  const [startedBefore, setStartedBefore] = useState<string | null>(null);
  const [isSlow, setIsSlow] = useState(false);

  const countries = useProxyCountries();
  const setProxy = useSetSenderProxy(sender.uuid);
  const openBrowser = useOpenCloudBrowser(sender.uuid);
  const startOver = useDisconnectLinkedin(sender.uuid);
  const session = useLinkedinSession(sender.uuid, step === 'browser');
  const startedAt = session.data?.startedAt ?? null;
  // "I have logged in" on GetSales' page starts the browser (or it's already connected).
  const pressedLoggedIn =
    step === 'browser' &&
    (session.data?.state === 'connected' ||
      (startedAt !== null && (startedBefore === null || startedAt > startedBefore)));
  const sessionState = pressedLoggedIn ? (session.data?.state ?? 'checking') : null;
  const connected = sessionState === 'connected';

  // Once connected, the inbox shows the sender's conversations.
  useEffect(() => {
    if (connected) void queryClient.invalidateQueries({ queryKey: adminKeys.senderProfiles() });
  }, [connected, queryClient]);

  useEffect(() => {
    if (sessionState !== 'checking') return;
    const timer = window.setTimeout(() => setIsSlow(true), SLOW_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [sessionState]);

  const continueToSignIn = () => {
    if (!country) {
      setCountryMissing(true);
      return;
    }
    setProxy.mutate(country.code, { onSuccess: () => setStep('sign-in') });
  };

  const showBrowser = () =>
    openBrowser.mutate(undefined, {
      onSuccess: ({ url, startedAt: before }) => {
        setBrowserUrl(url);
        setStartedBefore(before ?? null);
        setIsSlow(false);
        setStep('browser');
      },
    });

  const changeProxy = () => setStep('proxy');

  const restart = () =>
    startOver.mutate(undefined, {
      onSuccess: () => {
        setCountry(null);
        setStep('proxy');
      },
    });

  // GetSales' sign-in page for the cloud browser, with its own "I have logged in" and Close.
  if (step === 'browser' && browserUrl && !pressedLoggedIn) {
    return createPortal(
      <Modal
        open
        passiveModal
        size="lg"
        modalHeading={`Sign in to ${name}’s LinkedIn`}
        preventCloseOnClickOutside
        onRequestClose={() => setStep('sign-in')}
      >
        <Stack gap={4}>
          <iframe
            src={browserUrl}
            title={`Cloud browser for ${name}`}
            className={styles.cloudBrowser}
            allow="clipboard-read; clipboard-write"
          />
          <p className={styles.modalText}>
            Sign in to LinkedIn above, then press I have logged in at the top. This closes by itself
            and checks the account.
          </p>
        </Stack>
      </Modal>,
      document.body,
    );
  }

  const primary =
    step === 'proxy'
      ? {
          text: setProxy.isPending ? 'Saving…' : 'Continue',
          disabled: setProxy.isPending,
          onSubmit: continueToSignIn,
        }
      : connected
        ? { text: 'Done', disabled: false, onSubmit: onClose }
        : sessionState === 'checking'
          ? { text: 'Checking…', disabled: true, onSubmit: () => undefined }
          : {
              text: openBrowser.isPending ? 'Opening…' : 'Open cloud browser',
              disabled: openBrowser.isPending || startOver.isPending,
              onSubmit: showBrowser,
            };

  return createPortal(
    <Modal
      open
      size="md"
      modalHeading={`Connect ${name}’s LinkedIn`}
      primaryButtonText={primary.text}
      primaryButtonDisabled={primary.disabled}
      secondaryButtonText={connected ? undefined : 'Cancel'}
      onRequestClose={onClose}
      onRequestSubmit={primary.onSubmit}
    >
      <Stack gap={6}>
        <ProgressIndicator currentIndex={step === 'proxy' ? 0 : connected ? 2 : 1} spaceEqually>
          <ProgressStep label="Set proxy" />
          <ProgressStep label="Sign in to LinkedIn" />
        </ProgressIndicator>

        {step === 'proxy' ? (
          <Stack gap={6}>
            <RadioButtonGroup
              legendText="Choose a proxy to set up the LinkedIn account"
              name="linkedin-proxy"
              orientation="vertical"
              valueSelected="exscio"
            >
              <RadioButton id="proxy-exscio" value="exscio" labelText="Use Exscio proxy" />
            </RadioButtonGroup>
            <p className={styles.modalText}>
              Reliable: the proxy’s IP address is monitored and switched if it stops working.
            </p>
            <ComboBox<ProxyCountry>
              id="proxy-country"
              titleText="Country"
              placeholder={countries.isLoading ? 'Loading countries…' : 'Choose a country'}
              helperText="Pick where this LinkedIn account usually signs in from."
              items={countries.data ?? []}
              itemToString={(item) => item?.name ?? ''}
              shouldFilterItem={({ item, inputValue }) =>
                !inputValue || item.name.toLowerCase().includes(inputValue.toLowerCase())
              }
              selectedItem={country}
              onChange={({ selectedItem }) => {
                setCountry(selectedItem ?? null);
                if (selectedItem) setCountryMissing(false);
              }}
              invalid={countryMissing}
              invalidText="Choose a country."
              disabled={countries.isError}
            />
            {countries.isError ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Countries didn’t load."
                subtitle={toUserMessage(countries.error)}
              />
            ) : null}
            {setProxy.isError ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Couldn’t set the proxy."
                subtitle={toUserMessage(setProxy.error)}
              />
            ) : null}
          </Stack>
        ) : connected ? (
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title="LinkedIn connected."
            subtitle={`${name} can send messages and connection requests now.`}
          />
        ) : (
          <Stack gap={5}>
            <p className={styles.modalText}>
              Open the cloud browser and sign in to {name}’s LinkedIn account.
            </p>
            {sessionState === 'checking' ? (
              <InlineLoading
                status="active"
                description="Checking the session… This can take a minute."
              />
            ) : null}
            {sessionState === 'checking' && isSlow ? (
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                title="This is taking longer than usual."
                subtitle="It’s still checking. If nothing changes, open the cloud browser again or start over."
              />
            ) : null}
            {sessionState === 'signed_out' ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="LinkedIn isn’t signed in yet."
                subtitle="Open the cloud browser again and finish signing in, including any verification code."
              />
            ) : null}
            {sessionState === 'failed' ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="The cloud browser hit a problem."
                subtitle={session.data?.issue ?? 'Try changing the proxy or starting over.'}
              />
            ) : null}
            {session.isError ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Couldn’t check the session."
                subtitle={toUserMessage(session.error)}
              />
            ) : null}
            {openBrowser.isError ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Couldn’t open the cloud browser."
                subtitle={toUserMessage(openBrowser.error)}
              />
            ) : null}
            {startOver.isError ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Couldn’t start over."
                subtitle={toUserMessage(startOver.error)}
              />
            ) : null}
            <div className={styles.connectHelp}>
              <p className={styles.modalText}>Trouble signing in?</p>
              <Button kind="ghost" size="sm" onClick={changeProxy} disabled={startOver.isPending}>
                Change proxy
              </Button>
              <Button kind="ghost" size="sm" onClick={restart} disabled={startOver.isPending}>
                {startOver.isPending ? 'Starting over…' : 'Start over'}
              </Button>
            </div>
          </Stack>
        )}
      </Stack>
    </Modal>,
    document.body,
  );
}
