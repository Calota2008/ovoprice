import React, { useEffect, useRef, useState } from 'react';
import { Search, Mic, Camera, Link2, Barcode, CheckCircle2, Sparkles, Clipboard, Coins, ChevronRight } from 'lucide-react';
import { priceProvider } from '../../services/priceProvider';
import { usePriceData } from '../../services/usePriceData';
import { PopularSearchItem } from '../../types';
import { DemoBadge } from '../DemoBadge';

import { t, useLanguage } from '../../i18n';
import { useCountry } from '../../i18n/country';
import {
  recognitionLang,
  startVoiceSearch,
  VoiceProblem,
  VoiceSession,
} from '../../utils/voiceSearch';

interface HomeScreenProps {
  onSearchFocus: () => void;
  /** Called with the spoken text; the app opens the Search screen with it. */
  onVoiceSearch: (text: string) => void;
  onOpenVisualMatcher: (tab?: 'link' | 'photo' | 'barcode') => void;
  /** Receives the clipboard text (read when the button is pressed). */
  onPasteLink: (text: string) => void;
  onSelectPopularItem: (item: PopularSearchItem) => void;
  onOpenReels?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSearchFocus,
  onVoiceSearch,
  onOpenVisualMatcher,
  onPasteLink,
  onSelectPopularItem,
  onOpenReels,
}) => {
  const [pasteError, setPasteError] = useState<string | null>(null);
  const language = useLanguage();
  const country = useCountry();
  const [listening, setListening] = useState(false);
  const [voiceProblem, setVoiceProblem] = useState<VoiceProblem | null>(null);
  const voiceSession = useRef<VoiceSession | null>(null);

  // Stop the microphone when leaving the screen.
  useEffect(() => () => voiceSession.current?.cancel(), []);

  const handleMic = (e: React.MouseEvent) => {
    e.stopPropagation(); // the box itself opens Search; the mic only listens
    if (listening) {
      voiceSession.current?.cancel();
      return;
    }
    setVoiceProblem(null);
    setListening(true);
    voiceSession.current = startVoiceSearch(recognitionLang(language, country), {
      onResult: (text) => onVoiceSearch(text),
      onProblem: (p) => setVoiceProblem(p),
      onEnd: () => {
        voiceSession.current = null;
        setListening(false);
      },
    });
  };

  const voiceMessage = (p: VoiceProblem): string => {
    switch (p) {
      case 'unsupported':
        return t("This browser can't recognise speech. Try Chrome, Edge or Safari, or type your search.");
      case 'denied':
        return t('Microphone access was denied. Allow the microphone in your browser settings or type your search.');
      case 'no-microphone':
        return t('No microphone was found on this device.');
      case 'network':
        return t('Speech recognition needs an internet connection. Try again or type your search.');
      case 'no-speech':
        return t("We didn't hear anything. Tap the microphone and say the product name.");
      default:
        return t('Speech recognition failed. Try again or type your search.');
    }
  };

  const handlePaste = async () => {
    setPasteError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteError(t('The clipboard is empty. Copy a product link first.'));
        return;
      }
      onPasteLink(text);
    } catch {
      setPasteError(t('Cannot read the clipboard (permission denied). Open "Paste link" in the scanner and paste manually.'));
      onOpenVisualMatcher('link');
    }
  };
  const { data: popularSearches, loading: popularLoading } = usePriceData<PopularSearchItem[]>(
    () => priceProvider.getPopularSearches(),
    [],
    []
  );

  return (
    <div className="pb-24 space-y-4">
      {/* LANDED COST TRUTH Pill & Main Headline */}
      <div className="pt-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-md uppercase tracking-wider mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t("TOTAL LANDED COST")}</span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
            {t("Find & compare best total prices across all stores.")}
          </h1>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-1">
            <Coins className="w-4 h-4 text-emerald-700" />
          </div>
        </div>
      </div>

      {/* Main Search Input */}
      <div
        onClick={onSearchFocus}
        className="relative bg-white border border-slate-200 rounded-xl px-3.5 py-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 text-slate-400 text-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <span>{t("What are you looking for?")}</span>
        </div>
        <button
          type="button"
          onClick={handleMic}
          aria-pressed={listening}
          className={`w-8 h-8 -mr-1 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
            listening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
          aria-label={listening ? t('Stop listening') : t('Voice search')}
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>
      {listening && (
        <p role="status" className="-mt-2 text-xs font-medium text-rose-700">
          {t('Listening… say the product name.')}
        </p>
      )}
      {!listening && voiceProblem && (
        <p role="alert" className="-mt-2 text-xs font-medium text-amber-800">
          {voiceMessage(voiceProblem)}
        </p>
      )}

      {/* Scan / Find Product Hero Banner */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        {/* Background decorative grid */}
        <div className="absolute -right-4 -bottom-6 w-36 h-36 border border-emerald-500/20 rounded-full" />
        <div className="absolute right-6 -top-6 w-28 h-28 border border-emerald-500/15 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-300" />
              <h2 className="text-lg font-bold">{t("Scan / Find Product")}</h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[10px] font-bold uppercase tracking-wider border border-emerald-400/30">
              {t("AI MATCH")}
            </span>
          </div>

          <p className="text-xs text-emerald-100/90 leading-relaxed max-w-[280px] mb-3.5">
            {t("Have a store link, a photo or a barcode? Identify the product.")}
          </p>

          {/* 3 Integrated Entry Points */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onOpenVisualMatcher('link')}
              className="bg-white hover:bg-emerald-50/90 active:bg-slate-100 text-slate-900 rounded-xl p-2.5 sm:p-3 text-left transition-colors shadow-xs flex flex-col justify-between h-[92px] sm:h-24 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  {t("Paste Link")}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {t("MediaMarkt, OTTO, Amazon")}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onOpenVisualMatcher('photo')}
              className="bg-white hover:bg-emerald-50/90 active:bg-slate-100 text-slate-900 rounded-xl p-2.5 sm:p-3 text-left transition-colors shadow-xs flex flex-col justify-between h-[92px] sm:h-24 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  {t("Scan / Photo")}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {t("Screenshot, pic")}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onOpenVisualMatcher('barcode')}
              className="bg-white hover:bg-emerald-50/90 active:bg-slate-100 text-slate-900 rounded-xl p-2.5 sm:p-3 text-left transition-colors shadow-xs flex flex-col justify-between h-[92px] sm:h-24 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Barcode className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  {t("Barcode")}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {t("In retail store")}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Discover Reels entry point */}
      <button
        type="button"
        onClick={onOpenReels}
        className="w-full text-left bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-xl p-3 border border-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-between shadow-xs cursor-pointer group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                {t("Discover Reels")}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                REELS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {t("Shopping-video highlights & immersive product feed")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-cyan-400 shrink-0 ml-2">
          <span className="text-xs font-semibold hidden xs:inline">{t("Watch")}</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      {/* Data source indicator (no fake "live" feed) */}
      {priceProvider.isDemo && (
        <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <span className="text-amber-900 font-medium text-[11px]">{t("Example catalog")}</span>
          </div>
          <span className="text-amber-800 text-[11px]">{t("no real prices")}</span>
        </div>
      )}

      {/* Popular Searches */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-900">{t("Popular searches")}</h3>
          <DemoBadge label={t("Example")} />
        </div>

        <div className="space-y-2">
          {popularLoading && <p className="text-xs text-slate-500 px-1">{t("Loading…")}</p>}
          {popularSearches.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectPopularItem(item)}
              className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:border-slate-300 flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mb-0.5">
                    <span className="uppercase">{t(item.category)}</span>
                    <span>· {item.storesCount} {t("stores")}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-bold text-slate-900 tnum">
                      {t("From")} {item.price.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.badgeType === 'discount'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {t(item.badgeText)}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    {t(item.shippingNote)}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paste link from clipboard (read only when the user taps) */}
      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl border border-slate-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
            <Clipboard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-100 truncate">{t("Copied a product link?")}</p>
            <p className="text-[11px] text-slate-400 truncate">{t("MediaMarkt, OTTO, Amazon, eBay")}</p>
          </div>
        </div>
        <button
          onClick={handlePaste}
          className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-[11px] rounded-md transition-colors cursor-pointer shrink-0"
        >
          {t("Paste and analyze")}
        </button>
      </div>
      {pasteError && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{pasteError}</p>}
    </div>
  );
};
