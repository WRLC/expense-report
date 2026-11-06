function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function makeReportId(submittedDate: string, employee: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(submittedDate) ? submittedDate : localToday();
  const lastName = employee.trim().split(/\s+/).at(-1)?.normalize('NFKC').replace(/[^\p{L}\p{N}'’-]/gu, '') || 'Employee';
  return `WR-${date}-${lastName}`;
}
