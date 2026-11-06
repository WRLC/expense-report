import type { Report } from '../types/expenseReport';
import { dollars } from './calculations';
export function buildMailto(email:string,report:Report,balanceCents:number,includeReceipts:boolean){
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid accounting email address.');
 const subject=encodeURIComponent(`WRLC Expense Report ${report.reportNumber}`);
 const body=encodeURIComponent(`Hello,\n\nPlease find my expense report attached.\n\nEmployee: ${report.employee}\nReport: ${report.reportNumber}\nBalance due: ${dollars(balanceCents)}\n\nPlease attach the downloaded PDF${includeReceipts?' (which includes any selected receipts)':' and receipts'} before sending.`);
 return `mailto:${email}?subject=${subject}&body=${body}`;
}
