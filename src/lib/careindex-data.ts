/** Fictional demo records. NOT Synthea records. Only import official synthetic Synthea data. */
export type CareStatus='Active'|'Archived';
export type Visit={id:string;date:string;type:string;note:string;clinician:string};
export type Appointment={id:string;date:string;time:string;type:string;status:'Scheduled'|'Completed'|'Cancelled';notes:string};
export type Patient={id:number;sourceId?:string;firstName:string;lastName:string;dob:string;gender:string;phone:string;city:string;status:CareStatus;conditions:string[];medications:string[];visits:Visit[];appointments:Appointment[];createdAt:string};
export type DataSource='demo'|'synthea'|'custom-demo';
export type CareStore={version:1;source:DataSource;patients:Patient[];lastUpdated:string};
const FIRST=['Avery','Noah','Aisha','Oliver','Maya','Liam','Sana','Elijah','Amelia','Omar','Isabella','Ethan','Fatima','Emma','Daniel','Hana','Sophia','Adam','Grace','Yusuf','Zara','Lucas','Amir','Mia','Alex','Leila','Leo','Noor'];
const LAST=['Carter','Khan','Williams','Malik','Brooks','Ali','Miller','Rahman','Bennett','Patel','Wilson','Ahmad','Diaz','Farooq','Harris','Qureshi','Morgan','Singh','Turner','Shah'];
const CONDITIONS=['Seasonal allergies','Hypertension','Type 2 diabetes','Asthma','Migraine','Arthritis','Vitamin D deficiency','None recorded'];
const TYPES=['Routine check-up','Follow-up','Consultation','Lab review','Annual wellness'];
function rand(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};}
const pick=<T,>(a:T[],r:()=>number)=>a[Math.floor(r()*a.length)];
const isoDays=(offset:number,base=new Date())=>{const d=new Date(base);d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10);};
export function generatePatients(n=420):Patient[]{const r=rand(940332);const result:Patient[]=[];
 for(let i=0;i<n;i++){
  const age=18+Math.floor(r()*66), year=new Date().getFullYear()-age;
  const firstName=pick(FIRST,r),lastName=pick(LAST,r),id=10001+i;
  const cond=pick(CONDITIONS,r),conditions=cond==='None recorded'?[]:[cond];
  const visits:Visit[]=Array.from({length:Math.floor(r()*4)},(_,j)=>({id:`v-${id}-${j}`,date:isoDays(-15-Math.floor(r()*420)),type:pick(TYPES,r),note:'Demonstration visit record — no real clinical notes.',clinician:'Demo clinician'})).sort((a,b)=>b.date.localeCompare(a.date));
  const appointments:Appointment[]=[];
  if(r()>.43){const off=Math.floor(r()*17)-4;appointments.push({id:`a-${id}-0`,date:isoDays(off),time:pick(['09:00','10:30','11:15','13:45','15:00'],r),type:pick(TYPES,r),status:off<0?'Completed':'Scheduled',notes:'Synthetic appointment'});}
  result.push({id,firstName,lastName,dob:`${year}-${String(Math.ceil(r()*12)).padStart(2,'0')}-${String(Math.ceil(r()*28)).padStart(2,'0')}`,gender:pick(['Female','Male','Other'],r),phone:'DEMO — NO PHONE',city:pick(['North District','Central District','West District','East District'],r),status:'Active',conditions,medications:[],visits,appointments,createdAt:isoDays(-Math.floor(r()*600))});
 }
 return result;
}
export function initialStore():CareStore{return{version:1,source:'demo',patients:generatePatients(),lastUpdated:new Date().toISOString()};}
export const STORE_KEY='careindex_v1_synthetic_only';
export function safeLoad():CareStore|null{if(typeof window==='undefined')return null;try{const raw=window.localStorage.getItem(STORE_KEY);if(!raw)return null;const s=JSON.parse(raw) as CareStore;if(s.version!==1||!Array.isArray(s.patients)||s.patients.length>1500||s.patients.some(p=>!Number.isSafeInteger(p.id)||typeof p.firstName!=='string'||!Array.isArray(p.appointments)||!Array.isArray(p.visits)))return null;return s;}catch{return null;}}
export function saveStore(s:CareStore):boolean{try{window.localStorage.setItem(STORE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export function patientName(p:Patient){return `${p.firstName} ${p.lastName}`.trim();}
export function patientAge(p:Patient){const d=new Date(p.dob);if(Number.isNaN(d.getTime()))return'—';const now=new Date();return now.getFullYear()-d.getFullYear()-(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate())?1:0);}
export function newPatient(values:Pick<Patient,'firstName'|'lastName'|'dob'|'gender'|'city'|'phone'>,current:Patient[]):Patient{const id=Math.max(10000,...current.map(p=>p.id))+1;return{id,...values,status:'Active',conditions:[],medications:[],visits:[],appointments:[],createdAt:isoDays(0)};}
/** RFC4180-style CSV parsing, supporting quoted commas, escaped quotes, and newlines. */
export function readCSV(text:string):Record<string,string>[] {
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}else field+=c;}
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2)return[];const headers=rows[0].map(h=>h.replace(/^\uFEFF/,'').trim().toUpperCase());
 return rows.slice(1).map(vals=>Object.fromEntries(headers.map((h,i)=>[h,(vals[i]??'').trim()])));
}
function cap(s:string,n:number){return (s||'').replace(/[<>]/g,'').slice(0,n);}
/** Import an official Synthea Patients.csv and optional Encounters.csv, Conditions.csv, Medications.csv. */
export function importSyntheaCSV(files:Record<string,string>):Patient[]{
 const ptext=files.patients;if(!ptext)throw new Error('Select patients.csv from an official Synthea export.');
 const rows=readCSV(ptext);if(!rows.length||!('ID'in rows[0])||!('FIRST'in rows[0])||!('LAST'in rows[0]))throw new Error('This does not look like Synthea patients.csv.');
 if(rows.length>1000)throw new Error('For the browser demo, import at most 1,000 synthetic patients.');
 const now=isoDays(0);const index=new Map<string,Patient>();
 rows.forEach((r,i)=>{if(!r.ID||index.has(r.ID))return;index.set(r.ID,{id:50001+i,sourceId:cap(r.ID,80),firstName:cap(r.FIRST,60),lastName:cap(r.LAST,60),dob:r.BIRTHDATE||'2000-01-01',gender:cap(r.GENDER||'Unknown',20),phone:'DEMO — NO PHONE',city:cap(r.CITY||'Synthetic population',60),status:'Active',conditions:[],medications:[],visits:[],appointments:[],createdAt:now});});
 if(files.encounters){for(const r of readCSV(files.encounters).slice(0,40000)){const p=index.get(r.PATIENT);if(!p||p.visits.length>=15)continue;p.visits.push({id:cap(r.ID||`v-${p.id}-${p.visits.length}`,100),date:(r.START||now).slice(0,10),type:cap(r.DESCRIPTION||r.ENCOUNTERCLASS||'Medical encounter',80),clinician:'Synthea simulated practitioner',note:'Imported synthetic Synthea encounter (source has no free-text clinical note).'});}}
 if(files.conditions){for(const r of readCSV(files.conditions).slice(0,40000)){const p=index.get(r.PATIENT);if(!p)continue;const desc=cap(r.DESCRIPTION,85);if(desc&&!p.conditions.includes(desc)&&p.conditions.length<12)p.conditions.push(desc);}}
 if(files.medications){for(const r of readCSV(files.medications).slice(0,40000)){const p=index.get(r.PATIENT);if(!p)continue;const desc=cap(r.DESCRIPTION,85);if(desc&&!p.medications.includes(desc)&&p.medications.length<12)p.medications.push(desc);}}
 const result=[...index.values()];if(!result.length)throw new Error('No usable synthetic patients were found.');return result;
}
