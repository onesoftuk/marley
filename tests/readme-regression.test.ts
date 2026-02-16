import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

function loadReadme(): string {
  const readmePath = path.resolve(__dirname, '../README.md');
  return readFileSync(readmePath, 'utf-8');
}

describe('README regression guard', () => {
  const contents = loadReadme();

  it('documents the Refresh data workflow for local CSV-driven dashboards', () => {
    expect(contents).toContain('Refresh data');
    expect(contents).toContain('data/sold-today.csv');
    expect(contents).toContain('data/sold-last-30-days.csv');
  });

  it('lists the regression checklist commands for Ticket B1', () => {
    expect(contents).toContain('npm test');
    expect(contents).toContain('npm run build');
    expect(contents).toContain('npm run dev dashboard -- --port 4177');
  });
});
