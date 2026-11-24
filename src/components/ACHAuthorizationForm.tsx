import { useRef, useState } from 'react';
import { Printer, Trash2 } from 'lucide-react';
import type { EmployeeProfile } from '../lib/profile';

const STORAGE_KEY = 'wrlc-expense-report:ach-authorization:v1';
type Action = 'Add' | 'Delete' | 'Change';
type Field = 'name' | 'address' | 'city' | 'state' | 'zip' | 'phone' | 'email' | 'bankName' | 'accountType' | 'bankAddress' | 'bankCity' | 'bankState' | 'bankZip' | 'routingNumber' | 'accountNumber' | 'signerName' | 'signerTitle' | 'signatureDate';
type Draft = Record<Field, string> & { action: Action; authorized: boolean };

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createDraft(profile: EmployeeProfile): Draft {
  return {
    name: profile.name, address: '', city: '', state: '', zip: '', phone: '', email: profile.email,
    bankName: '', accountType: '', bankAddress: '', bankCity: '', bankState: '', bankZip: '', routingNumber: '', accountNumber: '',
    signerName: profile.name, signerTitle: '', signatureDate: today(), action: 'Add', authorized: false,
  };
}

function loadDraft(profile: EmployeeProfile): Draft {
  const defaults = createDraft(profile);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Draft> | null;
    if (!saved) return defaults;
    const fields: Field[] = ['name', 'address', 'city', 'state', 'zip', 'phone', 'email', 'bankName', 'accountType', 'bankAddress', 'bankCity', 'bankState', 'bankZip', 'routingNumber', 'accountNumber', 'signerName', 'signerTitle', 'signatureDate'];
    const draft = { ...defaults };
    for (const key of fields) if (typeof saved[key] === 'string') draft[key] = saved[key] as string;
    if (!draft.name.trim()) draft.name = profile.name;
    if (!draft.email.trim()) draft.email = profile.email;
    if (!draft.signerName.trim()) draft.signerName = profile.name;
    if (saved.action === 'Add' || saved.action === 'Delete' || saved.action === 'Change') draft.action = saved.action;
    draft.authorized = saved.authorized === true;
    return draft;
  } catch { return defaults; }
}

const CONTACT_FIELDS: Array<[Field, string, string?]> = [
  ['name', 'Name'], ['address', 'Address'], ['city', 'City'], ['state', 'State'], ['zip', 'ZIP'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email'],
];
const BANK_FIELDS: Array<[Field, string, string?]> = [
  ['bankName', 'Bank name'], ['accountType', 'Account name/type'], ['bankAddress', 'Bank address'], ['bankCity', 'City'], ['bankState', 'State'], ['bankZip', 'ZIP'], ['routingNumber', 'Routing number (9 digits)'], ['accountNumber', 'Account number'],
];

export function ACHAuthorizationForm({ profile }: { profile: EmployeeProfile }) {
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

  const clearBankInformation = () => {
    const next: Draft = {
      ...draftRef.current,
      bankName: '', accountType: '', bankAddress: '', bankCity: '', bankState: '', bankZip: '', routingNumber: '', accountNumber: '',
      authorized: false,
    };
    draftRef.current = next;
    setDraft(next);
    setError('');
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setNotice('Bank information cleared.'); }
    catch { setNotice('Bank information was cleared from the form but could not be saved in browser storage.'); }
  };

  const printForm = () => {
    const missing = [...CONTACT_FIELDS, ...BANK_FIELDS].find(([key]) => !draftRef.current[key].trim());
    if (missing) { setError(`Enter the required ${missing[1].toLowerCase()}.`); return; }
    if (!/^\d{9}$/.test(draftRef.current.routingNumber)) { setError('Enter a 9-digit bank routing number.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(draftRef.current.email)) { setError('Enter a valid email address.'); return; }
    if (!draftRef.current.signerName.trim() || !draftRef.current.signerTitle.trim() || !draftRef.current.signatureDate || !draftRef.current.authorized) {
      setError('Enter the authorized signer name, title, and date, then confirm the authorization.');
      return;
    }
    setError('');
    window.requestAnimationFrame(() => window.print());
  };

  const renderField = ([key, label, type = 'text']: [Field, string, string?]) => <label key={key} className="ach-field"><span>{label} <b aria-hidden="true">*</b></span><input type={type} value={draft[key]} onChange={event => update(key, event.target.value)} autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : undefined}/></label>;

  return <section className="deduction-form-area ach-form-area" aria-labelledby="ach-title">
    <div className="card deduction-form-card ach-form-card">
      <div className="deduction-document-heading"><p>WASHINGTON RESEARCH LIBRARY CONSORTIUM</p><h2 id="ach-title">ACH Authorization Form</h2><span>Bank account authorization</span></div>
      <p className="ach-privacy-note">Bank details are saved in this browser only; they are not encrypted or synced.</p>
      <p className="ach-required-note"><span aria-hidden="true">*</span> Required field</p>
      <section className="ach-section" aria-labelledby="ach-action-title">
        <div className="deduction-section-title"><span>01</span><h3 id="ach-action-title">Authorization type</h3></div>
        <fieldset className="ach-actions"><legend>Select one</legend>{(['Add', 'Delete', 'Change'] as const).map(action => <label key={action}><input type="radio" name="ach-action" checked={draft.action === action} onChange={() => update('action', action)}/>{action}</label>)}</fieldset>
      </section>
      <section className="ach-section" aria-labelledby="ach-contact-title">
        <div className="deduction-section-title"><span>02</span><h3 id="ach-contact-title">Employee information</h3></div>
        <div className="ach-fields">{CONTACT_FIELDS.map(renderField)}</div>
      </section>
      <section className="ach-section" aria-labelledby="ach-bank-title">
        <div className="deduction-section-title"><span>03</span><h3 id="ach-bank-title">Bank information</h3><button type="button" className="btn secondary ach-clear-button" onClick={clearBankInformation}><Trash2 size={14}/>Clear bank info</button></div>
        <div className="ach-fields">{BANK_FIELDS.map(renderField)}</div>
      </section>
      <section className="ach-section" aria-labelledby="ach-signature-title">
        <div className="deduction-section-title"><span>04</span><h3 id="ach-signature-title">Authorization</h3></div>
        <label className="checkline ach-confirm"><input type="checkbox" checked={draft.authorized} onChange={event => update('authorized', event.target.checked)}/><span>I confirm the ACH authorization requested above.</span></label>
        <div className="ach-fields ach-signer-fields">
          <label className="ach-field"><span>Authorized signer name <b aria-hidden="true">*</b></span><input value={draft.signerName} onChange={event => update('signerName', event.target.value)} autoComplete="name"/></label>
          <label className="ach-field"><span>Title <b aria-hidden="true">*</b></span><input value={draft.signerTitle} onChange={event => update('signerTitle', event.target.value)}/></label>
          <label className="ach-field"><span>Date <b aria-hidden="true">*</b></span><input type="date" value={draft.signatureDate} onChange={event => update('signatureDate', event.target.value)}/></label>
        </div>
      </section>
      {error && <p role="alert" className="error ach-error">{error}</p>}{notice && <p role="status" className="ach-error">{notice}</p>}
      <div className="deduction-form-footer"><span>Form data is saved on this device.</span><button className="btn primary deduction-print-button" type="button" onClick={printForm}><Printer size={16}/>Print / Save as PDF</button></div>
    </div>
  </section>;
}
