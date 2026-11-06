import { afterEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';
import { hasAdvanceValues, makePdf } from './pdf';
import type { Receipt, Report } from '../types/expenseReport';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const report: Report = {
  employee: 'Jordan Doe', employeeEmail: '', submittedDate: '2026-11-06', reportNumber: 'WR-2026-TEST',
  expenses: [{ id: 'expense-1', date: '2026-11-04', description: 'Conference registration', type: 'Registration', amount: '250.00' }],
  priorBalance: '', advances: [], certified: true, certificationDate: '2026-11-06',
};
const tinyPng = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC'), char => char.charCodeAt(0));
const imageReceipt = (name: string, id = 'receipt'): Receipt => ({
  id,
  file: { name, type: 'image/png', arrayBuffer: async () => tinyPng.buffer } as File,
});

describe('report PDF', () => {
  it('hides the advances section when all advance fields are empty or zero', () => {
    expect(hasAdvanceValues(report)).toBe(false);
    expect(hasAdvanceValues({ ...report, priorBalance: '0.00' })).toBe(false);
  });

  it('shows the advances section when a balance or advance value is present', () => {
    expect(hasAdvanceValues({ ...report, priorBalance: '25.00' })).toBe(true);
    expect(hasAdvanceValues({ ...report, advances: [{ id: 'a1', description: 'Train ticket', amount: '' }] })).toBe(true);
  });

  it('creates a readable report PDF', async () => {
    const result = await makePdf(report, new Map(), false);
    const doc = await PDFDocument.load(result.bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    const pdfSource = new TextDecoder('latin1').decode(result.bytes);
    expect(pdfSource).toContain('HR PROCESSING');
    expect(pdfSource).toContain('HR signature:');
    expect(pdfSource).toContain('Paid');
    expect(result.included).toEqual([]);
  });

  it('adds a receipt appendix page when an image is selected', async () => {
    const result = await makePdf(report, new Map([['expense-1', [imageReceipt('receipt.png')]]]), true);
    const doc = await PDFDocument.load(result.bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(result.included).toContain('Conference registration — receipt.png');
  });

  it('includes a screenshot whose filename contains a narrow no-break space', async () => {
    const filename = 'Screenshot 2026-11-06 at 1.15.24\u202fPM.png';
    const result = await makePdf(report, new Map([['expense-1', [imageReceipt(filename)]]]), true);
    const doc = await PDFDocument.load(result.bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(result.included).toContain(`Conference registration — ${filename}`);
  });

  it('converts screenshots when direct PNG embedding rejects their encoding', async () => {
    const receipt = imageReceipt('Screenshot 2026-11-06.png', 'screenshot');
    vi.spyOn(PDFDocument.prototype, 'embedPng').mockRejectedValueOnce(new Error('PNG encoding not supported'));
    vi.spyOn(PDFDocument.prototype, 'embedJpg').mockResolvedValue({ width: 1, height: 1 } as never);
    vi.spyOn(PDFPage.prototype, 'drawImage').mockImplementation(() => {});
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1, height: 1, close: vi.fn() })));
    const context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback({ arrayBuffer: async () => new Uint8Array([1]).buffer } as unknown as Blob));
    const result = await makePdf(report, new Map([['expense-1', [receipt]]]), true);
    expect(result.included).toContain('Conference registration — Screenshot 2026-11-06.png');
    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(PDFDocument.prototype.embedJpg).toHaveBeenCalledOnce();
  });
});
