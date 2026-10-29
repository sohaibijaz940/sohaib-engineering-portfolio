/* Pure AVL engine tests. Run: node tests/avl.engine.test.cjs after `tsc` compiles avl.ts to tests/.compiled. */
const test=require('node:test');
const assert=require('node:assert/strict');
const {runAVL,makeTree,checkAVL,inOrder,hasNode,countNodes,ROTATION_DEMOS,cloneTree,preOrder,postOrder}=require('./.compiled/avl.js');

test('All four AVL rotation cases are triggered and restore invariants',()=>{
 for(const demo of ROTATION_DEMOS){const initial=makeTree(demo.seed);const result=runAVL(initial,'insert',demo.add);
  assert.deepEqual(result.rotationTypes,[demo.name]);assert.deepEqual(inOrder(result.root),[10,20,30]);assert.equal(checkAVL(result.root).valid,true);
  assert.ok(result.frames.some(f=>f.kind==='rotate'));
  assert.deepEqual(inOrder(initial),demo.seed.slice().sort((a,b)=>a-b));
 }
});
test('Insert/search/delete trace and unique-ID rule',()=>{
 let tree=makeTree([50,20,70,15,30,65,85]);
 const inserted=runAVL(tree,'insert',25); assert.equal(inserted.changed,true); assert.equal(hasNode(inserted.root,25),true);assert.equal(checkAVL(inserted.root).valid,true);
 const dup=runAVL(inserted.root,'insert',25);assert.equal(dup.changed,false);assert.deepEqual(inOrder(dup.root),inOrder(inserted.root));
 const found=runAVL(inserted.root,'search',65);assert.equal(found.found,true);assert.equal(found.changed,false);
 const missing=runAVL(inserted.root,'search',900);assert.equal(missing.found,false); assert.equal(missing.frames.at(-1).kind,'warning');
 const removed=runAVL(inserted.root,'delete',50);assert.equal(removed.changed,true);assert.equal(hasNode(removed.root,50),false);assert.equal(checkAVL(removed.root).valid,true);
 assert.equal(checkAVL(tree).valid,true); // immutable operation: original remains intact
});
test('Root deletion, leaf removal, empty tree and bad input',()=>{
 let r=runAVL(null,'insert',50).root;assert.deepEqual(inOrder(r),[50]);r=runAVL(r,'delete',50).root;assert.equal(r,null);
 for(const bad of [0,-1,1000,NaN,Infinity,3.4])assert.throws(()=>runAVL(null,'insert',bad));
 assert.equal(runAVL(null,'delete',99).changed,false);assert.equal(runAVL(null,'search',99).found,false);
});
test('Traversal values and node limit',()=>{
 const tree=makeTree([50,30,70,20,40,60,80]);assert.deepEqual(inOrder(tree),[20,30,40,50,60,70,80]);assert.deepEqual(preOrder(tree),[50,30,20,40,70,60,80]);assert.deepEqual(postOrder(tree),[20,40,30,60,80,70,50]);
 const limitTree=makeTree(Array.from({length:31},(_,i)=>i+1));assert.equal(countNodes(limitTree),31);assert.equal(runAVL(limitTree,'insert',99).changed,false);
});
test('Property stress: repeated mixed insert/delete/search always obey BST & AVL invariants',()=>{
 let seed=1234567;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let rep=0;rep<20;rep++){
  let tree=null;const ref=new Set();
  for(let step=0;step<260;step++){
   const id=1+Math.floor(rnd()*40);const n=rnd();const op=n<.48?'insert':n<.87?'delete':'search';
   const result=runAVL(tree,op,id);
   if(op==='insert'&&ref.size<31)ref.add(id);
   if(op==='delete')ref.delete(id);
   tree=result.root;
   assert.equal(checkAVL(tree).valid,true,`invalid after ${op} ${id} run ${rep} step ${step}`);
   assert.deepEqual(inOrder(tree),[...ref].sort((a,b)=>a-b),`mismatch run ${rep} step ${step}`);
  }
 }
});
