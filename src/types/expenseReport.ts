export type Receipt = { id: string; file: File };
export type Expense = { id: string; date: string; description: string; type: string; amount: string };
export type Advance = { id: string; description: string; amount: string };
export type Report = { employee: string; employeeEmail: string; submittedDate: string; reportNumber: string; expenses: Expense[]; priorBalance: string; advances: Advance[]; certified: boolean; certificationDate: string };
export type Trip = { id: string; name: string; report: Report };
export type TripStore = { version: 2; activeTripId: string; trips: Trip[] };
