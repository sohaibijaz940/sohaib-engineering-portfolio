/** Read-only teaching endpoints. Never execute arbitrary SQL or expose raw patient data. */
import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,can,type Permission} from '@/server/careindex-auth';
import {db} from '@/server/careindex-db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noCache={'Cache-Control':'private, no-store, max-age=0'};
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:noCache});
type EventRow={request_id:string;time:string;method:string;resource:string;action:string;outcome:string;duration_ms:number;steps:string};
const safe=(input:string)=>input
 .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email omitted]')
 .replace(/\b[a-f0-9]{32,}\b/gi,'[opaque ID omitted]')
 .slice(0,360);
const queryPlans={
 patient_id:{label:'Patient primary-key lookup',sql:'SELECT id FROM patients WHERE id = ?',args:[10001],why:'SQLite uses the integer primary-key rowid. No custom AVL replaces this persistent database index.'},
 doctor_slot:{label:'Reserved doctor slot',sql:"SELECT id FROM booked_slots WHERE doctor_id = ? AND date = ? AND time = ? AND status = 'Scheduled'",args:['d1','2026-10-26','09:30'],why:'The partial unique index on scheduled slots protects against two active bookings for one doctor and time.'},
 linked_account:{label:'Patient account ownership',sql:'SELECT patient_id FROM patient_accounts WHERE user_id = ?',args:['fictional-user'],why:'The primary-key index on user_id supports binding a patient account to its server-verified patient record.'}
} as const;
export async function GET(request:NextRequest){
 try{
  const u=sessionUser(request);
  if(!u||u.role==='PENDING')return response({error:'Sign in to an approved CareIndex demo account to inspect real traces.'},401);
  const mode=request.nextUrl.searchParams.get('mode')||'traces';
  if(mode==='traces'){
   // Intentionally show only the signed-in account's trace records, not all clinic users' logs.
   const id=request.nextUrl.searchParams.get('id');
   if(id&&!/^[a-f0-9-]{36}$/.test(id))return response({error:'Invalid trace identifier.'},400);
   const rows=(id?db().prepare('SELECT request_id,time,method,resource,action,outcome,duration_ms,steps FROM audit WHERE user_id=? AND request_id=? ORDER BY time DESC LIMIT 1').all(u.id,id):db().prepare('SELECT request_id,time,method,resource,action,outcome,duration_ms,steps FROM audit WHERE user_id=? ORDER BY time DESC LIMIT 24').all(u.id)) as EventRow[];
   return response({mode:'real-recorded-events',events:rows.map(row=>({id:row.request_id,time:row.time,method:row.method,resource:row.resource,action:row.action,outcome:row.outcome,durationMs:row.duration_ms,steps:(()=>{try{return (JSON.parse(row.steps) as {stage:string;detail:string;ms:number}[]).slice(0,30).map(s=>({stage:safe(String(s.stage)),detail:safe(String(s.detail)),ms:Number(s.ms)}));}catch{return [];}})()}))});
  }
  if(mode==='plan'){
   const which=request.nextUrl.searchParams.get('query')||'doctor_slot';
   if(!(which in queryPlans))return response({error:'Unknown query. Only predefined safe plans are available.'},400);
   const q=queryPlans[which as keyof typeof queryPlans];
   // Fixed, parameterized, non-sensitive EXPLAIN QUERY PLAN. No SQL accepted from the browser.
   const result=db().prepare('EXPLAIN QUERY PLAN '+q.sql).all(...q.args);
   return response({mode:'real-sqlite-explain',query:which,label:q.label,statement:q.sql.replace(/\?/g,'[parameter]'),why:q.why,plan:result.map(r=>({id:Number(r.id),parent:Number(r.parent),detail:safe(String(r.detail))}))});
  }
  if(mode==='permissions'){
   const perms:Permission[]=['read','patients:write','appointments:write','visits:write','patients:delete','manage'];
   return response({role:u.role,permissions:perms.map(p=>({permission:p,allowed:can(u.role,p)})),note:'These values use the server’s actual can(role, permission) function. Patient self-service uses additional ownership rules.'});
  }
  return response({error:'Unknown Learning Lab mode.'},400);
 }catch(error){console.error('CareIndex engineering read failed',error);return response({error:'Unable to load the engineering resource.'},500);}
}
