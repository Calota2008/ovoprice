import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser with 10MB limit for image payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
  });
});

// POST /api/analyze-image
app.post('/api/analyze-image', async (req: Request, res: Response) => {
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
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const validMimeType = mimeType || 'image/jpeg';

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

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
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
