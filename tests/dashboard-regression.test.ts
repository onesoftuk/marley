import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DashboardRoute } from '../src/dashboard/route.js';

const HEADER = 'source,outcode,sold_date,address,postcode,price,bedrooms,tenure,sale_class,lat,lng,ingest_ts';

async function withTempExportDir(handler: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'marley-moves-dashboard-reg-'));
  try {
    await handler(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('dashboard regression protections', () => {
  it('refreshes metrics solely from local CSV exports without touching fetch/API', async () => {
    await withTempExportDir(async (dir) => {
      const soldTodayCsv = [
        HEADER,
        'propertydata,SP8,2026-02-16,1 Station Road,SP8 1AA,350000,3,freehold,residential,51.0,-2.0,2026-02-16T12:00:00Z',
      ].join('\n');
      const soldLast30Csv = [
        HEADER,
        'propertydata,SP8,2026-02-01,4 Orchard Close,SP8 2BB,410000,4,freehold,residential,51.1,-2.1,2026-02-16T12:00:00Z',
        'propertydata,SP7,2026-02-10,8 Oak Way,SP7 8AA,515000,5,freehold,residential,51.2,-2.2,2026-02-16T12:00:00Z',
      ].join('\n');

      await writeFile(path.join(dir, 'sold-today.csv'), `${soldTodayCsv}\n`, 'utf8');
      await writeFile(path.join(dir, 'sold-last-30-days.csv'), `${soldLast30Csv}\n`, 'utf8');

      const fetchSpy = 'fetch' in globalThis ? vi.spyOn(globalThis, 'fetch') : null;
      fetchSpy?.mockImplementation(() => {
        throw new Error('dashboard must remain local-only');
      });

      const route = new DashboardRoute({
        dataDir: dir,
        clock: () => new Date('2026-02-16T13:00:00.000Z'),
      });

      const view = await route.refresh();

      expect(view.metrics.soldTodayCount).toBe(1);
      expect(view.metrics.soldLast30DaysCount).toBe(2);
      expect(view.metrics.tables.soldToday.rows[0]?.address).toBe('1 Station Road');
      expect(view.metrics.tables.soldLast30Days.rows[1]?.address).toBe('8 Oak Way');
      expect(view.generatedAt).toBe('2026-02-16T13:00:00.000Z');

      if (fetchSpy) {
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
      }
    });
  });
});
