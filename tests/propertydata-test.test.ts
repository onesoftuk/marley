import { describe, it, expect } from 'vitest';
import { runPropertyDataTest } from '../src/dashboard/propertydata-test.js';
import type { NormalizedListing } from '../src/propertydata_mvp.js';

const SAMPLE_ROWS: NormalizedListing[] = [
  {
    source: 'propertydata',
    listing_id: 'row-001',
    address_line_1: '12 High Street',
    address_line_2: '',
    postcode: 'SP8 4AA',
    town: 'Gillingham',
    listing_status: 'sold_stc',
    status_changed_at: '2026-02-15T10:00:00Z',
    first_seen_at: '2026-01-20T09:00:00Z',
    asking_price: 450000,
    bedrooms: 3,
    property_type: 'semi_detached',
    source_url: 'https://example.com/row-001',
    ingest_ts: '2026-02-16T12:00:00.000Z',
  },
  {
    source: 'propertydata',
    listing_id: 'row-002',
    address_line_1: '22 Park Lane',
    address_line_2: '',
    postcode: 'SP7 1BB',
    town: 'Shaftesbury',
    listing_status: 'sold_stc',
    status_changed_at: '2026-02-12T08:00:00Z',
    first_seen_at: '2026-01-10T08:00:00Z',
    asking_price: 280000,
    bedrooms: 2,
    property_type: 'terraced',
    source_url: 'https://example.com/row-002',
    ingest_ts: '2026-02-16T12:00:00.000Z',
  },
];

describe('runPropertyDataTest', () => {
  it('filters rows by postcode, price, and bedrooms', async () => {
    const result = await runPropertyDataTest(
      { postcodes: ['SP8'], minPrice: 400000, minBedrooms: 3 },
      {
        fetchListings: async () => SAMPLE_ROWS,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      totalRows: 2,
      filteredRows: 1,
      filters: {
        postcodes: ['SP8'],
        minPrice: 400000,
        minBedrooms: 3,
      },
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows?.[0]?.listing_id).toBe('row-001');
  });

  it('returns an error when the fetcher throws', async () => {
    const result = await runPropertyDataTest(
      { postcodes: ['SP8'] },
      {
        fetchListings: async () => {
          throw new Error('network down');
        },
      },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('network down');
  });
});
