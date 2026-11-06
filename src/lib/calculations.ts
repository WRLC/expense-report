import type { Advance, Expense } from '../types/expenseReport';
export function parseCents(input: string): number | null {
  const s=input.trim().replace(/^\$/,''); if(!s) return 0;
  if(!/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?|\.\d{1,2})$/.test(s)) return null;
  const normalized=s.replace(/,/g,'');
  const n=Number(normalized); if(!Number.isFinite(n)||n<0||n>1_000_000_000) return null; return Math.round(n*100);
}
export const sumExpenses=(rows:Expense[])=>rows.reduce((sum,row)=>sum+(parseCents(row.amount)??0),0);
export const sumAdvances=(prior:string,rows:Advance[])=> (parseCents(prior)??0)+rows.reduce((sum,row)=>sum+(parseCents(row.amount)??0),0);
export const getTotals=(expenses:Expense[],prior:string,advances:Advance[])=>{const allExpenses=sumExpenses(expenses),totalAdvances=sumAdvances(prior,advances);return{allExpenses,totalAdvances,balanceDue:allExpenses-totalAdvances}};
export const dollars=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Math.abs(cents)/100);
