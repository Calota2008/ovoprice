import React, { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

/**
 * Iri, the OvoPrice mascot. Still pictures (public/mascot) moved with CSS:
 * - "idle" breathes gently, "bounce" jumps, "pop" springs in, "wobble" shakes its head;
 * - tapping or clicking tickles Iri: it squishes, laughs for a moment and says something funny;
 *   five taps in a row and it jumps in confetti.
 * People who asked their device for less motion get a still Iri (see index.css).
 */
export type IriPose = 'wave' | 'cart' | 'search' | 'puzzled' | 'celebrate' | 'heart' | 'bell' | 'sleep' | 'laugh';
export type IriMotion = 'idle' | 'bounce' | 'pop' | 'wobble' | 'none';

export const iriSrc = (pose: IriPose) => `/mascot/iri_${pose}.webp`;

const TICKLE_LINES = [
  () => t('Hehe! That tickles!'),
  () => t('Tickle me again!'),
  () => t('Stop, my belly hurts from laughing!'),
  () => t('I am looking for prices, not for jokes!'),
  () => t('One more and I jump!'),
];

interface IriProps {
  pose: IriPose;
  motion?: IriMotion;
  /** Height in px (the width follows the picture). */
  size: number;
  /** Tap / click to tickle. Off for small pictures inside messages. */
  tickle?: boolean;
  className?: string;
  /** Lazy loading for pictures below the fold. */
  lazy?: boolean;
}

export const Iri: React.FC<IriProps> = ({ pose, motion = 'idle', size, tickle = true, className = '', lazy }) => {
  const [laughing, setLaughing] = useState(false);
  const [party, setParty] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const taps = useRef(0);
  const timers = useRef<number[]>([]);
  const lastTap = useRef(0);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const onTickle = () => {
    const now = Date.now();
    taps.current = now - lastTap.current < 1500 ? taps.current + 1 : 1;
    lastTap.current = now;
    try {
      navigator.vibrate?.(25);
    } catch {
      /* not supported (iPhone): the animation is enough */
    }
    if (taps.current >= 5) {
      taps.current = 0;
      setLaughing(false);
      setParty(true);
      setLine(t('Wheee! You found my secret!'));
      later(() => setParty(false), 1600);
    } else {
      setLaughing(true);
      setLine(TICKLE_LINES[(taps.current - 1) % TICKLE_LINES.length]());
      later(() => setLaughing(false), 900);
    }
    const shown = now;
    later(() => {
      if (lastTap.current === shown) setLine(null);
    }, 1800);
  };

  const shownPose: IriPose = party ? 'celebrate' : laughing ? 'laugh' : pose;
  const anim = party ? 'iri-bounce' : laughing ? 'iri-squish' : motion === 'none' ? '' : `iri-${motion}`;
  // Re-mount the picture on each tickle so the squish animation restarts.
  const key = `${shownPose}-${laughing ? lastTap.current : 0}-${party ? 'p' : ''}`;

  const picture = (
    <img
      key={key}
      src={iriSrc(shownPose)}
      alt=""
      draggable={false}
      loading={lazy ? 'lazy' : undefined}
      style={{ height: size }}
      className={`block w-auto max-w-none select-none origin-bottom ${anim}`}
    />
  );

  // "absolute" from the caller replaces the default "relative" (both on one element would conflict).
  const pos = /\babsolute\b/.test(className) ? '' : 'relative';

  if (!tickle) {
    return (
      <span className={`${pos} inline-block ${className}`} aria-hidden="true">
        {picture}
      </span>
    );
  }

  return (
    <span className={`${pos} inline-block ${className}`}>
      <button
        type="button"
        onClick={onTickle}
        aria-label={t('Iri, the OvoPrice mascot. Tap to tickle.')}
        className="block cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-emerald-600 [-webkit-tap-highlight-color:transparent]"
        data-testid="iri"
      >
        {picture}
      </button>
      {line && (
        <span
          role="status"
          data-testid="iri-bubble"
          className="iri-pop absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full w-max max-w-[220px] rounded-2xl bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-lg border border-slate-200 text-center z-10 pointer-events-none"
        >
          {line}
        </span>
      )}
    </span>
  );
};

/** Short message at the bottom with Iri (saved, alert set). Shown for 3 seconds. */
export const IriToast: React.FC<{ pose: IriPose; title: string; text: string; onDone: () => void }> = ({ pose, title, text, onDone }) => {
  useEffect(() => {
    const id = window.setTimeout(onDone, 3000);
    return () => window.clearTimeout(id);
  }, [onDone]);
  return (
    <div
      role="status"
      data-testid="iri-toast"
      className="iri-pop pointer-events-none fixed z-[60] left-3 right-3 bottom-24 lg:left-auto lg:right-6 lg:bottom-6 lg:w-[360px] flex items-center gap-3 rounded-2xl bg-slate-900 text-white px-3 py-2.5 shadow-2xl"
    >
      <img src={iriSrc(pose)} alt="" className="h-16 w-auto -mt-8 -mb-1 shrink-0 iri-bounce" />
      <span className="text-sm leading-snug">
        <b>{title}</b> {text}
      </span>
    </div>
  );
};
