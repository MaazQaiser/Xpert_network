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

const LOCALES = { en: 'en-GB', ar: 'ar-SA' } as const;
const noSubscribe = () => () => {};

/**
 * Voice for the interview room (PRODUCT_PLAN §8): the interviewer speaks with speech
 * synthesis; the expert's speech becomes text with speech recognition where the browser has
 * it, and typing otherwise.
 */
export function useSpeech(language: 'en' | 'ar') {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // Feature detection; the server snapshot is false so the first render matches.
  const canSpeak = useSyncExternalStore(
    noSubscribe,
    () => 'speechSynthesis' in window,
    () => false,
  );
  const canListen = useSyncExternalStore(
    noSubscribe,
    () => recognitionConstructor() !== null,
    () => false,
  );
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window)
        window.speechSynthesis.cancel();
      recognition.current?.stop();
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!canSpeak || !text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LOCALES[language];
      utterance.rate = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [canSpeak, language],
  );

  const stopSpeaking = useCallback(() => {
    if (canSpeak) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [canSpeak]);

  /** Streams what the expert says into `onText` (interim and final), until `stopListening`. */
  const listen = useCallback(
    (onText: (text: string) => void, onError: (message: string) => void) => {
      const Ctor = recognitionConstructor();
      if (!Ctor) return;
      const instance = new Ctor();
      instance.lang = LOCALES[language];
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
        onError(
          event.error === 'not-allowed'
            ? 'Your browser blocked the microphone. Type your answer instead, or allow the microphone and try again.'
            : 'We didn’t catch that. Try again, or type your answer.',
        );
      };
      instance.onend = () => setIsListening(false);
      recognition.current = instance;
      setIsListening(true);
      instance.start();
    },
    [language],
  );

  const stopListening = useCallback(() => {
    recognition.current?.stop();
    setIsListening(false);
  }, []);

  return {
    canSpeak,
    canListen,
    isSpeaking,
    isListening,
    speak,
    stopSpeaking,
    listen,
    stopListening,
  };
}
