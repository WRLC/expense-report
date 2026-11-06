import { jsPDF } from 'jspdf'; import { PDFDocument, type PDFEmbeddedPage } from 'pdf-lib'; import type { Report, Receipt } from '../types/expenseReport'; import { dollars, getTotals, parseCents } from './calculations';
const date=(v:string)=>v?new Date(v+'T12:00:00').toLocaleDateString('en-US'):'—';
const pdfSafeText=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').replace(/[\u00a0\u202f]/g,' ').replace(/[–—−]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/·/g,'-').replace(/[^\x20-\x7e]/g,'?');
export const hasAdvanceValues=(report:Report)=>((parseCents(report.priorBalance)??0)!==0)||report.advances.some(a=>a.description.trim()||a.amount.trim());
async function embedReceiptImage(document:PDFDocument,file:File){
 const original=new Uint8Array(await file.arrayBuffer());
 try{return file.type==='image/png'?await document.embedPng(original):await document.embedJpg(original)}
 catch{
  let source:ImageBitmap|HTMLImageElement;let bitmap:ImageBitmap|undefined;let imageUrl='';
  try{
   if(typeof createImageBitmap==='function'){
    try{bitmap=await createImageBitmap(file);source=bitmap}
    catch{imageUrl=URL.createObjectURL(file);const image=new Image();image.src=imageUrl;await image.decode();source=image}
   }else{
    imageUrl=URL.createObjectURL(file);const image=new Image();image.src=imageUrl;await image.decode();source=image;
   }
   const width='naturalWidth'in source?source.naturalWidth:source.width,height='naturalHeight'in source?source.naturalHeight:source.height;
   if(!width||!height)throw new Error('Image has no readable dimensions.');
   const scale=Math.min(1,1800/width,2400/height);const canvas=globalThis.document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
   const context=canvas.getContext('2d');if(!context)throw new Error('Image conversion is unavailable in this browser.');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(source,0,0,canvas.width,canvas.height);
   const jpeg=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image conversion failed.')),'image/jpeg',0.9));
   return await document.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
  }catch(error){throw new Error(`This image could not be decoded or converted: ${error instanceof Error?error.message:'unsupported image format'}`)}
  finally{bitmap?.close();if(imageUrl)URL.revokeObjectURL(imageUrl)}
 }
}
export async function makePdf(report:Report, receipts:Map<string,Receipt[]>, include:boolean, tripName=''){
 const pdf=new jsPDF({unit:'pt',format:'letter'}), left=44, right=568; let y=48;
 const line=(yy:number)=>{pdf.setDrawColor(210,218,226);pdf.setLineWidth(.6);pdf.line(left,yy,right,yy)};
 const section=(title:string)=>{if(y>700){pdf.addPage();y=46}pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.setTextColor(24,62,104);pdf.text(title,left,y); y+=16;line(y);y+=18};
 pdf.setFont('helvetica','bold');pdf.setFontSize(21);pdf.setTextColor(30,43,58);pdf.text('WRLC Expense Report',left,y);pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.text(`Report ${report.reportNumber}`,right,y,{align:'right'});y+=20;
 pdf.setFontSize(10);pdf.text(`Trip: ${tripName||'Untitled trip'}`,left,y);pdf.text(`Date submitted: ${date(report.submittedDate)}`,right,y,{align:'right'});y+=16;pdf.text(`Employee: ${report.employee||'—'}`,left,y);if(report.employeeEmail)pdf.text(`Employee email: ${report.employeeEmail}`,right,y,{align:'right'});y+=25;
 section('EXPENSES');pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.text('DATE',left,y);pdf.text('DESCRIPTION / BUSINESS PURPOSE',left+82,y);pdf.text('TYPE',425,y);pdf.text('AMOUNT',right,y,{align:'right'});y+=13;
 const filled=report.expenses.filter(x=>x.date||x.description||x.type||x.amount);
 for(const ex of filled){const desc=pdf.splitTextToSize(ex.description||'—',270) as string[];const h=Math.max(38,desc.length*11+27);if(y+h>735){pdf.addPage();y=45}pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(date(ex.date),left,y);pdf.text(desc,left+82,y);pdf.text(ex.type||'—',425,y);pdf.text(dollars(parseCents(ex.amount)??0),right,y,{align:'right'});line(y+desc.length*11+9);y+=h}
 const totals=getTotals(filled,report.priorBalance,report.advances);y+=8;pdf.setFont('helvetica','bold');pdf.text('ALL EXPENSES',left+300,y);pdf.text(dollars(totals.allExpenses),right,y,{align:'right'});y+=21;
 const advances=report.advances.filter(a=>a.description.trim()||a.amount.trim());if(hasAdvanceValues(report)){section('ADVANCES RECEIVED FROM WRLC');pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text('Balance from last report',left,y);pdf.text(dollars(parseCents(report.priorBalance)??0),right,y,{align:'right'});y+=16;for(const a of advances){pdf.text(a.description||'Advance',left,y);pdf.text(dollars(parseCents(a.amount)??0),right,y,{align:'right'});y+=15}pdf.setFont('helvetica','bold');pdf.text('LESS ADVANCES',left+300,y);pdf.text(dollars(totals.totalAdvances),right,y,{align:'right'});y+=24}
 section('BALANCE DUE');const status=totals.balanceDue>0?'WRLC owes employee':totals.balanceDue<0?'Employee owes WRLC':'Account balanced';pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.text(status,left,y);pdf.text(dollars(totals.balanceDue),right,y,{align:'right'});y+=35;
 section('CERTIFICATION');pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text('“I hereby certify that the above expenditures represent legitimate business expenses incurred by me.”',left,y,{maxWidth:right-left});y+=25;pdf.text(`I certify that the information entered in this expense report is complete and accurate.`,left,y,{maxWidth:right-left});y+=16;pdf.text(`Typed name: ${report.employee||'—'}     Certification date: ${date(report.certificationDate)}`,left,y);y+=34;
 // Reserve a clear, printable processing area for HR. Keep each rule below its label.
 if(y+102>740){pdf.addPage();y=48}
 section('HR PROCESSING');
 pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(30,43,58);
 pdf.text('HR signature:',left,y);pdf.line(left+58,y+2,left+330,y+2);
 pdf.text('Date:',left+354,y);pdf.line(left+382,y+2,right,y+2);
 y+=28;pdf.rect(left,y-8,10,10);pdf.text('Paid',left+16,y);y+=20;

 const main=pdf.output('arraybuffer');const merged=await PDFDocument.load(main); const included:string[]=[];
 if(include){
  const attachmentTiles:{image?:Awaited<ReturnType<typeof embedReceiptImage>>;pdfPage?:PDFEmbeddedPage;width:number;height:number;label:string}[]=[];
  for(const ex of filled){for(const receipt of receipts.get(ex.id)||[]){
   try{
    const label=`${date(ex.date)} · ${ex.description||'Expense'} · ${receipt.file.name}`;
    if(receipt.file.type==='application/pdf'){
     const sourcePages=await merged.embedPdf(new Uint8Array(await receipt.file.arrayBuffer()));
     sourcePages.forEach((page,index)=>attachmentTiles.push({pdfPage:page,width:page.width,height:page.height,label:`${label}${sourcePages.length>1?` (page ${index+1})`:''}`}));
    }else{
     const image=await embedReceiptImage(merged,receipt.file);
     attachmentTiles.push({image,width:image.width,height:image.height,label});
    }
    included.push(`${ex.description||'Expense'} — ${receipt.file.name}`);
   }catch(error){throw new Error(`Could not include receipt “${receipt.file.name}”. ${error instanceof Error?error.message:'The file format is not supported.'}`)}
  }}
  const margin=36,gap=18,cellWidth=(612-margin*2-gap)/2,cellHeight=(720-gap)/2;
  for(let start=0;start<attachmentTiles.length;start+=4){
   const page=merged.addPage([612,792]);
   attachmentTiles.slice(start,start+4).forEach(({image,pdfPage,width:sourceWidth,height:sourceHeight,label},index)=>{
    const column=index%2,row=Math.floor(index/2),x=margin+column*(cellWidth+gap),bottom=margin+(1-row)*(cellHeight+gap);
    const fullLabel=pdfSafeText(label),safeLabel=fullLabel.length>62?`${fullLabel.slice(0,59)}...`:fullLabel,scale=Math.min((cellWidth-12)/sourceWidth,(cellHeight-38)/sourceHeight);
    const width=sourceWidth*scale,height=sourceHeight*scale;
    page.drawText(safeLabel,{x:x+6,y:bottom+cellHeight-16,size:8,maxWidth:cellWidth-12});
    const drawOptions={x:x+(cellWidth-width)/2,y:bottom+8+(cellHeight-38-height)/2,width,height};
    if(image)page.drawImage(image,drawOptions);else if(pdfPage)page.drawPage(pdfPage,drawOptions);
   });
  }
 }
 return {bytes:await merged.save(),included};
}
