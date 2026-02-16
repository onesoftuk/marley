import { promises as fs } from 'node:fs';
import path from 'node:path';

const SOLD_TODAY_FILE = 'sold-today.csv';
const SOLD_LAST_30_DAYS_FILE = 'sold-last-30-days.csv';

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const EXPECTED_HEADERS = [
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
] as const;

export type SoldDatasetSource = 'sold-today' | 'sold-last-30-days';

export interface SoldRecord {
  source: string;
  outcode: string;
  soldDate: string;
  address: string;
  postcode: string;
  price: number | null;
  bedrooms: number | null;
  tenure: string | null;
  saleClass: string | null;
  lat: number | null;
  lng: number | null;
  ingestTs: string;
}

/**
 * Indicates whether a dataset contained usable rows after parsing.
 * - `ready`: rows were parsed successfully
 * - `empty`: the file existed but only contained its header or blank rows
 * - `missing`: the CSV file was not present on disk
 */
export type SoldDatasetStatus = 'ready' | 'empty' | 'missing';

/**
 * Materialized data and metadata for a dashboard CSV export.
 */
export interface SoldDataset {
  source: SoldDatasetSource;
  filePath: string;
  status: SoldDatasetStatus;
  rows: SoldRecord[];
}

export interface DashboardData {
  soldToday: SoldDataset;
  soldLast30Days: SoldDataset;
}

export interface DashboardDataReadOptions {
  /**
   * Overrides the directory that contains sold CSV exports.
   * Defaults to `<project-root>/data`. Mainly intended for testing.
   */
  dataDir?: string;
}

export async function readDashboardData(
  options?: DashboardDataReadOptions,
): Promise<DashboardData> {
  const [soldToday, soldLast30Days] = await Promise.all([
    readSoldTodayDataset(options),
    readSoldLast30DaysDataset(options),
  ]);

  return { soldToday, soldLast30Days };
}

export async function readSoldTodayDataset(
  options?: DashboardDataReadOptions,
): Promise<SoldDataset> {
  return readSoldDataset('sold-today', SOLD_TODAY_FILE, options);
}

export async function readSoldLast30DaysDataset(
  options?: DashboardDataReadOptions,
): Promise<SoldDataset> {
  return readSoldDataset('sold-last-30-days', SOLD_LAST_30_DAYS_FILE, options);
}

async function readSoldDataset(
  source: SoldDatasetSource,
  fileName: string,
  options?: DashboardDataReadOptions,
): Promise<SoldDataset> {
  const dataDir = options?.dataDir ?? DEFAULT_DATA_DIR;
  const filePath = path.resolve(dataDir, fileName);

  let fileContents: string;
  try {
    fileContents = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        source,
        filePath,
        status: 'missing',
        rows: [],
      };
    }
    throw error;
  }

  const parsedRows = parseCsv(fileContents);

  if (parsedRows.length === 0) {
    return {
      source,
      filePath,
      status: 'empty',
      rows: [],
    };
  }

  const [headerRow, ...dataRows] = parsedRows;
  assertHeaderMatches(headerRow, filePath);

  if (dataRows.length === 0 || dataRows.every((row) => row.every((cell) => cell.trim() === ''))) {
    return {
      source,
      filePath,
      status: 'empty',
      rows: [],
    };
  }

  const records = dataRows
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row, index) => toSoldRecord(row, index + 2, filePath));

  if (records.length === 0) {
    return {
      source,
      filePath,
      status: 'empty',
      rows: [],
    };
  }

  return {
    source,
    filePath,
    status: 'ready',
    rows: records,
  };
}

function parseCsv(contents: string): string[][] {
  const sanitized = contents.replace(/^\uFEFF/, '');

  if (!sanitized.trim()) {
    return [];
  }

  const normalized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized.split('\n').map((line) => line.trimEnd());
  const lines: string[] = [];

  for (const line of rawLines) {
    if (line.trim().length === 0) {
      if (lines.length === 0) {
        continue; // skip leading blank lines entirely
      }
      continue; // skip blank lines between/after rows
    }
    lines.push(line);
  }

  if (lines.length === 0) {
    return [];
  }

  return lines.map(parseCsvLine);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function assertHeaderMatches(headerRow: string[], filePath: string): void {
  const header = headerRow.map((cell) => cell.trim());
  const expected = EXPECTED_HEADERS;

  if (header.length !== expected.length) {
    throw new Error(
      `Unexpected header length in ${filePath}. Expected ${expected.length} columns, received ${header.length}.`,
    );
  }

  header.forEach((columnName, index) => {
    if (columnName !== expected[index]) {
      throw new Error(
        `Unexpected header column in ${filePath}. Expected "${expected[index]}" at position ${index + 1}, received "${columnName}".`,
      );
    }
  });
}

function toSoldRecord(row: string[], lineNumber: number, filePath: string): SoldRecord {
  if (row.length !== EXPECTED_HEADERS.length) {
    throw new Error(
      `Row ${lineNumber} in ${filePath} has ${row.length} columns but ${EXPECTED_HEADERS.length} were expected.`,
    );
  }

  const [
    source,
    outcode,
    soldDate,
    address,
    postcode,
    price,
    bedrooms,
    tenure,
    saleClass,
    lat,
    lng,
    ingestTs,
  ] = row.map((cell) => cell.trim());

  return {
    source,
    outcode,
    soldDate,
    address,
    postcode,
    price: toNumberOrNull(price),
    bedrooms: toNumberOrNull(bedrooms),
    tenure: toNullableString(tenure),
    saleClass: toNullableString(saleClass),
    lat: toNumberOrNull(lat),
    lng: toNumberOrNull(lng),
    ingestTs,
  };
}

function toNumberOrNull(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value: string): string | null {
  return value ? value : null;
}
