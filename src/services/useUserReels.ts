import { useCallback, useEffect, useRef, useState } from 'react';
import { ReelItem } from '../types';
import { loadJson, saveJson } from '../utils/storage';
import { deleteMedia, getMedia, putMedia } from '../utils/mediaStore';
import {
  LIMITS,
  USER_REELS_KEY,
  UserReelInput,
  UserReelRecord,
  cleanSpecs,
  mediaKindOf,
  validateUserReels,
} from '../utils/userReels';

import { t, tr } from '../i18n';
export type AddReelResult = { ok: true; id: string } | { ok: false; error: string };

function toReelItem(record: UserReelRecord, url: string): ReelItem {
  return {
    id: record.id,
    productId: record.productId,
    title: record.title,
    subtitle: record.subtitle,
    category: record.category,
    image: record.mediaKind === 'image' ? url : undefined,
    videoUrl: record.mediaKind === 'video' ? url : undefined,
    creatorLabel: tr('Your Reel · this device only'),
    specs: record.specs,
    buyUrl: record.buyUrl,
    isAffiliate: record.isAffiliate,
    isLocal: true,
  };
}

/** Downsizes a photo so it stays small in browser storage. Returns null if the image cannot be decoded. */
async function prepareImage(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, LIMITS.maxImageSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  } catch {
    return null;
  }
}

/** Resolves true if the browser can play the file and it is short enough. */
export function checkVideo(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const done = (result: { ok: true } | { ok: false; error: string }) => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      resolve(result);
    };
    const timer = window.setTimeout(() => done({ ok: false, error: t('Could not read this video. Try another file.') }), 8000);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      if (video.duration > LIMITS.maxVideoSeconds)
        done({ ok: false, error: t('Videos can be at most {n} seconds.', { n: LIMITS.maxVideoSeconds }) });
      else done({ ok: true });
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      done({ ok: false, error: t("This video format can't be played in this browser. Use MP4 or WebM.") });
    };
    video.src = url;
  });
}

/** Reels created on this device. Metadata in localStorage, media in IndexedDB. Nothing leaves the browser. */
export function useUserReels() {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const records = loadJson<UserReelRecord[]>(USER_REELS_KEY, validateUserReels, []);
      const items: ReelItem[] = [];
      for (const record of records) {
        const blob = await getMedia(record.id);
        if (!blob) continue; // media lost (storage cleared): skip instead of showing a broken reel
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        items.push(toReelItem(record, url));
      }
      if (!cancelled) {
        setReels(items);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = [];
    };
  }, []);

  const add = useCallback(
    async (input: UserReelInput, file: File): Promise<AddReelResult> => {
      const kind = mediaKindOf(file);
      if (!kind) return { ok: false, error: t('Unsupported file type. Use MP4, WebM, JPG, PNG or WebP.') };
      const stored = loadJson<UserReelRecord[]>(USER_REELS_KEY, validateUserReels, []);
      if (stored.length >= LIMITS.maxReels)
        return { ok: false, error: t('You can keep up to {n} reels on this device. Delete one first.', { n: LIMITS.maxReels }) };

      let blob: Blob = file;
      if (kind === 'image') {
        const prepared = await prepareImage(file);
        if (!prepared) return { ok: false, error: t('Could not read this image. Try another file.') };
        blob = prepared;
      }

      const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const record: UserReelRecord = {
        id,
        productId: input.productId,
        title: input.title.trim(),
        subtitle: input.subtitle.trim(),
        category: (input.category.trim() || 'OTHER').toUpperCase(),
        specs: cleanSpecs(input.specs),
        buyUrl: input.buyUrl.trim() || undefined,
        isAffiliate: input.buyUrl.trim() ? input.isAffiliate : false,
        mediaKind: kind,
        createdAt: Date.now(),
      };

      try {
        await putMedia(id, blob);
      } catch (err) {
        console.error('Could not store reel media', err);
        return { ok: false, error: t('Could not store the file on this device (storage full or private browsing).') };
      }
      if (!saveJson(USER_REELS_KEY, [record, ...stored])) {
        await deleteMedia(id);
        return { ok: false, error: t('Could not save the reel details on this device.') };
      }

      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      setReels((prev) => [toReelItem(record, url), ...prev]);
      return { ok: true, id };
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    const stored = loadJson<UserReelRecord[]>(USER_REELS_KEY, validateUserReels, []);
    saveJson(
      USER_REELS_KEY,
      stored.filter((r) => r.id !== id)
    );
    await deleteMedia(id);
    setReels((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { reels, loading, add, remove };
}
