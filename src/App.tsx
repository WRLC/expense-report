import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownWideNarrow, Download, FileDown, FileText, House, Mail, Plus, RotateCcw, Settings as SettingsIcon, Share2, Trash2, X } from 'lucide-react';
import { ACCOUNTING_EMAIL, DRAFT_KEY } from './config/appConfig';
import type { Advance, Expense, Receipt, Report, TripStore } from './types/expenseReport';
import { getTotals } from './lib/calculations';
import { validateReport } from './lib/validation';
import { createTrip, importTripStore, loadTripStore } from './lib/trips';
import { clearReceiptStorage, deleteExpenseReceipts, deleteStoredReceipt, deleteTripReceipts, loadReceipts, saveReceipt } from './lib/receiptStorage';
import { reportFilename } from './lib/filenames';
import { loadProfile, saveProfile, type EmployeeProfile } from './lib/profile';
import { makeReportId } from './lib/reportId';
import { FinancialSummary } from './components/FinancialSummary';
import { PrivacyNotice } from './components/PrivacyNotice';
import { ExpenseRow } from './components/ExpenseRow';
import logoUrl from './assets/wrlc-logo-7.png';

const newExpense = (): Expense => ({ id: crypto.randomUUID(), date: '', description: '', type: '', amount: '' });
const newAdvance = (): Advance => ({ id: crypto.randomUUID(), description: '', amount: '' });

type ReceiptStore = Map<string, Map<string, Receipt[]>>;
type PropsAction<T> = T | ((current: T) => T);

function fillBlankEmployeeDetails(savedStore: TripStore, profile: EmployeeProfile): TripStore {
  return { ...savedStore, trips: savedStore.trips.map(trip => {
    const employee = profile.name || trip.report.employee;
    const employeeEmail = profile.email || trip.report.employeeEmail;
    return { ...trip, report: {
      ...trip.report,
      employee,
      employeeEmail,
      reportNumber: makeReportId(trip.report.submittedDate, employee),
    } };
  }) };
}

function loadStoreWithProfile(): TripStore { return fillBlankEmployeeDetails(loadTripStore(), loadProfile()); }

export default function App() {
  const [store, setStore] = useState<TripStore>(loadStoreWithProfile);
  const [receiptsByTrip, setReceiptsByTrip] = useState<ReceiptStore>(new Map());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState<EmployeeProfile>(loadProfile);
  const [profileDraft, setProfileDraft] = useState<EmployeeProfile>(loadProfile);
  const [page, setPage] = useState<'settings' | 'report'>(() => window.location.hash === '#settings' ? 'settings' : 'report');
  const [accountingEmail, setAccountingEmail] = useState(ACCOUNTING_EMAIL);
  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [pdfDownload, setPdfDownload] = useState<{ url: string; filename: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ row: Expense; index: number; receipts: Receipt[] } | null>(null);
  const [preview, setPreview] = useState<Receipt | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const importInput = useRef<HTMLInputElement>(null);
  const currentTrip = store.trips.find(trip => trip.id === store.activeTripId) ?? store.trips[0];
  const report = currentTrip.report;
  const receipts = receiptsByTrip.get(currentTrip.id) ?? new Map<string, Receipt[]>();
  const totals = useMemo(() => getTotals(report.expenses, report.priorBalance, report.advances), [report]);

  useEffect(() => {
    const onPopState = () => setPage(window.location.hash === '#settings' ? 'settings' : 'report');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (nextPage: 'settings' | 'report') => {
    const hash = nextPage === 'settings' ? '#settings' : '#report';
    if (window.location.hash !== hash) window.history.pushState({}, '', hash);
    setPage(nextPage);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(store)); }
      catch { setNotice('Browser storage is full. Export your trips to keep a copy.'); }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [store]);

  useEffect(() => {
    let active = true;
    void loadReceipts().then(saved => {
      if (!active) return;
      setReceiptsByTrip(current => {
        const merged = new Map(saved);
        for (const [tripId, expenses] of current) {
          const target = new Map(merged.get(tripId) ?? []);
          for (const [expenseId, receipts] of expenses) {
            const existing = target.get(expenseId) ?? [];
            target.set(expenseId, [...existing, ...receipts.filter(receipt => !existing.some(item => item.id === receipt.id))]);
          }
          merged.set(tripId, target);
        }
        return merged;
      });
    }).catch(() => { if (active) setNotice('Saved receipts could not be loaded from this browser.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (pdfDownload) URL.revokeObjectURL(pdfDownload.url);
  }, [pdfDownload]);

  const updateCurrentReport = (update: (current: Report) => Report) => {
    setStore(current => ({ ...current, trips: current.trips.map(trip => trip.id === currentTrip.id ? { ...trip, report: update(trip.report) } : trip) }));
  };
  const setReportField = (key: keyof Report, value: unknown) => updateCurrentReport(current => ({ ...current, [key]: value }));
  const updateEmployeeField = (key: 'employee' | 'employeeEmail', value: string) => {
    const next = {
      name: key === 'employee' ? value.trim() : (report.employee.trim() || profile.name),
      email: key === 'employeeEmail' ? value.trim() : (report.employeeEmail.trim() || profile.email),
    };
    setProfile(next);
    setProfileDraft(next);
    try { saveProfile(next); }
    catch { setNotice('Could not save your profile in this browser.'); }
    setStore(current => ({ ...current, trips: current.trips.map(trip => ({ ...trip, report: {
      ...trip.report,
      employee: next.name,
      employeeEmail: next.email,
      reportNumber: makeReportId(trip.report.submittedDate, next.name),
      ...(trip.id === currentTrip.id ? { [key]: value } : {}),
    } })) }));
  };
  const updateSubmittedDate = (submittedDate: string) => {
    setStore(current => ({ ...current, trips: current.trips.map(trip => trip.id === currentTrip.id ? { ...trip, report: {
      ...trip.report,
      submittedDate,
      reportNumber: makeReportId(submittedDate, trip.report.employee),
    } } : trip) }));
  };
  const updateSavedProfile = (key: keyof EmployeeProfile, value: string) => {
    setProfileDraft(current => ({ ...current, [key]: value }));
  };
  const saveSettingsProfile = () => {
    setProfile(profileDraft);
    try { saveProfile(profileDraft); }
    catch { setNotice('Could not save your profile in this browser.'); return; }
    setStore(current => ({ ...current, trips: current.trips.map(trip => ({ ...trip, report: {
      ...trip.report,
      employee: profileDraft.name,
      employeeEmail: profileDraft.email,
      reportNumber: makeReportId(trip.report.submittedDate, profileDraft.name),
    } })) }));
    setNotice('Employee information saved and synced to all trips.');
  };
  const updateExpense = (expenseId: string, key: keyof Expense, value: string) => updateCurrentReport(current => ({ ...current, expenses: current.expenses.map(row => row.id === expenseId ? { ...row, [key]: value } : row) }));
  const updateAdvance = (advanceId: string, key: keyof Advance, value: string) => updateCurrentReport(current => ({ ...current, advances: current.advances.map(row => row.id === advanceId ? { ...row, [key]: value } : row) }));
  const changeReceipts = (update: PropsAction<Map<string, Receipt[]>>) => setReceiptsByTrip(current => {
    const next = new Map(current);
    const existing = current.get(currentTrip.id) ?? new Map<string, Receipt[]>();
    next.set(currentTrip.id, typeof update === 'function' ? update(existing) : update);
    return next;
  });
  const addReceipt = (expenseId: string, files: FileList | null) => {
    if (!files) return;
    const accepted: Receipt[] = [];
    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) { setNotice(`${file.name} is not a PDF or image.`); continue; }
      if (file.size > 10 * 1024 * 1024) { setNotice(`${file.name} is over the 10 MB limit.`); continue; }
      accepted.push({ id: crypto.randomUUID(), file });
    }
    changeReceipts(current => new Map(current).set(expenseId, [...(current.get(expenseId) ?? []), ...accepted]));
    if (accepted.length) {
      setNotice(`${accepted.length} receipt${accepted.length === 1 ? '' : 's'} attached. Saving on this device…`);
      void Promise.all(accepted.map(receipt => saveReceipt(currentTrip.id, expenseId, receipt)))
        .then(() => setNotice(`${accepted.length} receipt${accepted.length === 1 ? '' : 's'} saved on this device.`))
        .catch(() => setNotice('Receipt attached for now, but could not be saved on this device. Check browser storage space.'));
    }
  };
  const removeReceipt = (expenseId: string, receiptId: string) => {
    changeReceipts(current => new Map(current).set(expenseId, (current.get(expenseId) ?? []).filter(receipt => receipt.id !== receiptId)));
    void deleteStoredReceipt(receiptId).catch(() => setNotice('Could not remove the receipt from this device.'));
  };
  const openPreview = (receipt: Receipt) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreview(receipt);
    setPreviewUrl(URL.createObjectURL(receipt.file));
  };
  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreview(null);
    setPreviewUrl('');
  };
  const createNewTrip = () => {
    const trip = createTrip();
    trip.report.employee = profile.name;
    trip.report.employeeEmail = profile.email;
    trip.report.reportNumber = makeReportId(trip.report.submittedDate, profile.name);
    setStore(current => ({ ...current, activeTripId: trip.id, trips: [...current.trips, trip] }));
    setErrors({});
    setNotice('New trip started. Name it and add expenses as you go.');
  };
  const renameTrip = (name: string) => setStore(current => ({ ...current, trips: current.trips.map(trip => trip.id === currentTrip.id ? { ...trip, name } : trip) }));
  const deleteCurrentTrip = () => {
    if (store.trips.length === 1) { setNotice('Keep at least one trip. Start a new trip before removing this one.'); return; }
    if (!confirm(`Delete “${currentTrip.name || 'Untitled trip'}” and its saved expenses?`)) return;
    const trips = store.trips.filter(trip => trip.id !== currentTrip.id);
    const nextReceipts = new Map(receiptsByTrip); nextReceipts.delete(currentTrip.id); setReceiptsByTrip(nextReceipts);
    setStore({ version: 2, activeTripId: trips[0].id, trips });
    void deleteTripReceipts(currentTrip.id).catch(() => setNotice('Trip deleted, but its saved receipt files could not be removed.'));
    setErrors({}); setNotice('Trip deleted.');
  };
  const showValidationErrors = (found: Record<string, string>) => {
    setErrors(found);
    if (Object.keys(found).length) {
      setNotice('Review the highlighted fields before downloading.');
      window.requestAnimationFrame(() => {
        const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
        invalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        invalid?.focus();
      });
      return false;
    }
    return true;
  };
  const createPdfArtifact = async () => {
    if (!showValidationErrors(validateReport(report))) return false;
    try {
      const { makePdf } = await import('./lib/pdf');
      const { bytes, included } = await makePdf(report, receipts, includeReceipts, currentTrip.name);
      const blob = new Blob([Uint8Array.from(bytes).buffer as ArrayBuffer], { type: 'application/pdf' });
      if (pdfDownload) URL.revokeObjectURL(pdfDownload.url);
      const objectUrl = URL.createObjectURL(blob);
      const filename = reportFilename(report.employee, currentTrip.name);
      setPdfDownload({ url: objectUrl, filename });
      return { blob, filename, objectUrl, includedCount: included.length, receiptCount: [...receipts.values()].flat().length };
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'PDF generation failed. Please try again.');
      return false;
    }
  };
  const downloadArtifact = (artifact: { objectUrl: string; filename: string }) => {
      const anchor = document.createElement('a');
      anchor.href = artifact.objectUrl;
      anchor.download = artifact.filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
  };
  const downloadPdf = async () => {
    const artifact = await createPdfArtifact();
    if (!artifact) return false;
    downloadArtifact(artifact);
    const receiptMessage = includeReceipts ? `${artifact.includedCount} receipt file${artifact.includedCount === 1 ? '' : 's'} included in the PDF. ` : artifact.receiptCount ? 'Remember to attach original receipts separately. ' : '';
      setNotice(`${receiptMessage}Your PDF is ready. If it did not download automatically, use the link below.`);
      return true;
  };
  const sharePdf = async () => {
    const artifact = await createPdfArtifact();
    if (!artifact) return;
    const file = new File([artifact.blob], artifact.filename, { type: 'application/pdf' });
    const subject = `WRLC Expense Report ${report.reportNumber} — ${currentTrip.name || 'Trip'}`;
    const body = [
      'Hello,', '',
      `Please find attached my expense report for ${currentTrip.name || 'this trip'}.`,
      `Employee: ${report.employee}`,
      `Employee email: ${report.employeeEmail}`,
      `Total due: $${(totals.balanceDue / 100).toFixed(2)}`,
    ].join('\n');
    if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
      downloadArtifact(artifact);
      setNotice('This browser cannot share PDF attachments. The PDF was downloaded; use the Gmail draft option to prepare an addressed message.');
      return;
    }
    try {
      await navigator.share({ files: [file], title: subject, text: body });
      setNotice('PDF ready to share. Choose an email app and add the recipient; the subject and message are suggested where supported.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setNotice('PDF sharing was canceled.');
        return;
      }
      downloadArtifact(artifact);
      setNotice('The share sheet could not open. The PDF was downloaded; use the Gmail draft option to prepare an addressed message.');
    }
  };
  const prepareGmailDraft = async () => {
    if (!showValidationErrors(validateReport(report))) return;
    if (!accountingEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountingEmail)) {
      setNotice('Enter a valid accounting email address before preparing the Gmail draft.');
      return;
    }
    // Open a tab synchronously from the click so browser popup blockers allow the Gmail draft.
    const gmailTab = window.open('about:blank', '_blank');
    if (!gmailTab) {
      setNotice('Your browser blocked the Gmail tab. Allow pop-ups for this site, then try again.');
      return;
    }
    gmailTab.opener = null;
    if (!await downloadPdf()) { gmailTab.close(); return; }
    const subject = `WRLC Expense Report ${report.reportNumber} — ${currentTrip.name || 'Trip'}`;
    const body = [
      'Hello,', '',
      `Please find my expense report for ${currentTrip.name || 'this trip'} attached.`,
      `Employee: ${report.employee}`,
      `Employee email: ${report.employeeEmail}`,
      `Total due: $${(totals.balanceDue / 100).toFixed(2)}`,
      '', 'Please attach the downloaded PDF before sending this message.',
    ].join('\n');
    const composeUrl = new URL('https://mail.google.com/mail/');
    composeUrl.searchParams.set('view', 'cm');
    composeUrl.searchParams.set('fs', '1');
    composeUrl.searchParams.set('to', accountingEmail.trim());
    composeUrl.searchParams.set('su', subject);
    composeUrl.searchParams.set('body', body);
    gmailTab.location.href = composeUrl.toString();
    setNotice('Gmail draft prepared. If the PDF did not download automatically, use the PDF link below. Attach the PDF before sending.');
  };
  const saveDraft = () => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(store)); setNotice('Trips saved on this device.'); }
    catch { setNotice('Could not save trips. Export a JSON copy instead.'); }
  };
  const restoreDraft = () => {
    try { setStore(loadStoreWithProfile()); setErrors({}); setNotice('Saved trips and receipts restored.'); }
    catch { setNotice('No saved trips are available on this device.'); }
  };
  const exportTrips = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'WRLC-Expense-Trips.json'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const importTrips = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { setStore(fillBlankEmployeeDetails(importTripStore(String(reader.result)), profile)); setErrors({}); setNotice('Trips imported. Existing locally saved receipts remain available for matching trips.'); }
      catch { setNotice('That trip file is not valid. Your current trips are unchanged.'); }
    };
    reader.readAsText(file);
  };
  const deleteExpense = (row: Expense, index: number) => {
    setPendingDelete({ row, index, receipts: receipts.get(row.id) ?? [] });
    updateCurrentReport(current => ({ ...current, expenses: current.expenses.filter(expense => expense.id !== row.id) }));
    changeReceipts(current => { const next = new Map(current); next.delete(row.id); return next; });
    void deleteExpenseReceipts(currentTrip.id, row.id).catch(() => setNotice('Expense removed, but its receipt files could not be removed from this device.'));
  };
  const undoDelete = () => {
    if (!pendingDelete) return;
    updateCurrentReport(current => { const expenses = [...current.expenses]; expenses.splice(Math.min(pendingDelete.index, expenses.length), 0, pendingDelete.row); return { ...current, expenses }; });
    changeReceipts(current => new Map(current).set(pendingDelete.row.id, pendingDelete.receipts));
    void Promise.all(pendingDelete.receipts.map(receipt => saveReceipt(currentTrip.id, pendingDelete.row.id, receipt))).catch(() => setNotice('Expense restored, but its receipts could not be saved again.'));
    setPendingDelete(null);
  };
  const sortRows = () => updateCurrentReport(current => ({ ...current, expenses: [...current.expenses].sort((a, b) => !a.date ? 1 : !b.date ? -1 : a.date.localeCompare(b.date)) }));
  const setActiveTrip = (id: string) => { setStore(current => ({ ...current, activeTripId: id })); setErrors({}); setPendingDelete(null); };
  const clearLocalData = () => {
    if (!confirm('Clear all trips and remove their local browser data?')) return;
    const trip = createTrip();
    trip.report.employee = profile.name;
    trip.report.employeeEmail = profile.email;
    trip.report.reportNumber = makeReportId(trip.report.submittedDate, profile.name);
    setStore({ version: 2, activeTripId: trip.id, trips: [trip] });
    setReceiptsByTrip(new Map()); localStorage.removeItem(DRAFT_KEY); setErrors({}); setNotice('Local trip data cleared.');
    void clearReceiptStorage().catch(() => setNotice('Trips cleared, but saved receipt files could not be removed.'));
  };

  return <main className="shell">
    <header className="topbar"><img className="brand-mark" src={logoUrl} alt="WRLC logo"/><div><div className="brand-overline">WASHINGTON RESEARCH LIBRARY CONSORTIUM</div><div className="brand-sub">Staff tools</div></div><nav className="site-nav" aria-label="Main navigation"><button type="button" className={page === 'report' ? 'active' : ''} onClick={() => navigate('report')} aria-current={page === 'report' ? 'page' : undefined}>Expense report</button><button type="button" className={page === 'settings' ? 'active' : ''} onClick={() => navigate('settings')} aria-current={page === 'settings' ? 'page' : undefined}><SettingsIcon size={15}/>Settings</button></nav><a className="home-link" aria-label="Staff homepage" title="Staff homepage" href="https://wrlc2k.sharepoint.com/sites/WRLCStaff2/SitePages/Home.aspx"><House size={18}/><span className="sr-only">Staff homepage</span></a></header>
    {page === 'settings' ? <>
      <div aria-live="polite" role="status" className={`notice ${notice ? 'notice-visible' : ''}`}>{notice}</div>
      <div className="page-title"><div><p className="eyebrow">PREFERENCES · THIS DEVICE</p><h1>Settings</h1><p className="lede">Manage your saved employee details, trips, and app installation.</p></div></div>
      <PrivacyNotice/>
      <div className="settings-layout">
        <section className="card settings-card"><div className="section-head"><div><span className="step">01</span><h2>Employee information</h2></div></div><p className="settings-copy">Save your name and email here to sync them to every trip. Changes made in an expense report also update these saved details.</p><div className="settings-fields"><label>Your name<input autoComplete="name" value={profileDraft.name} onChange={event => updateSavedProfile('name', event.target.value)}/></label><label>Your email<input type="email" autoComplete="email" value={profileDraft.email} onChange={event => updateSavedProfile('email', event.target.value)}/></label></div><div className="settings-profile-actions"><button className="btn primary" onClick={saveSettingsProfile}>Save and sync employee information</button>{(profileDraft.name !== profile.name || profileDraft.email !== profile.email) && <span role="status">Unsaved changes</span>}</div></section>
        <section className="card settings-card"><div className="section-head"><div><span className="step">02</span><h2>Trip data</h2></div></div><p className="settings-copy">Trips autosave in this browser. Export a copy to move your trip forms to another device. Receipt files stay with the browser and are not included in the export.</p><div className="settings-actions"><button className="btn secondary" onClick={restoreDraft}><RotateCcw/>Restore trips</button><button className="btn secondary" onClick={saveDraft}>Save trips</button><button className="btn secondary" onClick={exportTrips}><FileDown/>Export trips</button><button className="btn secondary" onClick={() => importInput.current?.click()}>Import trips</button><input ref={importInput} hidden type="file" accept="application/json,.json" onChange={event => { importTrips(event.target.files?.[0]); event.currentTarget.value = ''; }}/><button className="btn text-btn" onClick={clearLocalData}><Trash2/>Clear trip data</button></div></section>
        <section className="card settings-card"><div className="section-head"><div><span className="step">03</span><h2>Install this app</h2></div></div><p className="settings-copy">Install WRLC Expense Report from your browser’s menu to add it to your home screen or desktop. The app shell is cached for offline use; trip details and receipts remain saved on this device.</p></section>
      </div>
      <footer className="bottom-actions"><span>{store.trips.length} trip{store.trips.length === 1 ? '' : 's'} autosaved to this browser.</span></footer>
    </> : <>
    <div className="page-title"><div><p className="eyebrow">FINANCE · STAFF FORM</p><h1>Expense report</h1><p className="lede">Keep expenses organized by trip, then download your report when the trip is complete.</p></div></div>
    <div aria-live="polite" role="status" className={`notice ${notice ? 'notice-visible' : ''}`}>{notice}</div>
    <section className="trip-bar card"><div className="trip-select">{store.trips.length > 1 && <label htmlFor="active-trip">Current trip<select id="active-trip" value={currentTrip.id} onChange={event => setActiveTrip(event.target.value)}>{store.trips.map((trip,index)=><option key={trip.id} value={trip.id}>{trip.name.trim() || `Untitled trip ${index+1}`}</option>)}</select></label>}<label htmlFor="trip-name">Trip name<input id="trip-name" value={currentTrip.name} onChange={event => renameTrip(event.target.value)} placeholder="e.g. Annual conference · Chicago" maxLength={100}/></label></div><div className="trip-actions"><button className="btn secondary" onClick={createNewTrip}><Plus/>New trip</button><button className="btn text-btn" onClick={deleteCurrentTrip}><Trash2/>Delete trip</button><span>{store.trips.length} trip{store.trips.length===1?'':'s'} saved here</span></div></section>
    <div className="layout"><div className="form-column">
      <section className="card"><div className="section-head"><div><span className="step">01</span><h2>Employee information</h2></div><span className="report-tag">{report.reportNumber}</span></div><div className="field-grid"><label>Employee name<input value={report.employee} onChange={event=>updateEmployeeField('employee',event.target.value)} aria-invalid={!!errors.employee} aria-describedby={errors.employee?'error-employee':undefined}/>{errors.employee&&<small id="error-employee" role="alert" className="error">{errors.employee}</small>}</label><label>Employee email<input type="email" autoComplete="email" placeholder="name@example.org" value={report.employeeEmail} onChange={event=>updateEmployeeField('employeeEmail',event.target.value)} aria-invalid={!!errors.employeeEmail} aria-describedby={errors.employeeEmail?'error-employee-email':undefined}/>{errors.employeeEmail&&<small id="error-employee-email" role="alert" className="error">{errors.employeeEmail}</small>}</label><label>Date submitted<input type="date" value={report.submittedDate} onChange={event=>updateSubmittedDate(event.target.value)}/></label></div></section>
      <section className="card"><div className="section-head"><div><span className="step">02</span><h2>Expenses</h2></div><button className="btn small secondary" onClick={sortRows}><ArrowDownWideNarrow/>Sort by date</button></div><div className="table-head"><span>Date</span><span>Expense description / business purpose</span><span>Expense type</span><span>Amount</span><span>Receipts</span><span></span></div>
        {report.expenses.map((row,index)=><ExpenseRow key={row.id} expense={row} index={index} errors={errors} receipts={receipts.get(row.id)||[]} onUpdate={updateExpense} onAttach={addReceipt} onPreview={openPreview} onRemoveReceipt={receiptId=>removeReceipt(row.id, receiptId)} onDuplicate={()=>updateCurrentReport(current=>({ ...current, expenses:[...current.expenses.slice(0,index+1),{...row,id:crypto.randomUUID()},...current.expenses.slice(index+1)]}))} onDelete={()=>deleteExpense(row,index)}/>)}
        <div className="table-footer"><button className="btn secondary" onClick={()=>updateCurrentReport(current=>({...current,expenses:[...current.expenses,newExpense()]}))}><Plus/>Add expense</button><span>Receipt files are saved on this device and included in the PDF when selected.</span></div>{errors.expenses&&<small role="alert" className="error">{errors.expenses}</small>}</section>
      <details className="card accordion"><summary className="accordion-summary"><span className="step">03</span><h2>Advances from WRLC</h2></summary><div className="accordion-content"><label className="prior-field">Balance from last report <div className="currency-field"><span>$</span><input inputMode="decimal" placeholder="0.00" value={report.priorBalance} onChange={event=>setReportField('priorBalance',event.target.value)} aria-invalid={!!errors.priorBalance}/></div>{errors.priorBalance&&<small role="alert" className="error">{errors.priorBalance}</small>}</label><div className="advance-label"><span>Description</span><span>Amount</span><span></span></div>{report.advances.map((advance,index)=><div className="advance-row" key={advance.id}><input aria-label={`Advance ${index+1} description`} placeholder="Cash, tickets, or other advance" value={advance.description} onChange={event=>updateAdvance(advance.id,'description',event.target.value)}/><div><div className="currency-field"><span>$</span><input aria-label={`Advance ${index+1} amount`} inputMode="decimal" placeholder="0.00" value={advance.amount} onChange={event=>updateAdvance(advance.id,'amount',event.target.value)} aria-invalid={!!errors[`advance-${advance.id}`]}/></div>{errors[`advance-${advance.id}`]&&<small role="alert" className="error">{errors[`advance-${advance.id}`]}</small>}</div><button className="icon-btn danger" aria-label="Remove advance" onClick={()=>setReportField('advances',report.advances.filter(row=>row.id!==advance.id))}><Trash2/></button></div>)}<button className="btn secondary" onClick={()=>setReportField('advances',[...report.advances,newAdvance()])}><Plus/>Add advance</button></div></details>
      <section className="card"><div className="section-head"><div><span className="step">04</span><h2>Certification</h2></div></div><p className="cert-statement">“I hereby certify that the above expenditures represent legitimate business expenses incurred by me.”</p><label className="checkline"><input type="checkbox" checked={report.certified} onChange={event=>{setReportField('certified',event.target.checked);setReportField('certificationDate',new Date().toLocaleDateString('en-CA'))}}/>I certify that the information entered in this expense report is complete and accurate.</label>{errors.certified&&<small role="alert" className="error">{errors.certified}</small>}<p className="signature-line">Typed name: <strong>{report.employee||'—'}</strong><span>Certification date: {report.certified?report.certificationDate:'—'}</span></p><div className="notes"><strong>Notes</strong><ol><li>List expenses chronologically.</li><li>Attach receipts in the order listed.</li><li>Balance will be carried forward only if advances exceed expenses.</li></ol></div></section>
    </div>
    <div className="side-column"><FinancialSummary expenses={totals.allExpenses} advances={totals.totalAdvances} balance={totals.balanceDue}/><section className="card submit-card"><p className="eyebrow">READY TO SUBMIT?</p><h2>Prepare this trip</h2><label className="checkline"><input type="checkbox" checked={includeReceipts} onChange={event=>setIncludeReceipts(event.target.checked)}/>Include receipts in PDF</label>{!includeReceipts&&<p className="hint">Remember to attach original receipt files separately.</p>}<button className="btn primary full" onClick={downloadPdf}><Download/>Download Expense Report PDF</button>{pdfDownload&&<a className="btn secondary full pdf-download-link" href={pdfDownload.url} download={pdfDownload.filename}><Download/>Download PDF now</a>}<div className="email-field"><label htmlFor="accounting-email">Accounting email</label><input id="accounting-email" type="email" placeholder="Enter the address provided by WRLC" value={accountingEmail} onChange={event=>setAccountingEmail(event.target.value)}/></div><button className="btn secondary full" onClick={sharePdf}><Share2/>Share PDF</button><p className="hint">Shares the PDF through your device's share menu. The subject and message are suggested where supported; enter the recipient in your email app.</p><button className="btn secondary full" onClick={prepareGmailDraft}><Mail/>Download PDF &amp; prepare Gmail draft</button><p className="hint">Gmail opens with the accounting address, subject, and message filled in. Attach the downloaded PDF before sending.</p><div className="approval-mini"><FileText/><span>Downloads a PDF for this trip only.</span></div></section></div></div>
    {preview&&previewUrl&&<div className="modal-backdrop" role="presentation" onClick={closePreview}><div className="preview-modal" role="dialog" aria-modal="true" aria-label={`Receipt preview: ${preview.file.name}`} onClick={event=>event.stopPropagation()}><div className="preview-head"><strong>{preview.file.name}</strong><button className="icon-btn" aria-label="Close preview" onClick={closePreview}><X/></button></div><img src={previewUrl} alt={`Receipt ${preview.file.name}`}/></div></div>}
    <footer className="bottom-actions"><span>{store.trips.length} trip{store.trips.length===1?'':'s'} autosaved to this browser.</span>{pendingDelete&&<p role="status" className="status">Expense removed. <button className="link-button" onClick={undoDelete}>Undo</button></p>}</footer>
    </>}
  </main>;
}
