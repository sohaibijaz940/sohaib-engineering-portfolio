import fs from 'node:fs';
import crypto from 'node:crypto';
const env='.env.local';
const existing=fs.existsSync(env)?fs.readFileSync(env,'utf8'):'';
const match=existing.match(/^CAREINDEX_SETUP_KEY=(.*)$/m);
if(match){console.log('Setup secret already exists in .env.local. Keep it private; it will not be printed again.');process.exit(0);}
const key=crypto.randomBytes(24).toString('hex');
fs.appendFileSync(env,`${existing.endsWith('\n')||!existing?'':'\n'}CAREINDEX_SETUP_KEY=${key}\n`);
console.log('\nCAREINDEX ADMIN SETUP SECRET (COPY INTO FIRST ACCOUNT FORM):\n'+key+'\n');
console.log('Stored locally in .env.local. Do not commit this file. Restart dev server after setup.');
