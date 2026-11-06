import { describe, expect, it } from 'vitest';
import { makeReportId } from './reportId';

describe('report ID format', () => {
  it('uses the submitted date and employee last name', () => {
    expect(makeReportId('2026-11-06', 'Jordan Alex Doe')).toBe('WR-2026-11-06-Doe');
  });

  it('cleans spaces and punctuation from the last name', () => {
    expect(makeReportId('2026-11-06', 'Jordan Van Dyke,')).toBe('WR-2026-11-06-Dyke');
  });

  it('uses a placeholder when no employee name has been entered', () => {
    expect(makeReportId('2026-11-06', '')).toBe('WR-2026-11-06-Employee');
  });
});
