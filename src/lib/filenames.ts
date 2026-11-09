function safePart(value: string, fallback: string): string {
  const cleaned = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  return cleaned || fallback;
}

export function reportFilename(employee: string, reportName: string): string {
  return `${safePart(employee, 'Employee')}-${safePart(reportName, 'Report')}-Expense-Report.pdf`;
}
