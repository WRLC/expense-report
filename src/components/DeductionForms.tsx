import { useState } from 'react';
import { Check, Printer } from 'lucide-react';
import type { EmployeeProfile } from '../lib/profile';
import { loadPayrollDeductionDraft, PAYROLL_DEDUCTION_KEY, type PayrollDeductionDraft } from '../lib/payrollDeductions';
import { parseCents } from '../lib/calculations';

type FormKey = 'payroll' | 'retirement';
type Errors = Partial<Record<'employeeName' | 'effectiveDate' | 'deduction' | 'amount' | 'authorization', string>>;

type DeductionOption = {
  key: 'pretaxRetirement' | 'rothRetirement' | 'hsa';
  amountKey: 'pretaxAmount' | 'rothAmount' | 'hsaAmount';
  label: string;
  help?: string;
};

const OPTIONS: DeductionOption[] = [
  { key: 'pretaxRetirement', amountKey: 'pretaxAmount', label: 'Additional pre-tax retirement', help: 'Complete the GSRA form.' },
  { key: 'rothRetirement', amountKey: 'rothAmount', label: 'Additional Roth (after-tax) retirement', help: 'Complete the GSRA form.' },
  { key: 'hsa', amountKey: 'hsaAmount', label: 'HSA account' },
];

function validate(draft: PayrollDeductionDraft): Errors {
  const errors: Errors = {};
  if (!draft.employeeName.trim()) errors.employeeName = 'Enter your full name.';
  if (!draft.effectiveDate) errors.effectiveDate = 'Select an effective date.';
  const selected = OPTIONS.filter(option => draft[option.key]);
  if (!selected.length) errors.deduction = 'Select at least one deduction.';
  else if (selected.some(option => {
    const cents = parseCents(draft[option.amountKey]);
    return cents === null || cents <= 0;
  })) errors.amount = 'Enter a valid amount greater than $0 for each selected deduction.';
  if (!draft.authorizationConfirmed) errors.authorization = 'Confirm your authorization before printing.';
  return errors;
}

export function DeductionForms({ profile }: { profile: EmployeeProfile }) {
  const [activeForm, setActiveForm] = useState<FormKey>('payroll');
  const [draft, setDraft] = useState<PayrollDeductionDraft>(() => loadPayrollDeductionDraft(profile));
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState('');

  const update = <K extends keyof PayrollDeductionDraft>(key: K, value: PayrollDeductionDraft[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    try { localStorage.setItem(PAYROLL_DEDUCTION_KEY, JSON.stringify(next)); }
    catch { setNotice('This form could not be saved in browser storage.'); return; }
    setNotice('');
  };

  const printForm = () => {
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setNotice('Review the highlighted fields before printing.');
      return;
    }
    setNotice('');
    window.print();
  };

  return <div className="deduction-page">
    <div className="page-title deduction-page-title"><div><p className="eyebrow">EMPLOYEE BENEFITS · FORMS</p><h1>Deduction Forms</h1><p className="lede">Choose a form and complete it online. Each form is saved separately on this device.</p></div></div>
    {notice && <div aria-live="polite" role="status" className="notice notice-visible deduction-notice">{notice}</div>}
    <div className="deduction-layout">
      <aside className="deduction-navigation card" aria-label="Deduction forms">
        <p className="deduction-nav-title">AVAILABLE FORMS</p>
        <button type="button" className={`deduction-nav-item${activeForm === 'payroll' ? ' active' : ''}`} aria-current={activeForm === 'payroll' ? 'page' : undefined} onClick={() => { setActiveForm('payroll'); setNotice(''); }}>Payroll Deductions<span>Open form</span></button>
        <button type="button" className={`deduction-nav-item${activeForm === 'retirement' ? ' active' : ''}`} aria-current={activeForm === 'retirement' ? 'page' : undefined} onClick={() => { setActiveForm('retirement'); setNotice(''); }}>Retirement Contributions<span>Coming soon</span></button>
      </aside>

      {activeForm === 'payroll' ? <section className="deduction-form-area payroll-deduction-form" aria-labelledby="payroll-title">
        <div className="card deduction-form-card">
          <div className="deduction-document-heading"><p>WASHINGTON RESEARCH LIBRARY CONSORTIUM</p><h2 id="payroll-title">Payroll Deductions</h2><span>Voluntary Payroll Deductions</span></div>
          <section className="deduction-section" aria-labelledby="employee-info-title">
            <div className="deduction-section-title"><span>01</span><h3 id="employee-info-title">Employee Information</h3></div>
            <div className="deduction-fields">
              <label>Full name<input autoComplete="name" value={draft.employeeName} onChange={event => update('employeeName', event.target.value)} aria-invalid={!!errors.employeeName}/>{errors.employeeName && <small role="alert" className="error">{errors.employeeName}</small>}</label>
              <label>Email address<input type="email" autoComplete="email" value={draft.employeeEmail} onChange={event => update('employeeEmail', event.target.value)}/></label>
            </div>
          </section>

          <section className="deduction-section" aria-labelledby="authorization-title">
            <div className="deduction-section-title"><span>02</span><h3 id="authorization-title">Deduction Authorization</h3></div>
            <label className="deduction-effective-date">I authorize payroll deductions for the item(s) checked below to begin on<input type="date" value={draft.effectiveDate} onChange={event => update('effectiveDate', event.target.value)} aria-invalid={!!errors.effectiveDate}/>{errors.effectiveDate && <small role="alert" className="error">{errors.effectiveDate}</small>}</label>
            <p className="deduction-instruction">Check each deduction that applies and enter the amount to deduct each pay period.</p>
            <div className="deduction-options">
              {OPTIONS.map(option => <div className="deduction-option" key={option.key}>
                <label className="deduction-check"><input type="checkbox" checked={draft[option.key]} onChange={event => update(option.key, event.target.checked)}/><span>{option.label}{option.help && <small>{option.help}</small>}</span></label>
                <label className="deduction-amount"><span className="sr-only">{option.label} amount per pay period</span><div className="currency-field"><span>$</span><input type="text" inputMode="decimal" placeholder="0.00" value={draft[option.amountKey]} onChange={event => update(option.amountKey, event.target.value)} aria-invalid={!!errors.amount} disabled={!draft[option.key]}/></div><span>per pay period</span></label>
              </div>)}
            </div>
            {errors.deduction && <small role="alert" className="error">{errors.deduction}</small>}
            {errors.amount && <small role="alert" className="error">{errors.amount}</small>}
            <label className="deduction-check catchup-check"><input type="checkbox" checked={draft.catchUp} onChange={event => update('catchUp', event.target.checked)}/><span>My additional retirement amount includes catch-up contributions<small>Available to employees age 50 or older, or with 15 years of service. If prior-year FICA wages exceeded the IRS threshold, age-50 catch-up contributions must be made as Roth (after-tax).</small></span></label>
            <aside className="deduction-information"><strong>About retirement deductions</strong><p>Amounts on this form are in addition to the percentage elected on the Salary Reduction Agreement for Retirement Contributions. Once eligible for WRLC contributions (age 21 and 6 consecutive months of service), WRLC matches combined retirement contributions up to 5% of compensation. Contributions above 5% are not matched.</p></aside>
          </section>

          <section className="deduction-section" aria-labelledby="details-title">
            <div className="deduction-section-title"><span>03</span><h3 id="details-title">Additional Details</h3></div>
            <label>If the deduction is one-time, for a specified period, or toward a specific dollar goal, provide details<textarea rows={3} value={draft.specialDetails} onChange={event => update('specialDetails', event.target.value)} placeholder="For example: one-time deduction, number of pay periods, or dollar goal"/></label>
          </section>

          <section className="deduction-section" aria-labelledby="employee-authorization-title">
            <div className="deduction-section-title"><span>04</span><h3 id="employee-authorization-title">Employee Authorization</h3></div>
            <p className="deduction-authorization-copy">I authorize the payroll deductions selected above and certify that the information provided is accurate.</p>
            <label className="checkline deduction-confirmation"><input type="checkbox" checked={draft.authorizationConfirmed} onChange={event => update('authorizationConfirmed', event.target.checked)}/><span>I confirm this authorization.</span></label>
            {errors.authorization && <small role="alert" className="error">{errors.authorization}</small>}
            <div className="deduction-fields signature-fields"><label>Typed name<input value={draft.employeeName} onChange={event => update('employeeName', event.target.value)}/></label><label>Date<input type="date" value={draft.signatureDate} onChange={event => update('signatureDate', event.target.value)}/></label></div>
          </section>

          <section className="deduction-section payroll-processing" aria-labelledby="payroll-use-title">
            <div className="deduction-section-title"><span>05</span><h3 id="payroll-use-title">Payroll Use Only</h3></div>
            <p className="payroll-use-hint">Complete after the employee submits the printed form.</p>
            <div className="payroll-signature-lines"><div><span>Date entered</span><i aria-hidden="true"/></div><div><span>Entered by (initials or name)</span><i aria-hidden="true"/></div></div>
          </section>
          <div className="deduction-form-footer"><span>Form data is saved on this device.</span><button className="btn primary deduction-print-button" type="button" onClick={printForm}><Printer size={16}/>Print / Save as PDF</button></div>
        </div>
      </section> : <section className="card deduction-coming-soon" aria-labelledby="retirement-title"><div className="coming-soon-icon"><Check size={23}/></div><p className="eyebrow">FORM IN PROGRESS</p><h2 id="retirement-title">Retirement Contributions</h2><p>This form will be added here. Use Payroll Deductions for voluntary per-pay-period deduction authorizations in the meantime.</p><button type="button" className="btn secondary" onClick={() => setActiveForm('payroll')}>Open Payroll Deductions</button></section>}
    </div>
    <footer className="bottom-actions"><span>Payroll Deductions is saved independently from expense reports.</span></footer>
  </div>;
}
