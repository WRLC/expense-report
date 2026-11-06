import { beforeEach, describe, expect, it } from 'vitest';
import { clearReceiptStorage, deleteExpenseReceipts, deleteStoredReceipt, deleteTripReceipts, loadReceipts, saveReceipt } from './receiptStorage';

beforeEach(async () => { await clearReceiptStorage(); });

describe('receipt browser storage', () => {
  it('restores receipt files with their trip and expense after reload', async () => {
    const file = new File(['receipt bytes'], 'receipt.jpg', { type: 'image/jpeg' });
    await saveReceipt('trip-a', 'expense-a', { id: 'receipt-a', file });
    const restored = await loadReceipts();
    const item = restored.get('trip-a')?.get('expense-a')?.[0];
    expect(item?.file.name).toBe('receipt.jpg');
    expect(item?.file.type).toBe('image/jpeg');
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(item!.file);
    });
    expect(content).toBe('receipt bytes');
  });

  it('removes a receipt, an expense collection, or a trip collection', async () => {
    const file = new File(['x'], 'receipt.png', { type: 'image/png' });
    await saveReceipt('trip-a', 'expense-a', { id: 'a', file });
    await saveReceipt('trip-a', 'expense-b', { id: 'b', file });
    await saveReceipt('trip-b', 'expense-a', { id: 'c', file });
    await deleteStoredReceipt('a');
    await deleteExpenseReceipts('trip-a', 'expense-b');
    let restored = await loadReceipts();
    expect(restored.get('trip-a')).toBeUndefined();
    expect(restored.get('trip-b')?.get('expense-a')).toHaveLength(1);
    await deleteTripReceipts('trip-b');
    restored = await loadReceipts();
    expect(restored.size).toBe(0);
  });
});
