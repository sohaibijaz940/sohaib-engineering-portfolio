import 'server-only';
import {isAppOrigin} from '@/lib/request-origin';
import { randomBytes,createHash,scryptSync,timingSafeEqual,randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { db } from './careindex-db';
export type Role='PENDING'|'ADMIN'|'CLINICIAN'|'RECEPTIONIST'|'VIEWER'|'PATIENT';
export type CareUser={id:string;email:string;name:string;role:Role};
export type Permission='read'|'patients:write'|'appointments:write'|'visits:write'|'patients:delete'|'manage';
export const SESSION_COOKIE='careindex_session';
const ACCESS:Record<Role,Permission[]>={PATIENT:[],PENDING:[],VIEWER:['read'],RECEPTIONIST:['read','patients:write','appointments:write'],CLINICIAN:['read','patients:write','appointments:write','visits:write'],ADMIN:['read','patients:write','appointments:write','visits:write','patients:delete','manage']};
export const can=(role:Role,perm:Permission)=>ACCESS[role].includes(perm);
export function hashPassword(pass:string):string{const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(pass,salt,64).toString('hex')}`;}
export function verifyPassword(pass:string,stored:string){try{const [salt,hex]=stored.split(':');const a=Buffer.from(hex,'hex'),b=scryptSync(pass,salt,a.length);return a.length===64&&timingSafeEqual(a,b);}catch{return false;}}
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export function createSession(userId:string){const token=randomBytes(32).toString('hex'),expires=new Date(Date.now()+1000*60*60*12);db().prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(sha(token),userId,expires.toISOString(),new Date().toISOString());return {token,expires};}
export function sessionUser(req:NextRequest):CareUser|null{
 const token=req.cookies.get(SESSION_COOKIE)?.value;
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const row=db().prepare('SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').get(sha(token),new Date().toISOString()) as CareUser|undefined;
 return row??null;
}
export function expireSession(req:NextRequest){const token=req.cookies.get(SESSION_COOKIE)?.value;if(token)db().prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(token));}
export function cookieOptions(expires:Date){return {httpOnly:true,sameSite:'strict' as const,secure:process.env.NODE_ENV==='production',path:'/',expires};}
export function verifyOrigin(req:NextRequest){return isAppOrigin(req.headers.get('origin'),req.nextUrl.origin,process.env.NODE_ENV==='production'?process.env.NEXT_PUBLIC_SITE_URL:undefined);}
export function registerUser(email:string,name:string,pass:string,role:Role){const id=randomUUID();db().prepare('INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?)').run(id,email.toLowerCase(),name,hashPassword(pass),role,new Date().toISOString());return{id,email:email.toLowerCase(),name,role};}
