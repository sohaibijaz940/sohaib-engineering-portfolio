/** Browser adaptation of the AVL algorithms in the original C++ coursework.
 *  This module is pure TypeScript: no React, DOM, backend or personal data. */
export type AVLNode = { id: number; height: number; left: AVLNode | null; right: AVLNode | null };
export type Operation = "insert" | "delete" | "search";
export type FrameKind = "start" | "visit" | "change" | "rotate" | "complete" | "warning";
export type Rotation = "LL" | "RR" | "LR" | "RL";
export type AVLFrame = { tree: AVLNode | null; title: string; explanation: string; focus: number[]; kind: FrameKind; rotation?: Rotation };
export type AVLTrace = { root: AVLNode | null; frames: AVLFrame[]; changed: boolean; found: boolean; rotationTypes: Rotation[] };

export const cloneTree = (node: AVLNode | null): AVLNode | null => node ? ({ id: node.id, height: node.height, left: cloneTree(node.left), right: cloneTree(node.right) }) : null;
export const height = (node: AVLNode | null): number => node?.height ?? 0;
export const balance = (node: AVLNode | null): number => node ? height(node.left) - height(node.right) : 0;
const updateHeight = (node: AVLNode) => { node.height = 1 + Math.max(height(node.left), height(node.right)); };
const nodeOf = (id: number): AVLNode => ({id, height: 1, left: null, right: null});
function rotateRight(y: AVLNode): AVLNode { const x=y.left!; y.left=x.right; x.right=y; updateHeight(y); updateHeight(x); return x; }
function rotateLeft(x: AVLNode): AVLNode { const y=x.right!; x.right=y.left; y.left=x; updateHeight(x); updateHeight(y); return y; }
export function countNodes(root: AVLNode|null): number { return root ? 1 + countNodes(root.left) + countNodes(root.right) : 0; }
export function inOrder(root: AVLNode|null): number[] { return root ? [...inOrder(root.left),root.id,...inOrder(root.right)] : []; }
export function preOrder(root: AVLNode|null): number[] { return root ? [root.id,...preOrder(root.left),...preOrder(root.right)] : []; }
export function postOrder(root: AVLNode|null): number[] { return root ? [...postOrder(root.left),...postOrder(root.right),root.id] : []; }
export function hasNode(root: AVLNode|null, id:number): boolean { let n=root; while(n){ if(n.id===id)return true; n=id<n.id?n.left:n.right; } return false; }
export function minimum(root:AVLNode|null): number|null { if(!root)return null; let n=root; while(n.left)n=n.left; return n.id; }
export function maximum(root:AVLNode|null): number|null { if(!root)return null; let n=root; while(n.right)n=n.right; return n.id; }

/** Checks BST order, cached subtree heights, and the AVL invariant recursively. */
export function checkAVL(root: AVLNode|null): {valid:boolean; reason:string; size:number;height:number} {
 const walk=(node: AVLNode|null, min:number,max:number):{valid:boolean; reason:string; size:number;height:number}=>{
  if(!node)return {valid:true,reason:"",size:0,height:0};
  if(node.id<=min||node.id>=max)return {valid:false,reason:`BST ordering failed at ${node.id}`,size:0,height:0};
  const l=walk(node.left,min,node.id); if(!l.valid)return l;
  const r=walk(node.right,node.id,max); if(!r.valid)return r;
  const h=1+Math.max(l.height,r.height);
  if(node.height!==h)return {valid:false,reason:`Height cache mismatch at ${node.id}`,size:0,height:h};
  if(Math.abs(l.height-r.height)>1)return {valid:false,reason:`AVL balance violated at ${node.id}`,size:0,height:h};
  return {valid:true,reason:"Valid AVL tree",size:1+l.size+r.size,height:h};
 };
 return walk(root,-Infinity,Infinity);
}

export function runAVL(root: AVLNode|null, operation: Operation, id: number): AVLTrace {
 if(!Number.isSafeInteger(id)||id<1||id>999)throw new Error("Use a whole-number patient ID from 1 to 999.");
 const working=cloneTree(root);
 const frames:AVLFrame[]=[];
 const rotationTypes:Rotation[]=[];
 const snapshot=(tree:AVLNode|null,title:string,explanation:string,kind:FrameKind="visit",focus:number[]=[],rotation?:Rotation)=>{
  frames.push({tree:cloneTree(tree),title,explanation,kind,focus,rotation});
 };
 snapshot(working,`${operation.toUpperCase()} ${id}`,`Starting ${operation} on the current AVL tree.`,"start");
 if(operation==="search") {
  let n=working; let steps=0;
  while(n){steps++;snapshot(working,`Compare ${id} with ${n.id}`,id===n.id?"The target ID matches this node.":id<n.id?"The target is smaller, so follow the left child.":"The target is larger, so follow the right child.","visit",[n.id]);if(n.id===id){snapshot(working,`Found patient ID ${id}`,`Search succeeded after ${steps} node ${steps===1?"visit":"visits"}.`,"complete",[id]);return{root:working,frames,changed:false,found:true,rotationTypes};} n=id<n.id?n.left:n.right;}
  snapshot(working,`ID ${id} not found`,`Search reached an empty child after ${steps} comparisons.`,"warning");return{root:working,frames,changed:false,found:false,rotationTypes};
 }
 if(operation==="insert"&&hasNode(working,id)) { snapshot(working,"Duplicate rejected",`ID ${id} already exists. AVL trees store unique IDs here.`,"warning",[id]);return {root:working,frames,changed:false,found:true,rotationTypes}; }
 if(operation==="delete"&&!hasNode(working,id)){ snapshot(working,"Nothing to remove",`ID ${id} is not present in the tree.`,"warning");return {root:working,frames,changed:false,found:false,rotationTypes}; }
 const count=countNodes(working);
 if(operation==="insert"&&count>=31){snapshot(working,"Visualizer capacity reached","This demo supports up to 31 IDs so labels remain readable.","warning");return {root:working,frames,changed:false,found:false,rotationTypes};}
 let tree=working;
 // Reconnect a rotated subtree *before* taking a snapshot. This ensures playback displays
 // the new parent-child relationship, including when the rotated node was the tree root.
 const reconnect=(old:AVLNode,replacement:AVLNode)=>{
  if(tree===old){tree=replacement;return;}
  const visit=(n:AVLNode|null):boolean=>{
   if(!n)return false;
   if(n.left===old){n.left=replacement;return true;}
   if(n.right===old){n.right=replacement;return true;}
   return visit(n.left)||visit(n.right);
  };
  visit(tree);
 };
 const rebalance=(n:AVLNode):AVLNode=>{
  updateHeight(n);
  const b=balance(n);
  if(b>1){
   if(balance(n.left)>=0){ rotationTypes.push("LL");snapshot(tree,"LL imbalance",`Node ${n.id} is left-heavy. A right rotation restores balance.`,"rotate",[n.id,n.left!.id],"LL");const r=rotateRight(n);reconnect(n,r);snapshot(tree,"Right rotation","The left child becomes this subtree's new root.","rotate",[r.id],"LL");return r; }
   rotationTypes.push("LR"); snapshot(tree,"LR imbalance",`Node ${n.id} is left-heavy, but its left child leans right. This needs two rotations.`,"rotate",[n.id,n.left!.id],"LR");n.left=rotateLeft(n.left!);snapshot(tree,"First: left rotation","Rotate the left subtree to turn the zigzag into a straight chain.","rotate",[n.left.id],"LR");const r=rotateRight(n);reconnect(n,r);snapshot(tree,"Second: right rotation","Rotate the unbalanced node right to restore balance.","rotate",[r.id],"LR");return r;
  }
  if(b< -1){
   if(balance(n.right)<=0){rotationTypes.push("RR");snapshot(tree,"RR imbalance",`Node ${n.id} is right-heavy. A left rotation restores balance.`,"rotate",[n.id,n.right!.id],"RR");const r=rotateLeft(n);reconnect(n,r);snapshot(tree,"Left rotation","The right child becomes this subtree's new root.","rotate",[r.id],"RR");return r;}
   rotationTypes.push("RL");snapshot(tree,"RL imbalance",`Node ${n.id} is right-heavy, but its right child leans left. Two rotations are required.`,"rotate",[n.id,n.right!.id],"RL");n.right=rotateRight(n.right!);snapshot(tree,"First: right rotation","Rotate the right subtree to align the zigzag.","rotate",[n.right.id],"RL");const r=rotateLeft(n);reconnect(n,r);snapshot(tree,"Second: left rotation","Rotate the unbalanced node left to restore balance.","rotate",[r.id],"RL");return r;
  }
  return n;
 };
 if(operation==="insert") {
  const insert=(n:AVLNode|null):AVLNode=>{
   if(!n){snapshot(tree,`Place ID ${id}`,`Found an empty position. Create a new node for ID ${id}.`,"change",[id]);return nodeOf(id);}
   snapshot(tree,`Compare ${id} with ${n.id}`,id<n.id?"Smaller: move left.":"Larger: move right.","visit",[n.id]);
   if(id<n.id)n.left=insert(n.left);else n.right=insert(n.right);
   return rebalance(n);
  };
  tree=insert(tree);
 } else {
  const remove=(n:AVLNode|null,key:number):AVLNode|null=>{
   if(!n)return null;
   snapshot(tree,`Compare ${key} with ${n.id}`,key===n.id?"Found the node to remove.":key<n.id?"Search left for the ID to remove.":"Search right for the ID to remove.","visit",[n.id]);
   if(key<n.id)n.left=remove(n.left,key);else if(key>n.id)n.right=remove(n.right,key);
   else if(!n.left||!n.right){ snapshot(tree,`Remove ID ${key}`,"The node has at most one child; reconnect that child to its parent.","change",[key]);return n.left??n.right; }
   else { const successor=minimum(n.right)!; snapshot(tree,`Find successor ${successor}`,`The node has two children. Replace its ID with the smallest ID in the right subtree.`,"visit",[n.id,successor]);n.id=successor;n.right=remove(n.right,successor);}
   return rebalance(n);
  };
  tree=remove(tree,id);
 }
 snapshot(tree,`${operation==="insert"?"Inserted":"Deleted"} ${id}`,rotationTypes.length?`AVL balance restored after ${rotationTypes.join(", ")} rotation ${rotationTypes.length===1?"case":"cases"}. The tree is valid.`:"Tree updated. No rotation was needed.","complete",operation==="insert"?[id]:[],rotationTypes.at(-1));
 const check=checkAVL(tree); if(!check.valid)throw new Error(`Internal AVL invariant failure: ${check.reason}`);
 return {root:tree,frames,changed:true,found:operation==="delete",rotationTypes};
}
export function makeTree(ids:number[]):AVLNode|null { let tree:AVLNode|null=null; for(const id of ids){ tree=runAVL(tree,"insert",id).root; } return tree; }
export const DEFAULT_IDS=[50,30,70,20,40,60,80];
export const ROTATION_DEMOS:{name:Rotation; seed:number[]; add:number;description:string}[]=[
 {name:"LL",seed:[30,20],add:10,description:"Right rotation"},
 {name:"RR",seed:[10,20],add:30,description:"Left rotation"},
 {name:"LR",seed:[30,10],add:20,description:"Left, then right"},
 {name:"RL",seed:[10,30],add:20,description:"Right, then left"},
];
