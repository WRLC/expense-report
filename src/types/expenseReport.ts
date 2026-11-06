export type Receipt = { id: string; file: File };
export type Expense = { id: string; date: string; description: string; type: string; amount: string };
export type Advance = { id: string; description: string; amount: string };
export type Report = { employee: string; submittedDate: string; reportNumber: string; expenses: Expense[]; priorBalance: string; advances: Advance[]; certified: boolean; certificationDate: string };
