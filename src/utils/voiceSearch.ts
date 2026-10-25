import type { Lang } from '../i18n';

/** Why listening stopped without a result. */
export type VoiceProblem = 'unsupported' | 'denied' | 'no-speech' | 'no-microphone' | 'network' | 'failed';

export interface VoiceSession {
  /** Stop listening; no result is delivered. */
  cancel: () => void;
}

interface VoiceHandlers {
  onResult: (text: string) => void;
  onProblem: (problem: VoiceProblem) => void;
  /** Always called once when the session is over (result, problem or cancel). */
  onEnd: () => void;
}

type RecognitionCtor = new () => any;

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceSupported(): boolean {
  return getCtor() !== null;
}

/** Recognition language follows the app language (and the country for German). */
export function recognitionLang(lang: Lang, country: string): string {
  if (lang === 'de') return country === 'AT' ? 'de-AT' : 'de-DE';
  if (lang === 'ro') return 'ro-RO';
  return 'en-GB';
}

/** Cleans the spoken text: no trailing full stop, single spaces. */
export function cleanTranscript(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/[.。!?]+$/, '').trim();
}

/** Starts one dictation. The browser asks for microphone permission the first time. */
export function startVoiceSearch(lang: string, handlers: VoiceHandlers): VoiceSession | null {
  const Ctor = getCtor();
  if (!Ctor) {
    handlers.onProblem('unsupported');
    handlers.onEnd();
    return null;
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let finished = false;
  let gotResult = false;
  let problem: VoiceProblem | null = null;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (!gotResult && problem) handlers.onProblem(problem);
    handlers.onEnd();
  };

  rec.onresult = (event: any) => {
    const text = cleanTranscript(event.results?.[0]?.[0]?.transcript ?? '');
    if (text) {
      gotResult = true;
      handlers.onResult(text);
    }
  };
  rec.onerror = (event: any) => {
    switch (event.error) {
      case 'not-allowed':
      case 'service-not-allowed':
        problem = 'denied';
        break;
      case 'no-speech':
        problem = 'no-speech';
        break;
      case 'audio-capture':
        problem = 'no-microphone';
        break;
      case 'network':
        problem = 'network';
        break;
      case 'aborted':
        break; // cancelled by us
      default:
        problem = 'failed';
    }
  };
  rec.onend = () => {
    if (!gotResult && !problem && !finished) problem = 'no-speech';
    finish();
  };

  try {
    rec.start();
  } catch {
    problem = 'failed';
    finish();
    return null;
  }
  return {
    cancel: () => {
      problem = null;
      gotResult = true; // suppress any late result
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      finish();
    },
  };
}
