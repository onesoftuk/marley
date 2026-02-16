import type {
  DashboardData,
  SoldDataset,
  SoldDatasetSource,
  SoldDatasetStatus,
  SoldRecord,
} from './data.js';

export type DashboardTableEmptyReason = 'missing-file' | 'no-data';

export interface DashboardTableEmptyState {
  status: Extract<SoldDatasetStatus, 'missing' | 'empty'>;
  reason: DashboardTableEmptyReason;
  message: string;
  filePath: string;
  label: string;
}

export interface DashboardTableModel {
  source: SoldDatasetSource;
  label: string;
  filePath: string;
  rows: SoldRecord[];
  status: SoldDatasetStatus;
  emptyState: DashboardTableEmptyState | null;
}

export interface DashboardMetricsModel {
  soldTodayCount: number;
  soldLast30DaysCount: number;
  tables: {
    soldToday: DashboardTableModel;
    soldLast30Days: DashboardTableModel;
  };
}

/**
 * Creates a deterministic view model for dashboard metrics & tables using parsed CSV data.
 */
export function buildDashboardMetricsModel(data: DashboardData): DashboardMetricsModel {
  const soldTodayTable = toTableModel(data.soldToday);
  const soldLast30DaysTable = toTableModel(data.soldLast30Days);

  return {
    soldTodayCount: soldTodayTable.rows.length,
    soldLast30DaysCount: soldLast30DaysTable.rows.length,
    tables: {
      soldToday: soldTodayTable,
      soldLast30Days: soldLast30DaysTable,
    },
  };
}

function toTableModel(dataset: SoldDataset): DashboardTableModel {
  const label = formatSourceLabel(dataset.source);
  const emptyState = buildEmptyState(dataset, label);

  return {
    source: dataset.source,
    label,
    filePath: dataset.filePath,
    rows: dataset.rows,
    status: dataset.status,
    emptyState,
  };
}

function buildEmptyState(
  dataset: SoldDataset,
  label: string,
): DashboardTableEmptyState | null {
  if (dataset.rows.length > 0 && dataset.status === 'ready') {
    return null;
  }

  if (dataset.status === 'ready') {
    // Safety fallback: unexpected ready state with zero rows should still expose empty metadata.
    return {
      status: 'empty',
      reason: 'no-data',
      message: `${label} export did not include any rows.`,
      filePath: dataset.filePath,
      label,
    };
  }

  if (dataset.status === 'missing') {
    return {
      status: 'missing',
      reason: 'missing-file',
      message: `${label} export is missing. Expected file at ${dataset.filePath}.`,
      filePath: dataset.filePath,
      label,
    };
  }

  return {
    status: 'empty',
    reason: 'no-data',
    message: `${label} export did not include any rows.`,
    filePath: dataset.filePath,
    label,
  };
}

function formatSourceLabel(source: SoldDatasetSource): string {
  switch (source) {
    case 'sold-today':
      return 'Sold Today';
    case 'sold-last-30-days':
      return 'Sold (Last 30 Days)';
    default:
      return 'Sold';
  }
}
