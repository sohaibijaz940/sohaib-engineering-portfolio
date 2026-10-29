// V7 real HTTP handler / SQLite integration tests. No real medical data, no external server.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Module=require('node:module'),ts=require('typescript');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'careindex-v7-'));
process.env.CAREINDEX_DB_PATH=path.join(tmp,'test.sqlite');process.env.CAREINDEX_SETUP_KEY='private-test-secret-for-setup-keep-it-outside-source-2026';
const src=path.join(process.cwd(),'src'),origin='http://localhost:3000';
const resolve=Module._resolveFilename,load=Module._load;
Module._resolveFilename=function(name,parent,...rest){if(name.startsWith('@/')){const filename=path.join(src,name.slice(2));for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(filename+ext))return filename+ext;return filename;}return resolve.call(this,name,parent,...rest);};
Module._load=function(name,parent,...rest){if(name==='server-only')return{};return load.call(this,name,parent,...rest);};
Module._extensions['.ts']=function(mod,filename){const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;mod._compile(js,filename);};
const {NextRequest}=require('next/server'),auth=require('../src/app/api/careindex/auth/[action]/route.ts'),booking=require('../src/app/api/careindex/booking/route.ts'),portal=require('../src/app/api/careindex/portal/route.ts'),staff=require('../src/app/api/careindex/[resource]/route.ts'),database=require('../src/server/careindex-db.ts');
async function call(api,path,method='GET',body,cookie,noOrigin=false){const resource=path.split('?')[0].split('/').at(-1);const req=new NextRequest(origin+'/api/careindex/'+path,{method,headers:{...(method!=='GET'&&!noOrigin?{origin}:{}),...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});let response;
if(api===auth)response=await api[method](req,{params:Promise.resolve({action:resource})});else if(api===staff)response=await api[method](req,{params:Promise.resolve({resource})});else response=await api[method](req);
return{status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],traceId:response.headers.get('x-careindex-trace')};}
let admin='',alice='',bob='',aliceId=0,bobId=0,bookId='';
try{
 await test('administrator bootstrap survives V7 role and schema setup',async()=>{const x=await call(auth,'auth/signup','POST',{name:'Demo Admin',email:'admin@test.example',password:'long admin test password',setupKey:process.env.CAREINDEX_SETUP_KEY});assert.equal(x.status,201);admin=x.cookie;assert.equal(x.body.role,'ADMIN');assert.equal(Number(database.db().prepare('SELECT COUNT(*) n FROM patients').get().n),420);});
 await test('patient registration requires synthetic consent and creates isolated profile',async()=>{
  const no=await call(auth,'auth/patient-signup','POST',{name:'Alice Fiction',email:'alice@example.test',password:'long patient password'});assert.equal(no.status,400);
  const a=await call(auth,'auth/patient-signup','POST',{name:'Alice Fiction',email:'alice@example.test',password:'long patient password',syntheticConfirmation:true});assert.equal(a.status,201);assert.equal(a.body.role,'PATIENT');alice=a.cookie;aliceId=a.body.patientId;
  const b=await call(auth,'auth/patient-signup','POST',{name:'Bob Fiction',email:'bob@example.test',password:'long patient password',syntheticConfirmation:true});assert.equal(b.status,201);bob=b.cookie;bobId=b.body.patientId;assert.notEqual(aliceId,bobId);
  const p=await call(portal,'portal','GET',null,alice);assert.equal(p.status,200);assert.equal(p.body.profile.id,aliceId);assert.deepEqual(p.body.bookings,[]);
  const denied=await call(staff,'patients','GET',null,alice);assert.equal(denied.status,403);
  const list=await call(staff,'users','GET',null,admin);assert.equal(list.status,200);assert.equal(list.body.users.some(u=>u.email==='alice@example.test'),false);
 });
 await test('patient can book only own account and booking appears in staff list',async()=>{
  const date='2027-11-01';const availability=await call(booking,`booking?doctorId=d1&date=${date}`,'GET',null,alice);assert.equal(availability.status,200);assert.ok(availability.body.slots.some(s=>s.time==='09:00'&&s.available));
  const r=await call(booking,'booking','POST',{doctorId:'d1',date,time:'09:00',patientId:bobId},alice);assert.equal(r.status,201);bookId=r.body.id;
  assert.equal(database.db().prepare('SELECT patient_id FROM booked_slots WHERE id=?').get(bookId).patient_id,aliceId);
  assert.equal((await call(portal,'portal','GET',null,alice)).body.bookings.length,1);
  assert.equal((await call(portal,'portal','GET',null,bob)).body.bookings.length,0);
  const staffList=await call(staff,'appointments','GET',null,admin);assert.equal(staffList.status,200);assert.ok(staffList.body.appointments.some(a=>a.id===bookId&&a.source==='booking'));
  const stats=await call(staff,'stats','GET',null,admin);assert.ok(Number(stats.body.appointments)>185);
  const again=await call(booking,'booking','POST',{doctorId:'d1',date,time:'09:00'},bob);assert.equal(again.status,409);
 });
 await test('patient trace visibility is restricted to own requests',async()=>{
  const a=await call(portal,'portal','GET',null,alice);assert.equal(a.status,200);
  const own=await call(portal,`portal?trace=${a.traceId}`,'GET',null,alice);assert.equal(own.status,200);assert.ok(own.body.trace.steps.some(s=>s.stage==='OWNERSHIP'));
  const other=await call(portal,`portal?trace=${a.traceId}`,'GET',null,bob);assert.equal(other.status,200);assert.equal(other.body.trace,null);
 });
 await test('other patient cannot cancel or reschedule booking by guessing ID',async()=>{
  const bad=await call(booking,'booking','PATCH',{id:bookId,action:'cancel'},bob);assert.equal(bad.status,404);
  assert.equal(database.db().prepare('SELECT status FROM booked_slots WHERE id=?').get(bookId).status,'Scheduled');
  const bad2=await call(booking,'booking','PATCH',{id:bookId,action:'reschedule',doctorId:'d2',date:'2027-11-01',time:'10:00'},bob);assert.equal(bad2.status,404);
  assert.equal((await call(booking,'booking','PATCH',{id:bookId,action:'cancel'},alice,true)).status,403);
 });
 await test('owner reschedules atomically and cancelled appointment frees slot',async()=>{
  const changed=await call(booking,'booking','PATCH',{id:bookId,action:'reschedule',doctorId:'d2',date:'2027-11-01',time:'10:30'},alice);assert.equal(changed.status,200);assert.equal(changed.body.action,'rescheduled');
  const row=database.db().prepare('SELECT doctor_id,time FROM booked_slots WHERE id=?').get(bookId);assert.equal(row.doctor_id,'d2');assert.equal(row.time,'10:30');
  const cancelled=await call(booking,'booking','PATCH',{id:bookId,action:'cancel'},alice);assert.equal(cancelled.status,200);
  assert.equal(database.db().prepare('SELECT status FROM booked_slots WHERE id=?').get(bookId).status,'Cancelled');
  assert.equal((await call(booking,'booking','POST',{doctorId:'d2',date:'2027-11-01',time:'10:30'},bob)).status,201);
 });
 await test('staff cannot promote patient accounts; bulk replacement cannot break linked profiles',async()=>{
  const id=database.db().prepare('SELECT user_id FROM patient_accounts WHERE patient_id=?').get(aliceId).user_id;
  const upgrade=await call(staff,'users','PATCH',{id,role:'ADMIN'},admin);assert.equal(upgrade.status,403);
  const deletion=await call(staff,'patients','DELETE',{id:aliceId},admin);assert.equal(deletion.status,409);
  const replacement=await call(staff,'import','POST',{confirmReplace:true,files:{patients:'ID,FIRST,LAST\na,b,c'}},admin);assert.equal(replacement.status,409);
 });
}finally{try{database.db().close()}catch{};fs.rmSync(tmp,{recursive:true,force:true});}
