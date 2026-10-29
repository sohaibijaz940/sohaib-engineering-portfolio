const {test}=require('node:test');
const assert=require('node:assert/strict');
const {avlWalkthrough,hashWalkthrough,trieWalkthrough,intervalWalkthrough,parseKeys,overlap}=require('./.learning-compiled/careindex-learning.js');
const {PatientAVLIndex}=require('./.learning-compiled/careindex-index.js');
test('AVL engine emits correct LL/RR/LR/RL rotations, validates tree',()=>{
 for(const [sequence,expected] of [[[30,20,10],'LL'],[[10,20,30],'RR'],[[30,10,20],'LR'],[[10,30,20],'RL']]){
  const ix=new PatientAVLIndex();sequence.forEach(k=>ix.insert(k));assert.equal(ix.validate(),true);assert.equal(ix.root.key,20);assert.ok(ix.rotationEvents.some(r=>r.kind===expected),`${expected} wasn't recorded`);
  const lab=avlWalkthrough(sequence,20);assert.ok(lab.steps.some(s=>s.title.includes(`${expected} rotation`)));assert.match(lab.summary,/Found/);
 }
});
test('AVL lookup path corresponds to original engine',()=>{
 const keys=[50,30,70,20,40,60,80];const ix=new PatientAVLIndex();keys.forEach(k=>ix.insert(k));const search=ix.search(40);
 const lab=avlWalkthrough(keys,40);assert.deepEqual(lab.steps.filter(s=>s.title.startsWith('Compare')).map(s=>Number(s.title.match(/with (\d+)/)[1])),search.path);
});
test('Hash chains show collisions and worst-case lookup sequence',()=>{
 const lab=hashWalkthrough([7,14,21,3],21,7);assert.ok(lab.steps.some(s=>s.detail.includes('Collision')));assert.equal(lab.steps.at(-1).highlight[1],21);assert.match(lab.summary,/Found/);
});
test('Trie matches case-insensitive prefix and no-match',()=>{
 const words=['Alex','Alina','Ayesha','Zara'];assert.deepEqual(trieWalkthrough(words,'al').suggestions,['Alex','Alina']);assert.deepEqual(trieWalkthrough(words,'xy').suggestions,[]);
});
test('Intervals respect half-open boundaries and reject actual overlaps',()=>{
 assert.equal(overlap({from:'09:00',to:'09:30'},{from:'09:30',to:'10:00'}),false);
 assert.equal(overlap({from:'09:10',to:'09:40'},{from:'09:30',to:'10:00'}),true);
 assert.deepEqual(intervalWalkthrough({from:'09:30',to:'10:00'},[{from:'09:00',to:'09:30'},{from:'09:35',to:'10:30'}]).conflicts,[1]);
});
test('Input validation blocks duplicate, negative and huge datasets',()=>{
 assert.throws(()=>parseKeys('2,2'),/unique/);assert.throws(()=>parseKeys('-1,2'),/positive/);assert.throws(()=>parseKeys(''),/positive/);assert.throws(()=>parseKeys(Array.from({length:14},(_,i)=>i+1).join(',')),/1–13/);
});
