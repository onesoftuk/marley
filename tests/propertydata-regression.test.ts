import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as propertydata from '../src/propertydata_mvp.js';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

describe('propertydata entrypoint regressions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(async () => {
    process.env = ORIGINAL_ENV;
    vi.useRealTimers();
    if (ORIGINAL_FETCH) {
      globalThis.fetch = ORIGINAL_FETCH;
    }
  });

  async function withTempFile(handler: (file: string, dir: string) => Promise<void>): Promise<void> {
    const dir = await mkdtemp(path.join(tmpdir(), 'marley-moves-propertydata-'));
    try {
      const file = path.join(dir, 'output.csv');
      await handler(file, dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it('runPropertyDataMvp persists live API data when fetch succeeds', async () => {
    await withTempFile(async (file) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-16T12:00:00.000Z'));

      process.env.PROPERTYDATA_API_KEY = 'test-key';
      process.env.PROPERTYDATA_LIST_ID = 'test-list';
      process.env.PROPERTYDATA_DEFAULT_POSTCODES = 'SP8 1AA';
      const apiRows = [
        {
          id: 'live-001',
          address_line_1: '100 High Street',
          address_line_2: '',
          postcode: 'SP8 1AA',
          town: 'Gillingham',
          listing_status: 'sold_stc',
          status_changed_at: '2026-02-15T10:00:00Z',
          first_seen_at: '2026-02-01T10:00:00Z',
          asking_price: 350000,
          bedrooms: 3,
          property_type: 'terraced',
          source_url: 'https://example.com/live-001',
        },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ listings: apiRows }),
      }) as unknown as typeof fetch;

      const result = await propertydata.runPropertyDataMvp(file);

      expect(result.usedMock).toBe(false);
      expect(result.rowCount).toBe(1);

      const csv = await readFile(file, 'utf8');
      expect(csv).toContain('live-001');
      expect(csv).toContain('sold_stc');
      expect(csv).toContain('100 High Street');
    });
  });

  it('runPropertyDataMvp falls back to mock rows when live fetch fails', async () => {
    await withTempFile(async (file) => {
      process.env.PROPERTYDATA_API_KEY = 'test-key';
      process.env.PROPERTYDATA_LIST_ID = 'test-list';
      process.env.PROPERTYDATA_DEFAULT_POSTCODES = 'SP8 1AA';
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')); // force fetch failure

      const result = await propertydata.runPropertyDataMvp(file);

      expect(result.usedMock).toBe(true);
      expect(result.rowCount).toBe(3);

      const csv = await readFile(file, 'utf8');
      expect(csv).toContain('mock-001');
      expect(csv).toContain('mock-002');
      expect(csv).toContain('mock-003');
    });
  });

  it('fetchPropertyDataListings hits the PropertyData API with the current key', async () => {
    process.env.PROPERTYDATA_API_KEY = 'test-key';
    process.env.PROPERTYDATA_LIST_ID = 'test-list';
    process.env.PROPERTYDATA_DEFAULT_POSTCODES = 'SP8 1AA';

    const mockRows = [{ id: 'abc' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ listings: mockRows }),
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const rows = await propertydata.fetchPropertyDataListings();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestedUrl, init] = fetchMock.mock.calls[0];
    expect(typeof requestedUrl).toBe('string');
    const parsed = new URL(requestedUrl as string);
    expect(parsed.origin + parsed.pathname).toBe('https://api.propertydata.co.uk/sourced-properties');
    expect(parsed.searchParams.get('key')).toBe('test-key');
    expect(parsed.searchParams.get('list')).toBe('test-list');
    expect(parsed.searchParams.get('postcode')).toBe('SP8 1AA');

    expect(init).toEqual(
      expect.objectContaining({
        method: 'GET',
        signal: undefined,
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer test-key',
          'X-API-Key': 'test-key',
        }),
      }),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        id: 'abc',
        source_postcode: 'SP8 1AA',
      }),
    ]);
  });
});
