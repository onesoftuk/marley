import { describe, it, expect } from 'vitest';
import type { DashboardData, SoldDataset, SoldRecord } from '../src/dashboard/data.js';
import { buildDashboardMetricsModel } from '../src/dashboard/service.js';

function buildSoldRecord(overrides: Partial<SoldRecord> = {}): SoldRecord {
  return {
    source: 'propertydata',
    outcode: 'SP8',
    soldDate: '2026-02-15',
    address: '1 High Street',
    postcode: 'SP8 4AA',
    price: 350000,
    bedrooms: 3,
    tenure: 'freehold',
    saleClass: 'residential',
    lat: 51.00001,
    lng: -2.00001,
    ingestTs: '2026-02-16T08:00:00.000Z',
    ...overrides,
  };
}

function buildDataset(overrides: Partial<SoldDataset>): SoldDataset {
  if (!overrides.source) {
    throw new Error('dataset source is required for tests');
  }

  return {
    filePath: `/tmp/${overrides.source}.csv`,
    status: 'ready',
    rows: [],
    ...overrides,
  } as SoldDataset;
}

describe('dashboard metrics service', () => {
  it('derives metric counts from dataset rows', () => {
    const data: DashboardData = {
      soldToday: buildDataset({
        source: 'sold-today',
        rows: [buildSoldRecord(), buildSoldRecord({ soldDate: '2026-02-16' })],
        status: 'ready',
      }),
      soldLast30Days: buildDataset({
        source: 'sold-last-30-days',
        rows: [buildSoldRecord({ price: 525000 })],
        status: 'ready',
      }),
    };

    const result = buildDashboardMetricsModel(data);

    expect(result.soldTodayCount).toBe(2);
    expect(result.soldLast30DaysCount).toBe(1);
    expect(result.tables.soldToday.rows).toHaveLength(2);
    expect(result.tables.soldToday.emptyState).toBeNull();
    expect(result.tables.soldToday.label).toBe('Sold Today');
    expect(result.tables.soldToday.filePath).toBe('/tmp/sold-today.csv');
    expect(result.tables.soldLast30Days.emptyState).toBeNull();
    expect(result.tables.soldLast30Days.label).toBe('Sold (Last 30 Days)');
  });

  it('produces empty-state metadata when dataset has no rows', () => {
    const data: DashboardData = {
      soldToday: buildDataset({
        source: 'sold-today',
        rows: [],
        status: 'empty',
      }),
      soldLast30Days: buildDataset({
        source: 'sold-last-30-days',
        rows: [buildSoldRecord()],
        status: 'ready',
      }),
    };

    const result = buildDashboardMetricsModel(data);

    expect(result.soldTodayCount).toBe(0);
    expect(result.tables.soldToday.emptyState).toMatchObject({
      status: 'empty',
      reason: 'no-data',
      label: 'Sold Today',
    });
    expect(result.tables.soldToday.emptyState?.message).toContain('did not include any rows');
  });

  it('distinguishes between missing files and empty datasets', () => {
    const data: DashboardData = {
      soldToday: buildDataset({
        source: 'sold-today',
        rows: [],
        status: 'missing',
        filePath: '/tmp/custom/sold-today.csv',
      }),
      soldLast30Days: buildDataset({
        source: 'sold-last-30-days',
        rows: [],
        status: 'empty',
      }),
    };

    const result = buildDashboardMetricsModel(data);

    expect(result.tables.soldToday.emptyState).toMatchObject({
      status: 'missing',
      reason: 'missing-file',
      filePath: '/tmp/custom/sold-today.csv',
    });

    expect(result.tables.soldLast30Days.emptyState).toMatchObject({
      status: 'empty',
      reason: 'no-data',
    });
  });

  it('exposes empty-state metadata when a ready dataset unexpectedly has zero rows', () => {
    const data: DashboardData = {
      soldToday: buildDataset({
        source: 'sold-today',
        rows: [],
        status: 'ready',
      }),
      soldLast30Days: buildDataset({
        source: 'sold-last-30-days',
        rows: [buildSoldRecord()],
        status: 'ready',
      }),
    };

    const result = buildDashboardMetricsModel(data);

    expect(result.tables.soldToday.emptyState).toMatchObject({
      status: 'empty',
      reason: 'no-data',
      label: 'Sold Today',
    });
  });
});
