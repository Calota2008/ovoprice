import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Render sits behind one proxy: trust it so req.ip is the visitor's address (needed for the rate limit).
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ----------------------------- Security headers ----------------------------- */
// The app only talks to its own server and to Supabase. Images and videos of products/reels may come from https.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  if (IS_PRODUCTION) {
    // Only in production: the dev server (Vite) needs inline scripts and its own websocket.
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

/* ------------------------- Rate limit for photo analysis ------------------------- */
// Every analysis is a paid call to Google Gemini, so one visitor (IP address) may only do a few.
const PHOTO_LIMITS = [
  { windowMs: 60_000, max: 8 }, // per minute
  { windowMs: 24 * 60 * 60_000, max: 100 }, // per day
];
const photoHits = new Map<string, number[]>();

// Safety net for the whole site: at most this many analyses per day from all visitors together,
// so even someone who hides their address cannot run up the Gemini bill.
const PHOTO_DAILY_TOTAL = 500;
let totalDay = '';
let totalCount = 0;

// Behind Cloudflare the visitor's address is in CF-Connecting-IP; otherwise Render's proxy gives req.ip.
const visitorKey = (req: Request) => {
  const cf = req.headers['cf-connecting-ip'];
  return (typeof cf === 'string' && cf.trim()) || req.ip || 'unknown';
};

function photoRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = visitorKey(req);
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== totalDay) {
    totalDay = today;
    totalCount = 0;
  }
  if (totalCount >= PHOTO_DAILY_TOTAL) {
    res.setHeader('Retry-After', '3600');
    res.status(429).json({ error: 'Photo analysis is paused for today. Please search by name.', code: 'RATE_LIMIT', retryAfter: 3600 });
    return;
  }
  const longest = Math.max(...PHOTO_LIMITS.map((l) => l.windowMs));
  const hits = (photoHits.get(key) || []).filter((t) => now - t < longest);
  for (const limit of PHOTO_LIMITS) {
    const inWindow = hits.filter((t) => now - t < limit.windowMs);
    if (inWindow.length >= limit.max) {
      const retryAfter = Math.ceil((inWindow[0] + limit.windowMs - now) / 1000);
      photoHits.set(key, hits);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many photo analyses. Please wait and try again later.', code: 'RATE_LIMIT', retryAfter });
      return;
    }
  }
  hits.push(now);
  photoHits.set(key, hits);
  totalCount += 1;
  next();
}

// Forget old entries once an hour so the memory does not grow.
setInterval(() => {
  const now = Date.now();
  const longest = Math.max(...PHOTO_LIMITS.map((l) => l.windowMs));
  for (const [key, hits] of photoHits) {
    const recent = hits.filter((t) => now - t < longest);
    if (recent.length) photoHits.set(key, recent);
    else photoHits.delete(key);
  }
}, 60 * 60_000).unref();

/* ------------------------------ Request bodies ------------------------------ */
// Small limit everywhere; only the photo route accepts a larger body (a 5 MB photo is about 6.7 MB as base64).
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']);
const photoJson = express.json({ limit: '8mb' });
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/analyze-image') return next();
  return express.json({ limit: '100kb' })(req, res, next);
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
  });
});

// POST /api/analyze-image
app.post('/api/analyze-image', photoRateLimit, photoJson, async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: 'Gemini API key is not configured on the server. Please verify environment settings.',
      });
      return;
    }

    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid imageBase64 in request body.',
      });
      return;
    }

    // Strip data URL scheme prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '');
    const validMimeType = typeof mimeType === 'string' && mimeType ? mimeType.toLowerCase() : 'image/jpeg';
    if (!ALLOWED_IMAGE_TYPES.has(validMimeType)) {
      res.status(400).json({ error: 'Only photos (JPEG, PNG, WebP, HEIC) can be analyzed.' });
      return;
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
      res.status(400).json({ error: 'The photo could not be read.' });
      return;
    }
    if (Math.floor((cleanBase64.length * 3) / 4) > PHOTO_MAX_BYTES) {
      res.status(413).json({ error: 'Image exceeds the 5 MB limit. Please select a smaller photo.' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: validMimeType,
              },
            },
            {
              text: `Analyze this photograph of a physical object, product, furniture, electronics, appliance, or interior installation. Adhere strictly to the following rules:

1. EVIDENCE-BASED IDENTIFICATION:
- Never invent or assume a brand, model, manufacturer, dimensions, or technical specifications unless clearly legible or verified by unmistakable trademarks/logos.
- If the exact product model is not confirmed by visual evidence, identify it objectively by its generic product category and observable visual styling (e.g., "Moderne Küchenzeile in Weiß/Holzoptik" rather than an invented brand like "Nobilia Flash").
- Distinguish an entire room or installed setup (e.g., a fitted kitchen) from a single standalone product or appliance.

2. GERMAN RETAILER SEARCH QUERY (for German e-commerce like OTTO, MediaMarkt, Amazon.de):
- retailerSearchQuery MUST be in German, concise (2 to 5 keywords).
- Prioritize: standard German product noun + visible configuration/type + appliance inclusion (if clearly visible) + primary color/material finish.
- For kitchen imagery: Distinguish accurately between "Einbauküche" (fitted kitchen), "Küchenzeile" (straight kitchen run), "Winkelküche" (verified L-shape), "Küchenblock", or separate "Küchenschränke". If appliances (oven/cooktop/hood) are visibly integrated, specify "mit E-Geräten" or "mit Elektrogeräten"; if uncertain or none are present, specify "ohne Geräte" or omit. Do NOT assume an L-shape, corner, or specific dimensions unless clearly visible in the image. If configuration is uncertain, use a broader category query like "Einbauküche" or "Küchenzeile".
- Never include subjective or promotional adjectives (e.g., do not use "modern", "luxuriös", "hochwertig", "schön", "traumhaft").
- Do not include invented brands or unsupported model numbers.

3. COMPARABLE ALTERNATIVES:
- Provide 2 to 4 realistically comparable product types, common commercial configurations, or alternative styles available in German retail.
- Frame them as visually or functionally similar options, never as confirmed exact matches.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objectName: {
              type: Type.STRING,
              description:
                'Objective product title or descriptive category. Include brand/model ONLY if clearly verified by visual evidence (logo/text). Otherwise, provide a clear generic name with observable visual attributes (e.g., "Küchenzeile mit Hängeschränken (Weiß / Eiche)").',
            },
            category: {
              type: Type.STRING,
              description:
                'Primary product category using German or standard retail taxonomy (e.g. Küchen & Möbel, Haushaltsgroßgeräte, Unterhaltungselektronik).',
            },
            description: {
              type: Type.STRING,
              description:
                'Concise 1-2 sentence description explaining the item and its visible configuration, noting whether it represents an installed setup or standalone product.',
            },
            observableCharacteristics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'List of 3 to 6 strictly observable visual characteristics visible in the photograph (e.g. color, material finish, cabinet style, integrated appliances, handles). Do not speculate.',
            },
            retailerSearchQuery: {
              type: Type.STRING,
              description:
                'Concise German search query (2-5 terms) optimized for German retail search engines (OTTO.de, MediaMarkt.de, Amazon.de). Must use standard German retail nouns (e.g. "Einbauküche mit E-Geräten weiß", "Küchenzeile 280cm ohne Geräte", "Dyson V15 Detect"). No filler adjectives.',
            },
            alternatives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                '2 to 4 comparable alternative product categories, configurations, or similar styles available on German retail platforms.',
            },
          },
          required: [
            'objectName',
            'category',
            'description',
            'observableCharacteristics',
            'retailerSearchQuery',
            'alternatives',
          ],
        },
      },
    });

    if (!response.text) {
      res.status(502).json({
        error: 'No text response received from the Gemini model.',
      });
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      res.status(502).json({
        error: 'Gemini model did not return valid JSON.',
      });
      return;
    }

    // Validate required fields
    if (
      !parsed.objectName ||
      !parsed.category ||
      !parsed.description ||
      !Array.isArray(parsed.observableCharacteristics) ||
      !parsed.retailerSearchQuery ||
      !Array.isArray(parsed.alternatives)
    ) {
      res.status(502).json({
        error: 'Gemini response missing one or more required schema fields.',
      });
      return;
    }

    res.json(parsed);
  } catch (err: any) {
    console.error('Error analyzing image with Gemini:', err);
    res.status(500).json({
      error: err?.message || 'Internal server error while analyzing image with Gemini.',
    });
  }
});

// Body errors (too large, broken JSON) answer as JSON, never with an HTML error page.
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (!err) return next();
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: 'Image exceeds the 5 MB limit. Please select a smaller photo.' });
    return;
  }
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid request.' });
    return;
  }
  next(err);
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  if (IS_PRODUCTION) {
    app.use(express.static('dist'));
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OvoPrice server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
