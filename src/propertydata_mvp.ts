import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export type NormalizedListing = {
  source: string;
  listing_id: string;
  address_line_1: string;
  address_line_2: string;
  postcode: string;
  town: string;
  listing_status: string;
  status_changed_at: string;
  first_seen_at: string;
  asking_price: number | null;
  bedrooms: number | null;
  property_type: string;
  source_url: string;
  ingest_ts: string;
};

type PropertyDataRawListing = Record<string, unknown>;

type PropertyDataApiResponse = {
  listings?: PropertyDataRawListing[];
  data?: PropertyDataRawListing[];
  results?: PropertyDataRawListing[];
};

const DEFAULT_SOURCE = 'propertydata';
const DEFAULT_ENDPOINT = 'https://api.propertydata.co.uk/v1/listings';

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const stripped = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(stripped);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    const candidate = asString(value);
    if (candidate) return candidate;
  }
  return '';
}

function firstNonNullNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const candidate = asNumber(value);
    if (candidate !== null) return candidate;
  }
  return null;
}

export function normalizeListing(raw: PropertyDataRawListing, ingestTs: string): NormalizedListing {
  const listingId = firstNonEmptyString(raw.id, raw.listing_id, raw.listingId, raw.uid, raw.reference) || 'unknown';

  return {
    source: DEFAULT_SOURCE,
    listing_id: listingId,
    address_line_1: firstNonEmptyString(raw.address_line_1, raw.address1, raw.street, raw.address),
    address_line_2: firstNonEmptyString(raw.address_line_2, raw.address2, raw.locality),
    postcode: firstNonEmptyString(raw.postcode, raw.postal_code, raw.zip),
    town: firstNonEmptyString(raw.town, raw.city, raw.area),
    listing_status: firstNonEmptyString(raw.listing_status, raw.status) || 'unknown',
    status_changed_at: firstNonEmptyString(raw.status_changed_at, raw.statusUpdatedAt, raw.updated_at),
    first_seen_at: firstNonEmptyString(raw.first_seen_at, raw.firstSeenAt, raw.created_at),
    asking_price: firstNonNullNumber(raw.asking_price, raw.price, raw.list_price),
    bedrooms: firstNonNullNumber(raw.bedrooms, raw.beds),
    property_type: firstNonEmptyString(raw.property_type, raw.type) || 'unknown',
    source_url: firstNonEmptyString(raw.source_url, raw.url, raw.listing_url),
    ingest_ts: ingestTs,
  };
}

function getRowsFromResponse(payload: PropertyDataApiResponse): PropertyDataRawListing[] {
  if (Array.isArray(payload.listings)) return payload.listings;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

export async function fetchPropertyDataListings(params: {
  endpoint?: string;
  apiKey?: string;
  signal?: AbortSignal;
} = {}): Promise<PropertyDataRawListing[]> {
  const endpoint = params.endpoint ?? process.env.PROPERTYDATA_API_URL ?? DEFAULT_ENDPOINT;
  const apiKey = params.apiKey ?? process.env.PROPERTYDATA_API_KEY;

  if (!apiKey) {
    throw new Error('Missing PROPERTYDATA_API_KEY environment variable.');
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-API-Key': apiKey,
    },
    signal: params.signal,
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`PropertyData API request failed (${response.status} ${response.statusText}): ${bodyText.slice(0, 300)}`);
  }

  const payload = (await response.json()) as PropertyDataApiResponse;
  const rows = getRowsFromResponse(payload);

  if (!Array.isArray(rows)) {
    throw new Error('PropertyData API response shape not recognized: expected array under listings/data/results.');
  }

  return rows;
}

export function normalizeListings(rawListings: PropertyDataRawListing[], ingestTs = new Date().toISOString()): NormalizedListing[] {
  return rawListings.map((item) => normalizeListing(item, ingestTs));
}

const CSV_HEADERS: Array<keyof NormalizedListing> = [
  'source',
  'listing_id',
  'address_line_1',
  'address_line_2',
  'postcode',
  'town',
  'listing_status',
  'status_changed_at',
  'first_seen_at',
  'asking_price',
  'bedrooms',
  'property_type',
  'source_url',
  'ingest_ts',
];

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function toCsv(rows: NormalizedListing[]): string {
  const headerLine = CSV_HEADERS.join(',');
  const dataLines = rows.map((row) => CSV_HEADERS.map((header) => escapeCsvCell(row[header])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export async function writeCsv(path: string, rows: NormalizedListing[]): Promise<void> {
  const absolutePath = resolve(path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${toCsv(rows)}\n`, 'utf8');
}

export type SoldFilterOptions = {
  outcodes?: string[];
  now?: Date;
};

function parseIsoDate(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toUkOutcode(postcode: string): string {
  const cleaned = postcode.trim().toUpperCase();
  if (!cleaned) return '';
  return cleaned.split(/\s+/)[0] ?? '';
}

function isSoldStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return s === 'sold' || s === 'sold_stc' || s === 'sstc' || s === 'under_offer';
}

function outcodeAllowed(postcode: string, outcodes: string[]): boolean {
  if (!outcodes.length) return true;
  const listingOutcode = toUkOutcode(postcode);
  return outcodes.includes(listingOutcode);
}

/**
 * Function 1: find properties sold in last 30 days.
 */
export function findPropertiesSoldInLast30Days(rows: NormalizedListing[], options: SoldFilterOptions = {}): NormalizedListing[] {
  const now = options.now ?? new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);

  const outcodes = (options.outcodes ?? []).map((v) => v.trim().toUpperCase()).filter(Boolean);

  return rows.filter((row) => {
    if (!isSoldStatus(row.listing_status)) return false;
    if (!outcodeAllowed(row.postcode, outcodes)) return false;

    const changedAt = parseIsoDate(row.status_changed_at);
    if (!changedAt) return false;

    return changedAt >= cutoff && changedAt <= now;
  });
}

/**
 * Function 2: find properties sold today.
 */
export function findPropertiesSoldToday(rows: NormalizedListing[], options: SoldFilterOptions = {}): NormalizedListing[] {
  const now = options.now ?? new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const outcodes = (options.outcodes ?? []).map((v) => v.trim().toUpperCase()).filter(Boolean);

  return rows.filter((row) => {
    if (!isSoldStatus(row.listing_status)) return false;
    if (!outcodeAllowed(row.postcode, outcodes)) return false;

    const changedAt = parseIsoDate(row.status_changed_at);
    if (!changedAt) return false;

    return changedAt >= startOfDay && changedAt <= endOfDay;
  });
}

export async function runPropertyDataMvp(outputPath = 'data/sample.normalized.csv'): Promise<{ usedMock: boolean; rowCount: number; outputPath: string }> {
  const ingestTs = new Date().toISOString();

  try {
    const raw = await fetchPropertyDataListings();
    const normalized = normalizeListings(raw, ingestTs);
    await writeCsv(outputPath, normalized);
    return { usedMock: false, rowCount: normalized.length, outputPath: resolve(outputPath) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[propertydata_mvp] Live fetch unavailable, using mock rows. Reason: ${reason}`);

    const mockRows: NormalizedListing[] = [
      {
        source: DEFAULT_SOURCE,
        listing_id: 'mock-001',
        address_line_1: '12 Acorn Road',
        address_line_2: 'Flat 2',
        postcode: 'M1 1AA',
        town: 'Manchester',
        listing_status: 'for_sale',
        status_changed_at: '2026-02-10T10:00:00Z',
        first_seen_at: '2026-02-01T09:00:00Z',
        asking_price: 285000,
        bedrooms: 2,
        property_type: 'flat',
        source_url: 'https://example.com/listings/mock-001',
        ingest_ts: ingestTs,
      },
      {
        source: DEFAULT_SOURCE,
        listing_id: 'mock-002',
        address_line_1: '48 Willow Street',
        address_line_2: '',
        postcode: 'LS1 2BB',
        town: 'Leeds',
        listing_status: 'under_offer',
        status_changed_at: '2026-02-12T14:30:00Z',
        first_seen_at: '2026-01-28T08:20:00Z',
        asking_price: 410000,
        bedrooms: 3,
        property_type: 'terraced',
        source_url: 'https://example.com/listings/mock-002',
        ingest_ts: ingestTs,
      },
      {
        source: DEFAULT_SOURCE,
        listing_id: 'mock-003',
        address_line_1: '7 Meadow View',
        address_line_2: 'Kings Norton',
        postcode: 'B30 3CC',
        town: 'Birmingham',
        listing_status: 'sold_stc',
        status_changed_at: '2026-02-14T16:45:00Z',
        first_seen_at: '2026-01-20T11:05:00Z',
        asking_price: 525000,
        bedrooms: 4,
        property_type: 'semi_detached',
        source_url: 'https://example.com/listings/mock-003',
        ingest_ts: ingestTs,
      },
    ];

    await writeCsv(outputPath, mockRows);
    return { usedMock: true, rowCount: mockRows.length, outputPath: resolve(outputPath) };
  }
}

const isDirectRun = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectRun) {
  runPropertyDataMvp()
    .then((result) => {
      const mode = result.usedMock ? 'mock' : 'live';
      console.log(`[propertydata_mvp] Completed (${mode}). Rows: ${result.rowCount}. Output: ${result.outputPath}`);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[propertydata_mvp] Failed: ${message}`);
      process.exitCode = 1;
    });
}
