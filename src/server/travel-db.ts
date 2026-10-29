import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { destinations, stays, initialRates } from '../lib/travel-data';
let database: DatabaseSync | undefined;
export function travelDb() {
    if (database)
        return database;
    const filename = process.env.TRAVEL_DB_PATH || path.join(process.cwd(), 'data', 'travel.sqlite');
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    const d = new DatabaseSync(filename);
    d.exec(`PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE,password TEXT,role TEXT NOT NULL CHECK(role IN ('Guest','Traveller','Admin')),created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS destinations(id TEXT PRIMARY KEY,name TEXT NOT NULL,country TEXT NOT NULL,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hotels(id TEXT PRIMARY KEY,destination_id TEXT NOT NULL REFERENCES destinations(id),name TEXT NOT NULL,nightly REAL NOT NULL CHECK(nightly>0),capacity INTEGER NOT NULL CHECK(capacity>0));
CREATE TABLE IF NOT EXISTS pricing(currency TEXT PRIMARY KEY,pkr_per_unit REAL NOT NULL CHECK(pkr_per_unit>0),updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS trips(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),destination_id TEXT NOT NULL REFERENCES destinations(id),hotel_id TEXT NOT NULL REFERENCES hotels(id),title TEXT NOT NULL,input TEXT NOT NULL,estimate TEXT NOT NULL,total INTEGER NOT NULL CHECK(total>=0),created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_limits(bucket TEXT PRIMARY KEY,attempts INTEGER NOT NULL,reset_at INTEGER NOT NULL);
`);
    const now = new Date().toISOString();
    for (const x of destinations)
        d.prepare('INSERT OR IGNORE INTO destinations VALUES(?,?,?,?)').run(x.id, x.name, x.country, JSON.stringify(x));
    for (const h of stays)
        d.prepare('INSERT OR IGNORE INTO hotels VALUES(?,?,?,?,?)').run(h.id, h.destination_id, h.name, h.nightly, h.capacity);
    for (const [c, v] of Object.entries(initialRates))
        d.prepare('INSERT OR IGNORE INTO pricing VALUES(?,?,?)').run(c, v, now);
    if (!d.prepare('SELECT id FROM users WHERE email=?').get('operator@travel.demo'))
        d.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run('travel-demo-admin', 'Demo Pricing Editor', 'operator@travel.demo', hashPassword('TravelDemo!2026'), 'Admin', now);
    database = d;
    return d;
}
export function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(password, salt, 64).toString('hex'); }
export function checkPassword(password: string, hash: string) { try {
    const [salt, key] = hash.split(':');
    const actual = scryptSync(password, salt, 64), expected = Buffer.from(key, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}
catch {
    return false;
} }
export const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export type TravelUser = {
    id: string;
    name: string;
    role: 'Guest' | 'Traveller' | 'Admin';
};
export function findUser(token: string): TravelUser | null { return travelDb().prepare('SELECT u.id,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token), Date.now()) as TravelUser | undefined || null; }
export function createSession(userId: string) { const token = randomBytes(32).toString('hex'); travelDb().prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), userId, Date.now() + 7 * 86400000); return token; }
export function pricing() { return Object.fromEntries(travelDb().prepare('SELECT currency,pkr_per_unit FROM pricing').all().map(r => [String(r.currency), Number(r.pkr_per_unit)])) as Record<string, number>; }
export function limit(bucket: string, max: number, minutes: number) { const d = travelDb(), now = Date.now(); const r = d.prepare('SELECT attempts,reset_at FROM login_limits WHERE bucket=?').get(bucket); if (r && Number(r.reset_at) > now) {
    if (Number(r.attempts) >= max)
        return false;
    d.prepare('UPDATE login_limits SET attempts=attempts+1 WHERE bucket=?').run(bucket);
}
else
    d.prepare('INSERT OR REPLACE INTO login_limits VALUES(?,?,?)').run(bucket, 1, now + minutes * 60000); return true; }
export function hotelPricing() { return Object.fromEntries(travelDb().prepare("SELECT id,nightly FROM hotels").all().map(r => [String(r.id), Number(r.nightly)])) as Record<string, number>; }
