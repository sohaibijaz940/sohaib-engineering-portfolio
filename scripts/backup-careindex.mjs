/** Operator CLI: online, consistent backup of the SQLite DB. Backups include ALL records. */
import {DatabaseSync,backup} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdirSync,chmodSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const source=path.resolve(process.env.CAREINDEX_DB_PATH||'data/careindex.sqlite');
const dir=path.resolve(process.env.CAREINDEX_BACKUP_DIR||'backups');
if(!existsSync(source)){console.error('Source database does not exist:',source);process.exit(1);}
mkdirSync(dir,{recursive:true,mode:0o700});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=path.join(dir,`careindex-${stamp}.sqlite`);
const sql=new DatabaseSync(source,{readOnly:true});
try{
 const check=sql.prepare('PRAGMA quick_check').all();if(check.length!==1||check[0].quick_check!=='ok')throw Error('Database source integrity check failed');
 await backup(sql,output);chmodSync(output,0o600);
 const copy=new DatabaseSync(output,{readOnly:true});
 try{const r=copy.prepare('PRAGMA integrity_check').all();if(r.length!==1||r[0].integrity_check!=='ok')throw Error('Backup integrity check failed');if(copy.prepare('PRAGMA foreign_key_check').all().length)throw Error('Backup foreign-key check failed');}finally{copy.close();}
 const sha256=createHash('sha256').update(readFileSync(output)).digest('hex');
 writeFileSync(output+'.sha256',`${sha256}  ${path.basename(output)}\n`,{mode:0o600});
 console.log(`Verified backup created: ${output}\nSHA-256: ${sha256}\nEncrypt and copy off-host according to your approved retention plan.`);
}catch(e){console.error('Backup failed:',e instanceof Error?e.message:e);process.exitCode=1;}finally{sql.close();}
