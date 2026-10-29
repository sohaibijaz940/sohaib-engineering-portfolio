import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {db,insertPatient,mapPatient,transaction} from '@/server/careindex-db';
import {type Permission} from '@/server/careindex-auth';
import {trace,step,requireAccess,mutationOrigin,finish,failure,jsonBody,str,HttpError,type Trace} from '@/server/careindex-trace';
import {buildPatientIndex} from '@/lib/careindex-index';
import {importSyntheaCSV,type Patient} from '@/lib/careindex-data';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{resource:string}>};
const cleanId=(v:unknown)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)throw new HttpError(400,'Invalid positive numeric patient ID.');return n;};
const validDate=(v:unknown,k:string)=>{const s=str(v,k,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s)))throw new HttpError(400,`Invalid ${k}.`);return s;};
const pickStatus=(v:unknown,values:string[])=>{if(typeof v!=='string'||!values.includes(v))throw new HttpError(400,`Expected one of: ${values.join(', ')}.`);return v;};
const validPatient=(b:Record<string,unknown>)=>({firstName:str(b.firstName,'First name',60),lastName:str(b.lastName,'Last name',60),dob:validDate(b.dob,'Date of birth'),gender:pickStatus(b.gender,['Female','Male','Other','Unknown']),city:str(b.city??'Not specified','Area',60)});
const requirePatient=(id:number)=>{const p=db().prepare('SELECT * FROM patients WHERE id=?').get(id) as Record<string,unknown>|undefined;if(!p)throw new HttpError(404,'Patient not found.');return p;};
const withRelated=(p:Patient)=>({...p,appointments:db().prepare("SELECT id,date,time,type,status,notes,'legacy' AS source FROM appointments WHERE patient_id=? UNION ALL SELECT b.id,b.date,b.time,('Consultation · '||d.name) type,b.status,'' notes,'booking' AS source FROM booked_slots b JOIN doctors d ON d.id=b.doctor_id WHERE b.patient_id=? ORDER BY date DESC").all(p.id,p.id),visits:db().prepare('SELECT id,date,type,note,clinician FROM visits WHERE patient_id=? ORDER BY date DESC LIMIT 50').all(p.id)});
const rowArray=<T,>(query:string,...values:(string|number)[])=>db().prepare(query).all(...values) as T[];
function getList(t:Trace,q:string,limit:number,offset:number){
 const like=`%${q.replace(/[\\%_]/g,s=>'\\'+s)}%`;
 const rows=rowArray<Record<string,unknown>>("SELECT * FROM patients WHERE (CAST(id AS TEXT) LIKE ? ESCAPE '\\' OR first_name LIKE ? ESCAPE '\\' OR last_name LIKE ? ESCAPE '\\') ORDER BY id LIMIT ? OFFSET ?",like,like,like,limit,offset);
 const total=Number(db().prepare("SELECT COUNT(*) n FROM patients WHERE (CAST(id AS TEXT) LIKE ? ESCAPE '\\' OR first_name LIKE ? ESCAPE '\\' OR last_name LIKE ? ESCAPE '\\')").get(like,like,like)?.n??0);
 step(t,'SQL','Ran parameterized SQLite patient list query with pagination');return{patients:rows.map(mapPatient),total};
}
function lookup(t:Trace,id:number){
 const keys=rowArray<{id:number}>("SELECT id FROM patients WHERE status='Active'").map(p=>p.id);
 const ix=buildPatientIndex(keys);const result=ix.search(id);
 step(t,'AVL ENGINE',`Rebuilt demonstration AVL index from ${keys.length} active IDs; traversed ${result.comparisons} nodes`);
 const p=result.found?requirePatient(id):null;
 if(p)step(t,'SQL','Retrieved matching full record by primary key from SQLite');
 return{...result,stats:ix.stats,patient:p?withRelated(mapPatient(p)):null};
}
export async function GET(req:NextRequest,ctx:Ctx){const {resource}=await ctx.params;const t=trace(req,resource,'LIST / READ');
 try{
  const user=requireAccess(req,t,'read');const q=req.nextUrl.searchParams;
  switch(resource){
   case 'stats':{
    const stats=db().prepare("SELECT COUNT(*) total,SUM(status='Active') active,SUM(status='Archived') archived FROM patients").get();
    const upcoming=db().prepare("SELECT (SELECT COUNT(*) FROM appointments WHERE status='Scheduled' AND date>=date('now'))+(SELECT COUNT(*) FROM booked_slots WHERE status='Scheduled' AND date>=date('now')) n").get()?.n??0;
    const appointments=db().prepare('SELECT (SELECT COUNT(*) FROM appointments)+(SELECT COUNT(*) FROM booked_slots) n').get()?.n??0;
    const visits=db().prepare('SELECT COUNT(*) n FROM visits').get()?.n??0;
    step(t,'SQL','Aggregated patient, legacy appointment, booked-slot and visit totals in SQLite');return finish(t,200,{...stats,upcoming,appointments,visits});}
   case 'patients':{
    if(q.has('id')){const p=requirePatient(cleanId(q.get('id')));step(t,'SQL','Fetched one fictional patient record and its encounters');return finish(t,200,{patient:withRelated(mapPatient(p))});}
    return finish(t,200,getList(t,(q.get('q')??'').slice(0,60),Math.min(50,Math.max(1,Number(q.get('limit'))||15)),Math.max(0,Number(q.get('offset'))||0)));}
   case 'appointments':{
    const rows=rowArray("SELECT x.* FROM (SELECT a.id,a.patient_id AS patientId,a.date,a.time,a.type,a.status,a.notes,p.first_name AS firstName,p.last_name AS lastName,'legacy' AS source FROM appointments a JOIN patients p ON p.id=a.patient_id UNION ALL SELECT b.id,b.patient_id AS patientId,b.date,b.time,('Consultation · '||d.name) AS type,b.status,'' AS notes,p.first_name AS firstName,p.last_name AS lastName,'booking' AS source FROM booked_slots b JOIN patients p ON p.id=b.patient_id JOIN doctors d ON d.id=b.doctor_id) x ORDER BY x.date DESC,x.time DESC LIMIT 250");step(t,'SQL','Unified staff view includes both legacy appointments and V6/V7 booked slots');return finish(t,200,{appointments:rows});}
   case 'lookup':{const id=cleanId(q.get('id'));return finish(t,200,{lookup:lookup(t,id)});}
   case 'users':{requireAccess(req,t,'manage');const users=rowArray("SELECT id,email,name,role,created_at AS createdAt FROM users WHERE role!='PATIENT' ORDER BY created_at DESC");step(t,'SQL','Admin-only account directory; password hashes excluded');return finish(t,200,{users});}
   case 'audit':{
    const rows:Record<string,unknown>[]=user.role==='ADMIN'?rowArray<Record<string,unknown>>('SELECT * FROM audit ORDER BY time DESC LIMIT 80'):rowArray('SELECT * FROM audit WHERE user_id=? ORDER BY time DESC LIMIT 80',user.id);
    step(t,'SQL',user.role==='ADMIN'?'Loaded team-wide audit metadata':'Loaded own audit metadata only');return finish(t,200,{events:rows.map((r:Record<string,unknown>)=>({...r,steps:JSON.parse(String(r.steps))}))});}
   default:throw new HttpError(404,'Unknown resource.');
  }
 }catch(e){return failure(t,e);}
}
export async function POST(req:NextRequest,ctx:Ctx){return mutate(req,ctx,'POST');}
export async function PATCH(req:NextRequest,ctx:Ctx){return mutate(req,ctx,'PATCH');}
export async function DELETE(req:NextRequest,ctx:Ctx){return mutate(req,ctx,'DELETE');}
async function mutate(req:NextRequest,ctx:Ctx,method:string){const {resource}=await ctx.params;const t=trace(req,resource,method);
 try{
  mutationOrigin(req,t);
  const perms:Record<string,Permission>={patients:method==='DELETE'?'patients:delete':'patients:write',appointments:'appointments:write',visits:'visits:write',users:'manage',import:'manage'};
  if(!perms[resource])throw new HttpError(404,'Unknown endpoint.');
  const user=requireAccess(req,t,perms[resource]);const b=await jsonBody(req,t);
  if(resource==='patients'){
   if(method==='POST'){
    const vals=validPatient(b);if(vals.dob>new Date().toISOString().slice(0,10))throw new HttpError(400,'Date of birth cannot be in the future.');
    const id=transaction(()=>{const id=Number(db().prepare('SELECT COALESCE(MAX(id),10000)+1 next FROM patients').get()?.next);db().prepare('INSERT INTO patients(id,first_name,last_name,dob,gender,city,status,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,vals.firstName,vals.lastName,vals.dob,vals.gender,vals.city,'Active',new Date().toISOString());return id;});
    step(t,'SQL TRANSACTION','Inserted fictional patient using server-assigned numeric ID');return finish(t,201,{ok:true,id});}
   const id=cleanId(b.id);requirePatient(id);
   if(method==='PATCH'){
    if(b.status!==undefined){const status=pickStatus(b.status,['Active','Archived']);db().prepare('UPDATE patients SET status=? WHERE id=?').run(status,id);step(t,'SQL',`Changed archive state for patient #${id}`);}
    else{const v=validPatient(b);db().prepare('UPDATE patients SET first_name=?,last_name=?,dob=?,gender=?,city=? WHERE id=?').run(v.firstName,v.lastName,v.dob,v.gender,v.city,id);step(t,'SQL',`Updated synthetic patient #${id} using parameterized SQL`);}
    return finish(t,200,{ok:true});}
   if(method==='DELETE'){if(db().prepare('SELECT 1 FROM patient_accounts WHERE patient_id=?').get(id))throw new HttpError(409,'Linked patient portal profiles cannot be deleted.');db().prepare("UPDATE patients SET status='Archived' WHERE id=?").run(id);step(t,'RETENTION','Archived record without removing related appointments or visit history');return finish(t,200,{ok:true,archived:true});}
  }
  if(resource==='appointments'){
   if(method==='POST'){
    const patientId=cleanId(b.patientId),date=validDate(b.date,'Appointment date'),time=str(b.time,'Time',5),type=str(b.type,'Type',80),notes=str(b.notes??'','Notes',300,false);
    requirePatient(patientId);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new HttpError(400,'Invalid appointment time.');
    const id=randomUUID();db().prepare('INSERT INTO appointments(id,patient_id,date,time,type,status,notes,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,patientId,date,time,type,'Scheduled',notes,new Date().toISOString());step(t,'SQL','Inserted appointment linked to patient foreign key');return finish(t,201,{ok:true,id});}
   if(method==='PATCH'){
    const id=str(b.id,'Appointment ID',70),status=pickStatus(b.status,['Scheduled','Completed','Cancelled']);
    const count=db().prepare('UPDATE appointments SET status=? WHERE id=?').run(status,id).changes;if(!count){if(db().prepare('SELECT 1 FROM booked_slots WHERE id=?').get(id))throw new HttpError(409,'Doctor bookings must be managed through the Booking or Doctor Workspace. This protects invoices and check-in history.');throw new HttpError(404,'Appointment not found.');}
    step(t,'SQL',`Updated appointment workflow to ${status}`);return finish(t,200,{ok:true});}
  }
  if(resource==='visits'&&method==='POST'){
   const patientId=cleanId(b.patientId),date=validDate(b.date,'Visit date'),type=str(b.type,'Visit category',80),note=str(b.note,'Demonstration note',400);
   requirePatient(patientId);const id=randomUUID();db().prepare('INSERT INTO visits(id,patient_id,date,type,note,clinician,created_at) VALUES(?,?,?,?,?,?,?)').run(id,patientId,date,type,note,user.name,new Date().toISOString());step(t,'SQL','Recorded fictional visit with signed-in clinician attribution');return finish(t,201,{ok:true,id});}
  if(resource==='users'&&method==='PATCH'){
   const id=str(b.id,'User ID',60),role=pickStatus(b.role,['PENDING','ADMIN','CLINICIAN','RECEPTIONIST','VIEWER']);
   if(id===user.id)throw new HttpError(400,'You cannot change your own role.');
   const linked=db().prepare('SELECT role FROM users WHERE id=?').get(id) as {role:string}|undefined;if(!linked)throw new HttpError(404,'Account not found.');if(linked.role==='PATIENT')throw new HttpError(403,'Patient accounts cannot be promoted through staff role management.');const result=db().prepare('UPDATE users SET role=? WHERE id=?').run(role,id);if(!result.changes)throw new HttpError(404,'Account not found.');
   db().prepare('DELETE FROM sessions WHERE user_id=?').run(id);
   step(t,'RBAC','Admin changed staff role; existing sessions revoked');return finish(t,200,{ok:true});}
  if(resource==='import'&&method==='POST'){
   if(!b.confirmReplace)throw new HttpError(400,'Explicit data replacement confirmation required.');
   const raw=b.files;if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new HttpError(400,'CSV files missing.');
   const files:Record<string,string>={};for(const [k,v] of Object.entries(raw))if(['patients','encounters','conditions','medications'].includes(k)&&typeof v==='string'&&v.length<=2_000_000)files[k]=v;
   if(db().prepare('SELECT 1 FROM patient_accounts LIMIT 1').get()||db().prepare('SELECT 1 FROM visits LIMIT 1').get()||db().prepare('SELECT 1 FROM appointments LIMIT 1').get()||db().prepare('SELECT 1 FROM booked_slots LIMIT 1').get())throw new HttpError(409,'Dataset replacement is blocked when accounts, visits, or bookings exist. Import only into a fresh synthetic-data sandbox.');const patients=importSyntheaCSV(files);step(t,'IMPORT','Parsed and validated synthetic Synthea CSV records');
   transaction(()=>{db().exec('DELETE FROM patients');for(const p of patients)insertPatient(p);});step(t,'SQL TRANSACTION',`Replaced demo patient records with ${patients.length} synthetic profiles; staff accounts retained`);
   return finish(t,200,{ok:true,count:patients.length});}
  throw new HttpError(405,'Method not supported for this resource.');
 }catch(e){return failure(t,e);}
}
