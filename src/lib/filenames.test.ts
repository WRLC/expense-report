import { describe, expect, it } from 'vitest';
import { reportFilename } from './filenames';

describe('report PDF filename', () => {
  it('uses the employee and trip names', () => {
    expect(reportFilename('Taylor Staff', 'Annual Conference Chicago')).toBe('Taylor-Staff-Annual-Conference-Chicago-Expense-Report.pdf');
  });
  it('sanitizes unsafe filename characters and handles missing names', () => {
    expect(reportFilename('Zoë / Staff', '')).toBe('Zoe-Staff-Trip-Expense-Report.pdf');
  });
});
