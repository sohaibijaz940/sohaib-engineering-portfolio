import {timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {db,hasAdmin,seedFictionalPatients,transaction} from '@/server/careindex-db';
import {createSession,cookieOptions,expireSession,registerUser,sessionUser,SESSION_COOKIE,verifyOrigin,verifyPassword,hashPassword} from '@/server/careindex-auth';
import {trace,step,finish,failure,HttpError,jsonBody,str} from '@/server/careindex-trace';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{action:string}>};
const checkEmail=(e:string)=>{if(!/^[^@\s]{1,64}@[^@\s]{1,150}\.[^@\s]{2,20}$/.test(e))throw new HttpError(400,'Enter a valid email.');return e.toLowerCase();};
const checkPassword=(p:string)=>{if(p.length<12||p.length>128)throw new HttpError(400,'Password must contain 12–128 characters.');return p;};
function setSession(resp:NextResponse,userId:string){const {token,expires}=createSession(userId);resp.cookies.set(SESSION_COOKIE,token,cookieOptions(expires));return resp;}
export async function GET(req:NextRequest,ctx:Ctx){const {action}=await ctx.params;const t=trace(req,'auth',action);
 try{
  if(action==='setup-info'){step(t,'DB QUERY','Checking whether an administrator exists');return finish(t,200,{needsSetup:!hasAdmin()});}
  if(action==='me'){t.user=sessionUser(req);step(t,'SESSION','Resolved current login from a server-side session record');return finish(t,200,{user:t.user});}
  throw new HttpError(404,'Unknown auth route.');
 }catch(e){return failure(t,e);}
}
export async function POST(req:NextRequest,ctx:Ctx){const {action}=await ctx.params;const t=trace(req,'auth',action);
 try{
  if(!verifyOrigin(req))throw new HttpError(403,'Invalid request origin.');step(t,'CSRF','Verified same-origin request');
  if(action==='logout'){t.user=sessionUser(req);expireSession(req);step(t,'SESSION','Server-side session revoked');const r=finish(t,200,{ok:true});r.cookies.set(SESSION_COOKIE,'',{...cookieOptions(new Date(0)),maxAge:0});return r;}
  if(action==='change-password'){
   t.user=sessionUser(req);if(!t.user)throw new HttpError(401,'Sign in to change password.');
   const body=await jsonBody(req,t);const oldPass=typeof body.currentPassword==='string'?body.currentPassword:'';
   const newPass=checkPassword(typeof body.newPassword==='string'?body.newPassword:'');
   const row=db().prepare('SELECT password_hash AS passwordHash FROM users WHERE id=?').get(t.user.id) as {passwordHash:string}|undefined;
   if(!row||!verifyPassword(oldPass,row.passwordHash))throw new HttpError(403,'Current password is incorrect.');
   if(verifyPassword(newPass,row.passwordHash))throw new HttpError(400,'Choose a different new password.');
   transaction(()=>{db().prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(newPass),t.user!.id);db().prepare('DELETE FROM sessions WHERE user_id=?').run(t.user!.id);});
   step(t,'CREDENTIALS','Rehashed password with a new random salt and revoked all other sessions');
   const r=finish(t,200,{ok:true});return setSession(r,t.user.id);
  }

  const b=await jsonBody(req,t);const email=checkEmail(str(b.email,'Email',180));
  if(action==='patient-signup'){
   if(!hasAdmin())throw new HttpError(409,'Clinic demo setup must be completed by an administrator first.');
   const name=str(b.name,'Name',80),pass=checkPassword(typeof b.password==='string'?b.password:'');
   if(b.syntheticConfirmation!==true)throw new HttpError(400,'Please confirm this account uses fictional demonstration information only.');
   // No self-service attachment to seeded clinic records. A new fictional record is allocated atomically.
   const patientId=transaction(()=>{
    if(db().prepare('SELECT 1 FROM users WHERE email=?').get(email))throw new HttpError(409,'Email already registered.');
    const user=registerUser(email,name,pass,'PATIENT');
    const id=Number(db().prepare('SELECT COALESCE(MAX(id),10000)+1 AS next FROM patients').get()?.next);
    const parts=name.split(/\s+/);const first=parts[0];const last=parts.slice(1).join(' ')||'Demo';
    const now=new Date().toISOString();
    db().prepare('INSERT INTO patients(id,first_name,last_name,dob,gender,city,status,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,first,last,'2000-01-01','Unknown','Fictional demo','Active',now);
    db().prepare('INSERT INTO patient_accounts(user_id,patient_id,created_at) VALUES(?,?,?)').run(user.id,id,now);
    return{patientId:id,userId:user.id};
   });
   step(t,'IDENTITY BINDING','Created an isolated fictional profile bound to this patient account');
   step(t,'SQL TRANSACTION','Committed patient account, synthetic profile and ownership link atomically');
   const r=finish(t,201,{ok:true,role:'PATIENT',patientId:patientId.patientId});return setSession(r,patientId.userId);
  }
  if(action==='signup'){
   const name=str(b.name,'Name',80),pass=checkPassword(typeof b.password==='string'?b.password:''),first=!hasAdmin();
   if(first){const key=process.env.CAREINDEX_SETUP_KEY||'';const submitted=typeof b.setupKey==='string'?b.setupKey:'';
    if(key.length<32||key.length!==submitted.length||!timingSafeEqual(Buffer.from(key),Buffer.from(submitted)))throw new HttpError(403,'A valid local setup secret is required to create the first administrator.');
    step(t,'BOOTSTRAP','First administrator setup secret validated');}
   else step(t,'RBAC','New accounts start PENDING. Only an admin can approve access.');
   let created:{id:string;email:string;name:string;role:string};
   transaction(()=>{if(db().prepare('SELECT 1 FROM users WHERE email=?').get(email))throw new HttpError(409,'Email already registered.');
    if(first&&hasAdmin())throw new HttpError(409,'Administrator was already created.');
    created=registerUser(email,name,pass,first?'ADMIN':'PENDING');});
   step(t,'DATABASE','Parameterized INSERT committed to users table');
   if(first){const seeded=seedFictionalPatients();step(t,'SEED',`Initialized ${seeded} fictional demo profiles in SQLite`);}
   const r=finish(t,201,{ok:true,role:created!.role,requiresApproval:!first});return setSession(r,created!.id);
  }
  if(action==='login'){
   const pass=typeof b.password==='string'?b.password:'';
   const attempts=db().prepare('SELECT attempts,locked_until FROM login_attempts WHERE email=?').get(email) as {attempts:number;locked_until:string}|undefined;
   if(attempts&&attempts.locked_until>new Date().toISOString())throw new HttpError(429,'Too many attempts. Try again after 15 minutes.');
   const u=db().prepare('SELECT id,email,name,role,password_hash FROM users WHERE email=?').get(email) as {id:string;email:string;name:string;role:string;password_hash:string}|undefined;
   const ok=u&&verifyPassword(pass,u.password_hash);
   if(!ok){const next=(attempts?.locked_until&&attempts.locked_until<=new Date().toISOString()?0:(attempts?.attempts??0))+1;const until=next>=5?new Date(Date.now()+15*60_000).toISOString():'';
    db().prepare('INSERT INTO login_attempts(email,attempts,locked_until) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET attempts=excluded.attempts,locked_until=excluded.locked_until').run(email,next,until);
    step(t,'PASSWORD','Sign-in rejected; no credentials are logged');throw new HttpError(401,'Invalid email or password.');}
   db().prepare('DELETE FROM login_attempts WHERE email=?').run(email);
   step(t,'PASSWORD','Password verified using salted scrypt hash');step(t,'SESSION','Issued rotating random session token; only SHA-256 verifier stored in SQLite');
   const r=finish(t,200,{ok:true,role:u.role});return setSession(r,u.id);
  }
  throw new HttpError(404,'Unknown auth route.');
 }catch(e){return failure(t,e);}
}
