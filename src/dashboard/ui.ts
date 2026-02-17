import type { SoldRecord } from './data.js';
import type { DashboardRouteView } from './route.js';
import type { DashboardTableModel, DashboardTableEmptyState } from './service.js';

interface TableColumn {
  key: keyof TableRowShape;
  label: string;
  formatter?: (value: TableRowShape[keyof TableRowShape]) => string;
}

type TableRowShape = Pick<
  SoldRecord,
  'address' | 'postcode' | 'soldDate' | 'price' | 'bedrooms' | 'tenure' | 'saleClass'
>;

const TABLE_COLUMNS: TableColumn[] = [
  { key: 'address', label: 'Address' },
  { key: 'postcode', label: 'Postcode' },
  { key: 'soldDate', label: 'Sold Date', formatter: formatDate },
  { key: 'price', label: 'Price', formatter: formatCurrency },
  { key: 'bedrooms', label: 'Beds', formatter: formatNumber },
  { key: 'tenure', label: 'Tenure' },
  { key: 'saleClass', label: 'Class' },
];

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
});

const numberFormatter = new Intl.NumberFormat('en-GB');

export function renderDashboardPage(view: DashboardRouteView): string {
  const title = 'Marley Moves Dashboard';
  const generatedAt = formatGeneratedAt(view.generatedAt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #0f172a;
      color: #e2e8f0;
    }

    body {
      margin: 0;
      padding: 24px;
      min-height: 100vh;
      background: radial-gradient(circle at top, rgba(94, 234, 212, 0.15), transparent 60%), #0f172a;
    }

    .page {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    header h1 {
      margin: 0;
      font-size: 1.75rem;
    }

    header p {
      margin: 0;
      color: #94a3b8;
    }

    .refresh-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
    }

    button.refresh {
      background: #38bdf8;
      border: none;
      color: #0f172a;
      font-weight: 600;
      padding: 10px 18px;
      border-radius: 999px;
      cursor: pointer;
      transition: transform 150ms ease, background 150ms ease;
    }

    button.refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    button.refresh:not(:disabled):hover {
      transform: translateY(-1px);
      background: #0ea5e9;
    }

    .refresh-status {
      font-size: 0.9rem;
      min-height: 1.2em;
      color: #94a3b8;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .api-test {
      margin-bottom: 24px;
      padding: 20px;
      border-radius: 20px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: 0 15px 35px rgba(15, 23, 42, 0.45);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .api-test h2 {
      margin: 0;
      font-size: 1.25rem;
    }

    .api-test p {
      margin: 4px 0 0;
      color: #94a3b8;
    }

    .api-test-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      align-items: end;
    }

    .api-test-form label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.9rem;
      color: #cbd5f5;
    }

    .api-test-form input {
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.3);
      background: rgba(15, 23, 42, 0.6);
      color: #f8fafc;
      padding: 10px 12px;
      font-size: 1rem;
    }

    .api-test-form button {
      padding: 12px 18px;
      border-radius: 999px;
      border: none;
      background: #8b5cf6;
      color: #0f172a;
      font-weight: 600;
      cursor: pointer;
      transition: transform 150ms ease, background 150ms ease;
    }

    .api-test-form button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .api-test-form button:not(:disabled):hover {
      transform: translateY(-1px);
      background: #7c3aed;
    }

    .api-test-status {
      font-size: 0.9rem;
      color: #94a3b8;
      min-height: 1.2rem;
    }

    .api-test-output {
      margin: 0;
      padding: 16px;
      border-radius: 16px;
      background: rgba(2, 6, 23, 0.7);
      border: 1px solid rgba(148, 163, 184, 0.2);
      font-family: 'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace;
      font-size: 0.85rem;
      max-height: 260px;
      overflow: auto;
      white-space: pre-wrap;
    }

    .metric-card {
      border-radius: 16px;
      padding: 20px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.4);
    }

    .metric-label {
      margin: 0;
      color: #94a3b8;
      font-size: 0.95rem;
    }

    .metric-value {
      margin: 8px 0 0;
      font-size: 2.5rem;
      font-weight: 700;
      color: #f8fafc;
    }

    .tables {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .table-card {
      padding: 20px;
      border-radius: 20px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.5);
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .table-header h2 {
      margin: 0;
      font-size: 1.2rem;
    }

    .table-meta {
      margin: 4px 0 0;
      color: #94a3b8;
      font-size: 0.9rem;
    }

    .table-status {
      align-self: flex-start;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.85rem;
      text-transform: capitalize;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .table-status.ready {
      background: rgba(16, 185, 129, 0.15);
      color: #4ade80;
    }

    .table-status.empty {
      background: rgba(234, 179, 8, 0.15);
      color: #facc15;
    }

    .table-status.missing {
      background: rgba(248, 113, 113, 0.15);
      color: #f87171;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }

    th, td {
      text-align: left;
      padding: 10px;
    }

    th {
      color: #94a3b8;
      font-weight: 600;
      border-bottom: 1px solid rgba(148, 163, 184, 0.3);
    }

    tbody tr:nth-child(odd) {
      background: rgba(148, 163, 184, 0.06);
    }

    tbody tr:hover {
      background: rgba(14, 165, 233, 0.1);
    }

    .empty-state {
      border: 1px dashed rgba(148, 163, 184, 0.4);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      color: #94a3b8;
    }

    .empty-state strong {
      color: #f8fafc;
    }

    @media (max-width: 600px) {
      body {
        padding: 16px;
      }

      th, td {
        padding: 8px 6px;
        font-size: 0.85rem;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div>
        <h1>${title}</h1>
        <p>Last generated <span data-generated-at>${escapeHtml(generatedAt)}</span></p>
      </div>
      <div class="refresh-group">
        <button class="refresh" data-refresh-button type="button">Refresh Data</button>
        <p class="refresh-status" data-refresh-status></p>
      </div>
    </header>
    <section class="metrics">
      ${renderMetricCard('sold-today', 'Sold Today', view.metrics.soldTodayCount)}
      ${renderMetricCard('sold-last-30-days', 'Sold (Last 30 Days)', view.metrics.soldLast30DaysCount)}
    </section>
    <section class="api-test">
      <div>
        <h2>PropertyData Live Test</h2>
        <p>Trigger the API with custom filters before wiring the results into the export jobs.</p>
      </div>
      <form class="api-test-form" data-api-test-form>
        <label>
          Postcodes / Outcodes
          <input name="postcodes" placeholder="SP8, SP7" />
        </label>
        <label>
          Min Price (£)
          <input name="minPrice" type="number" min="0" step="1000" placeholder="300000" />
        </label>
        <label>
          Min Bedrooms
          <input name="minBedrooms" type="number" min="1" step="1" placeholder="3" />
        </label>
        <button type="submit" data-api-test-button>Run API Test</button>
      </form>
      <div class="api-test-status" data-api-test-status></div>
      <pre class="api-test-output" data-api-test-output>Awaiting test run.</pre>
    </section>
    <section class="tables">
      ${renderTableCard(view.metrics.tables.soldToday)}
      ${renderTableCard(view.metrics.tables.soldLast30Days)}
    </section>
  </div>
  <script>
    (function () {
      const refreshButton = document.querySelector('[data-refresh-button]');
      const statusEl = document.querySelector('[data-refresh-status]');
      if (!refreshButton) return;

      refreshButton.addEventListener('click', async () => {
        const original = refreshButton.textContent;
        refreshButton.disabled = true;
        refreshButton.textContent = 'Refreshing…';
        if (statusEl) {
          statusEl.textContent = 'Refreshing data…';
        }

        try {
          const response = await fetch('/dashboard/refresh', { method: 'POST' });
          if (!response.ok) {
            throw new Error('Refresh failed');
          }
          if (statusEl) {
            statusEl.textContent = 'Refresh complete. Reloading…';
          }
          window.location.reload();
        } catch (error) {
          console.error(error);
          if (statusEl) {
            statusEl.textContent = 'Refresh failed. Please try again.';
          }
          refreshButton.disabled = false;
          refreshButton.textContent = original;
        }
      });
    })();

    (function () {
      const form = document.querySelector('[data-api-test-form]');
      if (!(form instanceof HTMLFormElement)) return;
      const statusEl = document.querySelector('[data-api-test-status]');
      const outputEl = document.querySelector('[data-api-test-output]');
      const submitButton = form.querySelector('[data-api-test-button]');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!(submitButton instanceof HTMLButtonElement)) return;

        const formData = new FormData(form);
        const payload: Record<string, unknown> = {
          postcodes: (formData.get('postcodes') ?? '').toString(),
        };

        const minPrice = toNumber(formData.get('minPrice'));
        const minBedrooms = toNumber(formData.get('minBedrooms'));
        if (minPrice !== null) {
          payload.minPrice = minPrice;
        }
        if (minBedrooms !== null) {
          payload.minBedrooms = minBedrooms;
        }

        submitButton.disabled = true;
        if (statusEl) {
          statusEl.textContent = 'Running live test…';
        }
        if (outputEl) {
          outputEl.textContent = '';
        }

        try {
          const response = await fetch('/dashboard/propertydata-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.ok) {
            throw new Error(data?.error ?? 'Live test failed');
          }
          const summary = data.summary ?? { filteredRows: 0, totalRows: 0 };
          if (statusEl) {
            statusEl.textContent = 'Matched ' + summary.filteredRows + ' of ' + summary.totalRows + ' rows';
          }
          if (outputEl) {
            outputEl.textContent = JSON.stringify(data.rows ?? [], null, 2);
          }
        } catch (error) {
          console.error(error);
          if (statusEl) {
            statusEl.textContent = error instanceof Error ? error.message : 'Live test failed';
          }
        } finally {
          submitButton.disabled = false;
        }
      });

      function toNumber(value) {
        if (value === null) return null;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
      }
    })();
  </script>
</body>
</html>`;
}

function renderMetricCard(id: string, label: string, value: number): string {
  return `<article class="metric-card" data-metric="${escapeHtml(id)}">
    <p class="metric-label">${escapeHtml(label)}</p>
    <p class="metric-value">${escapeHtml(formatInteger(value))}</p>
  </article>`;
}

function renderTableCard(table: DashboardTableModel): string {
  const hasRows = table.rows.length > 0;
  const tableId = table.source;
  const safeLabel = escapeHtml(table.label);
  const statusClass = escapeHtml(table.status);

  return `<article class="table-card" data-table="${escapeHtml(tableId)}">
    <div class="table-header">
      <div>
        <h2>${safeLabel}</h2>
        <p class="table-meta">${escapeHtml(table.filePath)}</p>
      </div>
      <span class="table-status ${statusClass}" data-table-status="${escapeHtml(table.status)}"${renderStatusMeta(table)}>${escapeHtml(formatStatus(table.status))}</span>
    </div>
    ${hasRows ? renderTableRows(table) : renderEmptyState(table.emptyState, table)}
  </article>`;
}


function renderStatusMeta(table: DashboardTableModel): string {
  if (!table.emptyState) {
    return '';
  }

  return ` data-empty-reason="${escapeHtml(table.emptyState.reason)}"`;
}

function renderTableRows(table: DashboardTableModel): string {
  const headers = TABLE_COLUMNS.map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`).join('');
  const rows = table.rows
    .map((row) => {
      const rowShape: TableRowShape = row;
      const cells = TABLE_COLUMNS.map((column) => {
        const rawValue = rowShape[column.key] ?? '';
        const formatted = column.formatter ? column.formatter(rawValue) : formatNullable(rawValue as string | number | null);
        return `<td>${escapeHtml(formatted)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<div class="table-wrapper">
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderEmptyState(emptyState: DashboardTableEmptyState | null, table: DashboardTableModel): string {
  const message = emptyState?.message ?? `${table.label} export does not include any rows.`;
  const reasonAttr = emptyState?.reason ?? 'no-data';
  return `<div class="empty-state" data-empty-state="${escapeHtml(table.source)}" data-empty-reason="${escapeHtml(reasonAttr)}">
    <p><strong>${escapeHtml(table.label)}</strong></p>
    <p>${escapeHtml(message)}</p>
    <p><small>Source: ${escapeHtml(table.filePath)}</small></p>
  </div>`;
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${dateFormatter.format(date)} · ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatCurrency(value: TableRowShape[keyof TableRowShape]): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return currencyFormatter.format(value);
  }
  return '—';
}

function formatNumber(value: TableRowShape[keyof TableRowShape]): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return numberFormatter.format(value);
  }
  return '—';
}

function formatDate(value: TableRowShape[keyof TableRowShape]): string {
  if (typeof value === 'string' && value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return dateFormatter.format(date);
    }
    return value;
  }
  return '—';
}

function formatNullable(value: string | number | null): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'number') {
    return formatNumber(value);
  }
  return value;
}

function formatStatus(status: DashboardTableModel['status']): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'empty':
      return 'Empty';
    case 'missing':
      return 'Missing';
    default:
      return status;
  }
}

function formatInteger(value: number): string {
  return numberFormatter.format(value);
}

function escapeHtml(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
