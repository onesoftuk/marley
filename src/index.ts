import { startDashboardServer } from './dashboard/route.js';

export const placeholder = true;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'dashboard';

  switch (command) {
    case 'dashboard': {
      const port = parsePort(args) ?? undefined;
      await startDashboardServer({ port });
      break;
    }
    case 'help':
    case '--help':
    case '-h': {
      printHelp();
      break;
    }
    default: {
      console.error(`Unknown command "${command}".`);
      printHelp();
      process.exitCode = 1;
    }
  }
}

function parsePort(args: string[]): number | null {
  const portFlagIndex = args.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portFlagIndex !== -1) {
    const candidate = Number(args[portFlagIndex + 1]);
    return Number.isFinite(candidate) ? candidate : null;
  }

  const inline = args.find((arg) => arg.startsWith('--port='));
  if (inline) {
    const [_, value] = inline.split('=');
    const candidate = Number(value);
    return Number.isFinite(candidate) ? candidate : null;
  }

  return null;
}

function printHelp(): void {
  console.log('Marley Moves CLI');
  console.log('');
  console.log('Usage: npm run dev [command]');
  console.log('');
  console.log('Commands:');
  console.log('  dashboard         Start the local dashboard HTTP server');
  console.log('  help              Show this message');
  console.log('');
  console.log('Options (dashboard):');
  console.log('  --port <number>   Override the dashboard port (env: DASHBOARD_PORT)');
}

const isDirectRun = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectRun) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[main] Failed to start: ${message}`);
    process.exitCode = 1;
  });
}
