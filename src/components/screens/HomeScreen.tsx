import React, { useEffect, useRef, useState } from 'react';
import { Search, Mic, Camera, Link2, Barcode, Sparkles, Clipboard, Coins, ChevronRight, ImageIcon } from 'lucide-react';
import { priceProvider } from '../../services/priceProvider';
import { usePriceData } from '../../services/usePriceData';
import { PopularSearchItem, ReelItem } from '../../types';
import { DemoBadge } from '../DemoBadge';
import { Iri } from '../Iri';
import { useIsDesktop } from '../../hooks/useIsDesktop';

import { ACCOUNT_LIMITS } from '../../utils/limits';
import { t, useLanguage, LANGUAGES, Lang } from '../../i18n';
import { useCountry } from '../../i18n/country';
import {
  readVoiceLang,
  recognitionLang,
  saveVoiceLang,
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
  /** Opens the full vertical list for a row. */
  onSeeAll?: (kind: 'drops' | 'new') => void;
}

/** A row of product cards that scrolls sideways. Shared by "Price drops" and "New products". */
const ProductRail: React.FC<{
  title: string;
  items: PopularSearchItem[];
  onSelect: (item: PopularSearchItem) => void;
  testId: string;
  onSeeAll?: () => void;
}> = ({ title, items, onSelect, testId, onSeeAll }) => (
  <section aria-label={title} data-testid={testId} className="lg:col-span-12">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="flex items-center gap-2">
        <DemoBadge label={t("Example")} />
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            aria-label={`${t('See all')}: ${title}`}
            className="min-h-11 -my-2 px-1 inline-flex items-center gap-0.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
          >
            {t('See all')}
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
    <ul className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scroll-pl-4 snap-x scrollbar-none lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:mx-0 lg:px-0 lg:[&>li:nth-child(n+5)]:hidden">
      {items.map((item) => (
        <li key={item.id} className="snap-start shrink-0 w-[150px] lg:w-auto">
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="w-full h-full text-left bg-white rounded-xl border border-slate-200 p-2 shadow-2xs hover:border-slate-300 flex flex-col gap-1.5 transition-colors cursor-pointer"
          >
            <span className="relative block h-[84px] lg:h-40 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
              <img src={item.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <span
                className={`absolute left-1.5 top-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  item.badgeType === 'new' ? 'bg-sky-100 text-sky-900' : item.badgeType === 'discount' ? 'bg-emerald-100 text-emerald-900' : 'bg-emerald-700 text-white'
                }`}
              >
                {item.badgeType === 'new' ? t(item.badgeText) : t('Price drop')}
              </span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 truncate">{t(item.category)}</span>
            <span className="text-[13px] font-bold text-slate-900 leading-tight line-clamp-2">{item.title}</span>
            <span className="text-[12px] text-slate-700 tnum">
              {item.badgeType === 'new' ? (
                <>{item.storesCount} {t("stores")}</>
              ) : (
                <>{t("From")} <b className="text-slate-900">{item.price.toFixed(2).replace('.', ',')} €</b></>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  </section>
);

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSearchFocus,
  onVoiceSearch,
  onOpenVisualMatcher,
  onPasteLink,
  onSelectPopularItem,
  onOpenReels,
  onSeeAll,
}) => {
  const [pasteError, setPasteError] = useState<string | null>(null);
  const language = useLanguage();
  const country = useCountry();
  const [listening, setListening] = useState(false);
  const [voiceProblem, setVoiceProblem] = useState<VoiceProblem | null>(null);
  const voiceSession = useRef<VoiceSession | null>(null);

  // Stop the microphone when leaving the screen.
  useEffect(() => () => voiceSession.current?.cancel(), []);

  // The browser understands one language at a time, so the person picks it. It starts as the app language.
  const [voiceLang, setVoiceLang] = useState<Lang>(() => readVoiceLang() ?? language);
  const lastAppLanguage = useRef(language);
  useEffect(() => {
    // Changing the app language resets the microphone language to it (not on the first render).
    if (lastAppLanguage.current === language) return;
    lastAppLanguage.current = language;
    saveVoiceLang(null);
    setVoiceLang(language);
  }, [language]);

  const listen = (lang: Lang) => {
    setVoiceProblem(null);
    setListening(true);
    voiceSession.current = startVoiceSearch(recognitionLang(lang, country), {
      onResult: (text) => onVoiceSearch(text),
      onProblem: (p) => setVoiceProblem(p),
      onEnd: () => {
        voiceSession.current = null;
        setListening(false);
      },
    });
  };

  const handleMic = (e: React.MouseEvent) => {
    e.stopPropagation(); // the box itself opens Search; the mic only listens
    if (listening) {
      voiceSession.current?.cancel();
      return;
    }
    listen(voiceLang);
  };

  const pickVoiceLang = (lang: Lang) => {
    setVoiceLang(lang);
    saveVoiceLang(lang === language ? null : lang);
    voiceSession.current?.cancel();
    listen(lang);
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
  const { data: priceDrops } = usePriceData<PopularSearchItem[]>(() => priceProvider.getPriceDrops(), [], []);
  const { data: newProducts } = usePriceData<PopularSearchItem[]>(() => priceProvider.getNewProducts(), [], []);
  const { data: homeReels } = usePriceData<ReelItem[]>(() => priceProvider.getReels(), [], []);
  // Only reels that have a picture are shown as thumbnails.
  const reelThumbs = homeReels.filter((r) => !!r.image).slice(0, 6); // phone shows the first 3, wide screens up to 6
  // Example chips: only in the demo, only products that exist in the catalog (no invented names).
  const examples = priceProvider.isDemo
    ? [...priceDrops, ...newProducts].filter((item, i, all) => all.findIndex((o) => o.title === item.title) === i).slice(0, 4)
    : [];
  const isDesktop = useIsDesktop();

  return (
    <div className="pb-24 space-y-4 lg:pb-8 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-8">
      <div className="space-y-4 lg:col-span-7 lg:self-center lg:space-y-5">
      {/* LANDED COST TRUTH Pill & Main Headline */}
      <div className="pt-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            {t("The real price, delivery included.")}
          </h1>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-1">
            <Coins className="w-4 h-4 text-emerald-700" />
          </div>
        </div>
        <p className="text-sm lg:text-base text-slate-600 mt-1.5 leading-snug">
          {t("We compare stores in Germany and Austria and show you where you pay the least.")}
        </p>
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
      {(listening || (voiceProblem && voiceProblem !== 'unsupported')) && (
        <div data-testid="voice-languages" className="-mt-1">
          <p id="voice-lang-label" className="text-xs text-slate-600 mb-1.5">{t('I am speaking')}</p>
          <div role="group" aria-labelledby="voice-lang-label" className="flex gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                aria-pressed={voiceLang === l.code}
                onClick={() => pickVoiceLang(l.code)}
                className={`h-11 px-4 rounded-full border text-sm font-semibold cursor-pointer transition-colors ${
                  voiceLang === l.code ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 leading-snug mt-1.5">
            {t('Tap another language and the microphone starts again in it. The browser understands one language at a time, so it cannot guess.')}
          </p>
        </div>
      )}

      {/* Paste link from clipboard, right under the search box (read only when the user taps) */}
      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-md border border-slate-700 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
            <Clipboard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-100 leading-snug">{t("Already copied a product link?")}</p>
            <p className="text-[11px] text-slate-300 leading-snug">{t("Copy the product link in the store, then tap the button: we paste it for you and show where it is cheaper.")}</p>
          </div>
        </div>
        <button
          onClick={handlePaste}
          className="w-full lg:w-auto min-h-11 lg:min-h-0 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-sm lg:text-xs rounded-lg transition-colors cursor-pointer shrink-0"
        >
          {t("Paste copied link")}
        </button>
      </div>
      {pasteError && <p className="-mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{pasteError}</p>}

      {/* Iri greets and, in the demo, offers products that really exist in the catalog (a search for anything else finds nothing). */}
      <div data-testid="home-iri" className="relative rounded-2xl bg-gradient-to-br from-emerald-100 via-sky-100 to-violet-100 border border-emerald-200/70 pl-4 pr-1 pt-3 flex items-end gap-2 overflow-visible">
        <div className="flex-1 min-w-0 pb-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">{t('Iri asks:')}</p>
          <p className="text-lg lg:text-xl font-black text-slate-900 leading-tight">{t('What are we hunting today?')}</p>
          {examples.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-700 mt-2 mb-1.5">{t('Try an example:')}</p>
              <div className="flex flex-wrap gap-1.5" data-testid="home-examples">
                {examples.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectPopularItem(item)}
                    className="min-h-9 px-3 rounded-full bg-white/90 border border-emerald-200 text-emerald-900 text-xs font-bold shadow-[0_3px_0_#a7f3d0] hover:bg-white active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <Iri pose="cart" size={isDesktop ? 170 : 128} className="shrink-0 -mb-1" />
      </div>

      </div>

      {/* Scan / Find Product Hero Banner */}
      <div className="lg:col-span-5 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
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

          <p className="text-xs text-emerald-100/90 leading-relaxed max-w-[320px] mb-3.5">
            {t("No name at hand? Use a store link or the barcode. A photo is the last option.")}
          </p>

          {/* Free ways first, photo last (each photo analysis is a paid call) */}
          <div className="space-y-2" data-testid="home-find-options">
            {(
              [
                ['link', Link2, 'bg-blue-100 text-blue-700', t("Paste Link"), t("From Amazon, MediaMarkt, OTTO…"), 'free'],
                ['barcode', Barcode, 'bg-purple-100 text-purple-700', t("Scan barcode"), t("The code with lines on the box or the store label"), 'free'],
                isDesktop
                  ? ['photo', ImageIcon, 'bg-emerald-100 text-emerald-700', t("Choose a photo"), t("From your computer, only if you don't know the name and have no code"), 'limited'] as const
                  : ['photo', Camera, 'bg-emerald-100 text-emerald-700', t("Take a photo"), t("Only if you don't know the name and have no code"), 'limited'] as const,
              ] as const
            ).map(([tab, Icon, iconClass, title, sub, kind]) => (
              <button
                key={tab}
                type="button"
                onClick={() => onOpenVisualMatcher(tab)}
                className="w-full bg-white hover:bg-emerald-50/90 active:bg-slate-100 text-slate-900 rounded-xl p-2.5 text-left transition-colors shadow-xs flex items-center gap-3 cursor-pointer"
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-slate-900 block leading-tight">{title}</span>
                  <span className="text-[11px] text-slate-500 block leading-snug">{sub}</span>
                </span>
                <span
                  className={`shrink-0 text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                    kind === 'free' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {kind === 'free' ? t("FREE") : t("{n} / DAY", { n: ACCOUNT_LIMITS.photosPerDay })}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Discover Reels entry point: a few thumbnails, not a second list of products */}
      <button
        type="button"
        onClick={onOpenReels}
        className="lg:col-span-12 w-full text-left bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-xl p-3 border border-slate-800 hover:border-cyan-500/50 transition-all shadow-xs cursor-pointer group"
      >
        <div className="flex items-center justify-between">
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
        </div>
        {reelThumbs.length > 0 && (
          <div className="mt-2.5 grid grid-cols-3 lg:grid-cols-6 gap-2" data-testid="home-reel-thumbs">
            {reelThumbs.map((r, i) => (
              <div key={r.id} className={`rounded-lg overflow-hidden bg-black border border-slate-800 ${i >= 3 ? 'hidden lg:block' : ''}`}>
                <div className="aspect-[4/5] flex items-center justify-center">
                  <img src={r.image} alt="" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <p className="px-1.5 py-1 text-[10px] font-semibold text-slate-200 line-clamp-1">{t(r.title)}</p>
              </div>
            ))}
          </div>
        )}
      </button>

      {/* Data source indicator (no fake "live" feed) */}
      {priceProvider.isDemo && (
        <div className="lg:col-span-12 flex items-center justify-between text-xs py-1.5 px-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <span className="text-amber-900 font-medium text-[11px]">{t("Example catalog")}</span>
          </div>
          <span className="text-amber-800 text-[11px]">{t("no real prices")}</span>
        </div>
      )}

      {/* Price drops and new products: each section is hidden when the provider has nothing to show. */}
      {priceDrops.length > 0 && (
        <ProductRail title={t("Price drops")} items={priceDrops} onSelect={onSelectPopularItem} testId="home-price-drops" onSeeAll={onSeeAll ? () => onSeeAll('drops') : undefined} />
      )}
      {newProducts.length > 0 && (
        <ProductRail title={t("New products")} items={newProducts} onSelect={onSelectPopularItem} testId="home-new-products" onSeeAll={onSeeAll ? () => onSeeAll('new') : undefined} />
      )}

    </div>
  );
};
