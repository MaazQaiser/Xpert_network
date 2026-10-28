'use client';

import { useEffect, useRef, useState } from 'react';
import { IconButton, Theme } from '@carbon/react';
import { PauseFilled, PlayFilledAlt } from '@carbon/icons-react';
import type { CallDetail, CallSpeaker } from '../../model/calls.schema';
import { Avatar, clock } from './callParts';
import styles from './Calls.module.scss';

const SPEEDS = [1, 1.5, 2] as const;

/** Each person's colour class, on the scrubber and in the talk-time key. */
const SPEAKER_CLASS: Record<CallSpeaker, string | undefined> = {
  client: styles.speakerClient,
  expert: styles.speakerExpert,
  pm: styles.speakerPm,
};

type Participant = {
  who: CallSpeaker;
  name: string;
  photoUrl: string | null;
  videoUrl: string | null;
  role: string;
};

export function participantsOf(call: CallDetail): [Participant, Participant, Participant] {
  return [
    { who: 'client', ...call.client, role: 'Client' },
    { who: 'expert', ...call.expert, role: 'Expert' },
    { who: 'pm', ...call.moderator, role: 'Moderator' },
  ];
}

/** Who spoke when: one span per transcript line, until the next line starts. */
function segmentsOf(call: CallDetail, length: number) {
  return call.transcript.map((line, i) => {
    const end = call.transcript[i + 1]?.at ?? length;
    return { id: line.id, speaker: line.speaker, from: line.at, to: Math.max(line.at, end) };
  });
}

/** Each person's share of the talking, as a whole percentage. */
export function talkTime(call: CallDetail, length: number): Record<CallSpeaker, number> {
  const totals: Record<CallSpeaker, number> = { client: 0, expert: 0, pm: 0 };
  const segments = segmentsOf(call, length);
  for (const s of segments) totals[s.speaker] += s.to - s.from;
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  return {
    client: Math.round((totals.client / sum) * 100),
    expert: Math.round((totals.expert / sum) * 100),
    pm: Math.round((totals.pm / sum) * 100),
  };
}

/**
 * The call's recording, after Fathom: a dark video stage with whoever is speaking large and the
 * others in a strip beside, and the controls over its foot: play, the time, a scrubber coloured
 * by who was talking (key moments marked above it) and the speed. The prototype has no media,
 * so playback runs a clock that the stage, transcript and moments follow. Live, the stage shows
 * the call as it happens and the controls give way to the running time.
 */
export function RecordingPlayer({
  call,
  length,
  position,
  playing,
  speaker,
  onSeek,
  onPlaying,
}: {
  call: CallDetail;
  /** Seconds. */
  length: number;
  position: number;
  playing: boolean;
  /** Who is speaking at this point. */
  speaker: CallSpeaker | null;
  onSeek: (seconds: number) => void;
  onPlaying: (playing: boolean) => void;
}) {
  const isLive = call.status === 'live';
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const people = participantsOf(call);
  // The one talking fills the stage; with nobody yet, the expert does.
  const main = people.find((p) => p.who === (speaker ?? 'expert')) ?? people[1];
  const strip = people.filter((p) => p !== main);

  // While playing, the clock ticks forward at the chosen speed; it stops at the end.
  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      onSeek(Math.min(length, position + 1));
      if (position + 1 >= length) onPlaying(false);
    }, 1000 / speed);
    return () => window.clearInterval(timer);
  }, [playing, position, length, speed, onSeek, onPlaying]);

  // Live, the running time since the call started.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isLive) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isLive]);
  const liveFor = Math.max(0, (now - new Date(call.startsAt).getTime()) / 1000);

  const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1;

  return (
    <Theme theme="g100" as="section" className={styles.player} aria-label="Recording">
      <div className={styles.screen}>
        <div className={styles.mainTile}>
          {/* Keyed by person, so the new speaker's camera cuts in. */}
          <Camera key={main.who} person={main} running={playing || isLive} size={96} />
          <NameTag person={main} speaking={speaker === main.who && (playing || isLive)} />
        </div>

        <ul className={styles.strip} aria-label="Also on the call">
          {strip.map((person) => (
            <li key={person.who} className={styles.stripTile}>
              <Camera person={person} running={playing || isLive} size={48} />
              <NameTag person={person} speaking={false} compact />
            </li>
          ))}
        </ul>

        {isLive ? (
          <span className={styles.stageLive}>
            <span className={styles.liveDot} aria-hidden="true" />
            Live
          </span>
        ) : null}

        <div className={styles.controls}>
          {isLive ? (
            <p className={styles.liveClock}>
              <span className={styles.time}>{clock(liveFor)}</span>
              <span className={styles.liveClockNote}>
                Recording. Playback is ready when the call ends.
              </span>
            </p>
          ) : (
            <>
              <IconButton
                kind="ghost"
                size="md"
                label={playing ? 'Pause' : 'Play'}
                align="top-left"
                onClick={() => {
                  if (!playing && position >= length) onSeek(0);
                  onPlaying(!playing);
                }}
              >
                {playing ? <PauseFilled /> : <PlayFilledAlt />}
              </IconButton>
              <span className={styles.time}>
                {clock(position)} / {clock(length)}
              </span>
              <div className={styles.track}>
                <div className={styles.segments} aria-hidden="true">
                  {segmentsOf(call, length).map((s) => (
                    <span
                      key={s.id}
                      className={`${styles.segment} ${SPEAKER_CLASS[s.speaker]}`}
                      style={{
                        insetInlineStart: `${(s.from / length) * 100}%`,
                        inlineSize: `${((s.to - s.from) / length) * 100}%`,
                      }}
                    />
                  ))}
                  <span
                    className={styles.unplayed}
                    style={{ inlineSize: `${(1 - position / length) * 100}%` }}
                  />
                </div>
                {call.moments.map((moment) => (
                  <span
                    key={moment.at}
                    className={styles.marker}
                    style={{ insetInlineStart: `${(moment.at / length) * 100}%` }}
                    title={moment.title}
                    aria-hidden="true"
                  />
                ))}
                <input
                  type="range"
                  className={styles.range}
                  min={0}
                  max={length}
                  step={1}
                  value={position}
                  aria-label="Position in the recording"
                  aria-valuetext={clock(position)}
                  onChange={(event) => onSeek(Number(event.target.value))}
                />
              </div>
              <button
                type="button"
                className={styles.speed}
                aria-label={`Playback speed ${speed}×. Change to ${nextSpeed}×`}
                onClick={() => setSpeed(nextSpeed)}
              >
                {speed}×
              </button>
            </>
          )}
        </div>
      </div>
    </Theme>
  );
}

/**
 * One person's camera: their clip filling the tile, running while the call plays (or is
 * live) and held on its first frame otherwise. Reduced motion holds every frame still.
 */
function Camera({
  person,
  running,
  size,
}: {
  person: Participant;
  running: boolean;
  size: 48 | 96;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // play() can refuse (autoplay rules) or be missing (test DOMs); the poster stands in.
    try {
      if (running && !still) void Promise.resolve(video.play()).catch(() => undefined);
      else video.pause();
    } catch {
      // Nothing to do: the tile keeps its poster frame.
    }
  }, [running]);

  if (!person.videoUrl) {
    return <Avatar name={person.name} photoUrl={person.photoUrl} size={size} />;
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
      autoPlay={running}
      preload="metadata"
      aria-hidden="true"
    />
  );
}

/** The name tag on a tile, as a meeting app shows it: sound bars while they talk. */
function NameTag({
  person,
  speaking,
  compact = false,
}: {
  person: Participant;
  speaking: boolean;
  compact?: boolean;
}) {
  return (
    <span className={compact ? `${styles.nameTag} ${styles.nameTagCompact}` : styles.nameTag}>
      {speaking ? (
        <span className={styles.bars} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      ) : null}
      <span className={styles.nameTagName}>{person.name}</span>
      {compact ? null : <span className={styles.nameTagRole}>{person.role}</span>}
    </span>
  );
}

/** Under the video: each person's colour on the scrubber and their share of the talking. */
export function TalkTime({ call, length }: { call: CallDetail; length: number }) {
  const shares = talkTime(call, length);
  return (
    <ul className={styles.talkTime} aria-label="Talk time">
      {participantsOf(call).map((person) => (
        <li key={person.who} className={styles.talker}>
          <span className={`${styles.swatch} ${SPEAKER_CLASS[person.who]}`} aria-hidden="true" />
          <span className={styles.talkerName}>{person.name}</span>
          <span className={styles.talkerShare}>{shares[person.who]}%</span>
        </li>
      ))}
    </ul>
  );
}
