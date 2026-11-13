'use client';

import { useEffect, useRef, useState } from 'react';
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
  useCheckLinkedinSession,
  useDisconnectLinkedin,
  useLinkedinSession,
  useOpenCloudBrowser,
  useProxyCountries,
  useSetSenderProxy,
} from '../../api/queries';
import { senderName, type ProxyCountry, type SenderProfile } from '../../model/inbox.schema';
import styles from './Inbox.module.scss';

// closing: the cloud browser was just closed after signing in; it's started a moment later.
type Step = 'proxy' | 'sign-in' | 'browser' | 'closing' | 'checking';

// Past this, the check says it's slow (it keeps going).
const SLOW_CHECK_MS = 3 * 60 * 1000;

export const connectTiming = {
  // GetSales' own "I have logged in" ends the remote session and waits this long before starting
  // the browser, so the LinkedIn login is saved first. Ours does the same.
  settleMs: 6000,
};

/**
 * Height of GetSales' "Smart Login" bar at the top of the cloud browser page, which repeats our
 * buttons. The page is on their site, so it can't be hidden; the frame is shifted up by this much
 * instead. It wraps onto more lines as the frame narrows (measured on their page).
 */
export function signInBarHeight(frameWidth: number): number {
  if (frameWidth >= 1102) return 49;
  if (frameWidth >= 795) return 61;
  return 105;
}

/** The cloud browser, with GetSales' bar cropped off the top. */
function CloudBrowserFrame({ url, title }: { url: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState(() => signInBarHeight(0));

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setBar(signInBarHeight(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.cloudBrowser}>
      <iframe
        src={url}
        title={title}
        className={styles.cloudBrowserPage}
        style={{ insetBlockStart: -bar, blockSize: `calc(100% + ${bar}px)` }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}

/**
 * Connect a sender's LinkedIn without leaving the app:
 * 1. choose a proxy country, which gives the sender a cloud browser there;
 * 2. sign in to LinkedIn in that cloud browser, shown here, then press "I have logged in";
 * 3. the browser starts and the session is checked until the account shows as connected.
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
  const [isSlow, setIsSlow] = useState(false);

  const countries = useProxyCountries();
  const setProxy = useSetSenderProxy(sender.uuid);
  const openBrowser = useOpenCloudBrowser(sender.uuid);
  const check = useCheckLinkedinSession(sender.uuid);
  const startOver = useDisconnectLinkedin(sender.uuid);
  const session = useLinkedinSession(sender.uuid, step === 'checking');
  const sessionState =
    step === 'closing'
      ? 'checking'
      : step === 'checking'
        ? (session.data?.state ?? 'checking')
        : null;
  const connected = sessionState === 'connected';

  // Once connected, the inbox shows the sender's conversations.
  useEffect(() => {
    if (connected) void queryClient.invalidateQueries({ queryKey: adminKeys.senderProfiles() });
  }, [connected, queryClient]);

  // After "I have logged in": wait for the remote session to end, then start the browser.
  useEffect(() => {
    if (step !== 'closing') return;
    const timer = window.setTimeout(
      () =>
        check.mutate(undefined, {
          onSuccess: () => setStep('checking'),
          onError: () => setStep('sign-in'),
        }),
      connectTiming.settleMs,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per sign-in
  }, [step]);

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
      onSuccess: ({ url }) => {
        setBrowserUrl(url);
        setStep('browser');
      },
    });

  const changeProxy = () => {
    check.reset();
    setStep('proxy');
  };

  const restart = () =>
    startOver.mutate(undefined, {
      onSuccess: () => {
        check.reset();
        setCountry(null);
        setStep('proxy');
      },
    });

  // The cloud browser: the sender signs in to LinkedIn here, as they would on linkedin.com.
  if (step === 'browser' && browserUrl) {
    return createPortal(
      <Modal
        open
        size="lg"
        modalHeading={`Sign in to ${name}’s LinkedIn`}
        primaryButtonText="I have logged in"
        secondaryButtonText="Cancel"
        preventCloseOnClickOutside
        onRequestClose={() => setStep('sign-in')}
        onRequestSubmit={() => {
          // Closing the frame ends the remote session, as GetSales' own button does.
          check.reset();
          setIsSlow(false);
          setBrowserUrl(null);
          setStep('closing');
        }}
      >
        <Stack gap={4}>
          <CloudBrowserFrame url={browserUrl} title={`Cloud browser for ${name}`} />
          <p className={styles.modalText}>
            Use Ctrl+C and Ctrl+V to copy and paste. When you’re signed in, choose I have logged in.
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
            {check.isError ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Couldn’t check the session."
                subtitle={toUserMessage(check.error)}
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
