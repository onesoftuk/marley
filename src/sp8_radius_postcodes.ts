import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type PostcodesIoResult = {
  postcode: string;
  quality: number;
  eastings: number | null;
  northings: number | null;
  country: string;
  nhs_ha: string | null;
  longitude: number;
  latitude: number;
  european_electoral_region: string | null;
  primary_care_trust: string | null;
  region: string | null;
  lsoa: string | null;
  msoa: string | null;
  incode: string;
  outcode: string;
  parliamentary_constituency: string | null;
  admin_district: string | null;
  parish: string | null;
  admin_county: string | null;
  admin_ward: string | null;
  ced: string | null;
  ccg: string | null;
  nuts: string | null;
  codes: Record<string, string | null>;
};

type PostcodesIoResponse = {
  status: number;
  result: PostcodesIoResult[] | PostcodesIoResult | null;
};

const POSTCODES_IO = 'https://api.postcodes.io';
const SP8_ANCHOR = 'SP8';
const MILES_TO_METRES = 1609.344;

function milesToMetres(miles: number): number {
  return Math.round(miles * MILES_TO_METRES);
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal }).finally(() => clearTimeout(timeout));
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

async function getAnchorLatLon(outcodeOrPostcode: string): Promise<{ lat: number; lon: number }> {
  const encoded = encodeURIComponent(outcodeOrPostcode);

  // Try outcode first.
  const outcodeUrl = `${POSTCODES_IO}/outcodes/${encoded}`;
  try {
    const outcodeResponse = await fetchJson<PostcodesIoResponse>(outcodeUrl);
    const result = outcodeResponse.result as (PostcodesIoResult & { outcode: string }) | null;
    if (result && typeof result.latitude === 'number' && typeof result.longitude === 'number') {
      return { lat: result.latitude, lon: result.longitude };
    }
  } catch {
    // fallback below
  }

  // Fallback to postcode lookup.
  const postcodeUrl = `${POSTCODES_IO}/postcodes/${encoded}`;
  const postcodeResponse = await fetchJson<PostcodesIoResponse>(postcodeUrl);
  const result = postcodeResponse.result as PostcodesIoResult | null;
  if (!result || typeof result.latitude !== 'number' || typeof result.longitude !== 'number') {
    throw new Error(`Could not resolve latitude/longitude for ${outcodeOrPostcode}`);
  }
  return { lat: result.latitude, lon: result.longitude };
}

async function getNearbyPostcodes(lat: number, lon: number, radiusMiles: number): Promise<PostcodesIoResult[]> {
  const radiusMetres = milesToMetres(radiusMiles);
  const limit = 100;
  const all: PostcodesIoResult[] = [];

  let previousFirstPostcode = '';
  for (let offset = 0, pageNo = 1; pageNo <= 200; offset += limit, pageNo += 1) {
    const url = `${POSTCODES_IO}/postcodes?lon=${encodeURIComponent(String(lon))}&lat=${encodeURIComponent(String(lat))}&radius=${radiusMetres}&limit=${limit}&offset=${offset}`;
    const payload = await fetchJson<PostcodesIoResponse>(url);
    const page = Array.isArray(payload.result) ? payload.result : [];

    if (page.length === 0) break;

    const first = page[0]?.postcode ?? '';
    if (first && first === previousFirstPostcode) break;
    previousFirstPostcode = first;

    all.push(...page);
    if (page.length < limit) break;
  }

  const deduped = new Map<string, PostcodesIoResult>();
  for (const item of all) deduped.set(item.postcode, item);

  return [...deduped.values()].sort((a, b) => a.postcode.localeCompare(b.postcode, 'en-GB'));
}

function toCsv(rows: PostcodesIoResult[]): string {
  const headers = ['postcode', 'outcode', 'incode', 'admin_district', 'admin_county', 'admin_ward', 'region', 'country', 'latitude', 'longitude'];
  const lines = rows.map((r) => [
    r.postcode,
    r.outcode,
    r.incode,
    r.admin_district,
    r.admin_county,
    r.admin_ward,
    r.region,
    r.country,
    r.latitude,
    r.longitude,
  ].map(escapeCsvCell).join(','));

  return [headers.join(','), ...lines].join('\n');
}

async function main(): Promise<void> {
  const radiusMiles = Number(process.env.RADIUS_MILES ?? '20');
  const anchor = process.env.ANCHOR_OUTCODE ?? SP8_ANCHOR;
  const outputPath = process.env.OUTPUT_CSV ?? 'data/sp8-radius-20mi-postcodes.csv';
  const outputSummary = process.env.OUTPUT_SUMMARY ?? 'OUTPUT/sp8-radius-20mi-summary.md';

  const { lat, lon } = await getAnchorLatLon(anchor);
  const postcodes = await getNearbyPostcodes(lat, lon, radiusMiles);

  const csv = toCsv(postcodes);
  const absCsv = resolve(outputPath);
  const absSummary = resolve(outputSummary);

  await mkdir(dirname(absCsv), { recursive: true });
  await mkdir(dirname(absSummary), { recursive: true });
  await writeFile(absCsv, `${csv}\n`, 'utf8');

  const outcodes = [...new Set(postcodes.map((p) => p.outcode))].sort((a, b) => a.localeCompare(b, 'en-GB'));
  const districts = [...new Set(postcodes.map((p) => p.admin_district).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'en-GB'));

  const summary = [
    '# SP8 Radius Postcodes Summary',
    '',
    `- Anchor: **${anchor}**`,
    `- Radius: **${radiusMiles} miles**`,
    `- Anchor coordinates: **${lat}, ${lon}**`,
    `- Total postcodes found: **${postcodes.length}**`,
    `- Distinct outcodes found: **${outcodes.length}**`,
    '',
    '## Outcodes',
    '',
    outcodes.join(', '),
    '',
    '## Admin districts represented',
    '',
    ...districts.map((d) => `- ${d}`),
    '',
    `CSV: \`${absCsv}\``,
  ].join('\n');

  await writeFile(absSummary, `${summary}\n`, 'utf8');

  console.log(`Generated ${postcodes.length} postcodes within ${radiusMiles} miles of ${anchor}.`);
  console.log(`CSV: ${absCsv}`);
  console.log(`Summary: ${absSummary}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[sp8_radius_postcodes] Failed: ${message}`);
  process.exitCode = 1;
});
