import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('expense report form', () => {
  it('starts with three rows and adds another row', () => {
    render(<App />);
    expect(document.querySelectorAll('.expense-row')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: /Add expense/ }));
    expect(document.querySelectorAll('.expense-row')).toHaveLength(4);
  });

  it('deletes an expense with an undo action', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete expense' })[0]);
    expect(document.querySelectorAll('.expense-row')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(document.querySelectorAll('.expense-row')).toHaveLength(3);
  });

  it('saves and restores all browser trips', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Taylor Staff' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save trips' }));
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Changed Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restore trips' }));
    expect(screen.getByLabelText('Employee name')).toHaveValue('Taylor Staff');
  });

  it('keeps named trips separate when switching between them', () => {
    render(<App />);
    const selector = screen.getByLabelText('Current trip') as HTMLSelectElement;
    const originalTripId = selector.value;
    fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: 'Conference' } });
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Taylor Staff' } });
    fireEvent.click(screen.getByRole('button', { name: 'New trip' }));
    fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: 'Site visit' } });
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Morgan Staff' } });
    fireEvent.change(selector, { target: { value: originalTripId } });
    expect(screen.getByLabelText('Trip name')).toHaveValue('Conference');
    expect(screen.getByLabelText('Employee name')).toHaveValue('Taylor Staff');
  });

  it('sorts expense rows chronologically', () => {
    render(<App />);
    const dates = document.querySelectorAll<HTMLInputElement>('.expense-row input[type="date"]');
    fireEvent.change(dates[0], { target: { value: '2026-11-06' } });
    fireEvent.change(dates[1], { target: { value: '2026-11-02' } });
    fireEvent.click(screen.getByRole('button', { name: /Sort by date/ }));
    const sorted = document.querySelectorAll<HTMLInputElement>('.expense-row input[type="date"]');
    expect(sorted[0].value).toBe('2026-11-02');
    expect(sorted[1].value).toBe('2026-11-06');
  });

  it('keeps background sending disabled until an approved mail service is configured', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Send report to accounting' })).toBeDisabled();
    expect(screen.getByText(/approved WRLC delivery service/)).toBeInTheDocument();
  });

  it('generates and downloads a report PDF after validation', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Taylor Staff' } });
    fireEvent.change(screen.getByLabelText('Employee email'), { target: { value: 'taylor@example.org' } });
    const row = document.querySelector('.expense-row')!;
    fireEvent.change(row.querySelector('input[type="date"]')!, { target: { value: '2026-11-04' } });
    fireEvent.change(row.querySelector('input[placeholder="e.g. Train to annual meeting"]')!, { target: { value: 'Train to conference' } });
    fireEvent.change(row.querySelector('select')!, { target: { value: 'Travel' } });
    fireEvent.change(row.querySelector('input[inputmode="decimal"]')!, { target: { value: '19.50' } });
    fireEvent.click(screen.getByLabelText('I certify that the information entered in this expense report is complete and accurate.'));
    fireEvent.click(screen.getByRole('button', { name: 'Download Expense Report PDF' }));
    await waitFor(() => expect(screen.getByText(/receipt files included in the PDF/)).toBeInTheDocument());
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
