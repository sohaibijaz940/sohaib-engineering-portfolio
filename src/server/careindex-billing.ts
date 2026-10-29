/** CareIndex V8 invoice domain: fictional invoices and simulated payments only. */
import 'server-only';
import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';

export type InvoiceStatus='OPEN'|'PAID_DEMO'|'VOID'|'REFUND_DUE'|'REFUNDED_DEMO';
type InvoiceRow={id:string;status:InvoiceStatus;amount_cents:number;fee_cents:number;doctor_id:string};
const timestamp=()=>new Date().toISOString();
const invoiceNumber=()=>`CI-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${randomUUID().slice(0,8).toUpperCase()}`;

export function ensureBillingSchema(database:DatabaseSync){
 database.exec(`CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,invoice_number TEXT NOT NULL UNIQUE,booking_id TEXT NOT NULL UNIQUE REFERENCES booked_slots(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),currency TEXT NOT NULL DEFAULT 'PKR' CHECK(currency='PKR'),
  status TEXT NOT NULL CHECK(status IN ('OPEN','PAID_DEMO','VOID','REFUND_DUE','REFUNDED_DEMO')),
  created_at TEXT NOT NULL,updated_at TEXT NOT NULL,paid_at TEXT
 );
 CREATE INDEX IF NOT EXISTS invoice_status ON invoices(status,created_at);
 CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK(kind IN ('PAYMENT_DEMO','REFUND_DEMO')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents>=0),occurred_at TEXT NOT NULL,
  UNIQUE(invoice_id,kind)
 );`);
 // Idempotent migration: existing V6/V7 reservations get an invoice. Nothing is deleted.
 database.exec('BEGIN IMMEDIATE');
 try{
  const missing=database.prepare(`SELECT b.id,b.status,d.fee_cents AS fee
    FROM booked_slots b JOIN doctors d ON d.id=b.doctor_id
    LEFT JOIN invoices i ON i.booking_id=b.id WHERE i.id IS NULL`).all() as {id:string;status:string;fee:number}[];
  const insert=database.prepare('INSERT INTO invoices(id,invoice_number,booking_id,amount_cents,currency,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
  for(const r of missing){const now=timestamp();insert.run(randomUUID(),invoiceNumber(),r.id,r.fee,'PKR',r.status==='Cancelled'?'VOID':'OPEN',now,now);}
  database.exec('COMMIT');
 }catch(error){database.exec('ROLLBACK');throw error;}
}

/** Called *inside* the same appointment-booking transaction. */
export function issueInvoice(database:DatabaseSync,bookingId:string){
 const r=database.prepare('SELECT b.id,d.fee_cents AS fee FROM booked_slots b JOIN doctors d ON b.doctor_id=d.id WHERE b.id=?').get(bookingId) as {id:string;fee:number}|undefined;
 if(!r)throw Error('Booking must exist before issuing invoice');
 const now=timestamp(),id=randomUUID();
 database.prepare("INSERT INTO invoices(id,invoice_number,booking_id,amount_cents,currency,status,created_at,updated_at) VALUES(?,?,?,?,'PKR','OPEN',?,?)").run(id,invoiceNumber(),r.id,r.fee,now,now);
 return id;
}
/** Called inside the booking transaction; paid invoices cannot silently change price. */
export function updateInvoiceForReschedule(database:DatabaseSync,bookingId:string,newDoctorId:string){
 const invoice=database.prepare('SELECT id,status,amount_cents FROM invoices WHERE booking_id=?').get(bookingId) as Pick<InvoiceRow,'id'|'status'|'amount_cents'>|undefined;
 if(!invoice)return;
 const doctor=database.prepare('SELECT fee_cents AS fee FROM doctors WHERE id=? AND active=1').get(newDoctorId) as {fee:number}|undefined;
 if(!doctor)throw Error('Doctor not found');
 if(invoice.status==='OPEN')database.prepare('UPDATE invoices SET amount_cents=?,updated_at=? WHERE id=?').run(doctor.fee,timestamp(),invoice.id);
 else if(doctor.fee!==invoice.amount_cents)throw Error('PAID_CHANGE_FEE');
}
/** Invoice state remains truthful when a booking is cancelled. */
export function voidOrRefundDue(database:DatabaseSync,bookingId:string){
 const invoice=database.prepare('SELECT id,status FROM invoices WHERE booking_id=?').get(bookingId) as {id:string;status:InvoiceStatus}|undefined;
 if(!invoice)return;
 if(invoice.status==='OPEN')database.prepare("UPDATE invoices SET status='VOID',updated_at=? WHERE id=?").run(timestamp(),invoice.id);
 else if(invoice.status==='PAID_DEMO')database.prepare("UPDATE invoices SET status='REFUND_DUE',updated_at=? WHERE id=?").run(timestamp(),invoice.id);
}
