import { useState, useEffect, useRef, useCallback } from 'react';

// Browser SpeechRecognition interface typing
interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((this: SpeechRecognitionLike, ev: SpeechRecognitionEventLike) => any) | null;
  onerror: ((this: SpeechRecognitionLike, ev: SpeechRecognitionErrorEventLike) => any) | null;
  onend: ((this: SpeechRecognitionLike, ev: Event) => any) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseVoiceOptions {
  autoSpeak?: boolean;
  voiceRate?: number;
  voicePitch?: number;
  voiceName?: string;
  engine?: 'neural' | 'browser';
  onSpeechInput?: (text: string) => void;
}

export interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  sttSupported: boolean;
  ttsSupported: boolean;
  selectedVoice: string;
  setSelectedVoice: (voiceId: string) => void;
  engine: 'neural' | 'browser';
  setEngine: (eng: 'neural' | 'browser') => void;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, onEnded?: () => void) => void;
  stopSpeaking: () => void;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    autoSpeak = false,
    voiceRate = 1.0,
    voicePitch = 1.0,
    voiceName: initialVoice = 'en-US-ChristopherNeural',
    engine: initialEngine = 'neural',
    onSpeechInput,
  } = options;

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>(initialVoice);
  const [engine, setEngine] = useState<'neural' | 'browser'>(initialEngine);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);

  const sttSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const ttsSupported = typeof window !== 'undefined' && ('speechSynthesis' in window || typeof Audio !== 'undefined');

  // Initialize SpeechRecognition
  useEffect(() => {
    if (!sttSupported) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      // If an Urdu voice is selected, enable Urdu speech recognition, else English
      recognition.lang = selectedVoice.startsWith('ur-') ? 'ur-PK' : 'en-US';

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript && onSpeechInput) {
          onSpeechInput(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('SpeechRecognition initialization error:', e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [sttSupported, onSpeechInput, selectedVoice]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can type your question in the chat.');
      return;
    }
    try {
      setIsListening(true);
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Could not start recognition:', err);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, onEnded?: () => void) => {
      if (!text || !text.trim()) return;

      stopSpeaking();

      // Clean markdown formatting for clear speech
      const cleaned = text
        .replace(/[#*_`~]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (!cleaned) return;

      setIsSpeaking(true);

      // Attempt 1: Server-side Edge Neural TTS (realistic, human-quality)
      if (engine === 'neural') {
        try {
          const ratePercent = `${Math.round((voiceRate - 1.0) * 100)}%`;
          const signedRate = ratePercent.startsWith('-') ? ratePercent : `+${ratePercent}`;

          const res = await fetch('/api/tutor/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cleaned,
              voice: selectedVoice,
              rate: signedRate,
            }),
          });

          if (res.ok) {
            const blob = await res.blob();
            const audioUrl = URL.createObjectURL(blob);
            currentAudioUrlRef.current = audioUrl;

            const audio = new Audio(audioUrl);
            currentAudioRef.current = audio;

            audio.onended = () => {
              setIsSpeaking(false);
              if (onEnded) onEnded();
            };

            audio.onerror = (e) => {
              console.warn('Audio playback error, falling back to browser synthesis:', e);
              speakBrowserFallback(cleaned, onEnded);
            };

            await audio.play();
            return;
          } else {
            console.warn('Neural TTS server error, falling back to browser speech synthesis');
          }
        } catch (err) {
          console.warn('Neural TTS fetch failed, falling back to browser speech synthesis:', err);
        }
      }

      // Fallback: Browser SpeechSynthesis
      speakBrowserFallback(cleaned, onEnded);
    },
    [selectedVoice, engine, voiceRate, stopSpeaking]
  );

  const speakBrowserFallback = (cleaned: string, onEnded?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      if (onEnded) onEnded();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = voiceRate;
      utterance.pitch = voicePitch;
      utterance.lang = selectedVoice.startsWith('ur-') ? 'ur-PK' : 'en-US';

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnded) onEnded();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        if (onEnded) onEnded();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Browser speech synthesis error:', e);
      setIsSpeaking(false);
      if (onEnded) onEnded();
    }
  };

  return {
    isListening,
    isSpeaking,
    sttSupported,
    ttsSupported,
    selectedVoice,
    setSelectedVoice,
    engine,
    setEngine,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}

