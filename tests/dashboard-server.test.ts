import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { createDashboardServer } from '../src/dashboard/route.js';
import * as propertydataTest from '../src/dashboard/propertydata-test.js';

const HEADER =
  'source,outcode,sold_date,address,postcode,price,bedrooms,tenure,sale_class,lat,lng,ingest_ts';

async function withTempDataDir<T>(handler: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'marley-moves-server-'));
  try {
    return await handler(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeDataset(dir: string, file: string, rows: string[] = []): Promise<void> {
  const csv = [HEADER, ...rows].join('\n');
  await writeFile(path.join(dir, file), `${csv}\n`, 'utf-8');
}

function buildCsvRow(overrides: Partial<Record<string, string>> = {}): string {
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
  };

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

async function listenDashboardServer(dataDir: string, clock?: () => Date) {
  const instance = createDashboardServer({ dataDir, clock });
  const hostname = '127.0.0.1';
  const port = await new Promise<number>((resolve, reject) => {
    instance.server.once('error', reject);
    instance.server.listen(0, hostname, () => {
      const address = instance.server.address() as AddressInfo;
      resolve(address.port);
    });
  });

  async function close() {
    await new Promise<void>((resolve, reject) => {
      instance.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  return {
    url: `http://${hostname}:${port}`,
    close,
  };
}

describe('dashboard HTTP server', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('serves the cached dashboard view over HTTP', async () => {
    await withTempDataDir(async (dir) => {
      await writeDataset(dir, 'sold-today.csv', [buildCsvRow()]);
      await writeDataset(dir, 'sold-last-30-days.csv', [
        buildCsvRow({ sold_date: '2026-02-01', address: '4 Orchard Close', price: '315000' }),
        buildCsvRow({ sold_date: '2026-01-25', address: '8 Oak Way', price: '510000' }),
      ]);

      const server = await listenDashboardServer(dir, () => new Date('2026-02-16T12:00:00.000Z'));

      try {
        const response = await fetch(`${server.url}/dashboard`);
        expect(response.status).toBe(200);
        const payload = await response.json();

        expect(payload.view.generatedAt).toBe('2026-02-16T12:00:00.000Z');
        expect(payload.view.metrics.soldTodayCount).toBe(1);
        expect(payload.view.metrics.soldLast30DaysCount).toBe(2);
        expect(payload.view.metrics.tables.soldToday.rows[0]?.address).toBe('10 High Street');
        expect(payload.view.metrics.tables.soldLast30Days.emptyState).toBeNull();
      } finally {
        await server.close();
      }
    });
  });

  it('renders the HTML dashboard shell for GET /', async () => {
    await withTempDataDir(async (dir) => {
      await writeDataset(dir, 'sold-today.csv', [buildCsvRow({ address: '100 River Road' })]);
      await writeDataset(dir, 'sold-last-30-days.csv', [buildCsvRow({ address: '22 Park Lane' })]);

      const server = await listenDashboardServer(dir, () => new Date('2026-02-16T14:00:00.000Z'));

      try {
        const response = await fetch(`${server.url}/`);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('text/html');
        const html = await response.text();
        expect(html).toContain('Marley Moves Dashboard');
        expect(html).toContain('100 River Road');
        expect(html).toContain('Sold Today');
      } finally {
        await server.close();
      }
    });
  });

  it('only refreshes when POST /dashboard/refresh is invoked', async () => {
    await withTempDataDir(async (dir) => {
      await writeDataset(dir, 'sold-today.csv', [buildCsvRow()]);
      await writeDataset(dir, 'sold-last-30-days.csv');

      const server = await listenDashboardServer(dir, () => new Date('2026-02-16T13:00:00.000Z'));

      try {
        const initialResponse = await fetch(`${server.url}/dashboard`);
        const initialPayload = await initialResponse.json();
        expect(initialPayload.view.metrics.soldTodayCount).toBe(1);
        expect(initialPayload.view.metrics.soldLast30DaysCount).toBe(0);
        expect(initialPayload.view.metrics.tables.soldLast30Days.emptyState).toMatchObject({
          reason: 'no-data',
        });

        // Update CSV exports on disk but do not refresh yet.
        await writeDataset(dir, 'sold-today.csv', [
          buildCsvRow(),
          buildCsvRow({ address: '22 King Street' }),
        ]);
        await writeDataset(dir, 'sold-last-30-days.csv', [
          buildCsvRow({ sold_date: '2026-02-10', address: '7 Meadow View' }),
        ]);

        const cachedResponse = await fetch(`${server.url}/dashboard`);
        const cachedPayload = await cachedResponse.json();
        expect(cachedPayload.view.metrics.soldTodayCount).toBe(1);

        const refreshResponse = await fetch(`${server.url}/dashboard/refresh`, { method: 'POST' });
        const refreshPayload = await refreshResponse.json();
        expect(refreshPayload.refreshed).toBe(true);
        expect(refreshPayload.view.metrics.soldTodayCount).toBe(2);
        expect(refreshPayload.view.metrics.soldLast30DaysCount).toBe(1);

        const postRefreshResponse = await fetch(`${server.url}/dashboard`);
        const postRefreshPayload = await postRefreshResponse.json();
        expect(postRefreshPayload.view.metrics.soldTodayCount).toBe(2);
        expect(postRefreshPayload.view.metrics.tables.soldLast30Days.emptyState).toBeNull();
      } finally {
        await server.close();
      }
    });
  });

  it('proxies POST /dashboard/propertydata-test to the live test runner', async () => {
    await withTempDataDir(async (dir) => {
      await writeDataset(dir, 'sold-today.csv');
      await writeDataset(dir, 'sold-last-30-days.csv');

      const runSpy = vi.spyOn(propertydataTest, 'runPropertyDataTest').mockResolvedValue({
        ok: true,
        summary: {
          totalRows: 2,
          filteredRows: 1,
          filters: { postcodes: ['SP8'], minPrice: null, minBedrooms: null },
        },
        rows: [],
      });

      const server = await listenDashboardServer(dir, () => new Date('2026-02-16T15:00:00.000Z'));

      try {
        const response = await fetch(`${server.url}/dashboard/propertydata-test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postcodes: 'SP8' }),
        });

        expect(response.status).toBe(200);
        const payload = await response.json();
        expect(payload.ok).toBe(true);
        expect(payload.summary.filteredRows).toBe(1);
        expect(runSpy).toHaveBeenCalledWith({ postcodes: ['SP8'], minPrice: null, minBedrooms: null });
      } finally {
        await server.close();
      }
    });
  });

  it('returns a 400 when the live test runner fails', async () => {
    await withTempDataDir(async (dir) => {
      await writeDataset(dir, 'sold-today.csv');
      await writeDataset(dir, 'sold-last-30-days.csv');

      vi.spyOn(propertydataTest, 'runPropertyDataTest').mockResolvedValue({
        ok: false,
        error: 'Missing API key',
      });

      const server = await listenDashboardServer(dir, () => new Date('2026-02-16T16:00:00.000Z'));

      try {
        const response = await fetch(`${server.url}/dashboard/propertydata-test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postcodes: 'SP8' }),
        });

        expect(response.status).toBe(400);
        const payload = await response.json();
        expect(payload.ok).toBe(false);
        expect(payload.error).toContain('Missing API key');
      } finally {
        await server.close();
      }
    });
  });
});
