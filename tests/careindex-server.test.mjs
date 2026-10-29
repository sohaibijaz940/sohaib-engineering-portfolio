// Run actual V5 API route handlers using NextRequest and a temporary real SQLite database.
// TypeScript transpilation is local: no npm downloads and no real patient data.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Module=require('node:module');const ts=require('typescript');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'careindex-v5-test-'));
process.env.CAREINDEX_DB_PATH=path.join(tmp,'test.sqlite');
process.env.CAREINDEX_SETUP_KEY='test-setup-secret-only-for-local-test-environment-0001';
const origin='http://localhost:3000';
const project=process.cwd(),src=path.join(project,'src');
const oldResolve=Module._resolveFilename,oldLoad=Module._load;
Module._resolveFilename=function(request,parent,...rest){if(request.startsWith('@/')){const p=path.join(src,request.slice(2));for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(p+ext))return p+ext;return p;}return oldResolve.call(this,request,parent,...rest);};
Module._load=function(request,parent,...rest){if(request==='server-only')return{};return oldLoad.call(this,request,parent,...rest);};
const oldTs=Module._extensions['.ts'];
Module._extensions['.ts']=function(mod,filename){const source=fs.readFileSync(filename,'utf8');const transpiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;mod._compile(transpiled,filename);};
const {NextRequest}=require('next/server');
const auth=require('../src/app/api/careindex/auth/[action]/route.ts');
const data=require('../src/app/api/careindex/[resource]/route.ts');
const dbModule=require('../src/server/careindex-db.ts');
function req(resource,method='GET',body,cookie,opts={}){return new NextRequest(`${origin}/api/careindex/${resource}`,{method,headers:{...(method!=='GET'&&!opts.noOrigin?{origin}:{}),...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function call(handlers,path,method='GET',body,cookie,opts={}){const resource=path.split('?')[0].split('/').at(-1);const r=req(path,method,body,cookie,opts);const handler=handlers[method];const resp=await handler(r,{params:Promise.resolve({[handlers===auth?'action':'resource']:resource})});const json=await resp.json();return {status:resp.status,body:json,cookie:resp.headers.get('set-cookie'),trace:resp.headers.get('x-careindex-trace')};}
const getCookie=resp=>resp.cookie?.split(';')[0];
let adminCookie='',pendingCookie='',viewerCookie='',clinicianCookie='',receptionCookie='';
try {
 await test('setup cannot grant admin without secret; first admin creates persisted fictional data',async()=>{
  const bad=await call(auth,'auth/signup','POST',{email:'admin@demo.test',name:'Admin',password:'a strong password sample'},null);assert.equal(bad.status,403);
  const ok=await call(auth,'auth/signup','POST',{email:'admin@demo.test',name:'Admin',password:'a strong password sample',setupKey:process.env.CAREINDEX_SETUP_KEY});
  assert.equal(ok.status,201);assert.equal(ok.body.role,'ADMIN');adminCookie=getCookie(ok);
  assert.ok(adminCookie?.startsWith('careindex_session='));
  assert.equal(Number(dbModule.db().prepare('select count(*) n from patients').get().n),420);
  const session=dbModule.db().prepare('select token_hash from sessions').get();assert.equal(session.token_hash.length,64);assert.ok(!session.token_hash.includes(adminCookie.slice(18,30)));
 });
 await test('unapproved signup is blocked from patient data',async()=>{
  const r=await call(auth,'auth/signup','POST',{email:'viewer@demo.test',name:'Test Viewer',password:'viewer password 123456'});assert.equal(r.body.role,'PENDING');pendingCookie=getCookie(r);
  const blocked=await call(data,'patients','GET',null,pendingCookie);assert.equal(blocked.status,403);
  const login=await call(auth,'auth/login','POST',{email:'viewer@demo.test',password:'viewer password 123456'});assert.equal(login.status,200);
 });
 await test('admin approves viewer; old pending session revoked',async()=>{
  const r=await call(data,'users','GET',null,adminCookie);assert.equal(r.status,200);
  const id=r.body.users.find(u=>u.email==='viewer@demo.test').id;
  const upd=await call(data,'users','PATCH',{id,role:'VIEWER'},adminCookie);assert.equal(upd.status,200);
  assert.equal((await call(data,'patients','GET',null,pendingCookie)).status,401);
  const login=await call(auth,'auth/login','POST',{email:'viewer@demo.test',password:'viewer password 123456'});viewerCookie=getCookie(login);
  assert.equal(login.body.role,'VIEWER');assert.equal((await call(data,'patients','GET',null,viewerCookie)).status,200);
 });
 await test('viewer cannot register patient, even by directly invoking HTTP API',async()=>{
  const r=await call(data,'patients','POST',{firstName:'No',lastName:'Permission',dob:'2000-01-01',gender:'Male',city:'Demo'},viewerCookie);
  assert.equal(r.status,403);
  assert.equal(Number(dbModule.db().prepare('select count(*) n from patients').get().n),420);
 });
 await test('CSRF rejects mutation missing Origin header',async()=>{
  const r=await call(data,'patients','POST',{firstName:'No',lastName:'Origin',dob:'2000-01-01',gender:'Male',city:'Demo'},adminCookie,{noOrigin:true});assert.equal(r.status,403);
 });
 await test('admin can create/update patient; appointments persist; AVL lookup is real',async()=>{
  const r=await call(data,'patients','POST',{firstName:'Demo',lastName:'Patient',dob:'2000-01-01',gender:'Female',city:'Sandbox'},adminCookie);assert.equal(r.status,201);const id=r.body.id;assert.ok(id>10420);
  const detail=await call(data,`patients?id=${id}`,'GET',null,adminCookie);assert.equal(detail.body.patient.firstName,'Demo');
  const a=await call(data,'appointments','POST',{patientId:id,date:'2026-11-03',time:'10:30',type:'Consultation',notes:'Synthetic'},adminCookie);assert.equal(a.status,201);
  const changed=await call(data,'appointments','PATCH',{id:a.body.id,status:'Completed'},adminCookie);assert.equal(changed.status,200);
  const search=await call(data,`lookup?id=${id}`,'GET',null,adminCookie);assert.equal(search.status,200);assert.equal(search.body.lookup.found,true);assert.ok(search.body.lookup.path.length>0);assert.equal(search.body.lookup.patient.id,id);
  const valid=await call(data,`lookup?id=99999999`,'GET',null,adminCookie);assert.equal(valid.body.lookup.found,false);
  const arch=await call(data,'patients','PATCH',{id,status:'Archived'},adminCookie);assert.equal(arch.status,200);
  const searchArchived=await call(data,`lookup?id=${id}`,'GET',null,adminCookie);assert.equal(searchArchived.body.lookup.found,false);
  const deleted=await call(data,'patients','DELETE',{id},adminCookie);assert.equal(deleted.status,200);
  const retained=await call(data,`patients?id=${id}`,'GET',null,adminCookie);assert.equal(retained.status,200);assert.equal(retained.body.patient.status,'Archived');
 });
 await test('clinician can record visits; receptionist cannot',async()=>{
  async function invite(email,role){const s=await call(auth,'auth/signup','POST',{email,name:role,password:'a secure password ABC123'});assert.equal(s.status,201);
   const list=await call(data,'users','GET',null,adminCookie);const userId=list.body.users.find(u=>u.email===email).id;
   assert.equal((await call(data,'users','PATCH',{id:userId,role},adminCookie)).status,200);
   const login=await call(auth,'auth/login','POST',{email,password:'a secure password ABC123'});return getCookie(login);}
  clinicianCookie=await invite('clinician@demo.test','CLINICIAN');receptionCookie=await invite('reception@demo.test','RECEPTIONIST');
  const b={patientId:10001,date:'2026-10-02',type:'Follow-up',note:'Not real patient data'};
  assert.equal((await call(data,'visits','POST',b,receptionCookie)).status,403);
  assert.equal((await call(data,'visits','POST',b,clinicianCookie)).status,201);
  assert.equal((await call(data,'patients','DELETE',{id:10001},clinicianCookie)).status,403);
  assert.equal((await call(data,'users','GET',null,clinicianCookie)).status,403);
 });
 await test('audit exposes real server steps and only own non-admin events',async()=>{
  const a=await call(data,'audit','GET',null,adminCookie);assert.equal(a.status,200);assert.ok(a.body.events.some(ev=>ev.steps.some(s=>s.stage==='RBAC')));
  const v=await call(data,'audit','GET',null,viewerCookie);assert.equal(v.status,200);assert.ok(v.body.events.every(ev=>!ev.actor.includes('@')));
  assert.ok(a.body.events.some(ev=>ev.outcome==='DENIED'));
 });
 await test('sign-out revokes session in real DB',async()=>{
  assert.equal((await call(auth,'auth/logout','POST',{},viewerCookie)).status,200);
  assert.equal((await call(data,'patients','GET',null,viewerCookie)).status,401);
 });
}finally{try{dbModule.db().close();}catch{};for(const ext of ['','-wal','-shm'])try{fs.rmSync(process.env.CAREINDEX_DB_PATH+ext,{force:true});}catch{};fs.rmSync(tmp,{recursive:true,force:true});}
