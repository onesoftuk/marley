import { fetchPropertyDataListings, normalizeListings } from '../propertydata_mvp.js';
import type { NormalizedListing } from '../propertydata_mvp.js';

export interface PropertyDataTestFilters {
  postcodes?: string[];
  minPrice?: number | null;
  minBedrooms?: number | null;
}

export interface PropertyDataTestDependencies {
  fetchListings?: (filters: PropertyDataTestFilters) => Promise<NormalizedListing[]>;
}

export interface PropertyDataTestSummary {
  totalRows: number;
  filteredRows: number;
  filters: {
    postcodes: string[];
    minPrice: number | null;
    minBedrooms: number | null;
  };
}

export interface PropertyDataTestResult {
  ok: boolean;
  summary?: PropertyDataTestSummary;
  rows?: NormalizedListing[];
  error?: string;
}

const SAMPLE_LIMIT = 25;

export async function runPropertyDataTest(
  filters: PropertyDataTestFilters,
  deps: PropertyDataTestDependencies = {},
): Promise<PropertyDataTestResult> {
  try {
    const normalizedFilters = {
      postcodes: normalizePostcodes(filters.postcodes ?? []),
      minPrice: normalizeNumber(filters.minPrice),
      minBedrooms: normalizeNumber(filters.minBedrooms),
    } as const;

    const fetchListings = deps.fetchListings ?? fetchNormalizedListings;
    const listings = await fetchListings(filters);

    const filtered = listings.filter((row) => matchesFilters(row, normalizedFilters));

    const summary: PropertyDataTestSummary = {
      totalRows: listings.length,
      filteredRows: filtered.length,
      filters: {
        postcodes: normalizedFilters.postcodes,
        minPrice: normalizedFilters.minPrice,
        minBedrooms: normalizedFilters.minBedrooms,
      },
    };

    return {
      ok: true,
      summary,
      rows: filtered.slice(0, SAMPLE_LIMIT),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchNormalizedListings(filters: PropertyDataTestFilters): Promise<NormalizedListing[]> {
  const raw = await fetchPropertyDataListings({ postcodes: filters.postcodes });
  return normalizeListings(raw);
}

function normalizePostcodes(values: string[]): string[] {
  return values
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .map((value) => toOutcode(value));
}

function toOutcode(value: string): string {
  if (!value) return '';
  const compact = value.replace(/\s+/g, ' ').trim();
  const parts = compact.split(' ');
  return (parts[0] ?? '').toUpperCase();
}

function normalizeNumber(value: number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function matchesFilters(
  row: NormalizedListing,
  filters: Required<PropertyDataTestFilters>,
): boolean {
  if (filters.postcodes.length > 0) {
    const rowOutcode = toOutcode(row.postcode ?? '');
    if (!rowOutcode || !filters.postcodes.includes(rowOutcode)) {
      return false;
    }
  }

  if (filters.minPrice !== null) {
    const askingPrice = typeof row.asking_price === 'number' ? row.asking_price : null;
    if (askingPrice === null || askingPrice < filters.minPrice) {
      return false;
    }
  }

  if (filters.minBedrooms !== null) {
    const bedrooms = typeof row.bedrooms === 'number' ? row.bedrooms : null;
    if (bedrooms === null || bedrooms < filters.minBedrooms) {
      return false;
    }
  }

  return true;
}
