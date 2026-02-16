import http from 'node:http';
import { URL } from 'node:url';
import type { Server as HttpServer, IncomingMessage, ServerResponse } from 'node:http';
import { readDashboardData } from './data.js';
import { buildDashboardMetricsModel } from './service.js';
import type { DashboardMetricsModel } from './service.js';
import { renderDashboardPage } from './ui.js';

export interface DashboardRouteOptions {
  dataDir?: string;
  clock?: () => Date;
}

export interface DashboardRouteView {
  generatedAt: string;
  metrics: DashboardMetricsModel;
}

export class DashboardRoute {
  private cachedView: DashboardRouteView | null = null;

  constructor(private readonly options: DashboardRouteOptions = {}) {}

  async getView(): Promise<DashboardRouteView> {
    if (!this.cachedView) {
      await this.refresh();
    }

    return this.cachedView as DashboardRouteView;
  }

  async refresh(): Promise<DashboardRouteView> {
    const data = await readDashboardData({ dataDir: this.options.dataDir });
    const metrics = buildDashboardMetricsModel(data);
    const generatedAt = (this.options.clock?.() ?? new Date()).toISOString();

    const view: DashboardRouteView = {
      generatedAt,
      metrics,
    };

    this.cachedView = view;
    return view;
  }
}

export interface DashboardServerOptions extends DashboardRouteOptions {
  port?: number;
  hostname?: string;
}

export interface DashboardServerInstance {
  server: HttpServer;
  route: DashboardRoute;
}

export function createDashboardServer(
  options: DashboardServerOptions = {},
): DashboardServerInstance {
  const route = new DashboardRoute({ dataDir: options.dataDir, clock: options.clock });
  const server = http.createServer(async (req, res) => {
    try {
      await handleRequest(req, res, route);
    } catch (error) {
      console.error('[dashboard] Unhandled error while processing request:', error);
      sendJson(res, 500, { error: 'Internal Server Error' });
    }
  });

  return { server, route };
}

export async function startDashboardServer(
  options: DashboardServerOptions = {},
): Promise<HttpServer> {
  const hostname = options.hostname ?? '127.0.0.1';
  const fallbackPort = Number(process.env.DASHBOARD_PORT ?? '4177');
  const port = options.port ?? fallbackPort;
  const { server } = createDashboardServer(options);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, hostname, () => resolve());
  });

  console.log(`[dashboard] Listening at http://${hostname}:${port}`);
  console.log('[dashboard] Routes:');
  console.log('  • GET /dashboard — latest view model (cached until refresh)');
  console.log('  • POST /dashboard/refresh — re-reads CSV exports from disk');

  return server;
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  route: DashboardRoute,
): Promise<void> {
  enableCors(res);

  if (!req.url) {
    sendJson(res, 400, { error: 'Missing URL' });
    return;
  }

  const method = req.method?.toUpperCase() ?? 'GET';

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');

  if (method === 'GET' && (url.pathname === '/' || url.pathname === '/dashboard/ui')) {
    const view = await route.getView();
    const html = renderDashboardPage(view);
    sendHtml(res, 200, html);
    return;
  }

  if (method === 'GET' && url.pathname === '/dashboard') {
    const view = await route.getView();
    sendJson(res, 200, { view });
    return;
  }

  if (method === 'POST' && url.pathname === '/dashboard/refresh') {
    const view = await route.refresh();
    sendJson(res, 200, { view, refreshed: true });
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
}

function enableCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  if (!res.headersSent) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
  }

  res.end(JSON.stringify(payload));
}

function sendHtml(res: ServerResponse, statusCode: number, html: string): void {
  if (!res.headersSent) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }

  res.end(html);
}
