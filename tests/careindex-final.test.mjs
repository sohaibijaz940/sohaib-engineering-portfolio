import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Module=require('node:module'),ts=require('typescript');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'careindex-final-'));
process.env.CAREINDEX_DB_PATH=path.join(tmp,'demo.sqlite');process.env.CAREINDEX_SETUP_KEY='final-careindex-test-setup-secret-at-least-32';
const origin='http://localhost:3000',src=path.join(process.cwd(),'src');
const resolve=Module._resolveFilename,load=Module._load;
Module._resolveFilename=function(name,parent,...rest){if(name.startsWith('@/')){const filename=path.join(src,name.slice(2));for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(filename+ext))return filename+ext;return filename;}return resolve.call(this,name,parent,...rest);};
Module._load=function(name,parent,...rest){if(name==='server-only')return{};return load.call(this,name,parent,...rest);};
Module._extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);};
const {NextRequest}=require('next/server');
const auth=require('../src/app/api/careindex/auth/[action]/route.ts'),doctor=require('../src/app/api/careindex/doctor/route.ts'),guest=require('../src/app/api/careindex/demo/route.ts'),booking=require('../src/app/api/careindex/booking/route.ts'),data=require('../src/server/careindex-db.ts');
async function call(mod,url,method='GET',body,cookie,withOrigin=true){const req=new NextRequest(origin+'/api/careindex/'+url,{method,headers:{...(withOrigin&&method!=='GET'?{origin}:{}),...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const result=mod===auth?await mod[method](req,{params:Promise.resolve({action:url.split('/').at(-1)})}):await mod[method](req);
return{status:result.status,body:await result.json(),cookie:result.headers.get('set-cookie')?.split(';')[0]};}
let admin='',patient='',clinician='',reception='',viewer='',doctorId='',bookingId='';
try{
 await test('administrator setup remains protected by setup key',async()=>{const r=await call(auth,'auth/signup','POST',{name:'Administrator',email:'admin@demo.invalid',password:'12 plus characters password',setupKey:process.env.CAREINDEX_SETUP_KEY});assert.equal(r.status,201);admin=r.cookie;});
 await test('recruiter guest launcher is off unless explicitly enabled in synthetic mode',async()=>{const r=await call(guest,'demo','POST',{role:'PATIENT'});assert.equal(r.status,403);});
 await test('guest mode refuses missing synthetic-data flag',async()=>{process.env.CAREINDEX_ENABLE_GUESTS='true';const r=await call(guest,'demo','POST',{role:'PATIENT'});assert.equal(r.status,403);process.env.CAREINDEX_DATA_MODE='synthetic';});
 await test('guest patient and clinician have isolated roles and profile binding',async()=>{
  let r=await call(guest,'demo','POST',{role:'PATIENT'});assert.equal(r.status,201);assert.ok(r.cookie);patient=r.cookie;
  r=await call(guest,'demo','POST',{role:'CLINICIAN'});assert.equal(r.status,201);clinician=r.cookie;
  r=await call(guest,'demo','POST',{role:'RECEPTIONIST'});assert.equal(r.status,201);reception=r.cookie;
  r=await call(guest,'demo','POST',{role:'VIEWER'});assert.equal(r.status,201);viewer=r.cookie;
  const staff=await call(doctor,'doctor','GET',null,clinician);assert.equal(staff.status,200);doctorId=staff.body.selectedDoctorId;assert.ok(doctorId);assert.ok(staff.body.bookings.length===0);
  assert.equal((await call(doctor,'doctor','GET',null,patient)).status,403);
  assert.equal((await call(doctor,'doctor','GET',null,viewer)).status,403);
 });
 await test('booking appears in assigned clinician queue',async()=>{const date='2027-11-01';const r=await call(booking,'booking','POST',{doctorId,date,time:'09:30'},patient);assert.equal(r.status,201,JSON.stringify(r.body));bookingId=r.body.id;const list=await call(doctor,'doctor','GET',null,clinician);assert.equal(list.body.bookings.find(b=>b.id===bookingId).status,'Scheduled');});
 await test('guest role cannot assign clinicians and origin checks reject CSRF',async()=>{
  const userId=data.db().prepare("SELECT id FROM users WHERE role='CLINICIAN' LIMIT 1").get().id;
  assert.equal((await call(doctor,'doctor','POST',{userId,doctorId},reception)).status,403);
  assert.equal((await call(doctor,'doctor','POST',{userId,doctorId},admin,false)).status,403);
  assert.equal((await call(doctor,'doctor','POST',{userId,doctorId},admin)).status,200);
 });
 await test('check in is idempotent, viewer denied, clinician completes once',async()=>{
  const first=await call(doctor,'doctor','PATCH',{action:'check-in',bookingId},reception);assert.equal(first.status,200);
  const repeat=await call(doctor,'doctor','PATCH',{action:'check-in',bookingId},reception);assert.equal(repeat.status,200);assert.equal(repeat.body.alreadyCheckedIn,true);
  assert.equal((await call(doctor,'doctor','PATCH',{action:'complete',bookingId,note:'Fictional demo visit'},reception)).status,403);
  assert.equal((await call(doctor,'doctor','PATCH',{action:'check-in',bookingId},viewer)).status,403);
  const completed=await call(doctor,'doctor','PATCH',{action:'complete',bookingId,note:'Fictional demo visit'},clinician);
  assert.equal(completed.status,200,JSON.stringify(completed.body));assert.ok(completed.body.traceId);
  assert.equal((await call(doctor,'doctor','PATCH',{action:'complete',bookingId,note:'repeat'},clinician)).status,409);
  assert.equal(data.db().prepare('SELECT COUNT(*) AS n FROM consultation_records WHERE booking_id=?').get(bookingId).n,1);
  assert.equal(data.db().prepare('SELECT status FROM booked_slots WHERE id=?').get(bookingId).status,'Completed');
 });
 await test('unassigned doctor schedule and booking mutation are blocked',async()=>{
  const another='d2',patientId=data.db().prepare('SELECT patient_id AS id FROM patient_accounts LIMIT 1').get().id;
  data.db().prepare("INSERT INTO booked_slots(id,doctor_id,patient_id,date,time,status,created_at) VALUES(?,?,?,?,?,'Scheduled',?)").run('different-doctor-booking',another,patientId,'2027-11-02','09:00',new Date().toISOString());
  assert.equal((await call(doctor,`doctor?doctorId=${another}`,'GET',null,clinician)).status,403);
  assert.equal((await call(doctor,'doctor','PATCH',{action:'check-in',bookingId:'different-doctor-booking'},clinician)).status,403);
  assert.equal((await call(doctor,'doctor','PATCH',{action:'check-in',bookingId:'different-doctor-booking'},reception)).status,200);
 });
}finally{try{data.db().close()}catch{};fs.rmSync(tmp,{recursive:true,force:true});}
