import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readSoldTodayDataset, readDashboardData } from '../src/dashboard/data.js';

async function withTempDataDir<T>(handler: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'marley-moves-dashboard-'));
  try {
    return await handler(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function buildSampleRow(overrides: Partial<Record<string, string>> = {}): string {
  const base = {
    source: 'propertydata',
    outcode: 'SP8',
    sold_date: '2026-02-15',
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

const HEADER =
  'source,outcode,sold_date,address,postcode,price,bedrooms,tenure,sale_class,lat,lng,ingest_ts';
const HEADER_COLUMN_COUNT = HEADER.split(',').length;

describe('dashboard data reader', () => {
  it('marks dataset missing when file is absent', async () => {
    await withTempDataDir(async (dir) => {
      const result = await readSoldTodayDataset({ dataDir: dir });
      expect(result.status).toBe('missing');
      expect(result.rows).toHaveLength(0);
      expect(result.filePath).toContain('sold-today.csv');
    });
  });

  it('treats header-only files as empty datasets', async () => {
    await withTempDataDir(async (dir) => {
      await writeFile(path.join(dir, 'sold-today.csv'), `${HEADER}\n`, 'utf-8');
      const result = await readSoldTodayDataset({ dataDir: dir });
      expect(result.status).toBe('empty');
      expect(result.rows).toHaveLength(0);
    });
  });

  it('parses valid rows into sold records', async () => {
    await withTempDataDir(async (dir) => {
      const csv = `${HEADER}\n${buildSampleRow()}\n`;
      await writeFile(path.join(dir, 'sold-today.csv'), csv, 'utf-8');

      const result = await readSoldTodayDataset({ dataDir: dir });
      expect(result.status).toBe('ready');
      expect(result.rows).toHaveLength(1);
      const record = result.rows[0];
      expect(record.price).toBe(425000);
      expect(record.bedrooms).toBe(3);
      expect(record.lat).toBeCloseTo(51.00001);
      expect(record.saleClass).toBe('residential');
    });
  });

  it('reads both datasets together via readDashboardData', async () => {
    await withTempDataDir(async (dir) => {
      const todayCsv = `${HEADER}\n${buildSampleRow({ sold_date: '2026-02-16' })}`;
      const last30Csv = `${HEADER}\n${buildSampleRow({ sold_date: '2026-01-25', price: '315000' })}`;
      await writeFile(path.join(dir, 'sold-today.csv'), todayCsv, 'utf-8');
      await writeFile(path.join(dir, 'sold-last-30-days.csv'), last30Csv, 'utf-8');

      const data = await readDashboardData({ dataDir: dir });
      expect(data.soldToday.status).toBe('ready');
      expect(data.soldToday.rows).toHaveLength(1);
      expect(data.soldLast30Days.rows[0].price).toBe(315000);
    });
  });

  it('treats blank data rows as empty datasets', async () => {
    await withTempDataDir(async (dir) => {
      const blankRow = new Array(HEADER_COLUMN_COUNT).fill('').join(',');
      const csv = `${HEADER}\n${blankRow}`;
      await writeFile(path.join(dir, 'sold-today.csv'), csv, 'utf-8');

      const result = await readSoldTodayDataset({ dataDir: dir });
      expect(result.status).toBe('empty');
      expect(result.rows).toHaveLength(0);
    });
  });

  it('throws when headers do not match expectations', async () => {
    await withTempDataDir(async (dir) => {
      const invalidHeader = HEADER.replace('source', 'src');
      const csv = `${invalidHeader}\n${buildSampleRow()}`;
      await writeFile(path.join(dir, 'sold-today.csv'), csv, 'utf-8');

      await expect(readSoldTodayDataset({ dataDir: dir })).rejects.toThrow(/Unexpected header column/);
    });
  });

  it('handles CSV files prefixed with a UTF-8 BOM', async () => {
    await withTempDataDir(async (dir) => {
      const csv = `﻿${HEADER}\n${buildSampleRow()}`;
      await writeFile(path.join(dir, 'sold-today.csv'), csv, 'utf-8');

      const result = await readSoldTodayDataset({ dataDir: dir });
      expect(result.status).toBe('ready');
      expect(result.rows).toHaveLength(1);
    });
  });
});
