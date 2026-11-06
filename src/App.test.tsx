import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', window.location.pathname); });
afterEach(() => { cleanup(); window.history.replaceState({}, '', window.location.pathname); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('expense report form', () => {
  it('shows the WRLC logo in the header', () => {
    render(<App />);
    expect(screen.getByRole('img', { name: 'WRLC logo' })).toHaveAttribute('src', expect.stringContaining('wrlc-logo-7.png'));
  });

  it('keeps trip backup tools on the Settings page', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Restore trips' })).not.toBeInTheDocument();
    expect(screen.queryByText('Your report stays on this device')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Settings/ }));
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore trips' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export trips' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear trip data' })).toBeInTheDocument();
    expect(screen.getByText('Your report stays on this device')).toBeInTheDocument();
  });

  it('syncs employee details between Settings and trip reports', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Settings/ }));
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taylor Staff' } });
    fireEvent.change(screen.getByLabelText('Your email'), { target: { value: 'taylor@example.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and sync employee information' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('wrlc-expense-report-profile-v1')!).name).toBe('Taylor Staff'));
    fireEvent.click(screen.getByRole('button', { name: /Expense report/ }));
    await waitFor(() => expect(screen.getByLabelText('Employee name')).toHaveValue('Taylor Staff'));
    await waitFor(() => expect(screen.getByLabelText('Employee email')).toHaveValue('taylor@example.org'));
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Morgan Staff' } });
    fireEvent.click(screen.getByRole('button', { name: /Settings/ }));
    expect(screen.getByLabelText('Your name')).toHaveValue('Morgan Staff');
    expect(screen.getByLabelText('Your email')).toHaveValue('taylor@example.org');
    fireEvent.click(screen.getByRole('button', { name: /Expense report/ }));
    fireEvent.click(screen.getByRole('button', { name: 'New trip' }));
    expect(screen.getByLabelText('Employee name')).toHaveValue('Morgan Staff');
    expect(screen.getByLabelText('Employee email')).toHaveValue('taylor@example.org');
  });

  it('saves employee details to Settings when the employee section is completed', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Morgan Staff' } });
    fireEvent.change(screen.getByLabelText('Employee email'), { target: { value: 'morgan@example.org' } });
    await waitFor(() => expect(JSON.parse(localStorage.getItem('wrlc-expense-report-profile-v1')!).email).toBe('morgan@example.org'));
    fireEvent.click(screen.getByRole('button', { name: /Settings/ }));
    expect(screen.getByLabelText('Your name')).toHaveValue('Morgan Staff');
    expect(screen.getByLabelText('Your email')).toHaveValue('morgan@example.org');
  });

  it('starts with three rows and adds another row', () => {
    render(<App />);
    expect(document.querySelectorAll('.expense-row')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: /Add expense/ }));
    expect(document.querySelectorAll('.expense-row')).toHaveLength(4);
  });

  it('offers a rear camera capture input for receipts', () => {
    render(<App />);
    const camera = document.querySelector<HTMLInputElement>('input[capture="environment"]');
    expect(camera).toHaveAttribute('accept', 'image/*');
    expect(screen.getAllByRole('button', { name: /Take photo of receipt/ })).toHaveLength(3);
    expect(document.querySelectorAll('.receipt-actions')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Staff homepage' }).querySelector('svg')).toBeInTheDocument();
  });

  it('updates the report ID from the submitted date and last name', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Taylor Alex Shields' } });
    fireEvent.change(screen.getByLabelText('Date submitted'), { target: { value: '2026-11-04' } });
    expect(document.querySelector('.report-tag')).toHaveTextContent('WR-2026-11-04-Shields');
  });

  it('restores an attached receipt after the form is mounted again', async () => {
    const file = new File(['image bytes'], 'receipt.png', { type: 'image/png' });
    const first = render(<App />);
    fireEvent.change(first.container.querySelector<HTMLInputElement>('.expense-row input[type="file"]')!, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/saved on this device/i));
    await new Promise(resolve => window.setTimeout(resolve, 450));
    first.unmount();
    render(<App />);
    await waitFor(() => expect(screen.getByText('receipt.png')).toBeInTheDocument());
  });

  it('deletes an expense with an undo action', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete expense' })[0]);
    expect(document.querySelectorAll('.expense-row')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(document.querySelectorAll('.expense-row')).toHaveLength(3);
  });

  it('saves and restores trip data from Settings', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: 'Annual meeting' } });
    fireEvent.click(screen.getByRole('button', { name: /Settings/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save trips' }));
    fireEvent.click(screen.getByRole('button', { name: /Expense report/ }));
    fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: 'Changed trip' } });
    fireEvent.click(screen.getByRole('button', { name: /Settings/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore trips' }));
    fireEvent.click(screen.getByRole('button', { name: /Expense report/ }));
    expect(screen.getByLabelText('Trip name')).toHaveValue('Annual meeting');
  });

  it('keeps named trips separate when switching between them', () => {
    render(<App />);
    expect(screen.queryByLabelText('Current trip')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: 'Conference' } });
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Taylor Staff' } });
    fireEvent.click(screen.getByRole('button', { name: 'New trip' }));
    const selector = screen.getByLabelText('Current trip') as HTMLSelectElement;
    fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: 'Site visit' } });
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Morgan Staff' } });
    fireEvent.change(selector, { target: { value: [...selector.options].find(option => option.text === 'Conference')!.value } });
    expect(screen.getByLabelText('Trip name')).toHaveValue('Conference');
    expect(screen.getByLabelText('Employee name')).toHaveValue('Morgan Staff');
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

  it('opens Gmail with a prepared draft and downloads the PDF', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const gmailTab = { opener: window, location: { href: '' }, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(gmailTab as unknown as Window);
    render(<App />);
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Taylor Staff' } });
    fireEvent.change(screen.getByLabelText('Employee email'), { target: { value: 'taylor@example.org' } });
    fireEvent.change(screen.getByLabelText('Accounting email'), { target: { value: 'accounting@example.org' } });
    const row = document.querySelector('.expense-row')!;
    fireEvent.change(row.querySelector('input[type="date"]')!, { target: { value: '2026-11-04' } });
    fireEvent.change(row.querySelector('input[placeholder="e.g. Train to annual meeting"]')!, { target: { value: 'Train to conference' } });
    fireEvent.change(row.querySelector('select')!, { target: { value: 'Travel' } });
    fireEvent.change(row.querySelector('input[inputmode="decimal"]')!, { target: { value: '19.50' } });
    fireEvent.click(screen.getByLabelText('I certify that the information entered in this expense report is complete and accurate.'));
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF & prepare Gmail draft' }));
    await waitFor(() => expect(gmailTab.location.href).toContain('https://mail.google.com/mail/'));
    const gmailUrl = new URL(gmailTab.location.href);
    expect(gmailUrl.searchParams.get('to')).toBe('accounting@example.org');
    expect(gmailUrl.searchParams.get('body')).toContain('taylor@example.org');
    expect(open).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent(/Gmail draft prepared.*use the PDF link below/i);
    expect(screen.getByRole('link', { name: 'Download PDF now' })).toBeInTheDocument();
  });

  it('shares the generated PDF with suggested subject and message', async () => {
    const canShare = vi.fn().mockReturnValue(true);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, canShare, share });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Taylor Staff' } });
    fireEvent.change(screen.getByLabelText('Employee email'), { target: { value: 'taylor@example.org' } });
    const row = document.querySelector('.expense-row')!;
    fireEvent.change(row.querySelector('input[type="date"]')!, { target: { value: '2026-11-04' } });
    fireEvent.change(row.querySelector('input[placeholder="e.g. Train to annual meeting"]')!, { target: { value: 'Train to conference' } });
    fireEvent.change(row.querySelector('select')!, { target: { value: 'Travel' } });
    fireEvent.change(row.querySelector('input[inputmode="decimal"]')!, { target: { value: '19.50' } });
    fireEvent.click(screen.getByLabelText('I certify that the information entered in this expense report is complete and accurate.'));
    fireEvent.click(screen.getByRole('button', { name: 'Share PDF' }));
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    const shareData = share.mock.calls[0][0];
    expect(canShare).toHaveBeenCalledOnce();
    expect(shareData.files[0]).toMatchObject({ name: 'Taylor-Staff-Trip-Expense-Report.pdf', type: 'application/pdf' });
    expect(shareData.title).toContain('WRLC Expense Report');
    expect(shareData.text).toContain('taylor@example.org');
    expect(screen.getByRole('status')).toHaveTextContent(/Choose an email app and add the recipient/i);
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
    const fallbackDownload = screen.getByRole('link', { name: 'Download PDF now' });
    expect(fallbackDownload).toHaveAttribute('href', 'blob:test');
    expect(fallbackDownload).toHaveAttribute('download', 'Taylor-Staff-Trip-Expense-Report.pdf');
  });
});
