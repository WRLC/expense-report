import type { EmployeeProfile } from './profile';

export const PAYROLL_DEDUCTION_KEY = 'wrlc-expense-report:payroll-deductions:v1';

export type PayrollDeductionDraft = {
  employeeName: string;
  employeeEmail: string;
  effectiveDate: string;
  pretaxRetirement: boolean;
  pretaxAmount: string;
  rothRetirement: boolean;
  rothAmount: string;
  hsa: boolean;
  hsaAmount: string;
  catchUp: boolean;
  specialDetails: string;
  authorizationConfirmed: boolean;
  signatureDate: string;
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function createPayrollDeductionDraft(profile: EmployeeProfile): PayrollDeductionDraft {
  return {
    employeeName: profile.name,
    employeeEmail: profile.email,
    effectiveDate: '',
    pretaxRetirement: false,
    pretaxAmount: '',
    rothRetirement: false,
    rothAmount: '',
    hsa: false,
    hsaAmount: '',
    catchUp: false,
    specialDetails: '',
    authorizationConfirmed: false,
    signatureDate: today(),
  };
}

export function loadPayrollDeductionDraft(profile: EmployeeProfile): PayrollDeductionDraft {
  const defaults = createPayrollDeductionDraft(profile);
  try {
    const saved = JSON.parse(localStorage.getItem(PAYROLL_DEDUCTION_KEY) ?? 'null') as Partial<PayrollDeductionDraft> | null;
    if (!saved || typeof saved !== 'object') return defaults;
    return {
      ...defaults,
      ...saved,
      employeeName: typeof saved.employeeName === 'string' && saved.employeeName.trim() ? saved.employeeName : profile.name,
      employeeEmail: typeof saved.employeeEmail === 'string' && saved.employeeEmail.trim() ? saved.employeeEmail : profile.email,
      signatureDate: typeof saved.signatureDate === 'string' ? saved.signatureDate : defaults.signatureDate,
      pretaxRetirement: saved.pretaxRetirement === true,
      rothRetirement: saved.rothRetirement === true,
      hsa: saved.hsa === true,
      catchUp: saved.catchUp === true,
      authorizationConfirmed: saved.authorizationConfirmed === true,
    };
  } catch {
    return defaults;
  }
}
