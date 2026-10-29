import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {db,transaction} from '@/server/careindex-db';
import {sessionUser} from '@/server/careindex-auth';
import {trace,step,mutationOrigin,finish,failure,jsonBody,HttpError,str} from '@/server/careindex-trace';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Clinician={id:string;name:string;role:string};
type Booking={id:string;doctorId:string;patientId:number;patientName:string;date:string;time:string;status:string;checkedInAt:string|null;doctor:string;specialty:string;consultationNote:string|null};
const roles=['ADMIN','CLINICIAN','RECEPTIONIST'];
function access(req:NextRequest,t:ReturnType<typeof trace>){
 const user=sessionUser(req);t.user=user;
 step(t,'SESSION','Verified session against SQLite; anonymous access rejected');
 if(!user)throw new HttpError(401,'Sign in first.');
 if(!roles.includes(user.role))throw new HttpError(403,'Staff access required.');
 step(t,'RBAC',`${user.role} granted access to clinic scheduling`);
 return user;
}
function doctorScope(user:Clinician,selected?:string){
 if(user.role==='ADMIN'||user.role==='RECEPTIONIST')return selected||null;
 const record=db().prepare('SELECT doctor_id AS doctorId FROM doctor_assignments WHERE user_id=?').get(user.id) as {doctorId:string}|undefined;
 if(!record)throw new HttpError(403,'This clinician needs a doctor assignment. Ask an administrator to assign you in Doctor Workspace.');
 if(selected&&record.doctorId!==selected)throw new HttpError(403,'Clinicians can access only their assigned doctor schedule.');
 return record.doctorId;
}
function schedule(user:Clinician,doctorId?:string){
 const scope=doctorScope(user,doctorId);
 const rows=db().prepare(`SELECT b.id,b.doctor_id AS doctorId,b.patient_id AS patientId,
  (p.first_name||' '||p.last_name) AS patientName,b.date,b.time,b.status,b.checked_in_at AS checkedInAt,
  d.name AS doctor,d.specialty,
  (SELECT v.note FROM consultation_records c JOIN visits v ON v.id=c.visit_id WHERE c.booking_id=b.id) AS consultationNote
  FROM booked_slots b JOIN patients p ON p.id=b.patient_id JOIN doctors d ON d.id=b.doctor_id
  WHERE (? IS NULL OR b.doctor_id=?) ORDER BY b.date DESC,b.time DESC LIMIT 180`).all(scope,scope) as Booking[];
 return{scope,bookings:rows};
}
export async function GET(req:NextRequest){
 const t=trace(req,'doctor','WORKSPACE SCHEDULE');
 try{const user=access(req,t);const selected=req.nextUrl.searchParams.get('doctorId')??undefined;
  const doctors=db().prepare('SELECT id,name,specialty,fee_cents AS feeCents FROM doctors WHERE active=1 ORDER BY name').all();
  const {scope,bookings}=schedule(user,selected);
  const assignments=user.role==='ADMIN'?db().prepare(`SELECT u.id AS userId,u.name AS staffName,u.email,u.role,a.doctor_id AS doctorId
    FROM users u LEFT JOIN doctor_assignments a ON a.user_id=u.id WHERE u.role='CLINICIAN' ORDER BY u.name`).all():[];
  step(t,'SQL','Scoped doctor appointments to assigned clinician or authorized clinic staff');
  return finish(t,200,{user:{name:user.name,role:user.role},doctors,assignments,selectedDoctorId:scope,bookings});
 }catch(e){return failure(t,e);}
}
export async function POST(req:NextRequest){
 const t=trace(req,'doctor','ASSIGN CLINICIAN');
 try{mutationOrigin(req,t);const user=access(req,t);if(user.role!=='ADMIN')throw new HttpError(403,'Only administrators assign clinicians.');
  const body=await jsonBody(req,t);const userId=str(body.userId,'Clinician account',70),doctorId=str(body.doctorId,'Doctor ID',70);
  const staff=db().prepare("SELECT role FROM users WHERE id=?").get(userId) as {role:string}|undefined;
  if(!staff||staff.role!=='CLINICIAN')throw new HttpError(400,'Choose an approved clinician account.');
  if(!db().prepare('SELECT id FROM doctors WHERE id=? AND active=1').get(doctorId))throw new HttpError(404,'Doctor not found.');
  transaction(()=>db().prepare(`INSERT INTO doctor_assignments(user_id,doctor_id,assigned_at) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET doctor_id=excluded.doctor_id,assigned_at=excluded.assigned_at`).run(userId,doctorId,new Date().toISOString()));
  step(t,'TRANSACTION','Assigned clinician to a synthetic doctor profile; subsequent schedule access is server-scoped');
  return finish(t,200,{ok:true});
 }catch(e){return failure(t,e);}
}
export async function PATCH(req:NextRequest){
 const t=trace(req,'doctor','APPOINTMENT LIFECYCLE');
 try{mutationOrigin(req,t);const user=access(req,t);const body=await jsonBody(req,t);
  const id=str(body.bookingId,'Booking ID',70),action=str(body.action,'Action',24);
  if(!['check-in','complete'].includes(action))throw new HttpError(400,'Choose check-in or complete.');
  if(action==='complete'&&user.role==='RECEPTIONIST')throw new HttpError(403,'Only an assigned clinician or administrator can complete a consultation.');
  const result=transaction(()=>{
   const record=db().prepare(`SELECT id,patient_id AS patientId,doctor_id AS doctorId,date,status,checked_in_at AS checkedInAt FROM booked_slots WHERE id=?`).get(id) as {id:string;patientId:number;doctorId:string;date:string;status:string;checkedInAt:string|null}|undefined;
   if(!record)throw new HttpError(404,'Appointment not found.');
   doctorScope(user,record.doctorId);step(t,'AUTHORIZATION','Verified appointment belongs to clinician assignment or authorized staff role');
   if(record.status!=='Scheduled')throw new HttpError(409,'Only scheduled bookings can be processed.');
   if(action==='check-in'){
    if(record.checkedInAt)return{ok:true,alreadyCheckedIn:true};
    db().prepare('UPDATE booked_slots SET checked_in_at=? WHERE id=?').run(new Date().toISOString(),id);
    step(t,'STATE MACHINE','Scheduled → Checked-in. Repeat check-ins are idempotent.');
    return{ok:true,checkedIn:true};
   }
   if(!record.checkedInAt)throw new HttpError(409,'Check in the patient before completing the consultation.');
   const note=str(body.note,'Fictional visit note',400);
   if(!db().prepare('SELECT 1 FROM consultation_records WHERE booking_id=?').get(id)){
    const visitId=randomUUID(),now=new Date().toISOString();
    db().prepare('INSERT INTO visits(id,patient_id,date,type,note,clinician,created_at) VALUES(?,?,?,?,?,?,?)')
       .run(visitId,record.patientId,record.date,'Consultation',note,user.name,now);
    db().prepare('INSERT INTO consultation_records(booking_id,visit_id,recorded_at) VALUES(?,?,?)').run(id,visitId,now);
   }
   db().prepare("UPDATE booked_slots SET status='Completed' WHERE id=?").run(id);
   step(t,'TRANSACTION','Stored a single linked fictional visit and completed booking atomically');
   return{ok:true,completed:true};
  });step(t,'COMMIT','Clinic workflow committed to SQLite');return finish(t,200,{...result,traceId:t.id});
 }catch(e){return failure(t,e);}
}
