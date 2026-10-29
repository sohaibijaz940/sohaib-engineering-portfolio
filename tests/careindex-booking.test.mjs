import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
// Isolated SQLite booking constraints test using the same DDL copied out of the application schema.
const source=fs.readFileSync('src/server/careindex-db.ts','utf8');
const table=(name)=>{const match=source.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name}\\([^;]+;`));assert.ok(match,`Missing ${name} DDL`);return match[0];};
const index=source.match(/CREATE UNIQUE INDEX IF NOT EXISTS unique_active_doctor_slot[^;]+;/)?.[0];assert.ok(index);
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON;');
db.exec('CREATE TABLE patients(id INTEGER PRIMARY KEY);');db.exec(table('doctors'));db.exec(table('doctor_hours'));db.exec(table('booked_slots'));db.exec(index);
db.prepare('INSERT INTO patients(id) VALUES(?)').run(10001);
db.prepare('INSERT INTO doctors(id,name,specialty,fee_cents,created_at) VALUES(?,?,?,?,?)').run('d1','Fictional clinician','General',250000,'2026-10-25');
const insert=db.prepare("INSERT INTO booked_slots(id,doctor_id,patient_id,date,time,status,created_at) VALUES(?,?,?,?,?,'Scheduled',?)");
await test('one active booking per doctor/date/time',()=>{
 insert.run('a','d1',10001,'2026-11-02','10:00','2026-10-25');
 assert.throws(()=>insert.run('b','d1',10001,'2026-11-02','10:00','2026-10-25'),/UNIQUE/);
});
await test('cancellation releases the slot',()=>{
 db.prepare("UPDATE booked_slots SET status='Cancelled' WHERE id='a'").run();
 insert.run('b','d1',10001,'2026-11-02','10:00','2026-10-25');
 assert.equal(db.prepare("SELECT COUNT(*) n FROM booked_slots WHERE status='Scheduled'").get().n,1);
});
await test('different dates permit independent reservations',()=>{
 insert.run('c','d1',10001,'2026-11-03','10:00','2026-10-25');
 assert.equal(db.prepare("SELECT COUNT(*) n FROM booked_slots WHERE status='Scheduled'").get().n,2);
});
await test('bookings enforce patient foreign key',()=>{
 assert.throws(()=>insert.run('z','d1',99999,'2026-11-04','11:00','2026-10-25'),/FOREIGN KEY/);
});
db.close();
