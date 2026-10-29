import 'server-only';
import { randomUUID,createHash } from 'node:crypto';
import { NextResponse,type NextRequest } from 'next/server';
import {db} from './careindex-db';
import {sessionUser,can,verifyOrigin,type CareUser,type Permission} from './careindex-auth';
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export type TraceStep={stage:string;detail:string;ms:number};
export type Trace={id:string;steps:TraceStep[];started:number;user:CareUser|null;method:string;resource:string;action:string;outcome:string};
export function trace(req:NextRequest,resource:string,action:string):Trace{return{id:randomUUID(),steps:[],started:Date.now(),user:null,method:req.method,resource,action,outcome:'OK'};}
export function step(t:Trace,stage:string,detail:string){t.steps.push({stage,detail,ms:Date.now()-t.started});}
export function requireAccess(req:NextRequest,t:Trace,perm:Permission){
 t.user=sessionUser(req);step(t,'SESSION','HTTP-only session cookie validated against server-side session table');
 if(!t.user){step(t,'AUTHORIZATION','Rejected: no valid signed-in session');throw new HttpError(401,'Sign in to continue.');}
 if(!can(t.user.role,perm)){step(t,'RBAC',`Rejected: ${t.user.role} lacks ${perm} permission`);throw new HttpError(403,'Your role does not permit this action.');}
 step(t,'RBAC',`${t.user.role} granted permission: ${perm}`);return t.user;
}
export function mutationOrigin(req:NextRequest,t:Trace){if(!verifyOrigin(req)){step(t,'CSRF','Origin mismatch or missing Origin header');throw new HttpError(403,'Request origin rejected.');}step(t,'CSRF','Same-origin check passed');}
export function finish(t:Trace,status:number,body:unknown){
 const duration=Date.now()-t.started;
 t.outcome=status<400?'SUCCESS':status===403?'DENIED':'ERROR';
 try{db().prepare('INSERT INTO audit(id,request_id,time,user_id,actor,role,method,resource,action,outcome,steps,duration_ms) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),t.id,new Date().toISOString(),t.user?.id??null,t.user?`${t.user.role.toLowerCase()}-${createHash('sha256').update(t.user.id).digest('hex').slice(0,10)}`:'anonymous',t.user?.role??'ANONYMOUS',t.method,t.resource,t.action,t.outcome,JSON.stringify(t.steps),duration);}catch(error){console.error('CareIndex trace persistence failed',error);}
 const r=NextResponse.json(body,{status});r.headers.set('x-careindex-trace',t.id);r.headers.set('cache-control','no-store');return r;
}
export function failure(t:Trace,error:unknown){const status=error instanceof HttpError?error.status:500;step(t,'RESPONSE',status===500?'Unexpected server error (details kept server-side)':(error as Error).message);if(status===500)console.error('CareIndex operation failed',error);return finish(t,status,{error:status===500?'Internal server error.':(error as Error).message,traceId:t.id});}
export async function jsonBody(req:NextRequest,t:Trace){
 if(Number(req.headers.get('content-length')||0)>8_000_000)throw new HttpError(413,'Payload too large.');
 const raw=await req.text();if(raw.length>8_000_000)throw new HttpError(413,'Payload too large.');
 let value:unknown;try{value=JSON.parse(raw);}catch{throw new HttpError(400,'Expected JSON request body.');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(400,'Expected a JSON object.');step(t,'VALIDATION','Request JSON parsed and checked');return value as Record<string,unknown>;
}
export function str(value:unknown,key:string,max=100,required=true){if(typeof value!=='string')throw new HttpError(400,`${key} must be text.`);const s=value.trim();if((required&&!s)||s.length>max)throw new HttpError(400,`${key} must be 1–${max} characters.`);return s;}
