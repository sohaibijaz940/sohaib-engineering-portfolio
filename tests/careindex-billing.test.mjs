/** V8 billing integration tests: real Node SQLite, HTTP handlers, no network, no real payments. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),Module=require('node:module');
const ts=require('typescript');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'careindex-v8-'));process.env.CAREINDEX_DB_PATH=path.join(tmp,'test.sqlite');
const src=path.join(process.cwd(),'src'),origin='http://localhost:3000';
class FakeNextRequest extends Request {constructor(url,opt){super(url,opt);this.nextUrl=new URL(url);this.cookies={get:(name)=>{const entry=this.headers.get('cookie')?.split('; ').find(v=>v.startsWith(name+'='));return entry?{value:entry.slice(name.length+1)}:undefined;}};}}
const oldResolve=Module._resolveFilename,oldLoad=Module._load;
Module._resolveFilename=function(name,parent,...rest){if(name.startsWith('@/')){const filename=path.join(src,name.slice(2));for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(filename+ext))return filename+ext;return filename;}return oldResolve.call(this,name,parent,...rest);};
Module._load=function(name,parent,...rest){if(name==='server-only')return{};if(name==='next/server')return {NextRequest:FakeNextRequest,NextResponse:{json:(b,opts)=>Response.json(b,opts)}};return oldLoad.call(this,name,parent,...rest);};
Module._extensions['.ts']=function(mod,filename){const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;mod._compile(js,filename);};
const billing=require('../src/app/api/careindex/billing/route.ts'),booking=require('../src/app/api/careindex/booking/route.ts');
const {db,insertPatient}=require('../src/server/careindex-db.ts'),{ensureBillingSchema}=require('../src/server/careindex-billing.ts');
const store=db();let admin='',alice='',bob='',invoiceId='',bookingId='';
function makeSession(role,email,patientId){const id=randomUUID(),token=randomBytes(32).toString('hex');store.prepare('INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?)').run(id,email,email,'test-only',role,new Date().toISOString());const sha=createHash('sha256').update(token).digest('hex');store.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(sha,id,'2099-01-01T00:00:00.000Z',new Date().toISOString());if(patientId)store.prepare('INSERT INTO patient_accounts(user_id,patient_id,created_at) VALUES(?,?,?)').run(id,patientId,new Date().toISOString());return 'careindex_session='+token;}
async function call(api,path,method='GET',body,cookie,noOrigin=false){const req=new FakeNextRequest(origin+'/api/careindex/'+path,{method,headers:{...(method!=='GET'&&!noOrigin?{origin}:{}),...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const response=await api[method](req);return {status:response.status,body:await response.json()};}
const monday='2099-12-07';
await test('bootstrap and previous bookings receive an invoice exactly once',()=>{
 insertPatient({id:91001,firstName:'Fiction',lastName:'Alice',dob:'1992-01-01',gender:'Unknown',city:'Demo',status:'Active',conditions:[],medications:[],visits:[],appointments:[],createdAt:new Date().toISOString()});
 insertPatient({id:91002,firstName:'Fiction',lastName:'Bob',dob:'1993-01-01',gender:'Unknown',city:'Demo',status:'Active',conditions:[],medications:[],visits:[],appointments:[],createdAt:new Date().toISOString()});
 admin=makeSession('ADMIN','admin@sample.test');alice=makeSession('PATIENT','alice@sample.test',91001);bob=makeSession('PATIENT','bob@sample.test',91002);
 store.prepare("INSERT INTO booked_slots(id,doctor_id,patient_id,date,time,status,created_at) VALUES(?,'d1',?,'2099-12-08','09:00','Scheduled',?)").run('legacy-demo-booking',91001,new Date().toISOString());
 ensureBillingSchema(store);ensureBillingSchema(store);
 assert.equal(store.prepare("SELECT COUNT(*) n FROM invoices WHERE booking_id='legacy-demo-booking'").get().n,1);
});
await test('booking creates a single invoice in the same transaction',async()=>{
 const r=await call(booking,'booking','POST',{doctorId:'d2',date:monday,time:'09:00'},alice);assert.equal(r.status,201,JSON.stringify(r.body));bookingId=r.body.id;
 const row=store.prepare('SELECT i.id,i.amount_cents AS amount,i.status FROM invoices i WHERE i.booking_id=?').get(bookingId);
 assert.ok(row?.id);assert.equal(row.status,'OPEN');assert.equal(row.amount,350000);invoiceId=row.id;
 const list=await call(billing,'billing','GET',null,alice);assert.equal(list.status,200);assert.equal(list.body.invoices.some(x=>x.id===invoiceId),true);
});
await test('different patient cannot view or pay another patient invoice',async()=>{
 const get=await call(billing,`billing?id=${invoiceId}`,'GET',null,bob);assert.equal(get.status,404);
 const pay=await call(billing,'billing','POST',{action:'simulate-payment',invoiceId},bob);assert.equal(pay.status,404);
 const list=await call(billing,'billing','GET',null,bob);assert.equal(list.status,200);assert.deepEqual(list.body.invoices,[]);
});
await test('CSRF prevents state change',async()=>{
 const r=await call(billing,'billing','POST',{action:'simulate-payment',invoiceId},alice,true);assert.equal(r.status,403);
 assert.equal(store.prepare('SELECT status FROM invoices WHERE id=?').get(invoiceId).status,'OPEN');
});
await test('simulated checkout is idempotent, has one ledger event, uses server fee',async()=>{
 const r=await call(billing,'billing','POST',{action:'simulate-payment',invoiceId,amountCents:1},alice);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.alreadyPaid,false);assert.equal(r.body.invoice.status,'PAID_DEMO');
 const second=await call(billing,'billing','POST',{action:'simulate-payment',invoiceId},alice);assert.equal(second.status,200);assert.equal(second.body.alreadyPaid,true);
 assert.equal(store.prepare("SELECT COUNT(*) n FROM billing_events WHERE invoice_id=? AND kind='PAYMENT_DEMO'").get(invoiceId).n,1);
 assert.equal(store.prepare('SELECT amount_cents FROM billing_events WHERE invoice_id=?').get(invoiceId).amount_cents,350000);
});
await test('paid booking cancellation requires explicit simulated refund',async()=>{
 const cancel=await call(booking,'booking','PATCH',{id:bookingId,action:'cancel'},alice);assert.equal(cancel.status,200,JSON.stringify(cancel.body));
 assert.equal(store.prepare('SELECT status FROM invoices WHERE id=?').get(invoiceId).status,'REFUND_DUE');
 const patientRefund=await call(billing,'billing','PATCH',{action:'simulate-refund',invoiceId},alice);assert.equal(patientRefund.status,403);
 const adminRefund=await call(billing,'billing','PATCH',{action:'simulate-refund',invoiceId},admin);assert.equal(adminRefund.status,200,JSON.stringify(adminRefund.body));assert.equal(adminRefund.body.invoice.status,'REFUNDED_DEMO');
 const again=await call(billing,'billing','PATCH',{action:'simulate-refund',invoiceId},admin);assert.equal(again.status,200);assert.equal(again.body.alreadyRefunded,true);
 assert.equal(store.prepare("SELECT COUNT(*) n FROM billing_events WHERE invoice_id=? AND kind='REFUND_DEMO'").get(invoiceId).n,1);
});
await test('unpaid cancellation voids invoice and blocks checkout',async()=>{
 const booked=await call(booking,'booking','POST',{doctorId:'d2',date:monday,time:'10:00'},bob);assert.equal(booked.status,201);
 const invoice=store.prepare('SELECT id FROM invoices WHERE booking_id=?').get(booked.body.id);
 const cancelled=await call(booking,'booking','PATCH',{id:booked.body.id,action:'cancel'},bob);assert.equal(cancelled.status,200);
 assert.equal(store.prepare('SELECT status FROM invoices WHERE id=?').get(invoice.id).status,'VOID');
 const payment=await call(billing,'billing','POST',{action:'simulate-payment',invoiceId:invoice.id},bob);assert.equal(payment.status,409);
});
await test('cannot change paid invoice to a different consultation fee',async()=>{
 const r=await call(booking,'booking','POST',{doctorId:'d2',date:monday,time:'11:00'},alice);assert.equal(r.status,201);
 const iv=store.prepare('SELECT id FROM invoices WHERE booking_id=?').get(r.body.id);
 const paid=await call(billing,'billing','POST',{action:'simulate-payment',invoiceId:iv.id},alice);assert.equal(paid.status,200);
 const move=await call(booking,'booking','PATCH',{id:r.body.id,action:'reschedule',date:monday,time:'11:30',doctorId:'d1'},alice);
 assert.equal(move.status,409,JSON.stringify(move.body));
 assert.equal(store.prepare('SELECT doctor_id FROM booked_slots WHERE id=?').get(r.body.id).doctor_id,'d2');
});
await test('only administrators can simulate refunds',async()=>{
 const r=await call(billing,'billing','PATCH',{action:'simulate-refund',invoiceId},bob);assert.equal(r.status,403);
});
afterAll();
function afterAll(){store.close();fs.rmSync(tmp,{recursive:true,force:true});}
