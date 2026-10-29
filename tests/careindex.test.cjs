const test=require('node:test');
const assert=require('node:assert/strict');
const {PatientAVLIndex,buildPatientIndex}=require('./.careindex-compiled/careindex-index.js');
const {generatePatients,importSyntheaCSV,readCSV,patientAge,newPatient}=require('./.careindex-compiled/careindex-data.js');
test('deterministic fictional dataset has distinct synthetic IDs, demo-only phones, coherent types',()=>{
 const a=generatePatients(420),b=generatePatients(420);
 assert.equal(a.length,420);assert.equal(new Set(a.map(p=>p.id)).size,420);
 assert.equal(a[0].firstName,b[0].firstName);assert.ok(a.every(p=>p.phone.includes('DEMO')));
 assert.ok(a.every(p=>p.appointments.every(x=>['Scheduled','Completed','Cancelled'].includes(x.status))));
});
test('AVL builds 1000 ordered IDs into balanced tree and reports real search paths',()=>{
 const ix=buildPatientIndex(Array.from({length:1000},(_,i)=>50001+i));
 assert.equal(ix.size,1000);assert.ok(ix.validate());assert.ok(ix.stats.height<=12);
 const trace=ix.search(50501);assert.equal(trace.found,true);assert.ok(trace.path.length<=12);assert.equal(trace.path.at(-1),50501);
 assert.equal(ix.search(59999).found,false);
});
test('AVL handles mixed inserts/deletes, missing keys, duplicates and invariants',()=>{
 const ix=new PatientAVLIndex(),ref=new Set();let seed=1234567;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return seed>>>0;};
 for(let i=0;i<4200;i++){
  const key=1+rand()%1600;const op=rand()%3;
  if(op===0){assert.equal(ix.delete(key),ref.delete(key));}
  else {const expected=!ref.has(key);assert.equal(ix.insert(key),expected);ref.add(key);}
  if(i%89===0){assert.ok(ix.validate());assert.equal(ix.size,ref.size);}
 }
 assert.ok(ix.validate());for(let key=1;key<=1600;key++)assert.equal(ix.search(key).found,ref.has(key));
});
test('Synthea quoted CSV data imports linked patients, encounters, conditions and medications',()=>{
 const files={patients:'Id,FIRST,LAST,BIRTHDATE,GENDER,CITY\n"s-001","Jane, Marie",Doe,1988-04-21,F,Testville\ns-002,Ali,Khan,1991-03-12,M,Somewhere\n',encounters:'ID,PATIENT,START,DESCRIPTION\ne-1,s-001,2024-07-01T10:00:00Z,Wellness Encounter\n',conditions:'PATIENT,DESCRIPTION\ns-001,"Asthma, unspecified"\n',medications:'PATIENT,DESCRIPTION\ns-002,Example medication\n'};
 const p=importSyntheaCSV(files);assert.equal(p.length,2);
 assert.equal(p[0].firstName,'Jane, Marie');assert.equal(p[0].visits.length,1);
 assert.equal(p[0].conditions[0],'Asthma, unspecified');assert.equal(p[1].medications[0],'Example medication');
 assert.equal(p[0].sourceId,'s-001');assert.equal(p[0].phone,'DEMO — NO PHONE');
});
test('CSV parser supports escaped quotes, multiline fields and CRLF',()=>{
 const rows=readCSV('ID,COMMENT\r\n1,"Said ""hello"" today"\r\n2,"first\nsecond"\r\n');
 assert.equal(rows.length,2);assert.equal(rows[0].COMMENT,'Said "hello" today');assert.equal(rows[1].COMMENT,'first\nsecond');
});
test('Synthea importer rejects unrelated schema and over-cap datasets',()=>{
 assert.throws(()=>importSyntheaCSV({patients:'name,age\nNotSynthetic,12'}),/Synthea/);
 const rows=Array.from({length:1001},(_,i)=>`${i},Given,Name`);
 assert.throws(()=>importSyntheaCSV({patients:'ID,FIRST,LAST\n'+rows.join('\n')}),/1,000/);
});
test('patient creation generates next unique ID above imported or existing patients',()=>{
 const patients=generatePatients(10);
 const p=newPatient({firstName:'Synthetic',lastName:'Example',dob:'2000-01-01',gender:'Other',city:'Demo',phone:'DEMO'},patients);
 assert.equal(p.id,10011);assert.equal(p.status,'Active');assert.deepEqual(p.visits,[]);
});
