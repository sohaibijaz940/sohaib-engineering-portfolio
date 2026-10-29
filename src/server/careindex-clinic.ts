/** Clinic scheduling administration (synthetic-data demonstration only). */
import 'server-only';
import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {HttpError} from './careindex-trace';

export type WorkingDay={weekday:number;startTime:string;endTime:string};
const timeRe=/^([01]\d|2[0-3]):(00|30)$/;
const maxFeePKR=1_000_000;
function parseWorkingHours(value:unknown):WorkingDay[]{
 if(!Array.isArray(value)||value.length>7)throw new HttpError(400,'Working hours must contain up to seven weekdays.');
 const days=new Set<number>();const result:WorkingDay[]=[];
 for(const item of value){
  if(!item||typeof item!=='object'||Array.isArray(item))throw new HttpError(400,'Invalid working day.');
  const r=item as Record<string,unknown>;
  if(!Number.isInteger(r.weekday)||Number(r.weekday)<0||Number(r.weekday)>6||days.has(Number(r.weekday)))throw new HttpError(400,'Each weekday 0–6 must appear once.');
  if(typeof r.startTime!=='string'||typeof r.endTime!=='string'||!timeRe.test(r.startTime)||!timeRe.test(r.endTime)||r.startTime<'08:00'||r.endTime>'20:00'||r.startTime>=r.endTime)throw new HttpError(400,'Use half-hour working times between 08:00 and 20:00.');
  days.add(Number(r.weekday));result.push({weekday:Number(r.weekday),startTime:r.startTime,endTime:r.endTime});
 }
 return result.sort((a,b)=>a.weekday-b.weekday);
}
function label(value:unknown,name:string,max:number){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new HttpError(400,`${name} must be 1–${max} characters.`);return value.trim();}
function parseDoctor(input:Record<string,unknown>){
 const name=label(input.name,'Doctor name',100),specialty=label(input.specialty,'Specialty',80);
 const feePKR=Number(input.feePKR);
 if(!Number.isSafeInteger(feePKR)||feePKR<0||feePKR>maxFeePKR)throw new HttpError(400,'Fee must be a whole PKR amount between 0 and 1,000,000.');
 const hours=parseWorkingHours(input.hours);
 return{name,specialty,feeCents:feePKR*100,hours,active:input.active!==false};
}
export function getDoctorsForAdmin(database:DatabaseSync){
 const doctors=database.prepare('SELECT id,name,specialty,fee_cents AS feeCents,active FROM doctors ORDER BY name').all() as {id:string;name:string;specialty:string;feeCents:number;active:number}[];
 return doctors.map(d=>({...d,active:Boolean(d.active),hours:database.prepare('SELECT weekday,start_time AS startTime,end_time AS endTime FROM doctor_hours WHERE doctor_id=? ORDER BY weekday').all(d.id),futureBookings:Number(database.prepare("SELECT COUNT(*) n FROM booked_slots WHERE doctor_id=? AND status='Scheduled' AND date>=date('now')").get(d.id)?.n??0)}));
}
export function createDoctor(database:DatabaseSync,input:Record<string,unknown>){
 const v=parseDoctor(input);if(!v.hours.length)throw new HttpError(400,'Provide at least one working day.');
 const id=randomUUID();
 database.prepare('INSERT INTO doctors(id,name,specialty,fee_cents,active,created_at) VALUES(?,?,?,?,?,?)').run(id,v.name,v.specialty,v.feeCents,v.active?1:0,new Date().toISOString());
 const insert=database.prepare('INSERT INTO doctor_hours(doctor_id,weekday,start_time,end_time) VALUES(?,?,?,?)');
 for(const h of v.hours)insert.run(id,h.weekday,h.startTime,h.endTime);
 return id;
}
export function updateDoctor(database:DatabaseSync,input:Record<string,unknown>){
 const id=label(input.id,'Doctor ID',70);const v=parseDoctor(input);
 if(!database.prepare('SELECT 1 FROM doctors WHERE id=?').get(id))throw new HttpError(404,'Doctor not found.');
 const upcoming=database.prepare("SELECT date,time FROM booked_slots WHERE doctor_id=? AND status='Scheduled' AND date>=date('now')").all(id) as {date:string;time:string}[];
 // Existing bookings must remain inside their doctor's updated working hours.
 for(const booking of upcoming){const weekday=new Date(booking.date+'T12:00:00Z').getUTCDay(),window=v.hours.find(h=>h.weekday===weekday);
  if(!v.active||!window||booking.time<window.startTime||booking.time>=window.endTime)throw new HttpError(409,'Existing future appointments conflict with this schedule or deactivation. Reschedule/cancel them first.');
 }
 database.prepare('UPDATE doctors SET name=?,specialty=?,fee_cents=?,active=? WHERE id=?').run(v.name,v.specialty,v.feeCents,v.active?1:0,id);
 database.prepare('DELETE FROM doctor_hours WHERE doctor_id=?').run(id);
 const insert=database.prepare('INSERT INTO doctor_hours(doctor_id,weekday,start_time,end_time) VALUES(?,?,?,?)');
 for(const h of v.hours)insert.run(id,h.weekday,h.startTime,h.endTime);
 return id;
}
