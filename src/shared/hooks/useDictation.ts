'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** The slice of the Web Speech API we use; not in TypeScript's DOM types yet. */
type RecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noSubscribe = () => () => {};

/**
 * Speech-to-text for message boxes, using the browser's own speech recognition where it
 * exists (PRODUCT_PLAN §8: Web Speech API or typed fallback). `canDictate` is false where the
 * browser has none, so callers can hide the control and keep typing as the only path.
 */
export function useDictation(lang = 'en-GB') {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Feature detection; the server snapshot is false so the first render matches.
  const canDictate = useSyncExternalStore(
    noSubscribe,
    () => recognitionConstructor() !== null,
    () => false,
  );
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => () => recognition.current?.stop(), []);

  /** Streams what's said into `onText` (interim and final) until `stop` or silence. */
  const start = useCallback(
    (onText: (text: string) => void) => {
      const Ctor = recognitionConstructor();
      if (!Ctor) return;
      const instance = new Ctor();
      instance.lang = lang;
      instance.continuous = true;
      instance.interimResults = true;
      let finalText = '';
      instance.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (!result) continue;
          const piece = result[0]?.transcript ?? '';
          if (result.isFinal) finalText += piece;
          else interim += piece;
        }
        onText(`${finalText}${interim}`.trim());
      };
      instance.onerror = (event) => {
        setIsListening(false);
        setError(
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'Your browser blocked the microphone. Allow it and try again, or type instead.'
            : 'We didn’t catch that. Try again, or type instead.',
        );
      };
      instance.onend = () => setIsListening(false);
      recognition.current = instance;
      setError(null);
      setIsListening(true);
      instance.start();
    },
    [lang],
  );

  const stop = useCallback(() => {
    recognition.current?.stop();
    setIsListening(false);
  }, []);

  return { canDictate, isListening, error, start, stop };
}
