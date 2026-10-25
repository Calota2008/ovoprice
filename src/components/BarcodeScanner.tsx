import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { isValidGtin } from '../utils/ean';

export type CameraProblem = 'denied' | 'no-camera' | 'insecure' | 'unsupported' | 'failed';

interface BarcodeScannerProps {
  /** Apelat o singură dată, cu un cod GTIN valid (cifră de control corectă). */
  onDetected: (code: string) => void;
  onCameraProblem: (problem: CameraProblem) => void;
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

/**
 * Citește coduri de bare cu camera. Folosește BarcodeDetector când browserul îl
 * are (Chrome/Android), altfel ZXing (încărcat doar la nevoie).
 */
export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onCameraProblem }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  // Păstrăm handler-ele în ref ca să nu repornim camera la fiecare randare.
  const handlers = useRef({ onDetected, onCameraProblem });
  handlers.current = { onDetected, onCameraProblem };

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let zxingReader: { reset: () => void } | null = null;
    let done = false;

    const finish = (code: string) => {
      if (done || stopped) return;
      if (!isValidGtin(code)) return; // misread: keep scanning
      done = true;
      handlers.current.onDetected(code.replace(/\D/g, ''));
    };

    const start = async () => {
      if (!window.isSecureContext) {
        handlers.current.onCameraProblem('insecure');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        handlers.current.onCameraProblem('unsupported');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (err: any) {
        const name = err?.name as string | undefined;
        if (name === 'NotAllowedError' || name === 'SecurityError') handlers.current.onCameraProblem('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') handlers.current.onCameraProblem('no-camera');
        else handlers.current.onCameraProblem('failed');
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        handlers.current.onCameraProblem('failed');
        return;
      }
      setReady(true);

      const BD = (window as any).BarcodeDetector;
      if (BD) {
        const detector = new BD({ formats: FORMATS });
        const tick = async () => {
          if (stopped || done) return;
          try {
            const found = await detector.detect(video);
            if (found?.[0]?.rawValue) finish(found[0].rawValue);
          } catch {
            /* cadru indisponibil, încercăm din nou */
          }
          if (!stopped && !done) timer = window.setTimeout(tick, 200);
        };
        tick();
      } else {
        try {
          const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library');
          if (stopped) return;
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
          ]);
          const reader = new BrowserMultiFormatReader(hints, 250);
          zxingReader = reader;
          reader.decodeFromStream(stream!, video, (result) => {
            if (result) finish(result.getText());
          });
        } catch {
          handlers.current.onCameraProblem('failed');
        }
      }
    };

    start();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      try {
        zxingReader?.reset();
      } catch {
        /* ignore */
      }
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3]">
      <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Starting camera…</span>
        </div>
      )}
      {ready && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-3/4 h-24 border-2 border-emerald-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      )}
    </div>
  );
};
