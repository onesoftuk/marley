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
  properties?: PropertyDataRawListing[];
  listings?: PropertyDataRawListing[];
  data?: PropertyDataRawListing[];
  results?: PropertyDataRawListing[];
  postcode?: string;
};

const DEFAULT_SOURCE = 'propertydata';
const DEFAULT_ENDPOINT = 'https://api.propertydata.co.uk/sourced-properties';
const DEFAULT_LIST_ID = 'repossessed-properties';
const MILLISECONDS_PER_DAY = 86_400_000;


function resolvePostcodes(input: string[], envValue?: string): string[] {
  const normalizedInput = input.map((value) => normalizePostcode(value)).filter(Boolean);
  const envPostcodes = parseEnvPostcodes(envValue);
  const combined = [...normalizedInput, ...envPostcodes];
  return Array.from(new Set(combined));
}

function parseEnvPostcodes(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(new RegExp('[,\n]+'))
    .map((token) => normalizePostcode(token))
    .filter(Boolean);
}

function normalizePostcode(value: string): string {
  return value.trim().toUpperCase();
}

function coerceNumber(explicit: number | undefined, envValue: string | undefined, fallback: number): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  if (typeof envValue === 'string' && envValue.trim()) {
    const parsed = Number(envValue.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function coerceBooleanNumber(explicit: boolean | undefined, envValue: string | undefined, fallback: boolean): boolean {
  if (typeof explicit === 'boolean') {
    return explicit;
  }

  if (typeof envValue === 'string' && envValue.trim()) {
    const token = envValue.trim().toLowerCase();
    return token === '1' || token === 'true' || token === 'yes';
  }

  return fallback;
}

function enrichRawListing(raw: PropertyDataRawListing, ctx: { now: Date; sourcePostcode: string }): PropertyDataRawListing {
  const status = resolveListingStatus(raw.sstc, raw.listing_status, raw.status);
  const statusChangedAt = resolveRelativeIso(asNumber(raw.days_since_price_change), ctx.now);
  const firstSeenAt = resolveRelativeIso(asNumber(raw.days_on_market), ctx.now);
  const summary = asString(raw.summary ?? raw.description ?? '');

  return {
    ...raw,
    address_line_1: firstNonEmptyString(raw.address_line_1, raw.address1, raw.street, raw.address),
    address_line_2: summary,
    postcode: firstNonEmptyString(raw.postcode, ctx.sourcePostcode),
    listing_status: status,
    status_changed_at: statusChangedAt,
    first_seen_at: firstSeenAt,
    asking_price: asNumber(raw.asking_price ?? raw.price),
    bedrooms: asNumber(raw.bedrooms),
    property_type: firstNonEmptyString(raw.property_type, raw.type),
    source_url: firstNonEmptyString(raw.source_url, raw.url),
    source_postcode: ctx.sourcePostcode,
  };
}

function resolveListingStatus(...candidates: unknown[]): string {
  for (const value of candidates) {
    if (typeof value === 'number') {
      return value === 1 ? 'sold_stc' : 'live';
    }
    if (typeof value === 'boolean') {
      return value ? 'sold_stc' : 'live';
    }
    const asStr = asString(value);
    if (asStr) {
      return asStr;
    }
  }

  return 'live';
}

function resolveRelativeIso(days: number | null, now: Date): string {
  if (typeof days === 'number' && Number.isFinite(days)) {
    const copy = new Date(now);
    copy.setTime(copy.getTime() - days * MILLISECONDS_PER_DAY);
    return copy.toISOString();
  }

  return now.toISOString();
}

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
  if (Array.isArray(payload.properties)) return payload.properties;
  if (Array.isArray(payload.listings)) return payload.listings;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

export type PropertyDataFetchOptions = {
  endpoint?: string;
  apiKey?: string;
  listId?: string;
  postcodes?: string[];
  radiusMiles?: number;
  maxAgeDays?: number;
  resultsPerPostcode?: number;
  excludeSstc?: boolean;
  signal?: AbortSignal;
  now?: Date;
};

export async function fetchPropertyDataListings(options: PropertyDataFetchOptions = {}): Promise<PropertyDataRawListing[]> {
  const endpoint = options.endpoint ?? process.env.PROPERTYDATA_API_URL ?? DEFAULT_ENDPOINT;
  const apiKey = options.apiKey ?? process.env.PROPERTYDATA_API_KEY;
  const listId = options.listId ?? process.env.PROPERTYDATA_LIST_ID ?? DEFAULT_LIST_ID;
  const now = options.now ?? new Date();

  if (!apiKey) {
    throw new Error('Missing PROPERTYDATA_API_KEY environment variable.');
  }

  const requestPostcodes = resolvePostcodes(options.postcodes ?? [], process.env.PROPERTYDATA_DEFAULT_POSTCODES);
  if (requestPostcodes.length === 0) {
    throw new Error('No PropertyData postcodes provided. Add them in the UI or set PROPERTYDATA_DEFAULT_POSTCODES.');
  }

  const radiusMiles = coerceNumber(options.radiusMiles, process.env.PROPERTYDATA_RADIUS_MILES, 15);
  const maxAgeDays = coerceNumber(options.maxAgeDays, process.env.PROPERTYDATA_MAX_AGE_DAYS, 30);
  const resultsPerPostcode = coerceNumber(options.resultsPerPostcode, process.env.PROPERTYDATA_MAX_RESULTS, 50);
  const excludeSstc = coerceBooleanNumber(options.excludeSstc, process.env.PROPERTYDATA_EXCLUDE_SSTC, false);

  const combined: PropertyDataRawListing[] = [];
  const seen = new Set<string>();

  for (const postcode of requestPostcodes) {
    const url = new URL(endpoint);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('list', listId);
    url.searchParams.set('postcode', postcode);
    if (radiusMiles) url.searchParams.set('radius', String(radiusMiles));
    if (maxAgeDays) url.searchParams.set('max_age', String(maxAgeDays));
    if (resultsPerPostcode) url.searchParams.set('results', String(resultsPerPostcode));
    url.searchParams.set('exclude_sstc', excludeSstc ? '1' : '0');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
      },
      signal: options.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`PropertyData API request failed (${response.status} ${response.statusText}): ${bodyText.slice(0, 300)}`);
    }

    const payload = (await response.json()) as PropertyDataApiResponse;
    const rows = getRowsFromResponse(payload);

    if (!Array.isArray(rows)) {
      throw new Error('PropertyData API response shape not recognized: expected array under properties/listings/data/results.');
    }

    for (const raw of rows) {
      const listingId = firstNonEmptyString(raw.id, raw.listing_id, raw.listingId, raw.uid, raw.reference) || `${postcode}-${combined.length}`;
      if (seen.has(listingId)) {
        continue;
      }

      seen.add(listingId);
      combined.push(
        enrichRawListing(raw, {
          now,
          sourcePostcode: payload.postcode ?? postcode,
        }),
      );
    }
  }

  return combined;
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
