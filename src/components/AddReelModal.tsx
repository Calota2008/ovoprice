import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, Plus, Trash2, Search, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { priceProvider } from '../services/priceProvider';
import { checkVideo } from '../services/useUserReels';
import { Product, ReelSpec } from '../types';
import {
  ACCEPT_ATTR,
  FormErrors,
  LIMITS,
  UserReelInput,
  eanMessage,
  mediaKindOf,
  validateUserReelInput,
} from '../utils/userReels';

import { t, tr } from '../i18n';
interface AddReelModalProps {
  onClose: () => void;
  onSubmit: (input: UserReelInput, file: File) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
}

const inputClass =
  'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500';
const labelClass = 'block text-[11px] font-semibold text-slate-300 mb-1';
const errorClass = 'text-[11px] text-amber-300 mt-1';

function specsFromProduct(product: Product): ReelSpec[] {
  return [
    { label: tr('Brand'), value: product.brand },
    { label: tr('Model'), value: product.model },
    { label: tr('Color'), value: product.colorVariant },
  ].filter((s) => s.value && s.value.trim());
}

export const AddReelModal: React.FC<AddReelModalProps> = ({ onClose, onSubmit }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ url: string; kind: 'video' | 'image' } | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('');
  const [specs, setSpecs] = useState<ReelSpec[]>([]);
  const [buyUrl, setBuyUrl] = useState('');
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [ean, setEan] = useState('');
  const [matched, setMatched] = useState<Product | null>(null);
  const [matchNote, setMatchNote] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview]
  );

  const handleFile = async (picked: File | null) => {
    setSubmitError(null);
    setErrors((e) => ({ ...e, media: undefined }));
    if (!picked) return;
    const kind = mediaKindOf(picked);
    if (!kind) {
      setFile(null);
      setPreview(null);
      setErrors((e) => ({ ...e, media: t('Unsupported file type. Use MP4, WebM, JPG, PNG or WebP.') }));
      return;
    }
    const maxBytes = kind === 'video' ? LIMITS.maxVideoBytes : LIMITS.maxImageBytes;
    if (picked.size > maxBytes) {
      setFile(null);
      setPreview(null);
      setErrors((e) => ({ ...e, media: t('File is too large (max {n} MB).', { n: Math.round(maxBytes / 1024 / 1024) }) }));
      return;
    }
    if (kind === 'video') {
      const check = await checkVideo(picked);
      if (!check.ok) {
        setFile(null);
        setPreview(null);
        setErrors((e) => ({ ...e, media: check.error }));
        return;
      }
    }
    setFile(picked);
    setPreview({ url: URL.createObjectURL(picked), kind });
  };

  const handleMatch = async () => {
    setMatchNote(null);
    setMatched(null);
    const problem = eanMessage(ean);
    if (problem) {
      setErrors((e) => ({ ...e, ean: problem }));
      return;
    }
    setErrors((e) => ({ ...e, ean: undefined }));
    setMatching(true);
    try {
      const product = await priceProvider.getProductByEan(ean);
      if (product) {
        setMatched(product);
        if (!title.trim()) setTitle(product.title);
        if (!subtitle.trim()) setSubtitle(product.subtitle);
        if (!category.trim()) setCategory(product.category);
        if (specs.length === 0) setSpecs(specsFromProduct(product));
      } else {
        setMatchNote(t('Not in the catalog yet. You can still add the Reel, but price comparison will not be available.'));
      }
    } catch {
      setMatchNote(t('The catalog could not be searched right now. Try again.'));
    } finally {
      setMatching(false);
    }
  };

  const updateSpec = (index: number, patch: Partial<ReelSpec>) =>
    setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setSubmitError(null);
    const input: UserReelInput = {
      title,
      subtitle,
      category,
      specs,
      buyUrl,
      isAffiliate,
      productId: matched?.id,
    };
    const found = validateUserReelInput(input);
    if (!file) found.media = t('Choose a video or a photo.');
    setErrors(found);
    if (Object.keys(found).length > 0 || !file) return;
    setBusy(true);
    const result = await onSubmit(input, file);
    setBusy(false);
    if (!result.ok) setSubmitError(result.error);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-reel-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#0b111b] text-slate-100 border border-slate-800 shadow-2xl focus:outline-none"
      >
        <form onSubmit={handleSubmit} noValidate className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="add-reel-title" className="text-sm font-bold">
              {t("Add Reel")}
            </h2>
            <button type="button" onClick={onClose} disabled={busy} aria-label={t("Close")} className="p-1 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cyan-400" />
            {t("Your Reel is stored only on this device. It is not published to other people.")}
          </p>

          {/* Media */}
          <div>
            <label htmlFor="reel-media" className={labelClass}>
              {t("Video or photo *")}
            </label>
            <label
              htmlFor="reel-media"
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-600 hover:border-cyan-500 p-4 text-xs text-slate-300 cursor-pointer"
            >
              {preview ? (
                preview.kind === 'video' ? (
                  <video src={preview.url} className="max-h-40 rounded-lg" muted playsInline controls={false} />
                ) : (
                  <img src={preview.url} alt={t("Selected")} className="max-h-40 rounded-lg object-contain" />
                )
              ) : (
                <>
                  <Upload className="w-5 h-5 text-cyan-400" />
                  <span>{t("Choose a file (MP4, WebM, JPG, PNG, WebP)")}</span>
                  <span className="text-[10px] text-slate-500">
                    {t("Video up to")} {Math.round(LIMITS.maxVideoBytes / 1024 / 1024)} {t("MB and")} {LIMITS.maxVideoSeconds}s
                  </span>
                </>
              )}
            </label>
            <input
              id="reel-media"
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {file && <p className="text-[10px] text-slate-500 mt-1 truncate">{file.name}</p>}
            {errors.media && <p className={errorClass} role="alert">{errors.media}</p>}
          </div>

          {/* Catalog match */}
          <div>
            <label htmlFor="reel-ean" className={labelClass}>
              {t("Barcode (EAN) — to match a catalog product")}
            </label>
            <div className="flex gap-2">
              <input
                id="reel-ean"
                inputMode="numeric"
                value={ean}
                onChange={(e) => {
                  setEan(e.target.value);
                  setMatched(null);
                  setMatchNote(null);
                }}
                placeholder="e.g. 4548736132580"
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleMatch}
                disabled={matching}
                className="shrink-0 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" /> {t("Match")}
              </button>
            </div>
            {errors.ean && <p className={errorClass} role="alert">{errors.ean}</p>}
            {matched && (
              <p className="flex items-start gap-1.5 text-[11px] text-emerald-300 mt-1.5" role="status">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {t("Matched:")} {matched.title}{t(". Compare and Buy will use catalog offers.")}
              </p>
            )}
            {matchNote && (
              <p className="flex items-start gap-1.5 text-[11px] text-amber-300 mt-1.5" role="status">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {matchNote}
              </p>
            )}
          </div>

          {/* Name, description, category */}
          <div>
            <label htmlFor="reel-title" className={labelClass}>
              {t("Product name *")}
            </label>
            <input id="reel-title" value={title} maxLength={LIMITS.maxTitle} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            {errors.title && <p className={errorClass} role="alert">{errors.title}</p>}
          </div>
          <div>
            <label htmlFor="reel-subtitle" className={labelClass}>
              {t("Short description")}
            </label>
            <textarea
              id="reel-subtitle"
              value={subtitle}
              maxLength={LIMITS.maxDescription}
              rows={2}
              onChange={(e) => setSubtitle(e.target.value)}
              className={inputClass}
            />
            {errors.subtitle && <p className={errorClass} role="alert">{errors.subtitle}</p>}
          </div>
          <div>
            <label htmlFor="reel-category" className={labelClass}>
              {t("Category")}
            </label>
            <input id="reel-category" value={category} maxLength={LIMITS.maxCategory} onChange={(e) => setCategory(e.target.value)} placeholder={t("e.g. Headphones")} className={inputClass} />
            {errors.category && <p className={errorClass} role="alert">{errors.category}</p>}
          </div>

          {/* Specs */}
          <fieldset>
            <legend className={labelClass}>{t("Specifications")}</legend>
            <div className="space-y-2">
              {specs.map((spec, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    aria-label={t('Specification {n} label', { n: i + 1 })}
                    value={spec.label}
                    maxLength={LIMITS.maxSpecLabel}
                    onChange={(e) => updateSpec(i, { label: e.target.value })}
                    placeholder={t("Label")}
                    className={`${inputClass} w-2/5`}
                  />
                  <input
                    aria-label={t('Specification {n} value', { n: i + 1 })}
                    value={spec.value}
                    maxLength={LIMITS.maxSpecValue}
                    onChange={(e) => updateSpec(i, { value: e.target.value })}
                    placeholder={t("Value")}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={t('Remove specification {n}', { n: i + 1 })}
                    className="shrink-0 p-2 text-slate-400 hover:text-amber-300 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {specs.length < LIMITS.maxSpecs && (
              <button
                type="button"
                onClick={() => setSpecs((prev) => [...prev, { label: '', value: '' }])}
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {t("Add specification")}
              </button>
            )}
            {errors.specs && <p className={errorClass} role="alert">{errors.specs}</p>}
          </fieldset>

          {/* Buy link */}
          <div>
            <label htmlFor="reel-buy" className={labelClass}>
              {t("Merchant link (optional)")}
            </label>
            <input id="reel-buy" type="url" value={buyUrl} onChange={(e) => setBuyUrl(e.target.value)} placeholder={t("https://…")} className={inputClass} />
            <p className="text-[10px] text-slate-500 mt-1">
              {t("Used for the Buy button only when the product is not matched to a catalog product.")}
            </p>
            {errors.buyUrl && <p className={errorClass} role="alert">{errors.buyUrl}</p>}
            {buyUrl.trim() && (
              <label className="flex items-center gap-2 mt-2 text-[11px] text-slate-300 cursor-pointer">
                <input type="checkbox" checked={isAffiliate} onChange={(e) => setIsAffiliate(e.target.checked)} />
                {t("This is an affiliate link")}
              </label>
            )}
          </div>

          {submitError && (
            <p className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800 rounded-lg p-2.5" role="alert">
              {submitError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {busy ? t("Saving…") : t("Save Reel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
