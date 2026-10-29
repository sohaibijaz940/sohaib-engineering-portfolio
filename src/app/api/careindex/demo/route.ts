/** Opt-in guest sessions for an isolated, synthetic-only recruiter environment. */
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {NextRequest} from 'next/server';
import {db,hasAdmin,transaction} from '@/server/careindex-db';
import {registerUser,createSession,cookieOptions,SESSION_COOKIE} from '@/server/careindex-auth';
import {trace,mutationOrigin,step,jsonBody,finish,failure,HttpError} from '@/server/careindex-trace';
export const runtime='nodejs';export const dynamic='force-dynamic';
const enabled=()=>process.env.CAREINDEX_ENABLE_GUESTS==='true'&&process.env.CAREINDEX_DATA_MODE==='synthetic';
export async function GET(req:NextRequest){const t=trace(req,'demo','GUEST MODE');try{return finish(t,200,{enabled:enabled(),roles:['PATIENT','CLINICIAN','RECEPTIONIST','VIEWER']});}catch(e){return failure(t,e);}}
export async function POST(req:NextRequest){const t=trace(req,'demo','GUEST SESSION');try{
 mutationOrigin(req,t);if(!enabled())throw new HttpError(403,'Demo guest access is not enabled.');
 if(!hasAdmin())throw new HttpError(409,'Complete administrator setup before enabling recruiter sessions.');
 const body=await jsonBody(req,t),role=String(body.role);
 if(!['PATIENT','CLINICIAN','RECEPTIONIST','VIEWER'].includes(role))throw new HttpError(400,'Choose a supported demo role.');
 // Demo-only simple quota. Public deployments additionally need infrastructure-level rate limiting.
 const source=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0,64)||'local';
 const hash=createHash('sha256').update(source).digest('hex'),hour=new Date().toISOString().slice(0,13);
 const account=transaction(()=>{
  db().exec('CREATE TABLE IF NOT EXISTS demo_quotas(hash TEXT,hour TEXT,count INTEGER NOT NULL,PRIMARY KEY(hash,hour))');
  const previous=db().prepare('SELECT count FROM demo_quotas WHERE hash=? AND hour=?').get(hash,hour) as {count:number}|undefined;
  if((previous?.count??0)>=12)throw new HttpError(429,'Too many demo sessions. Try again later.');
  db().prepare('INSERT INTO demo_quotas(hash,hour,count) VALUES(?,?,1) ON CONFLICT(hash,hour) DO UPDATE SET count=count+1').run(hash,hour);
  const nonce=randomUUID().slice(0,8),user=registerUser(`visitor-${nonce}-${randomUUID().slice(0,6)}@careindex.invalid`,role==='CLINICIAN'?`Dr. Guest ${nonce}`:`Guest ${nonce}`,randomBytes(40).toString('hex'),role as 'PATIENT'|'CLINICIAN'|'RECEPTIONIST'|'VIEWER');
  if(role==='PATIENT'){
   const patientId=Number(db().prepare('SELECT COALESCE(MAX(id),10000)+1 AS next FROM patients').get()?.next),now=new Date().toISOString();
   db().prepare('INSERT INTO patients(id,first_name,last_name,dob,gender,city,status,created_at) VALUES(?,?,?,?,?,?,?,?)').run(patientId,'Guest',nonce,'2000-01-01','Unknown','Fictional demo','Active',now);
   db().prepare('INSERT INTO patient_accounts(user_id,patient_id,created_at) VALUES(?,?,?)').run(user.id,patientId,now);
   step(t,'OWNERSHIP','Created a unique fictional patient profile linked to this guest session');
  }
  if(role==='CLINICIAN'){
   const doctor=db().prepare('SELECT id FROM doctors WHERE active=1 ORDER BY id LIMIT 1').get() as {id:string}|undefined;
   if(!doctor)throw new HttpError(409,'No active synthetic doctor has been configured.');
   db().prepare('INSERT INTO doctor_assignments(user_id,doctor_id,assigned_at) VALUES(?,?,?)').run(user.id,doctor.id,new Date().toISOString());
   step(t,'RBAC','Assigned the guest clinician to one synthetic doctor profile');
  }
  step(t,'TRANSACTION','Created isolated demo login with server-enforced role');return user;
 });
 const {token,expires}=createSession(account.id);step(t,'SESSION','Issued secure HTTP-only session cookie');
 const response=finish(t,201,{ok:true,role:account.role,redirect:role==='PATIENT'?'/demos/careindex/patient/':role==='CLINICIAN'?'/demos/careindex/doctor/':'/demos/careindex/'});
 response.cookies.set(SESSION_COOKIE,token,cookieOptions(expires));return response;
 }catch(e){return failure(t,e);}}
