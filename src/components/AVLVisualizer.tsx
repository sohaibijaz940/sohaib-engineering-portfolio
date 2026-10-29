"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
 ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight,
 CircleHelp, Database, Github, GitBranch, Pause, Play, RotateCcw, Search, Shuffle,
 SkipBack, SkipForward, Sparkles, Terminal, Trash2, Plus, Zap
} from "lucide-react";
import SiteChrome from "@/components/SiteChrome";
import {
 DEFAULT_IDS, ROTATION_DEMOS, balance, checkAVL, countNodes, height, inOrder,
 makeTree, maximum, minimum, postOrder, preOrder, runAVL,
 type AVLNode, type AVLFrame, type Operation, type Rotation
} from "@/lib/avl";

const initialTree = makeTree(DEFAULT_IDS);
const initialFrame: AVLFrame = {
 tree: initialTree, title: "A balanced starting point", kind: "complete", focus: [],
 explanation: "Seven sample patient IDs are arranged in a valid AVL tree. Try inserting 10, searching for 60, or loading a rotation preset."
};
const presets = [
 {label:"LL", hint:"Right rotation"}, {label:"RR", hint:"Left rotation"},
 {label:"LR", hint:"Double rotation"}, {label:"RL", hint:"Double rotation"}
];
const format = (n:number) => String(n).padStart(2,"0");

type Point={id:number; x:number; y:number; parent:number|null; depth:number; bf:number};
function geometry(root:AVLNode|null){
 const points:Point[]=[];
 let i=0; const count=countNodes(root);
 const width=Math.max(650, (count+1)*77);
 const maxDepth=height(root);
 const svgHeight=Math.max(365,maxDepth*102+95);
 const walk=(node:AVLNode|null,depth:number,parent:number|null)=>{
  if(!node)return;
  walk(node.left,depth+1,node.id);
  i++;
  points.push({id:node.id,x:i*width/(count+1),y:73+depth*102,depth,parent,bf:balance(node)});
  walk(node.right,depth+1,node.id);
 };
 walk(root,0,null);
 return {points,width,svgHeight};
}

function TreeCanvas({frame}:{frame:AVLFrame}) {
 const {points,width,svgHeight}=useMemo(()=>geometry(frame.tree),[frame.tree]);
 const byId=new Map(points.map(n=>[n.id,n]));
 const focussed=new Set(frame.focus);
 return <div className="avl-canvas-scroller" tabIndex={0} aria-label="AVL tree visualization. Scroll horizontally if the tree is wider than the panel.">
  <svg className="avl-tree-svg" width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`} role="img" aria-label={points.length?`AVL tree containing ${points.length} synthetic IDs. In-order: ${inOrder(frame.tree).join(", ")}.`:"Empty AVL tree"}>
   <defs>
    <pattern id="avl-pattern" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeOpacity=".065" strokeWidth="1"/></pattern>
    <filter id="avl-node-glow"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   </defs>
   <rect width={width} height={svgHeight} fill="url(#avl-pattern)"/>
   {points.map(p=>{if(p.parent===null)return null;const parent=byId.get(p.parent)!;return <path key={`${p.parent}-${p.id}`} d={`M${parent.x} ${parent.y+27} L${p.x} ${p.y-27}`} stroke={focussed.has(p.id)?"var(--accent)":"var(--avl-edge)"} strokeWidth={focussed.has(p.id)?3:2} strokeLinecap="round" fill="none"/>;})}
   {points.map(p=>{
    const selected=focussed.has(p.id);
    return <g key={p.id} className={`avl-graph-node ${selected?"is-focused":""}`} transform={`translate(${p.x} ${p.y})`}>
     <title>{`Patient ID ${p.id}, balance factor ${p.bf}, depth ${p.depth}`}</title>
     {selected&&<circle r="37" fill="var(--accent)" opacity=".14" filter="url(#avl-node-glow)"/>}
     <circle r="29" className="avl-node-disc"/>
     <text y="6" textAnchor="middle" fontSize="19" fontWeight="780" className="avl-node-label">{p.id}</text>
     <g transform="translate(0 43)"><rect x="-22" y="-10" width="44" height="19" rx="9" className="avl-bf-pill"/><text textAnchor="middle" y="4" className="avl-bf-text" fontSize="10" fontWeight="700">BF {p.bf>0?`+${p.bf}`:p.bf}</text></g>
    </g>;
   })}
   {points.length===0&&<g transform={`translate(${width/2} ${svgHeight/2})`} textAnchor="middle"><text fill="var(--muted)" fontSize="18">Your AVL tree is empty.</text><text y="30" fill="var(--muted)" fontSize="13">Insert a synthetic patient ID to begin.</text></g>}
  </svg>
 </div>;
}

export default function AVLVisualizer(){
 const [tree,setTree]=useState<AVLNode|null>(initialTree);
 const [frames,setFrames]=useState<AVLFrame[]>([initialFrame]);
 const [frameIndex,setFrameIndex]=useState(0);
 const [playing,setPlaying]=useState(false);
 const [mode,setMode]=useState<Operation>("insert");
 const [input,setInput]=useState("25");
 const [speed,setSpeed]=useState(850);
 const [error,setError]=useState("");
 const [recentRotation,setRecentRotation]=useState<Rotation[]>([]);
 const current=frames[Math.min(frameIndex,frames.length-1)];
 const showing=current.tree;
 const check=checkAVL(tree);
 const visualStageValid=checkAVL(showing).valid;
 const progress=frames.length===1?100:(frameIndex/(frames.length-1))*100;
 const reducedMotion=()=>typeof window!=="undefined"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 useEffect(()=>{if(!playing)return;if(frameIndex>=frames.length-1){setPlaying(false);return;} const timer=window.setTimeout(()=>setFrameIndex(i=>Math.min(i+1,frames.length-1)),speed);return()=>window.clearTimeout(timer);},[playing,frameIndex,frames.length,speed]);
 const showFrames=(nextTree:AVLNode|null, nextFrames:AVLFrame[], rotations:Rotation[]=[])=>{
  setTree(nextTree);setFrames(nextFrames);setRecentRotation(rotations);
  const reduce=reducedMotion();setFrameIndex(reduce?nextFrames.length-1:0);setPlaying(!reduce&&nextFrames.length>1);setError("");
 };
 function submitOperation(event?:FormEvent){event?.preventDefault();const id=Number(input);
  if(!/^\d{1,3}$/.test(input.trim())||!Number.isSafeInteger(id)||id<1||id>999){setError("Enter a whole-number ID between 1 and 999.");setPlaying(false);return;}
  try{const result=runAVL(tree,mode,id);showFrames(result.root,result.frames,result.rotationTypes);}catch(e){setError(e instanceof Error?e.message:"Unable to run operation.");setPlaying(false);}
 }
 function loadDemo(name:Rotation){const demo=ROTATION_DEMOS.find(p=>p.name===name)!;const base=makeTree(demo.seed);const result=runAVL(base,"insert",demo.add);showFrames(result.root,result.frames,result.rotationTypes);setMode("insert");setInput(String(demo.add));}
 function reset(){const base=makeTree(DEFAULT_IDS);showFrames(base,[{tree:base,title:"Balanced starter tree restored",explanation:"Back to seven sample IDs. Choose an operation or rotation preset to explore.",focus:[],kind:"complete"}]);setInput("25");}
 function clear(){showFrames(null,[{tree:null,title:"Canvas cleared",explanation:"Insert an ID to create the first node of a new AVL tree.",focus:[],kind:"complete"}]);}
 function randomize(){const nums:number[]=[];while(nums.length<9){const id=10+Math.floor(Math.random()*85);if(!nums.includes(id))nums.push(id);} const generated=makeTree(nums);showFrames(generated,[{tree:generated,title:"New random sample generated",explanation:"Nine synthetic IDs were inserted into a valid AVL tree. Search for an existing ID or try another insert/delete.",focus:[],kind:"complete"}]);}
 const metrics=[{label:"NODES",value:String(countNodes(showing)),extra:"Unique IDs"},{label:"HEIGHT",value:String(height(showing)),extra:"Levels"},{label:"ROTATIONS",value:recentRotation.length?recentRotation.join(" + "):"—",extra:"Current operation"},{label:"COMPLEXITY",value:"O(log n)",extra:"Search / updates"}];
 const traversal=inOrder(showing);
 return <div className="engineering-site avl-page"><SiteChrome/><main id="main">
  <section className="avl-header section-wrap">
   <Link href="/projects/patient-record-avl-tree/" className="back-link"><ArrowLeft size={17}/> Back to case study</Link>
   <div className="avl-heading-row"><div><span className="eyebrow"><span className="live-dot"/> LIVE DEMO / INTERACTIVE ALGORITHMS</span><h1>AVL Tree <em>Lab.</em></h1><p>Insert, delete, and search synthetic patient IDs. Watch self-balancing rotations unfold, one step at a time.</p></div><div className="avl-header-actions"><a href="https://github.com/sohaibijaz940/Patient-Record-AVL-Tree" target="_blank" rel="noopener noreferrer" className="btn-outline"><Github size={17}/> Original C++ <ArrowUpRight size={15}/></a><a href="#how-it-works" className="avl-underlined">How it works <CircleHelp size={16}/></a></div></div>
   <div className="avl-trust-note"><CheckCircle2 size={16}/> Real TypeScript AVL operations inspired by the original C++ algorithms. Local browser execution; no patient records are used or stored.</div>
  </section>
  <section className="avl-workspace section-wrap" aria-label="Interactive AVL tree demo">
   <div className="avl-controls glow-card"><div className="avl-panel-heading"><span><Terminal size={17}/> CONTROL CENTER</span><span className="avl-panel-counter">01 / OPERATIONS</span></div>
    <div className="avl-controls-inner"><label className="avl-control-label" htmlFor="avl-id">PATIENT ID <span>1–999 · synthetic</span></label>
     <form onSubmit={submitOperation} className="avl-run-form"><input id="avl-id" type="number" min="1" max="999" step="1" inputMode="numeric" value={input} onChange={e=>setInput(e.target.value)} required aria-describedby={error?"avl-error":undefined}/><button className="avl-run" type="submit"><Zap size={17}/> Run {mode}</button></form>
     {error&&<p className="avl-error" id="avl-error" role="alert">{error}</p>}
     <div className="avl-mode-tabs" role="group" aria-label="Choose tree operation">{([{name:"insert",icon:<Plus size={16}/>},{name:"delete",icon:<Trash2 size={16}/>},{name:"search",icon:<Search size={16}/>} ] as {name:Operation;icon:React.ReactNode}[]).map(o=><button type="button" key={o.name} className={mode===o.name?"active":""} aria-pressed={mode===o.name} onClick={()=>setMode(o.name)}>{o.icon}{o.name}</button>)}</div>
     <div className="avl-sidebar-divider"/>
     <div className="avl-control-section-heading"><span>ROTATION PLAYGROUND</span><span>01–04</span></div>
     <p className="avl-helper-text">Load a minimal example and watch the exact rotation case, from imbalance to restoration.</p>
     <div className="avl-preset-grid">{presets.map(p=><button key={p.label} type="button" onClick={()=>loadDemo(p.label as Rotation)}><strong>{p.label}</strong><small>{p.hint}</small><ArrowUpRight size={15}/></button>)}</div>
     <div className="avl-sidebar-divider"/>
     <div className="avl-control-section-heading"><span>QUICK ACTIONS</span></div>
     <div className="avl-quick-actions"><button type="button" onClick={randomize}><Shuffle size={16}/> Random tree</button><button type="button" onClick={reset}><RotateCcw size={16}/> Reset</button><button type="button" onClick={clear}><Trash2 size={16}/> Clear all</button></div>
    </div>
   </div>
   <div className="avl-main-panel"><div className="avl-panel-heading avl-canvas-heading"><span><GitBranch size={18}/> TREE VISUALIZATION</span><span className="avl-graph-status"><span className="avl-dot"/> {visualStageValid?"VALID AVL":"REBALANCING"} · {format(countNodes(showing))} NODES</span></div>
    <div className="avl-canvas"><div className="avl-canvas-top"><span>LIVE STRUCTURE / VISUAL STATE</span><span>BF = LEFT HEIGHT − RIGHT HEIGHT</span></div><TreeCanvas frame={current}/><div className="avl-legend"><span><i className="legend-node"/> Node / ID</span><span><i className="legend-highlight"/> Current path</span><span><i className="legend-branch"/> Connection</span><span className="avl-canvas-note">Scroll horizontally for large trees</span></div></div>
    <div className="avl-stepper"><div className="avl-step-head"><div><span className="avl-step-eyebrow">STEP {format(frameIndex+1)} / {format(frames.length)} <span className="avl-kind">{current.kind.toUpperCase()}</span></span><h2>{current.title}</h2><p aria-live="polite" aria-atomic="true">{current.explanation}</p></div>{current.rotation&&<div className="avl-rotation-tag"><GitBranch size={15}/>{current.rotation} CASE</div>}</div>
     <div className="avl-playback"><div className="avl-playback-buttons"><button onClick={()=>{setPlaying(false);setFrameIndex(0);}} aria-label="First step" disabled={frameIndex===0}><SkipBack size={17}/></button><button onClick={()=>{setPlaying(false);setFrameIndex(i=>Math.max(0,i-1));}} aria-label="Previous step" disabled={frameIndex===0}><ChevronLeft size={19}/></button><button className="avl-play-toggle" onClick={()=>{if(frameIndex===frames.length-1)setFrameIndex(0);setPlaying(p=>!p);}} aria-label={playing?"Pause playback":"Play steps"} disabled={frames.length===1}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?"Pause":"Play"}</button><button onClick={()=>{setPlaying(false);setFrameIndex(i=>Math.min(frames.length-1,i+1));}} aria-label="Next step" disabled={frameIndex===frames.length-1}><ChevronRight size={19}/></button><button onClick={()=>{setPlaying(false);setFrameIndex(frames.length-1);}} aria-label="Last step" disabled={frameIndex===frames.length-1}><SkipForward size={17}/></button></div><label className="avl-speed">Speed <select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={1350}>Slow</option><option value={850}>Normal</option><option value={400}>Fast</option></select></label></div>
     <div className="avl-progress-track" aria-label={`Playback ${Math.round(progress)} percent complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><div style={{width:`${progress}%`}}/></div>
    </div>
   </div>
  </section>
  <section className="avl-below section-wrap"><div className="avl-metric-grid">{metrics.map(m=><div className="avl-metric glow-card" key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small>{m.extra}</small></div>)}</div>
   <div className="avl-facts"><div className="avl-facts-main"><div className="avl-facts-title"><Database size={20}/><h2>Inspect the structure</h2><span className="avl-invariant"><CheckCircle2 size={15}/> {check.valid?"AVL invariants hold":"Check tree"}</span></div><div className="avl-traversal"><span>IN-ORDER</span><p>{traversal.length?traversal.join("  →  "):"Empty tree"}</p></div><div className="avl-detail-cols"><div><span>PRE-ORDER</span><p>{preOrder(showing).join(" → ")||"—"}</p></div><div><span>POST-ORDER</span><p>{postOrder(showing).join(" → ")||"—"}</p></div></div><div className="avl-detail-cols"><div><span>MINIMUM ID</span><p>{minimum(showing)??"—"}</p></div><div><span>MAXIMUM ID</span><p>{maximum(showing)??"—"}</p></div></div></div><aside id="how-it-works" className="avl-education"><span className="eyebrow"><Sparkles size={16}/> THE ENGINEERING</span><h3>Balanced by design.</h3><p>An AVL tree is a binary search tree that keeps every node’s left and right subtree heights within one level of each other.</p><p>After inserts or deletes, the algorithm updates heights and performs LL, RR, LR or RL rotations when necessary. Search follows the BST order.</p><p className="avl-disclaimer">This TypeScript visualizer reimplements the core AVL logic of the linked C++ coursework; it is not a compiled C++ application. IDs are fictional, in-memory, and reset when the page reloads.</p><Link className="avl-more" href="/projects/patient-record-avl-tree/">Read engineering case study <ArrowRight size={17}/></Link></aside></div>
  </section>
 </main><footer className="site-footer section-wrap"><Link href="/">sohaib / engineering</Link><span>AVL Tree Lab · Browser demo</span><Link href="/#work">More projects ↑</Link></footer></div>;
}
