/** Real SQLite invoices, demonstrational payments ONLY. Never accepts payment credentials. */
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {db,transaction} from '@/server/careindex-db';
import {sessionUser,can} from '@/server/careindex-auth';
import {trace,step,mutationOrigin,finish,failure,jsonBody,str,HttpError} from '@/server/careindex-trace';
export const runtime='nodejs';export const dynamic='force-dynamic';

type Invoice={id:string;invoiceNumber:string;bookingId:string;amountCents:number;currency:'PKR';status:string;createdAt:string;updatedAt:string;paidAt:string|null;date:string;time:string;bookingStatus:string;doctor:string;specialty:string;patientId:number;patientName:string;events?:{kind:string;amountCents:number;occurredAt:string}[]};
const sql=`SELECT i.id,i.invoice_number AS invoiceNumber,i.booking_id AS bookingId,i.amount_cents AS amountCents,i.currency,i.status,i.created_at AS createdAt,i.updated_at AS updatedAt,i.paid_at AS paidAt,
 b.date,b.time,b.status AS bookingStatus,d.name AS doctor,d.specialty,b.patient_id AS patientId,(p.first_name||' '||p.last_name) AS patientName
 FROM invoices i JOIN booked_slots b ON b.id=i.booking_id JOIN doctors d ON d.id=b.doctor_id JOIN patients p ON p.id=b.patient_id`;
const getInvoice=(id:string)=>db().prepare(sql+' WHERE i.id=?').get(id) as Invoice|undefined;
function checkedUser(req:NextRequest,t:ReturnType<typeof trace>){
 const user=sessionUser(req);t.user=user;step(t,'SESSION','Validated HTTP-only session cookie against server-side session table');
 if(!user)throw new HttpError(401,'Sign in to continue.');
 if(user.role!=='PATIENT'&&!can(user.role,'read'))throw new HttpError(403,'Access not permitted.');
 step(t,'RBAC',user.role==='PATIENT'?'Patient invoices are restricted by patient_accounts ownership':'Approved clinic staff may view fictional invoice records');return user;
}
function ownedInvoice(user:ReturnType<typeof checkedUser>,invoice:Invoice|undefined){
 if(!invoice)throw new HttpError(404,'Invoice not found.');
 if(user.role==='PATIENT'){
  const ownership=db().prepare('SELECT 1 FROM patient_accounts WHERE user_id=? AND patient_id=?').get(user.id,invoice.patientId);
  if(!ownership)throw new HttpError(404,'Invoice not found.');
 }
 return invoice;
}
export async function GET(req:NextRequest){const t=trace(req,'billing','VIEW INVOICES');try{
 const user=checkedUser(req,t),id=req.nextUrl.searchParams.get('id');
 if(id){if(!/^[a-f0-9-]{36}$/i.test(id))throw new HttpError(400,'Invalid invoice ID.');const invoice=ownedInvoice(user,getInvoice(id));
  const events=db().prepare('SELECT kind,amount_cents AS amountCents,occurred_at AS occurredAt FROM billing_events WHERE invoice_id=? ORDER BY occurred_at').all(id);
  step(t,'SQL','Loaded one authorized invoice and its synthetic-only payment ledger');return finish(t,200,{invoice:{...invoice,events}});
 }
 let rows:Invoice[];
 if(user.role==='PATIENT'){
  rows=db().prepare(sql+' JOIN patient_accounts pa ON pa.patient_id=b.patient_id WHERE pa.user_id=? ORDER BY i.created_at DESC LIMIT 200').all(user.id) as unknown as Invoice[];
  step(t,'OWNERSHIP','Filtered invoices by signed-in patient account in SQL—not a client-provided patient ID');
 }else{
  rows=db().prepare(sql+' ORDER BY i.created_at DESC LIMIT 200').all() as unknown as Invoice[];
  step(t,'SQL','Loaded at most 200 clinic invoice summaries');
 }
 const summary=rows.reduce((a,r)=>{a.invoices++;if(r.status==='OPEN')a.outstandingCents+=r.amountCents;if(['PAID_DEMO','REFUND_DUE'].includes(r.status))a.simulatedCollectedCents+=r.amountCents;if(r.status==='REFUND_DUE')a.refundDueCents+=r.amountCents;return a;},{invoices:0,outstandingCents:0,simulatedCollectedCents:0,refundDueCents:0});
 return finish(t,200,{invoices:rows,summary,demoOnly:true});
 }catch(e){return failure(t,e);}}

export async function POST(req:NextRequest){const t=trace(req,'billing','SIMULATE PAYMENT');try{
 mutationOrigin(req,t);const user=checkedUser(req,t);if(user.role!=='PATIENT')throw new HttpError(403,'Only the linked patient may simulate checkout.');
 const body=await jsonBody(req,t);if(body.action!=='simulate-payment')throw new HttpError(400,'Unsupported billing action.');
 const id=str(body.invoiceId,'Invoice ID',70);
 const result=transaction(()=>{
  step(t,'TRANSACTION','BEGIN IMMEDIATE locks the atomic billing state transition');
  const invoice=ownedInvoice(user,getInvoice(id));step(t,'OWNERSHIP','Confirmed invoice belongs to the signed-in fictional patient');
  if(invoice.status==='PAID_DEMO'){step(t,'IDEMPOTENCY','Already simulated as paid; returned existing result without a second ledger entry');return{ok:true,alreadyPaid:true};}
  if(invoice.status!=='OPEN'||invoice.bookingStatus!=='Scheduled')throw new HttpError(409,'This invoice is not eligible for checkout.');
  const now=new Date().toISOString();
  db().prepare("INSERT INTO billing_events(id,invoice_id,kind,amount_cents,occurred_at) VALUES(?,?,'PAYMENT_DEMO',?,?)").run(randomUUID(),id,invoice.amountCents,now);
  db().prepare("UPDATE invoices SET status='PAID_DEMO',paid_at=?,updated_at=? WHERE id=? AND status='OPEN'").run(now,now,id);
  step(t,'PAYMENT SIMULATION','Created a synthetic ledger event—NO payment provider, card data or real charge');
  step(t,'SQL CONSTRAINT','Unique invoice/payment-event constraint prevents duplicate simulated captures');
  return{ok:true,alreadyPaid:false};
 });step(t,'COMMIT','Payment simulation was durably recorded in SQLite');return finish(t,200,{...result,invoice:getInvoice(id),traceId:t.id,demoOnly:true});
 }catch(e){return failure(t,e);}}

export async function PATCH(req:NextRequest){const t=trace(req,'billing','SIMULATE REFUND');try{
 mutationOrigin(req,t);const user=checkedUser(req,t);
 if(user.role!=='ADMIN')throw new HttpError(403,'Administrator permission required for fictional refund completion.');
 const body=await jsonBody(req,t);if(body.action!=='simulate-refund')throw new HttpError(400,'Unsupported refund action.');
 const id=str(body.invoiceId,'Invoice ID',70);
 const result=transaction(()=>{
  step(t,'TRANSACTION','BEGIN IMMEDIATE for refund state transition');const invoice=getInvoice(id);if(!invoice)throw new HttpError(404,'Invoice not found.');
  if(invoice.status==='REFUNDED_DEMO'){step(t,'IDEMPOTENCY','Already refunded in the simulation; no second event');return{ok:true,alreadyRefunded:true};}
  if(invoice.status!=='REFUND_DUE')throw new HttpError(409,'Only cancelled paid demonstration invoices can be refunded.');
  const now=new Date().toISOString();
  db().prepare("INSERT INTO billing_events(id,invoice_id,kind,amount_cents,occurred_at) VALUES(?,?,'REFUND_DEMO',?,?)").run(randomUUID(),id,invoice.amountCents,now);
  db().prepare("UPDATE invoices SET status='REFUNDED_DEMO',updated_at=? WHERE id=?").run(now,id);
  step(t,'REFUND SIMULATION','Recorded simulated refund ledger event. No external money moved.');return{ok:true,alreadyRefunded:false};
 });step(t,'COMMIT','Synthetic refund transition committed');return finish(t,200,{...result,invoice:getInvoice(id),traceId:t.id,demoOnly:true});
 }catch(e){return failure(t,e);}}
