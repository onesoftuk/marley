import { describe, it, expect } from 'vitest';
import { placeholder } from '../src/index.js';

describe('smoke', () => {
  it('placeholder passes', () => {
    expect(placeholder).toBe(true);
  });
});
