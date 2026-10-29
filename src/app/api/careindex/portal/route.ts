import {NextRequest} from 'next/server';
import {db} from '@/server/careindex-db';
import {sessionUser} from '@/server/careindex-auth';
import {trace,step,finish,failure,HttpError} from '@/server/careindex-trace';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:NextRequest){const t=trace(req,'portal','PATIENT SELF-SERVICE');try{
 const u=sessionUser(req);t.user=u;step(t,'SESSION','Resolved authenticated patient session');
 if(!u)throw new HttpError(401,'Sign in to continue.');
 if(u.role!=='PATIENT')throw new HttpError(403,'The patient portal is only for patient demo accounts.');
 const bound=db().prepare('SELECT p.id,p.first_name AS firstName,p.last_name AS lastName FROM patient_accounts a JOIN patients p ON p.id=a.patient_id WHERE a.user_id=?').get(u.id) as {id:number;firstName:string;lastName:string}|undefined;
 if(!bound)throw new HttpError(403,'No linked synthetic patient profile found.');
 step(t,'OWNERSHIP','Resolved patient ID server-side from the signed-in user, not a request parameter');
 const traceId=req.nextUrl.searchParams.get('trace');
 if(traceId){if(!/^[a-f0-9-]{36}$/.test(traceId))throw new HttpError(400,'Invalid trace ID.');
  const event=db().prepare('SELECT request_id,resource,action,outcome,steps,duration_ms FROM audit WHERE request_id=? AND user_id=?').get(traceId,u.id) as {request_id:string;resource:string;action:string;outcome:string;steps:string;duration_ms:number}|undefined;
  step(t,'AUDIT','Loaded only the current account’s sanitized request trace');
  return finish(t,200,{trace:event?{...event,steps:JSON.parse(event.steps)}:null});
 }
 const bookings=db().prepare(`SELECT b.id,b.date,b.time,b.status,b.created_at AS createdAt,d.name AS doctor,d.specialty,d.fee_cents AS feeCents
 FROM booked_slots b JOIN doctors d ON b.doctor_id=d.id WHERE b.patient_id=? ORDER BY b.date DESC,b.time DESC LIMIT 150`).all(bound.id);
 step(t,'SQL','Selected only bookings associated with the authenticated patient ID');
 return finish(t,200,{user:{name:u.name,email:u.email,role:u.role},profile:bound,bookings});
 }catch(e){return failure(t,e);}}
