'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, SkeletonText, Theme } from '@carbon/react';
import {
  Chat,
  CheckmarkFilled,
  CircleDash,
  Microphone,
  MicrophoneOff,
  Notebook,
  PhoneOff,
  RecordingFilled,
  Screen,
  ScreenOff,
  SendAlt,
  Touch_1 as RaiseHand,
  UserMultiple,
  Video,
  VideoOff,
} from '@carbon/icons-react';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, NotFoundState, XpertLogo } from '@/shared/ui';
import { useCallRecord } from '../../api/queries';
import type { CallDetail, CallSpeaker } from '../../model/calls.schema';
import { Avatar, clock, timeOf } from '../Calls/callParts';
import styles from './MeetingRoom.module.scss';

type Person = {
  who: CallSpeaker;
  name: string;
  role: string;
  photoUrl: string | null;
  videoUrl: string | null;
};
type Panel = 'chat' | 'people' | 'notes' | null;
type Message = { id: string; from: string; text: string; at: string };

function peopleOf(call: CallDetail): [Person, Person, Person] {
  return [
    { who: 'client', role: `Client · ${call.client.detail}`, ...call.client },
    { who: 'expert', role: `Expert · ${call.expert.detail}`, ...call.expert },
    { who: 'pm', role: 'You · Moderator', ...call.moderator },
  ];
}

/**
 * The Xpert Network meeting room, our own call app in the manner of Microsoft Teams: Join opens
 * it over the console, full screen. A lobby first (check your camera and mic), then the call:
 * a bar with the title, the running time and the controls; the people in a gallery with your
 * own camera in the corner; and a side panel for chat, people and the AI's live notes, which
 * tick off the client's questions as the call covers them. Leave goes to the call's review.
 */
export function MeetingRoom({ callId }: { callId: string }) {
  const call = useCallRecord(callId);
  // The room covers the console, as a call window does; it renders into the page body.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return createPortal(
    <Theme theme="g100" className={styles.room}>
      <AsyncBoundary
        query={call}
        errorTitle="This call didn’t open"
        notFound={
          <NotFoundState
            title="Call not found"
            message="The link may be out of date. Your calls are on the Calls page."
            backHref={routes.admin.calls}
            backLabel="Back to Calls"
          />
        }
        loading={
          <div className={styles.loading} aria-busy="true" aria-label="Opening the call">
            <SkeletonText heading width="30%" />
          </div>
        }
      >
        {(data) => <Room call={data} />}
      </AsyncBoundary>
    </Theme>,
    document.body,
  );
}

function Room({ call }: { call: CallDetail }) {
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  if (call.status === 'completed') {
    return (
      <div className={styles.lobby}>
        <div className={styles.lobbyCard}>
          <h1 className={styles.lobbyTitle}>This call has ended</h1>
          <p className={styles.lobbyMeta}>
            The recording, transcript and report are on its review page.
          </p>
          <div className={styles.lobbyActions}>
            <Button as={Link} href={routes.admin.callReview(call.id)} size="lg">
              Open the review
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return joined ? (
    <InCall call={call} micOn={micOn} camOn={camOn} setMicOn={setMicOn} setCamOn={setCamOn} />
  ) : (
    <Lobby
      call={call}
      micOn={micOn}
      camOn={camOn}
      setMicOn={setMicOn}
      setCamOn={setCamOn}
      onJoin={() => setJoined(true)}
    />
  );
}

// ——— Before you join ———————————————————————————————————————————————————————————————
function Lobby({
  call,
  micOn,
  camOn,
  setMicOn,
  setCamOn,
  onJoin,
}: {
  call: CallDetail;
  micOn: boolean;
  camOn: boolean;
  setMicOn: (on: boolean) => void;
  setCamOn: (on: boolean) => void;
  onJoin: () => void;
}) {
  const [, , me] = peopleOf(call);
  const waiting = call.status === 'live' ? [call.client.name, call.expert.name] : [];
  return (
    <div className={styles.lobby}>
      <div className={styles.lobbyCard}>
        <span className={styles.brand}>
          <XpertLogo size={20} />
          Xpert Network
        </span>
        <h1 className={styles.lobbyTitle}>
          {call.expert.name} × {call.client.detail}
        </h1>
        <p className={styles.lobbyMeta}>
          {call.projectName} · {timeOf(call.startsAt)} – {timeOf(call.endsAt)} GMT
        </p>

        {/* Your camera, before anyone sees it. */}
        <div className={styles.preview}>
          <Camera person={me} on={camOn} running />
          <span className={styles.previewName}>{me.name}</span>
        </div>

        <div className={styles.lobbyToggles}>
          <ToggleButton
            on={camOn}
            onLabel="Camera on"
            offLabel="Camera off"
            OnIcon={Video}
            OffIcon={VideoOff}
            onToggle={() => setCamOn(!camOn)}
          />
          <ToggleButton
            on={micOn}
            onLabel="Mic on"
            offLabel="Mic off"
            OnIcon={Microphone}
            OffIcon={MicrophoneOff}
            onToggle={() => setMicOn(!micOn)}
          />
        </div>

        <p className={styles.lobbyWho}>
          {waiting.length > 0
            ? `${waiting.join(' and ')} are in the call.`
            : 'No one else has joined yet.'}{' '}
          The call is recorded, and the AI takes notes.
        </p>

        <div className={styles.lobbyActions}>
          <Button size="lg" onClick={onJoin} className={styles.joinButton}>
            Join now
          </Button>
          <Button as={Link} href={routes.admin.callReview(call.id)} kind="ghost" size="lg">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ——— In the call ———————————————————————————————————————————————————————————————————
function InCall({
  call,
  micOn,
  camOn,
  setMicOn,
  setCamOn,
}: {
  call: CallDetail;
  micOn: boolean;
  camOn: boolean;
  setMicOn: (on: boolean) => void;
  setCamOn: (on: boolean) => void;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>('notes');
  const [hand, setHand] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [joinedAt] = useState(() => Date.now());
  const people = peopleOf(call);
  const [client, expert, me] = people;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  // Running time: from the call's start when it's live, else from when you joined.
  const since = call.status === 'live' ? new Date(call.startsAt).getTime() : joinedAt;
  const elapsed = Math.max(0, (now - since) / 1000);
  // Who's talking: the last line's speaker when live; otherwise the two take turns.
  const lastSpeaker = call.transcript.at(-1)?.speaker;
  const speaking: CallSpeaker =
    call.status === 'live' && lastSpeaker && lastSpeaker !== 'pm'
      ? lastSpeaker
      : Math.floor(elapsed / 6) % 2 === 0
        ? 'expert'
        : 'client';

  const toggle = (next: Exclude<Panel, null>) => setPanel((p) => (p === next ? null : next));

  return (
    <div className={styles.call}>
      {/* The bar: what this is and how long, then the controls, as in Teams. */}
      <header className={styles.bar}>
        <div className={styles.barTitle}>
          <XpertLogo size={20} />
          <span className={styles.barName}>
            {call.expert.name} × {call.client.detail}
          </span>
          <span className={styles.timer} aria-label={`Call time ${clock(elapsed)}`}>
            {clock(elapsed)}
          </span>
          <span className={styles.rec}>
            <RecordingFilled size={16} aria-hidden={true} />
            Recording · AI notes on
          </span>
        </div>

        <nav className={styles.controls} aria-label="Call controls">
          <BarButton
            label="Chat"
            Icon={Chat}
            pressed={panel === 'chat'}
            onClick={() => toggle('chat')}
          />
          <BarButton
            label="People"
            Icon={UserMultiple}
            pressed={panel === 'people'}
            onClick={() => toggle('people')}
            badge={String(people.length)}
          />
          <BarButton
            label="Notes"
            Icon={Notebook}
            pressed={panel === 'notes'}
            onClick={() => toggle('notes')}
          />
          <BarButton
            label={hand ? 'Lower' : 'Raise'}
            Icon={RaiseHand}
            pressed={hand}
            onClick={() => setHand(!hand)}
          />
          <span className={styles.divider} aria-hidden="true" />
          <BarButton
            label={camOn ? 'Camera' : 'Camera off'}
            Icon={camOn ? Video : VideoOff}
            pressed={!camOn}
            onClick={() => setCamOn(!camOn)}
          />
          <BarButton
            label={micOn ? 'Mic' : 'Muted'}
            Icon={micOn ? Microphone : MicrophoneOff}
            pressed={!micOn}
            onClick={() => setMicOn(!micOn)}
          />
          <BarButton
            label={sharing ? 'Stop sharing' : 'Share'}
            Icon={sharing ? ScreenOff : Screen}
            pressed={sharing}
            onClick={() => setSharing(!sharing)}
          />
          <Button
            kind="danger"
            size="md"
            renderIcon={PhoneOff}
            className={styles.leave}
            onClick={() => router.push(routes.admin.callReview(call.id))}
          >
            Leave
          </Button>
        </nav>
      </header>

      <div className={panel ? `${styles.body} ${styles.bodyPanel}` : styles.body}>
        <main className={styles.stage} aria-label="People on the call">
          {sharing ? (
            <p className={styles.sharing} role="status">
              <Screen size={16} aria-hidden={true} />
              You’re sharing your screen.
              <button
                type="button"
                className={styles.sharingStop}
                onClick={() => setSharing(false)}
              >
                Stop sharing
              </button>
            </p>
          ) : null}
          <div className={styles.gallery}>
            {[client, expert].map((person) => (
              <Tile
                key={person.who}
                person={person}
                speaking={speaking === person.who}
                muted={false}
              />
            ))}
          </div>
          {/* Your own camera, small in the corner. */}
          <div className={styles.self}>
            <Tile person={me} self camOn={camOn} muted={!micOn} hand={hand} speaking={false} />
          </div>
        </main>

        {panel ? (
          <aside className={styles.panel} aria-label={PANEL_TITLES[panel]}>
            <h2 className={styles.panelTitle}>{PANEL_TITLES[panel]}</h2>
            {panel === 'chat' ? <ChatPanel call={call} /> : null}
            {panel === 'people' ? <PeoplePanel people={people} micOn={micOn} hand={hand} /> : null}
            {panel === 'notes' ? <NotesPanel call={call} /> : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

const PANEL_TITLES: Record<Exclude<Panel, null>, string> = {
  chat: 'Meeting chat',
  people: 'People',
  notes: 'AI notes',
};

// ——— Pieces ————————————————————————————————————————————————————————————————————————
function BarButton({
  label,
  Icon,
  pressed,
  onClick,
  badge,
}: {
  label: string;
  Icon: typeof Chat;
  pressed: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button type="button" className={styles.barButton} aria-pressed={pressed} onClick={onClick}>
      <span className={styles.barIcon}>
        <Icon size={20} aria-hidden={true} />
        {badge ? <span className={styles.badge}>{badge}</span> : null}
      </span>
      <span className={styles.barLabel}>{label}</span>
    </button>
  );
}

function ToggleButton({
  on,
  onLabel,
  offLabel,
  OnIcon,
  OffIcon,
  onToggle,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  OnIcon: typeof Chat;
  OffIcon: typeof Chat;
  onToggle: () => void;
}) {
  const Icon = on ? OnIcon : OffIcon;
  return (
    <button
      type="button"
      className={on ? styles.toggle : `${styles.toggle} ${styles.toggleOff}`}
      aria-pressed={on}
      onClick={onToggle}
    >
      <Icon size={20} aria-hidden={true} />
      {on ? onLabel : offLabel}
    </button>
  );
}

/** A camera: the person's clip, or their face when the camera is off. */
function Camera({ person, on, running }: { person: Person; on: boolean; running: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    try {
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (running && !still) void Promise.resolve(video.play()).catch(() => undefined);
      else video.pause();
    } catch {
      // No playback here (test DOMs); the poster stands in.
    }
  }, [running, on]);
  if (!on || !person.videoUrl) {
    return (
      <span className={styles.cameraOff}>
        <Avatar name={person.name} photoUrl={person.photoUrl} size={64} />
      </span>
    );
  }
  return (
    <video
      ref={ref}
      className={styles.camera}
      src={person.videoUrl}
      poster={person.videoUrl.replace(/\.mp4$/, '.jpg')}
      muted
      loop
      playsInline
      autoPlay
      aria-hidden="true"
    />
  );
}

function Tile({
  person,
  speaking,
  muted,
  self = false,
  camOn = true,
  hand = false,
}: {
  person: Person;
  speaking: boolean;
  muted: boolean;
  self?: boolean;
  camOn?: boolean;
  hand?: boolean;
}) {
  return (
    <figure
      className={[styles.tile, speaking ? styles.tileSpeaking : null, self ? styles.tileSelf : null]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${person.name}${speaking ? ', speaking' : ''}${muted ? ', muted' : ''}`}
    >
      <Camera person={person} on={camOn} running />
      {hand ? (
        <span className={styles.hand} aria-label="Hand raised">
          <RaiseHand size={16} aria-hidden={true} />
        </span>
      ) : null}
      <figcaption className={styles.nameTag}>
        {muted ? <MicrophoneOff size={16} aria-hidden={true} /> : null}
        {self ? 'You' : person.name}
      </figcaption>
    </figure>
  );
}

function ChatPanel({ call }: { call: CallDetail }) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'm1',
      from: call.client.name,
      text: 'Joining now, thanks for setting this up.',
      at: timeOf(call.startsAt),
    },
    {
      id: 'm2',
      from: call.expert.name,
      text: 'Hi all, ready when you are.',
      at: timeOf(call.startsAt),
    },
  ]);
  const [draft, setDraft] = useState('');
  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const at = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setMessages((list) => [...list, { id: `m${list.length + 1}`, from: 'You', text, at }]);
    setDraft('');
  };
  return (
    <div className={styles.chat}>
      <ol className={styles.messages} aria-live="polite">
        {messages.map((m) => (
          <li
            key={m.id}
            className={m.from === 'You' ? `${styles.message} ${styles.mine}` : styles.message}
          >
            <span className={styles.messageHead}>
              {m.from} <span className={styles.messageAt}>{m.at}</span>
            </span>
            <span className={styles.messageText}>{m.text}</span>
          </li>
        ))}
      </ol>
      <form className={styles.compose} onSubmit={send}>
        <label htmlFor="room-chat" className="cds--visually-hidden">
          Message everyone
        </label>
        <input
          id="room-chat"
          className={styles.composeInput}
          placeholder="Message everyone"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className={styles.composeSend} aria-label="Send">
          <SendAlt size={16} aria-hidden={true} />
        </button>
      </form>
    </div>
  );
}

function PeoplePanel({ people, micOn, hand }: { people: Person[]; micOn: boolean; hand: boolean }) {
  return (
    <ul className={styles.people}>
      {people.map((p) => {
        const isMe = p.who === 'pm';
        return (
          <li key={p.who} className={styles.personRow}>
            <Avatar name={p.name} photoUrl={p.photoUrl} size={32} />
            <span className={styles.personText}>
              <span className={styles.personName}>{isMe ? `${p.name} (you)` : p.name}</span>
              <span className={styles.personRole}>{p.role}</span>
            </span>
            {isMe && hand ? <RaiseHand size={16} aria-label="Hand raised" /> : null}
            {isMe && !micOn ? (
              <MicrophoneOff size={16} aria-label="Muted" />
            ) : (
              <Microphone size={16} aria-label="Mic on" />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The AI's live notes: the client's questions, ticked as the call covers them; what was said. */
function NotesPanel({ call }: { call: CallDetail }) {
  const covered = call.questions.filter((q) => q.covered).length;
  const recent = call.transcript.slice(-4);
  return (
    <div className={styles.notes}>
      <section>
        <h3 className={styles.notesHead}>
          The client’s questions{' '}
          <span className={styles.notesCount}>
            {covered} of {call.questions.length}
          </span>
        </h3>
        <ul className={styles.checks}>
          {call.questions.map((q) => (
            <li key={q.text} className={q.covered ? styles.checkDone : undefined}>
              {q.covered ? (
                <CheckmarkFilled size={16} aria-label="Covered" />
              ) : (
                <CircleDash size={16} aria-label="Not yet" />
              )}
              {q.text}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className={styles.notesHead}>Just said</h3>
        {recent.length === 0 ? (
          <p className={styles.notesEmpty}>Lines show here as people speak.</p>
        ) : (
          <ol className={styles.lines}>
            {recent.map((line) => (
              <li key={line.id}>
                <span className={styles.lineWho}>
                  {line.speaker === 'pm'
                    ? 'You'
                    : line.speaker === 'client'
                      ? call.client.name
                      : call.expert.name}
                </span>
                {line.text}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
