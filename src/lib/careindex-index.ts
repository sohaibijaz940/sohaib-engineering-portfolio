/** CareIndex's real, in-memory AVL index. This is for an educational, synthetic-data demo.
 * Database indexes, not a bespoke JS tree, should be the authoritative index in real clinics. */
export type IndexNode = { key: number; height: number; left: IndexNode | null; right: IndexNode | null };
export type IndexStats = { size: number; height: number; rotations: number };
export type SearchTrace = { found: boolean; path: number[]; comparisons: number };
export type RotationEvent={kind:"LL"|"LR"|"RR"|"RL";pivot:number};
const h=(n:IndexNode|null)=>n?.height??0;
const upd=(n:IndexNode)=>{n.height=1+Math.max(h(n.left),h(n.right));};
const bf=(n:IndexNode)=>h(n.left)-h(n.right);
const node=(key:number):IndexNode=>({key,height:1,left:null,right:null});
const rr=(y:IndexNode):IndexNode=>{const x=y.left!;y.left=x.right;x.right=y;upd(y);upd(x);return x;};
const rl=(x:IndexNode):IndexNode=>{const y=x.right!;x.right=y.left;y.left=x;upd(x);upd(y);return y;};
export class PatientAVLIndex {
 root:IndexNode|null=null;
 size=0;
 rotations=0;
 rotationEvents:RotationEvent[]=[];
 insert(key:number):boolean{
  if(!Number.isSafeInteger(key)||key<=0)throw new Error('Patient IDs must be positive integers.');
  let added=false;
  const ins=(n:IndexNode|null):IndexNode=>{
   if(!n){added=true;return node(key);}
   if(key<n.key)n.left=ins(n.left);
   else if(key>n.key)n.right=ins(n.right);
   else return n;
   return this.rebalance(n);
  };
  this.root=ins(this.root);if(added)this.size++;return added;
 }
 private rebalance(n:IndexNode):IndexNode{
  upd(n);
  if(bf(n)>1){
   this.rotationEvents.push({kind:bf(n.left!)<0?"LR":"LL",pivot:n.key});
   if(bf(n.left!)<0){n.left=rl(n.left!);this.rotations++;}
   this.rotations++;return rr(n);
  }
  if(bf(n)<-1){
   this.rotationEvents.push({kind:bf(n.right!)>0?"RL":"RR",pivot:n.key});
   if(bf(n.right!)>0){n.right=rr(n.right!);this.rotations++;}
   this.rotations++;return rl(n);
  }
  return n;
 }
 delete(key:number):boolean{
  let removed=false;
  const min=(n:IndexNode)=>{while(n.left)n=n.left;return n;};
  const del=(n:IndexNode|null,k:number,successor=false):IndexNode|null=>{
   if(!n)return null;
   if(k<n.key)n.left=del(n.left,k,successor);
   else if(k>n.key)n.right=del(n.right,k,successor);
   else {
    if(!successor)removed=true;
    if(!n.left)return n.right;
    if(!n.right)return n.left;
    const s=min(n.right);n.key=s.key;n.right=del(n.right,s.key,true);
   }
   return this.rebalance(n);
  };
  this.root=del(this.root,key);if(removed)this.size--;return removed;
 }
 search(key:number):SearchTrace{
  let n=this.root;const path:number[]=[];
  while(n){path.push(n.key);if(key===n.key)return{found:true,path,comparisons:path.length};n=key<n.key?n.left:n.right;}
  return{found:false,path,comparisons:path.length};
 }
 get stats():IndexStats{return {size:this.size,height:h(this.root),rotations:this.rotations};}
 validate():boolean{
  const walk=(n:IndexNode|null,min:number,max:number):{ok:boolean,height:number,size:number}=>{
   if(!n)return{ok:true,height:0,size:0};
   if(n.key<=min||n.key>=max)return{ok:false,height:0,size:0};
   const l=walk(n.left,min,n.key),r=walk(n.right,n.key,max),height=1+Math.max(l.height,r.height);
   return{ok:l.ok&&r.ok&&Math.abs(l.height-r.height)<=1&&n.height===height,height,size:1+l.size+r.size};
  };const result=walk(this.root,-Infinity,Infinity);return result.ok&&result.size===this.size;
 }
}
export function buildPatientIndex(keys:number[]):PatientAVLIndex{const ix=new PatientAVLIndex();for(const k of keys)ix.insert(k);return ix;}
export function renderIndexLevels(root:IndexNode|null,limit=3){
 const rows:{key:number;depth:number;slot:number}[]=[];
 const walk=(n:IndexNode|null,depth:number,slot:number)=>{if(!n||depth>=limit)return;rows.push({key:n.key,depth,slot});walk(n.left,depth+1,slot*2);walk(n.right,depth+1,slot*2+1);};walk(root,0,0);return rows;
}
