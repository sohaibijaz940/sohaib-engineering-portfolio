import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {db,transaction} from '@/server/careindex-db';
import {issueInvoice,updateInvoiceForReschedule,voidOrRefundDue} from '@/server/careindex-billing';
import {sessionUser} from '@/server/careindex-auth';
import {trace,step,requireAccess,mutationOrigin,finish,failure,jsonBody,str,HttpError} from '@/server/careindex-trace';
export const runtime='nodejs'; export const dynamic='force-dynamic';
const hours=Array.from({length:24},(_,i)=>`${String(8+Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`);
function clinicClock(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const get=(key:string)=>parts.find(x=>x.type===key)?.value??'';return{date:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`};}
function patientForUser(id:string){const r=db().prepare('SELECT patient_id AS patientId FROM patient_accounts WHERE user_id=?').get(id) as {patientId:number}|undefined;if(!r)throw new HttpError(403,'Patient account is not linked to a fictional profile.');return r.patientId;}
function validDay(raw:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw new HttpError(400,'Date must use YYYY-MM-DD.');const d=new Date(raw+'T12:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==raw)throw new HttpError(400,'Invalid calendar date.');return d.getUTCDay();}
function slots(doctorId:string,date:string){const weekday=validDay(date),doctor=db().prepare('SELECT id,name,specialty,fee_cents AS feeCents FROM doctors WHERE id=? AND active=1').get(doctorId);if(!doctor)throw new HttpError(404,'Doctor not found.');const window=db().prepare('SELECT start_time,end_time FROM doctor_hours WHERE doctor_id=? AND weekday=?').get(doctorId,weekday) as {start_time:string;end_time:string}|undefined;
 const occupied=new Set((db().prepare("SELECT time FROM booked_slots WHERE doctor_id=? AND date=? AND status='Scheduled'").all(doctorId,date) as {time:string}[]).map(x=>x.time));return{doctor,slots:window?hours.filter(h=>h>=window.start_time&&h<window.end_time).map(time=>({time,available:!occupied.has(time)&&(date>clinicClock().date||(date===clinicClock().date&&time>clinicClock().time))})):[]};}
export async function GET(req:NextRequest){const t=trace(req,'booking','DOCTORS / AVAILABILITY');try{const user=sessionUser(req);t.user=user;if(!user)throw new HttpError(401,'Sign in to continue.');if(user.role==='PENDING')throw new HttpError(403,'Account requires staff approval.');step(t,'SESSION','Authenticated session for schedule access');step(t,'RBAC',user.role==='PATIENT'?'Patient can view public synthetic doctor availability':'Approved staff can inspect doctor availability');const date=req.nextUrl.searchParams.get('date');const id=req.nextUrl.searchParams.get('doctorId');const doctors=db().prepare('SELECT id,name,specialty,fee_cents AS feeCents FROM doctors WHERE active=1 ORDER BY name').all();step(t,'SQL','Loaded synthetic clinician profiles from the database');if(!date||!id)return finish(t,200,{doctors});const availability=slots(id,date);step(t,'INTERVAL CHECK','Compared half-hour schedule slots with active reservations; unavailable slots excluded');return finish(t,200,{doctors,...availability});}catch(e){return failure(t,e);}}
export async function POST(req:NextRequest){const t=trace(req,'booking','RESERVE SLOT');try{mutationOrigin(req,t);const user=sessionUser(req);t.user=user;if(!user)throw new HttpError(401,'Sign in to continue.');if(user.role!=='PATIENT')requireAccess(req,t,'appointments:write');else{step(t,'SESSION','Validated patient session from server-side record');step(t,'RBAC','Patient account may book only its own linked fictional profile');}const b=await jsonBody(req,t);
 const doctorId=str(b.doctorId,'Doctor ID',70),date=str(b.date,'Date',10),time=str(b.time,'Time',5),patientId=user.role==='PATIENT'?patientForUser(user.id):Number(b.patientId);
 if(!Number.isSafeInteger(patientId)||patientId<=0)throw new HttpError(400,'Valid patient ID required.');validDay(date);
 if(date<clinicClock().date)throw new HttpError(400,'Cannot reserve a past date.');
 const id=transaction(()=>{step(t,'TRANSACTION','BEGIN IMMEDIATE: concurrent writes serialize before availability check');
 const patient=db().prepare("SELECT id FROM patients WHERE id=? AND status='Active'").get(patientId);if(!patient)throw new HttpError(404,'Active synthetic patient not found.');
 const avail=slots(doctorId,date);if(!avail.slots.some(s=>s.time===time&&s.available))throw new HttpError(409,'This doctor/time is unavailable. Choose another slot.');step(t,'SCHEDULING','Compared requested interval against working hours, local clinic time and existing scheduled reservations');
 const id=randomUUID();db().prepare("INSERT INTO booked_slots(id,doctor_id,patient_id,date,time,status,created_at) VALUES(?,?,?,?,?,'Scheduled',?)").run(id,doctorId,patientId,date,time,new Date().toISOString());step(t,'SQL UNIQUE INDEX','Persisted reservation protected by a unique active doctor/date/time constraint');issueInvoice(db(),id);step(t,'INVOICE','Created one PKR invoice with a server-side fee snapshot in the booking transaction');return id;});step(t,'COMMIT','Booking successfully committed to SQLite');return finish(t,201,{ok:true,id,traceId:t.id});
 }catch(e){const code=e instanceof Error&&e.message.includes('UNIQUE constraint')?new HttpError(409,'Slot already booked.'):e;return failure(t,code);}}
export async function PATCH(req:NextRequest){const t=trace(req,'booking','MANAGE BOOKING');try{
 mutationOrigin(req,t);const user=sessionUser(req);t.user=user;if(!user)throw new HttpError(401,'Sign in to continue.');
 if(user.role!=='PATIENT')requireAccess(req,t,'appointments:write');else step(t,'RBAC','Patient changes restricted to owned future appointments');
 const b=await jsonBody(req,t);const id=str(b.id,'Booking ID',70),action=b.action==='reschedule'?'reschedule':'cancel';
 const output=transaction(()=>{
  step(t,'TRANSACTION','Started atomic booking update inside SQLite');
  const r=db().prepare('SELECT id,patient_id AS patientId,doctor_id AS doctorId,date,time,status FROM booked_slots WHERE id=?').get(id) as {id:string;patientId:number;doctorId:string;date:string;time:string;status:string}|undefined;
  if(!r)throw new HttpError(404,'Booking not found.');
  if(user.role==='PATIENT'&&r.patientId!==patientForUser(user.id)){step(t,'OWNERSHIP','Rejected change to booking belonging to another account');throw new HttpError(404,'Booking not found.');}
  step(t,'OWNERSHIP','Confirmed reservation belongs to allowed patient or authorized clinic staff');
  if(r.status!=='Scheduled')throw new HttpError(409,'Only scheduled appointments can be changed.');
  const now=clinicClock();if(r.date<now.date||(r.date===now.date&&r.time<=now.time))throw new HttpError(409,'Past or started appointments cannot be changed.');
  if(action==='cancel'){
   db().prepare("UPDATE booked_slots SET status='Cancelled' WHERE id=? AND status='Scheduled'").run(id);voidOrRefundDue(db(),id);step(t,'BILLING','Voided unpaid invoice or marked simulated payment as refund due');step(t,'SQL','Cancelled reservation and released slot under unique active-slot index');return{ok:true,action:'cancelled'};
  }
  const date=str(b.date,'Date',10),time=str(b.time,'Time',5),doctorId=str(b.doctorId,'Doctor ID',70);validDay(date);
  if(date<now.date||(date===now.date&&time<=now.time))throw new HttpError(400,'Choose a future appointment time.');
  const availability=slots(doctorId,date);
  if(!availability.slots.some(s=>s.time===time&&s.available))throw new HttpError(409,'Requested time is unavailable.');
  step(t,'INTERVAL CHECK','Validated new working hours and checked active time-slot conflicts');
  updateInvoiceForReschedule(db(),id,doctorId);step(t,'BILLING','Kept invoice amount in sync with appointment fee; blocks paid price changes');db().prepare('UPDATE booked_slots SET doctor_id=?,date=?,time=? WHERE id=?').run(doctorId,date,time,id);
  step(t,'SQL UNIQUE INDEX','Rescheduled booking inside transaction with unique active doctor/date/time constraint');return{ok:true,action:'rescheduled'};
 });step(t,'COMMIT','Booking change committed to SQLite');return finish(t,200,{...output,traceId:t.id});
 }catch(e){const err=e instanceof Error&&e.message.includes('UNIQUE constraint')?new HttpError(409,'Slot already booked.'):e instanceof Error&&e.message==='PAID_CHANGE_FEE'?new HttpError(409,'Paid demonstration invoices cannot be changed to a different consultation fee. Contact staff to handle adjustments.'):e;return failure(t,err);}}
