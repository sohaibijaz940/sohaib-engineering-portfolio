import {readFileSync,writeFileSync} from 'node:fs';
const ids=['trustmart','travel','careindex','word-search','avl','sql'];const result={};
for(const id of ids){const text=readFileSync(`src/content/writing/${id}.mdx`,'utf8');const words=(text.replace(/<[^>]+>/g,'').match(/\b[\w’'-]+\b/g)||[]).length;const headings=[...text.matchAll(/^## (.+)$/gm)].map(([,title])=>({title,id:title.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-')}));result[id]={words,minutes:Math.max(1,Math.round(words/200)),headings};}
writeFileSync('src/data/writing-metadata.json',JSON.stringify(result,null,2)+'\n');console.log('Prepared metadata for six MDX stories.');
