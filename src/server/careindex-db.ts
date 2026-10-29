/** Local-only SQLite persistence. Requires Node >=22.13; use Node 24 LTS when possible. */
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { generatePatients, type Patient } from '@/lib/careindex-data';
import {ensureBillingSchema} from './careindex-billing';

let singleton:DatabaseSync|undefined;
export function db():DatabaseSync {
 if(singleton)return singleton;
 const filename=process.env.CAREINDEX_DB_PATH?path.resolve(process.env.CAREINDEX_DB_PATH):path.join(process.cwd(),'data','careindex.sqlite');
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 const database=new DatabaseSync(filename);
 database.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
 database.exec(`
 CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('PENDING','ADMIN','CLINICIAN','RECEPTIONIST','VIEWER','PATIENT')),created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
 CREATE TABLE IF NOT EXISTS login_attempts (email TEXT PRIMARY KEY,attempts INTEGER NOT NULL,locked_until TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS patients(id INTEGER PRIMARY KEY,source_id TEXT,first_name TEXT NOT NULL,last_name TEXT NOT NULL,dob TEXT NOT NULL,gender TEXT NOT NULL,city TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('Active','Archived')),conditions TEXT NOT NULL DEFAULT '[]',medications TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS patients_status ON patients(status);
 CREATE INDEX IF NOT EXISTS patients_name ON patients(last_name,first_name);
 CREATE TABLE IF NOT EXISTS appointments(id TEXT PRIMARY KEY,patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,date TEXT NOT NULL,time TEXT NOT NULL,type TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('Scheduled','Completed','Cancelled')),notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS appointment_schedule ON appointments(date,time);
 CREATE TABLE IF NOT EXISTS doctors(id TEXT PRIMARY KEY,name TEXT NOT NULL,specialty TEXT NOT NULL,fee_cents INTEGER NOT NULL CHECK(fee_cents>=0),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS doctor_hours(doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),start_time TEXT NOT NULL,end_time TEXT NOT NULL,PRIMARY KEY(doctor_id,weekday));
 CREATE TABLE IF NOT EXISTS booked_slots(id TEXT PRIMARY KEY,doctor_id TEXT NOT NULL REFERENCES doctors(id),patient_id INTEGER NOT NULL REFERENCES patients(id),date TEXT NOT NULL,time TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('Scheduled','Cancelled','Completed')),created_at TEXT NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS unique_active_doctor_slot ON booked_slots(doctor_id,date,time) WHERE status='Scheduled';
 CREATE INDEX IF NOT EXISTS booked_slots_patient ON booked_slots(patient_id,date);
 CREATE TABLE IF NOT EXISTS visits(id TEXT PRIMARY KEY,patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,date TEXT NOT NULL,type TEXT NOT NULL,note TEXT NOT NULL,clinician TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS doctor_assignments(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,doctor_id TEXT NOT NULL REFERENCES doctors(id),assigned_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS doctor_assignment_doctor ON doctor_assignments(doctor_id);
 CREATE TABLE IF NOT EXISTS consultation_records(booking_id TEXT PRIMARY KEY REFERENCES booked_slots(id) ON DELETE RESTRICT,visit_id TEXT NOT NULL UNIQUE REFERENCES visits(id) ON DELETE RESTRICT,recorded_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,request_id TEXT NOT NULL,time TEXT NOT NULL,user_id TEXT,actor TEXT NOT NULL,role TEXT NOT NULL,method TEXT NOT NULL,resource TEXT NOT NULL,action TEXT NOT NULL,outcome TEXT NOT NULL,steps TEXT NOT NULL,duration_ms INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS audit_recent ON audit(time DESC);
 `);
 // Migration for existing V5/V6 databases: permit self-service PATIENT accounts without losing sessions.
 // Rebuilding users requires foreign keys off before BEGIN. No patient records are deleted.
 const usersDDL=String(database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get()?.sql??'');
 if(usersDDL&&!usersDDL.includes("'PATIENT'")){
  database.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;');
  try{
   database.exec(`CREATE TABLE users_v7(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('PENDING','ADMIN','CLINICIAN','RECEPTIONIST','VIEWER','PATIENT')),created_at TEXT NOT NULL);
    INSERT INTO users_v7 SELECT id,email,name,password_hash,role,created_at FROM users;
    DROP TABLE users;ALTER TABLE users_v7 RENAME TO users;`);
   database.exec('COMMIT;');
  }catch(error){database.exec('ROLLBACK;');throw error;}
  finally{database.exec('PRAGMA foreign_keys=ON;');}
  const integrity=database.prepare('PRAGMA foreign_key_check').all();
  if(integrity.length)throw Error('V7 schema migration failed foreign-key integrity verification');
 }
 database.exec(`CREATE TABLE IF NOT EXISTS patient_accounts(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,patient_id INTEGER NOT NULL UNIQUE REFERENCES patients(id) ON DELETE RESTRICT,created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS patient_account_patient ON patient_accounts(patient_id);`);
 // Idempotent synthetic doctor fixtures; never import real clinician identities.
 const count=Number(database.prepare('SELECT COUNT(*) n FROM doctors').get()?.n??0);
 if(count===0){
  const now=new Date().toISOString();
  for(const [id,name,specialty,fee] of [['d1','Dr. Ayesha Malik','General medicine',2500],['d2','Dr. Hassan Raza','Dermatology',3500],['d3','Dr. Zara Khan','Family medicine',2800]] as const){
   database.prepare('INSERT INTO doctors(id,name,specialty,fee_cents,created_at) VALUES(?,?,?,?,?)').run(id,name,specialty,fee*100,now);
   for(let weekday=1;weekday<=5;weekday++)database.prepare('INSERT INTO doctor_hours(doctor_id,weekday,start_time,end_time) VALUES(?,?,?,?)').run(id,weekday,'09:00','17:00');
  }
 }
 // V11 migration: non-destructive addition to existing booked_slots table.
 const columns=database.prepare('PRAGMA table_info(booked_slots)').all() as {name:string}[];
 if(!columns.some(column=>column.name==='checked_in_at'))database.exec('ALTER TABLE booked_slots ADD COLUMN checked_in_at TEXT');
 ensureBillingSchema(database);
 singleton=database;return database;
}
export function transaction<T>(run:()=>T):T{
 const d=db(); d.exec('BEGIN IMMEDIATE');
 try{const result=run();d.exec('COMMIT');return result;}
 catch(error){d.exec('ROLLBACK');throw error;}
}
const j=(value:string)=>{try{return JSON.parse(value)}catch{return[]}};
export function mapPatient(row:Record<string,unknown>):Patient{
 return {id:Number(row.id),sourceId:row.source_id?String(row.source_id):undefined,firstName:String(row.first_name),lastName:String(row.last_name),dob:String(row.dob),gender:String(row.gender),phone:'DEMO — NO PHONE',city:String(row.city),status:row.status as Patient['status'],conditions:j(String(row.conditions)),medications:j(String(row.medications)),visits:[],appointments:[],createdAt:String(row.created_at)};
}
export function insertPatient(p:Patient){
 db().prepare('INSERT INTO patients(id,source_id,first_name,last_name,dob,gender,city,status,conditions,medications,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(p.id,p.sourceId??null,p.firstName,p.lastName,p.dob,p.gender,p.city,p.status,JSON.stringify(p.conditions),JSON.stringify(p.medications),p.createdAt);
 for(const a of p.appointments)db().prepare('INSERT INTO appointments(id,patient_id,date,time,type,status,notes,created_at) VALUES(?,?,?,?,?,?,?,?)').run(a.id,p.id,a.date,a.time,a.type,a.status,a.notes,new Date().toISOString());
 for(const v of p.visits)db().prepare('INSERT INTO visits(id,patient_id,date,type,note,clinician,created_at) VALUES(?,?,?,?,?,?,?)').run(v.id,p.id,v.date,v.type,v.note,v.clinician,new Date().toISOString());
}
export function seedFictionalPatients(){
 if(Number(db().prepare('SELECT COUNT(*) n FROM patients').get()?.n??0)>0)return 0;
 let count=0;transaction(()=>{for(const p of generatePatients(420)){insertPatient(p);count++;}});
 return count;
}
export function hasAdmin(){return Number(db().prepare("SELECT COUNT(*) n FROM users WHERE role='ADMIN'").get()?.n??0)>0;}
