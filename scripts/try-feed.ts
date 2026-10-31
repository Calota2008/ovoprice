// Try an Awin product feed file locally (CSV or CSV.gz downloaded from Awin "Create-a-feed").
// Usage: npx tsx scripts/try-feed.ts path/to/feed.csv[.gz]
// Prints what would be imported. Does not send anything anywhere and does not change the app.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { readAwinFeed } from '../src/feeds/awinFeed';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npx tsx scripts/try-feed.ts feed.csv[.gz]');
  process.exit(1);
}
const raw = readFileSync(file);
const text = (file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8');
const { products, report } = readAwinFeed(text);
console.log('Rows:', report.rows, '| offers kept:', report.offers, '| without EAN:', report.withoutEan);
console.log('Skipped:', report.skipped);
console.log('Products with EAN:', products.length);
for (const p of products.slice(0, 10)) {
  const o = p.offers[0];
  console.log(`- ${p.ean}  ${p.title.slice(0, 60)}  ${o.total.toFixed(2)} € at ${o.merchantName}${o.shipping === null ? ' (delivery unknown)' : ''}`);
}
