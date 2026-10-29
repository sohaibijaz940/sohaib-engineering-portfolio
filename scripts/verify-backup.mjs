/** Non-destructive restore drill: copies the candidate to a throwaway DB and validates it. */
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtempSync,readFileSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import path from 'node:path';import os from 'node:os';
const source=process.argv[2];
if(!source||!existsSync(source)){console.error('Usage: npm run verify:backup -- path/to/backup.sqlite');process.exit(1);}
const expectedFile=source+'.sha256';
if(!existsSync(expectedFile)){console.error('Refusing unchecksummed backup: '+expectedFile);process.exit(1);}
const actual=createHash('sha256').update(readFileSync(source)).digest('hex');
const expected=readFileSync(expectedFile,'utf8').trim().split(/\s+/)[0];
if(expected!==actual){console.error('SHA-256 mismatch. Backup may be corrupted or tampered with.');process.exit(1);}
const dir=mkdtempSync(path.join(os.tmpdir(),'careindex-restore-drill-'));
try{
 const test=path.join(dir,randomUUID()+'.sqlite');copyFileSync(source,test);
 const db=new DatabaseSync(test,{readOnly:true});
 try{const integrity=db.prepare('PRAGMA integrity_check').all();if(integrity.length!==1||integrity[0].integrity_check!=='ok')throw Error('SQLite integrity check failed');const fk=db.prepare('PRAGMA foreign_key_check').all();if(fk.length)throw Error(`Found ${fk.length} broken foreign keys`);for(const table of ['users','patients','booked_slots','invoices','audit'])if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))throw Error(`Missing expected table ${table}`);
  console.log('PASS: checksum, SQLite integrity, foreign keys and required schema. Restore drill used an isolated temporary copy.');
 }finally{db.close();}
}catch(e){console.error('Restore drill FAILED:',e instanceof Error?e.message:e);process.exitCode=1;}finally{rmSync(dir,{recursive:true,force:true});}
