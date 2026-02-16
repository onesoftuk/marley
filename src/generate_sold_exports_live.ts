import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type SoldPriceRaw = {
  date?: string;
  address?: string;
  price?: number;
  bedrooms?: number | null;
  tenure?: string;
  class?: string;
  lat?: number;
  lng?: number;
};

type SoldPriceResponse = {
  status?: string;
  data?: {
    raw_data?: SoldPriceRaw[];
  };
};

type SoldRecord = {
  source: string;
  outcode: string;
  sold_date: string;
  address: string;
  postcode: string;
  price: number | null;
  bedrooms: number | null;
  tenure: string;
  sale_class: string;
  lat: number | null;
  lng: number | null;
  ingest_ts: string;
};

const SOURCE = 'propertydata/sold-prices';

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const dt = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function extractPostcodeFromAddress(address: string): string {
  const m = address.toUpperCase().match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/);
  if (!m) return '';
  const compact = m[0].replace(/\s+/g, '');
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`.trim();
}

function toOutcode(postcode: string): string {
  const s = postcode.trim().toUpperCase();
  return s.split(/\s+/)[0] ?? '';
}

function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: SoldRecord[]): string {
  const headers: Array<keyof SoldRecord> = [
    'source',
    'outcode',
    'sold_date',
    'address',
    'postcode',
    'price',
    'bedrooms',
    'tenure',
    'sale_class',
    'lat',
    'lng',
    'ingest_ts',
  ];
  const lines = rows.map((r) => headers.map((h) => esc(r[h])).join(','));
  return [headers.join(','), ...lines].join('\n');
}

async function write(path: string, content: string): Promise<void> {
  const abs = resolve(path);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf8');
}

async function readOutcodes(path = 'data/target-outcodes.txt'): Promise<string[]> {
  const text = await readFile(resolve(path), 'utf8');
  return text
    .split(/\r?\n/)
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
}

async function fetchSoldPrices(outcode: string, apiKey: string): Promise<SoldPriceRaw[]> {
  const url = `https://api.propertydata.co.uk/sold-prices?key=${encodeURIComponent(apiKey)}&postcode=${encodeURIComponent(outcode)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`sold-prices ${outcode} failed (${response.status}): ${body.slice(0, 250)}`);
  }

  const payload = (await response.json()) as SoldPriceResponse;
  return payload.data?.raw_data ?? [];
}

async function run(): Promise<void> {
  const apiKey = process.env.PROPERTYDATA_API_KEY;
  if (!apiKey) throw new Error('Missing PROPERTYDATA_API_KEY');

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);
  start30.setHours(0, 0, 0, 0);

  const outcodes = await readOutcodes();
  const rows: SoldRecord[] = [];

  for (const outcode of outcodes) {
    const rawRows = await fetchSoldPrices(outcode, apiKey);

    for (const raw of rawRows) {
      const soldDate = (raw.date ?? '').trim();
      const soldDt = parseDateOnly(soldDate);
      if (!soldDt) continue;

      const address = (raw.address ?? '').trim();
      const postcode = extractPostcodeFromAddress(address);

      rows.push({
        source: SOURCE,
        outcode,
        sold_date: soldDate,
        address,
        postcode,
        price: typeof raw.price === 'number' ? raw.price : null,
        bedrooms: typeof raw.bedrooms === 'number' ? raw.bedrooms : null,
        tenure: (raw.tenure ?? '').toString(),
        sale_class: (raw.class ?? '').toString(),
        lat: typeof raw.lat === 'number' ? raw.lat : null,
        lng: typeof raw.lng === 'number' ? raw.lng : null,
        ingest_ts: now.toISOString(),
      });
    }
  }

  const targeted = rows
    .filter((r) => outcodes.includes(r.outcode))
    .sort((a, b) => b.sold_date.localeCompare(a.sold_date));

  const soldLast30 = targeted.filter((r) => {
    const d = parseDateOnly(r.sold_date);
    return !!d && d >= start30 && d <= endToday;
  });

  const soldToday = targeted.filter((r) => {
    const d = parseDateOnly(r.sold_date);
    return !!d && d >= startToday && d <= endToday;
  });

  await write('data/targeted.normalized.csv', `${toCsv(targeted)}\n`);
  await write('data/sold-last-30-days.csv', `${toCsv(soldLast30)}\n`);
  await write('data/sold-today.csv', `${toCsv(soldToday)}\n`);

  const summary = [
    '# Marley Moves sold export summary (live)',
    '',
    `- Generated: ${now.toISOString()}`,
    '- Data mode: live API (/sold-prices)',
    `- Target outcodes: ${outcodes.join(', ')}`,
    `- Rows in target outcodes: ${targeted.length}`,
    `- Sold in last 30 days: ${soldLast30.length}`,
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
  console.error(`[generate_sold_exports_live] Failed: ${message}`);
  process.exitCode = 1;
});
