import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import {
  fetchPropertyDataListings,
  normalizeListings,
  toCsv,
  findPropertiesSoldInLast30Days,
  findPropertiesSoldToday,
  type NormalizedListing,
} from './propertydata_mvp.js';

function toUkOutcode(postcode: string): string {
  const cleaned = postcode.trim().toUpperCase();
  if (!cleaned) return '';
  return cleaned.split(/\s+/)[0] ?? '';
}

async function readOutcodes(path = 'data/target-outcodes.txt'): Promise<string[]> {
  const text = await readFile(resolve(path), 'utf8');
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().toUpperCase())
    .filter(Boolean);
}

function byOutcodes(rows: NormalizedListing[], outcodes: string[]): NormalizedListing[] {
  if (!outcodes.length) return rows;
  return rows.filter((row) => outcodes.includes(toUkOutcode(row.postcode)));
}

async function write(path: string, content: string): Promise<void> {
  const abs = resolve(path);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf8');
}

async function run(): Promise<void> {
  const now = new Date();
  const outcodes = await readOutcodes();

  let normalized: NormalizedListing[] = [];
  let usedMock = false;
  let fetchError = '';

  try {
    const raw = await fetchPropertyDataListings();
    normalized = normalizeListings(raw, now.toISOString());
  } catch (error) {
    usedMock = true;
    fetchError = error instanceof Error ? error.message : String(error);

    const isoNow = now.toISOString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    normalized = [
      {
        source: 'propertydata',
        listing_id: 'mock-sp8-today',
        address_line_1: '12 High Street',
        address_line_2: '',
        postcode: 'SP8 4AA',
        town: 'Gillingham',
        listing_status: 'sold_stc',
        status_changed_at: isoNow,
        first_seen_at: tenDaysAgo.toISOString(),
        asking_price: 325000,
        bedrooms: 3,
        property_type: 'semi_detached',
        source_url: 'https://example.com/mock-sp8-today',
        ingest_ts: isoNow,
      },
      {
        source: 'propertydata',
        listing_id: 'mock-sp7-last30',
        address_line_1: '4 Orchard Close',
        address_line_2: '',
        postcode: 'SP7 8BB',
        town: 'Shaftesbury',
        listing_status: 'under_offer',
        status_changed_at: yesterday.toISOString(),
        first_seen_at: tenDaysAgo.toISOString(),
        asking_price: 415000,
        bedrooms: 4,
        property_type: 'detached',
        source_url: 'https://example.com/mock-sp7-last30',
        ingest_ts: isoNow,
      },
      {
        source: 'propertydata',
        listing_id: 'mock-outside',
        address_line_1: '1 Example Road',
        address_line_2: '',
        postcode: 'BA1 1AA',
        town: 'Bath',
        listing_status: 'sold',
        status_changed_at: isoNow,
        first_seen_at: tenDaysAgo.toISOString(),
        asking_price: 280000,
        bedrooms: 2,
        property_type: 'flat',
        source_url: 'https://example.com/mock-outside',
        ingest_ts: isoNow,
      },
    ];
  }

  const targeted = byOutcodes(normalized, outcodes);
  const sold30 = findPropertiesSoldInLast30Days(targeted, { outcodes, now });
  const soldToday = findPropertiesSoldToday(targeted, { outcodes, now });

  await write('data/targeted.normalized.csv', `${toCsv(targeted)}\n`);
  await write('data/sold-last-30-days.csv', `${toCsv(sold30)}\n`);
  await write('data/sold-today.csv', `${toCsv(soldToday)}\n`);

  const summary = [
    '# Marley Moves sold export summary',
    '',
    `- Generated: ${now.toISOString()}`,
    `- Data mode: ${usedMock ? 'mock fallback' : 'live API'}`,
    ...(usedMock ? [`- Fallback reason: ${fetchError}`] : []),
    `- Target outcodes: ${outcodes.join(', ')}`,
    `- Total normalized rows (all areas): ${normalized.length}`,
    `- Rows in target outcodes: ${targeted.length}`,
    `- Sold in last 30 days: ${sold30.length}`,
    `- Sold today: ${soldToday.length}`,
    '',
    '## Files',
    '- `data/targeted.normalized.csv`',
    '- `data/sold-last-30-days.csv`',
    '- `data/sold-today.csv`',
  ].join('\n');

  await write('OUTPUT/data-export-summary.md', `${summary}\n`);

  console.log(summary);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[generate_sold_exports] Failed: ${message}`);
  process.exitCode = 1;
});
