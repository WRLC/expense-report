import { useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import type { EmployeeProfile } from '../lib/profile';

const STORAGE_KEY = 'wrlc-expense-report:retirement-agreement:v1';

type Draft = {
  employeeName: string;
  effectiveMonth: string;
  matchElection: string;
  taxElection: 'traditional' | 'roth' | 'split' | '';
  traditionalPercent: string;
  rothPercent: string;
  employeeConfirmed: boolean;
  signatureDate: string;
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function loadDraft(profile: EmployeeProfile): Draft {
  const defaults: Draft = { employeeName: profile.name, effectiveMonth: '', matchElection: '', taxElection: '', traditionalPercent: '', rothPercent: '', employeeConfirmed: false, signatureDate: today() };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Draft> | null;
    if (!saved) return defaults;
    return { ...defaults, ...saved, employeeName: typeof saved.employeeName === 'string' && saved.employeeName.trim() ? saved.employeeName : profile.name, employeeConfirmed: saved.employeeConfirmed === true };
  } catch { return defaults; }
}

export function RetirementAgreementForm({ profile }: { profile: EmployeeProfile }) {
  const [draft, setDraft] = useState(() => loadDraft(profile));
  const draftRef = useRef(draft);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    const next = { ...draftRef.current, [key]: value };
    draftRef.current = next;
    setDraft(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setNotice(''); }
    catch { setNotice('This form could not be saved in browser storage.'); }
    setError('');
  };

  const printForm = () => {
    const current = draftRef.current;
    if (!current.employeeName.trim() || !current.effectiveMonth || !current.matchElection || !current.taxElection || !current.employeeConfirmed) {
      setError('Enter your name and effective month, choose both contribution elections, and confirm your authorization before printing.');
      return;
    }
    if (current.taxElection === 'split') {
      const traditional = Number(current.traditionalPercent);
      const roth = Number(current.rothPercent);
      if (!Number.isFinite(traditional) || !Number.isFinite(roth) || traditional < 0 || roth < 0 || traditional + roth !== 100) {
        setError('For a split election, enter percentages that total 100%.');
        return;
      }
    }
    setError('');
    window.requestAnimationFrame(() => window.print());
  };

  return <section className="deduction-form-area retirement-agreement-form" aria-labelledby="retirement-agreement-title">
    <div className="card deduction-form-card retirement-form-card">
      <div className="deduction-document-heading"><p>WASHINGTON RESEARCH LIBRARY CONSORTIUM</p><h2 id="retirement-agreement-title">Salary Reduction Agreement for Retirement Contributions</h2></div>
      <div className="retirement-intro"><strong>This form is used to receive matching contributions from WRLC. Participation starts after 6 months of employment.</strong><span>Do not use this form for Group Supplemental Retirement Annuities (GSRA), nonmatching contributions. Use the Payroll Deductions form for GSRA contributions to TIAA.</span></div>

      <section className="retirement-section" aria-labelledby="retirement-matching-title">
        <h3 id="retirement-matching-title">1. 403(b) Matching Contribution Election</h3>
        <p><strong>To receive a WRLC matching contribution under the 403(b) retirement plan, select one option below.</strong></p>
        <label className="retirement-effective">Effective with the month of<input aria-label="Effective month" type="month" value={draft.effectiveMonth} onChange={event => update('effectiveMonth', event.target.value)}/></label>
        <p>I hereby authorize my base salary to be reduced by a total of (check one):</p>
        <div className="retirement-match-options">{['5%', '4%', '3%', '2%', '1%', '$200.00 annually'].map(value => <label key={value}><input type="radio" name="match-election" checked={draft.matchElection === value} onChange={() => update('matchElection', value)}/>{value}</label>)}</div>
        <p className="retirement-legal">Percentages will be calculated on gross base salary per pay period and allocated for retirement plan contributions. WRLC contributions to my annuity contract(s) will be matched by an equal amount, allocated as designated, subject to the statutory exclusion allowance under IRC Section 403(b) or the limits of IRC Sections 415 or 402(g), whichever is least.</p>
      </section>

      <section className="retirement-section" aria-labelledby="retirement-roth-title">
        <h3 id="retirement-roth-title">2. Elective Roth (After-Tax) Contribution Provision (SECURE 2.0)</h3>
        <p>Employees who meet the Plan's SECURE 2.0 eligibility standards may designate all or part of the salary reduction above as a Roth (after-tax) elective deferral under IRC Section 402A instead of a traditional pre-tax deferral. This election is voluntary; if this section is not completed, the contribution will be traditional pre-tax.</p>
        <p>I certify that I meet the eligibility standards under SECURE 2.0 and elect to allocate my salary reduction as follows (check one):</p>
        <div className="retirement-tax-options">
          <label><input type="radio" name="tax-election" checked={draft.taxElection === 'traditional'} onChange={() => update('taxElection', 'traditional')}/>100% Traditional (Pre-Tax)</label>
          <label><input type="radio" name="tax-election" checked={draft.taxElection === 'roth'} onChange={() => update('taxElection', 'roth')}/>100% Roth (After-Tax)</label>
          <div className="retirement-split"><label><input type="radio" name="tax-election" checked={draft.taxElection === 'split'} onChange={() => update('taxElection', 'split')}/>Split:</label><input aria-label="Traditional percentage" inputMode="decimal" type="number" min="0" max="100" value={draft.traditionalPercent} onChange={event => update('traditionalPercent', event.target.value)} disabled={draft.taxElection !== 'split'}/> % Traditional / <input aria-label="Roth percentage" inputMode="decimal" type="number" min="0" max="100" value={draft.rothPercent} onChange={event => update('rothPercent', event.target.value)} disabled={draft.taxElection !== 'split'}/> % Roth</div>
        </div>
        <p className="retirement-legal">Regardless of this election, WRLC's matching contribution will be credited on a traditional pre-tax basis, as required under the Plan and applicable IRC provisions.</p>
      </section>

      <section className="retirement-section" aria-labelledby="retirement-continuation-title">
        <h3 id="retirement-continuation-title">3. Continuation of Deductions</h3>
        <p>WRLC will continue to deduct the amount indicated on this form while employment continues unless:</p>
        <ol><li>I execute another Salary Reduction Agreement within the limits established under Sections 403(b) and 415 of the Internal Revenue Code; or</li><li>A recalculation of the legally permissible maximum percent results in a lower salary reduction amount than currently in effect, requiring a new Salary Reduction Agreement.</li></ol>
        <p>I understand that if a new agreement is required and I do not execute it, WRLC may automatically limit my percentage to the percentage permitted by the Internal Revenue Code.</p>
      </section>

      <section className="retirement-section retirement-employee-section" aria-labelledby="retirement-employee-title">
        <h3 id="retirement-employee-title">4. Employee Authorization</h3>
        <label className="retirement-confirm"><input type="checkbox" checked={draft.employeeConfirmed} onChange={event => update('employeeConfirmed', event.target.checked)}/><span>I authorize the salary reduction and contribution elections above and certify that I meet the stated eligibility requirements.</span></label>
        <div className="retirement-employee-fields"><label>Employee printed name<input autoComplete="name" value={draft.employeeName} onChange={event => update('employeeName', event.target.value)}/></label><label>Date confirmed<input type="date" value={draft.signatureDate} onChange={event => update('signatureDate', event.target.value)}/></label></div>
      </section>

      <section className="retirement-section retirement-wrlc-section" aria-labelledby="retirement-wrlc-title">
        <h3 id="retirement-wrlc-title">5. For the Washington Research Library Consortium</h3>
        <p className="retirement-manual-hint">For WRLC use after the employee submits the form.</p>
        <div className="retirement-manual-fields"><label><span>Name</span><i/></label><label><span>Title</span><i/></label><label><span>Date</span><i/></label></div>
      </section>
      {error && <p role="alert" className="error retirement-error">{error}</p>}{notice && <p role="status" className="retirement-error">{notice}</p>}
      <div className="deduction-form-footer"><span>Form data is saved on this device.</span><button className="btn primary deduction-print-button" type="button" onClick={printForm}><Printer size={16}/>Print / Save as PDF</button></div>
    </div>
  </section>;
}
