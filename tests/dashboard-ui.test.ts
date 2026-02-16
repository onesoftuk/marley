import { describe, it, expect } from 'vitest';
import { parseHTML } from 'linkedom';
import { renderDashboardPage } from '../src/dashboard/ui.js';
import type { DashboardRouteView } from '../src/dashboard/route.js';
import type { DashboardTableModel } from '../src/dashboard/service.js';
import type { SoldRecord } from '../src/dashboard/data.js';

function makeRecord(overrides: Partial<SoldRecord> = {}): SoldRecord {
  return {
    source: 'sold-today',
    outcode: 'SW1A',
    soldDate: '2026-02-15',
    address: '10 Downing Street',
    postcode: 'SW1A 2AA',
    price: 1250000,
    bedrooms: 4,
    tenure: 'Freehold',
    saleClass: 'Free',
    lat: 51.5034,
    lng: -0.1276,
    ingestTs: '2026-02-16T10:00:00.000Z',
    ...overrides,
  };
}

function makeTable(overrides: Partial<DashboardTableModel> = {}): DashboardTableModel {
  return {
    source: 'sold-today',
    label: 'Sold Today',
    filePath: '/data/sold-today.csv',
    status: 'ready',
    rows: [makeRecord()],
    emptyState: null,
    ...overrides,
  } as DashboardTableModel;
}

type ViewOverrides = Partial<Omit<DashboardRouteView, 'metrics'>> & {
  metrics?: Partial<Omit<DashboardRouteView['metrics'], 'tables'>> & {
    tables?: Partial<DashboardRouteView['metrics']['tables']>;
  };
};

function makeView(overrides: ViewOverrides = {}): DashboardRouteView {
  const base: DashboardRouteView = {
    generatedAt: '2026-02-16T12:00:00.000Z',
    metrics: {
      soldTodayCount: 1,
      soldLast30DaysCount: 1,
      tables: {
        soldToday: makeTable(),
        soldLast30Days: makeTable({
          source: 'sold-last-30-days',
          label: 'Sold (Last 30 Days)',
          filePath: '/data/sold-last-30-days.csv',
        }),
      },
    },
  };

  return {
    ...base,
    ...overrides,
    metrics: {
      ...base.metrics,
      ...overrides.metrics,
      tables: {
        ...base.metrics.tables,
        ...overrides.metrics?.tables,
      },
    },
  };
}

describe('renderDashboardPage', () => {
  it('renders metric cards with the latest counts', () => {
    const view = makeView({
      metrics: {
        soldTodayCount: 3,
        soldLast30DaysCount: 27,
      },
    });

    const html = renderDashboardPage(view);
    const { document } = parseHTML(html);

    const soldTodayCard = document.querySelector('[data-metric="sold-today"] .metric-value');
    const soldLast30DaysCard = document.querySelector('[data-metric="sold-last-30-days"] .metric-value');

    expect(soldTodayCard?.textContent?.trim()).toBe('3');
    expect(soldLast30DaysCard?.textContent?.trim()).toBe('27');
  });

  it('renders table rows for populated datasets', () => {
    const view = makeView({
      metrics: {
        tables: {
          soldToday: makeTable({
            rows: [
              makeRecord({ address: '123 Test Street', postcode: 'AB1 2CD', price: 350000 }),
              makeRecord({ address: '456 Example Road', postcode: 'AB1 2CE', price: 275000 }),
            ],
          }),
        },
      },
    });

    const html = renderDashboardPage(view);
    const { document } = parseHTML(html);

    const rows = document.querySelectorAll('[data-table="sold-today"] tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('123 Test Street');
    expect(rows[1].textContent).toContain('456 Example Road');
  });

  it('shows an empty-state message when a dataset has no rows', () => {
    const emptyState = {
      status: 'empty',
      reason: 'no-data',
      message: 'Sold (Last 30 Days) export did not include any rows.',
      filePath: '/data/sold-last-30-days.csv',
      label: 'Sold (Last 30 Days)',
    } as const;

    const view = makeView({
      metrics: {
        tables: {
          soldLast30Days: makeTable({
            source: 'sold-last-30-days',
            label: 'Sold (Last 30 Days)',
            filePath: '/data/sold-last-30-days.csv',
            status: 'empty',
            rows: [],
            emptyState,
          }),
        },
      },
    });

    const html = renderDashboardPage(view);
    const { document } = parseHTML(html);

    const emptyEl = document.querySelector('[data-empty-state="sold-last-30-days"]');
    expect(emptyEl).toBeTruthy();
    expect(emptyEl?.textContent).toContain(emptyState.message);
  });

  it('labels missing datasets with status metadata and exposes the reason', () => {
    const missingState = {
      status: 'missing',
      reason: 'missing-file',
      message: 'Sold Today export is missing.',
      filePath: '/data/sold-today.csv',
      label: 'Sold Today',
    } as const;

    const view = makeView({
      metrics: {
        tables: {
          soldToday: makeTable({
            status: 'missing',
            rows: [],
            emptyState: missingState,
          }),
        },
      },
    });

    const html = renderDashboardPage(view);
    const { document } = parseHTML(html);

    const statusChip = document.querySelector('[data-table="sold-today"] .table-status');
    expect(statusChip?.getAttribute('data-table-status')).toBe('missing');
    expect(statusChip?.getAttribute('data-empty-reason')).toBe('missing-file');
    expect(statusChip?.textContent?.trim()).toBe('Missing');

    const emptyStateEl = document.querySelector('[data-empty-state="sold-today"]');
    expect(emptyStateEl?.getAttribute('data-empty-reason')).toBe('missing-file');
  });

  it('includes a refresh control wired to the refresh endpoint', () => {
    const html = renderDashboardPage(makeView());
    const { document } = parseHTML(html);

    const refreshButton = document.querySelector('[data-refresh-button]');
    expect(refreshButton).toBeTruthy();
    expect(html).toContain("fetch('/dashboard/refresh'");
  });
});
