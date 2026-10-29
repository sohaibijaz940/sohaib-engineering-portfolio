/** Deterministic, testable educational algorithms. No patient information is needed. */
import {PatientAVLIndex,type IndexNode} from './careindex-index';
export type Snapshot={key:number;height:number;left:Snapshot|null;right:Snapshot|null};
export type LabStep={title:string;detail:string;pseudocode:string;highlight:number[];tree?:Snapshot|null;buckets?:number[][];visited?:string[];result?:string};
const clone=(node:IndexNode|null):Snapshot|null=>node?{key:node.key,height:node.height,left:clone(node.left),right:clone(node.right)}:null;
export function parseKeys(raw:string,max=13):number[]{
 const parts=raw.split(',').map(s=>s.trim());
 if(!parts.length||parts.length>max||parts.some(x=>!/^\d{1,7}$/.test(x)))throw new Error(`Enter 1–${max} comma-separated positive numeric IDs.`);
 const vals=parts.map(Number);
 if(vals.some(x=>x<=0)||new Set(vals).size!==vals.length)throw new Error('IDs must be positive and unique.');
 return vals;
}
export function avlWalkthrough(keys:number[],target:number):{steps:LabStep[];summary:string;stats:{size:number;height:number;rotations:number}}{
 const ix=new PatientAVLIndex();const steps:LabStep[]=[{title:'Empty AVL index',detail:'Every insertion maintains the binary-search ordering invariant.',pseudocode:'root = null',highlight:[],tree:null}];
 for(const key of keys){const prev=ix.rotationEvents.length;ix.insert(key);
  steps.push({title:`Insert ID ${key}`,detail:`Place ${key} using binary-search ordering. The engine recomputes heights and rebalances as required.`,pseudocode:`root = insert(root, ${key})`,highlight:[key],tree:clone(ix.root)});
  for(const r of ix.rotationEvents.slice(prev))steps.push({title:`${r.kind} rotation at ${r.pivot}`,detail:`The original AVL engine classified this as a ${r.kind} imbalance and rotated the subtree. This snapshot is the balanced result.`,pseudocode:r.kind==='LL'?'rotateRight(pivot)':r.kind==='RR'?'rotateLeft(pivot)':r.kind==='LR'?'rotateLeft(child); rotateRight(pivot)':'rotateRight(child); rotateLeft(pivot)',highlight:[r.pivot],tree:clone(ix.root)});
 }
 const found=ix.search(target);
 for(let i=0;i<found.path.length;i++){const key=found.path[i];steps.push({title:`Compare ${target} with ${key}`,detail:target===key?'The requested ID matches this node. Search completes.':`Target ${target} is ${target<key?'smaller':'larger'}, so search moves ${target<key?'left':'right'}.`,pseudocode:target===key?'return node':target<key?'node = node.left':'node = node.right',highlight:found.path.slice(0,i+1),tree:clone(ix.root)});}
 if(!found.found)steps.push({title:'ID not found',detail:'Traversal ended at an empty child. The key does not exist in the index.',pseudocode:'return null',highlight:found.path,tree:clone(ix.root)});
 return{steps,summary:`${found.found?'Found':'Not found'} · ${found.comparisons} comparisons · height ${ix.stats.height} · ${ix.stats.rotations} individual rotations`,stats:ix.stats};
}
export function hashWalkthrough(keys:number[],target:number,bucketCount=7):{steps:LabStep[];summary:string;bucketCount:number}{
 if(!Number.isSafeInteger(bucketCount)||bucketCount<2||bucketCount>30)throw Error('Invalid bucket count.');
 const buckets:number[][]=Array.from({length:bucketCount},()=>[]);
 const snap=()=>buckets.map(b=>[...b]);
 const steps:LabStep[]=[{title:'Initialize hash buckets',detail:'This simplified hash table uses separate chaining and a modular hash. Real hash maps often use more sophisticated hashes and resizing.',pseudocode:`buckets = Array(${bucketCount})`,highlight:[],buckets:snap()}];
 for(const key of keys){const slot=key%bucketCount;const collisions=buckets[slot].length;buckets[slot].push(key);steps.push({title:`Hash and insert ${key}`,detail:`h(${key}) = ${key} % ${bucketCount} = ${slot}.${collisions?` Collision: add to chain of ${collisions} existing ${collisions===1?'key':'keys'}.`:' Bucket was empty.'}`,pseudocode:`buckets[${slot}].push(${key})`,highlight:[slot],buckets:snap()});}
 const slot=target%bucketCount;steps.push({title:`Locate bucket ${slot}`,detail:`Compute target hash ${target} % ${bucketCount} = ${slot}. Only the chosen chain must be scanned.`,pseudocode:`bucket = buckets[${slot}]`,highlight:[slot],buckets:snap()});
 for(const key of buckets[slot]){steps.push({title:`Compare ${target} with ${key}`,detail:key===target?'Matching key found.':'No match; advance to the next entry in the collision chain.',pseudocode:`if (entry === ${target}) return entry`,highlight:[slot,key],buckets:snap()});if(key===target)break;}
 const found=buckets[slot].includes(target);
 if(!found)steps.push({title:'Not in chain',detail:'The target does not exist in the selected bucket.',pseudocode:'return null',highlight:[slot],buckets:snap()});
 return{steps,summary:`${found?'Found':'Not found'} · bucket ${slot} · chain length ${buckets[slot].length} · O(1) average, O(n) worst-case`,bucketCount};
}
export function trieWalkthrough(words:string[],prefix:string):{steps:LabStep[];summary:string;suggestions:string[]}{
 const root={children:new Map<string,unknown>(),end:false};type TrieNode=typeof root;
 for(const word of words){let cur:TrieNode=root;for(const char of word.toLowerCase()){if(!cur.children.has(char))cur.children.set(char,{children:new Map<string,unknown>(),end:false});cur=cur.children.get(char) as TrieNode;}cur.end=true;}
 const steps:LabStep[]=[{title:'Build a fictional-name Trie',detail:`Inserted ${words.length} fictional doctor names. Each edge represents one character.`,pseudocode:'insert all words into prefix tree',highlight:[],visited:[]}];
 let cur:TrieNode|undefined=root;const visited:string[]=[];
 for(const ch of prefix.toLowerCase()){const next:TrieNode|undefined=cur?.children.get(ch) as TrieNode|undefined;visited.push(ch);steps.push({title:`Follow '${ch}'`,detail:next?'Matching prefix branch exists.':'No matching branch: there are no suggestions for this prefix.',pseudocode:`node = node.children['${ch}']`,highlight:[],visited:[...visited],result:next?'match':'missing'});cur=next;if(!cur)break;}
 const suggestions=cur?words.filter(w=>w.toLowerCase().startsWith(prefix.toLowerCase())).slice(0,8):[];
 steps.push({title:'Collect suggestions',detail:suggestions.length?`Suggestions: ${suggestions.join(', ')}`:'No matching fictional names.',pseudocode:'depthFirstCollect(node, limit = 8)',highlight:[],visited:[...visited],result:suggestions.join(', ')});
 return{steps,summary:`${suggestions.length} matching suggestions · prefix traversal O(L) for L characters, excluding output collection`,suggestions};
}
export type TimeWindow={from:string;to:string};
export function overlap(a:TimeWindow,b:TimeWindow):boolean{return a.from<b.to&&b.from<a.to;}
export function intervalWalkthrough(request:TimeWindow,existing:TimeWindow[]):{steps:LabStep[];summary:string;conflicts:number[]}{
 const valid=(x:TimeWindow)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x.from)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x.to)&&x.from<x.to;
 if(!valid(request)||existing.some(x=>!valid(x)))throw Error('Time windows must have valid increasing HH:MM bounds.');
 const steps:LabStep[]=[{title:'Receive requested interval',detail:`Requested appointment [${request.from}, ${request.to}). End is exclusive so a new visit can start exactly as another ends.`,pseudocode:'request = [start, end)',highlight:[]}];
 const conflicts:number[]=[];
 for(let i=0;i<existing.length;i++){const e=existing[i],hit=overlap(request,e);if(hit)conflicts.push(i);steps.push({title:`Compare existing interval ${i+1}`,detail:`[${request.from}, ${request.to}) vs [${e.from}, ${e.to}): ${hit?'OVERLAP':'no overlap'}.`,pseudocode:`request.start < existing.end && existing.start < request.end  // ${hit}`,highlight:[i],result:hit?'CONFLICT':'AVAILABLE'});}
 steps.push({title:conflicts.length?'Reject conflicting slot':'Interval is conflict-free',detail:conflicts.length?'A real app must enforce the booking rule inside a database transaction or constraint.':'A conflict-free check is necessary but must be committed atomically to avoid two concurrent bookings.',pseudocode:conflicts.length?'return 409 Conflict':'BEGIN; INSERT booking; COMMIT',highlight:conflicts,result:conflicts.length?'BLOCKED':'ELIGIBLE'});
 return{steps,summary:`${conflicts.length} overlaps detected · O(n) scan in this teaching example`,conflicts};
}
