import { describe, it, expect } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DashboardRoute } from '../src/dashboard/route.js';

const HEADER = 'source,outcode,sold_date,address,postcode,price,bedrooms,tenure,sale_class,lat,lng,ingest_ts';

type CsvRowFields = {
  source?: string;
  outcode?: string;
  sold_date?: string;
  address?: string;
  postcode?: string;
  price?: string;
  bedrooms?: string;
  tenure?: string;
  sale_class?: string;
  lat?: string;
  lng?: string;
  ingest_ts?: string;
};

async function withTempDataDir<T>(handler: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'marley-moves-route-'));
  try {
    return await handler(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function buildCsvRow(overrides: CsvRowFields = {}): string {
  const base = {
    source: 'propertydata',
    outcode: 'SP8',
    sold_date: '2026-02-16',
    address: '10 High Street',
    postcode: 'SP8 4AA',
    price: '425000',
    bedrooms: '3',
    tenure: 'freehold',
    sale_class: 'residential',
    lat: '51.00001',
    lng: '-2.00001',
    ingest_ts: '2026-02-16T09:34:50.522Z',
    ...overrides,
  } satisfies Record<keyof CsvRowFields, string>;

  return [
    base.source,
    base.outcode,
    base.sold_date,
    base.address,
    base.postcode,
    base.price,
    base.bedrooms,
    base.tenure,
    base.sale_class,
    base.lat,
    base.lng,
    base.ingest_ts,
  ].join(',');
}

async function writeDataset(dir: string, file: string, rows: string[] = []): Promise<void> {
  const csv = [HEADER, ...rows].join('\n');
  await writeFile(path.join(dir, file), `${csv}\n`, 'utf-8');
}

describe('DashboardRoute', () => {
  it('builds a dashboard view model sourced from disk', async () => {
    await withTempDataDir(async (dir) => {
      await writeDataset(dir, 'sold-today.csv', [buildCsvRow()]);
      await writeDataset(dir, 'sold-last-30-days.csv', [
        buildCsvRow({ sold_date: '2026-02-01', price: '315000', address: '4 Orchard Close' }),
        buildCsvRow({ sold_date: '2026-01-28', price: '510000', address: '8 Oak Way' }),
      ]);

      const route = new DashboardRoute({
        dataDir: dir,
        clock: () => new Date('2026-02-16T12:00:00.000Z'),
      });

      const view = await route.getView();

      expect(view.generatedAt).toBe('2026-02-16T12:00:00.000Z');
      expect(view.metrics.soldTodayCount).toBe(1);
      expect(view.metrics.soldLast30DaysCount).toBe(2);
      expect(view.metrics.tables.soldToday.label).toBe('Sold Today');
      expect(view.metrics.tables.soldToday.rows[0]?.address).toBe('10 High Street');
      expect(view.metrics.tables.soldLast30Days.rows).toHaveLength(2);
      expect(view.metrics.tables.soldLast30Days.emptyState).toBeNull();
    });
  });

  it('refresh re-reads CSV exports each time', async () => {
    await withTempDataDir(async (dir) => {
      await writeDataset(dir, 'sold-today.csv', [buildCsvRow()]);
      await writeDataset(dir, 'sold-last-30-days.csv');

      const timestamps = ['2026-02-16T13:00:00.000Z', '2026-02-16T14:00:00.000Z'];
      let refreshCount = 0;
      const route = new DashboardRoute({
        dataDir: dir,
        clock: () => new Date(timestamps[Math.min(refreshCount, timestamps.length - 1)]),
      });

      async function performRefresh() {
        const result = await route.refresh();
        refreshCount += 1;
        return result;
      }

      const first = await performRefresh();
      expect(first.metrics.soldTodayCount).toBe(1);
      expect(first.metrics.tables.soldLast30Days.emptyState).toMatchObject({ reason: 'no-data' });

      await writeDataset(dir, 'sold-today.csv', [buildCsvRow(), buildCsvRow({ address: '22 King Street' })]);
      await writeDataset(dir, 'sold-last-30-days.csv', [
        buildCsvRow({ sold_date: '2026-02-10', address: '7 Meadow View' }),
      ]);

      const second = await performRefresh();
      expect(second.metrics.soldTodayCount).toBe(2);
      expect(second.metrics.soldLast30DaysCount).toBe(1);
      expect(second.metrics.tables.soldLast30Days.emptyState).toBeNull();
      expect(second.generatedAt).toBe('2026-02-16T14:00:00.000Z');
    });
  });
});
