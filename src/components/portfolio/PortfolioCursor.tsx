'use client';
import {useEffect,useRef} from 'react';

/** A fine-pointer enhancement confined to the portfolio, never the application demos. */
export default function PortfolioCursor(){
 const cursor=useRef<HTMLDivElement>(null),spark=useRef<HTMLDivElement>(null),label=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const el=cursor.current,dot=spark.current,scope=el?.closest<HTMLElement>('.folio');if(!el||!dot||!scope)return;
  const media=window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px) and (prefers-reduced-motion: no-preference)');
  let x=0,y=0,followX=0,followY=0,frame=0,visible=false,previous=0;
  const surfaces=[...scope.querySelectorAll<HTMLElement>('main > section,.pf-work-pin')];surfaces.forEach(n=>n.dataset.cursorSurface='true');let surface:HTMLElement|null=null;
  const hide=()=>{if(surface)surface.dataset.spotVisible='false';visible=false;el.dataset.visible='false';dot.dataset.visible='false';scope.classList.remove('pf-has-cursor');cancelAnimationFrame(frame);frame=0;previous=0;};
  const draw=(time:number)=>{if(!visible){frame=0;return;}const dt=previous?Math.min(40,time-previous):16;previous=time;const ease=1-Math.exp(-dt/65);followX+=(x-followX)*ease;followY+=(y-followY)*ease;el.style.transform=`translate3d(${followX}px,${followY}px,0)`;dot.style.transform=`translate3d(${x}px,${y}px,0)`;if(surface){const rect=surface.getBoundingClientRect();surface.style.setProperty('--spot-x',`${followX-rect.left}px`);surface.style.setProperty('--spot-y',`${followY-rect.top}px`);}if(Math.abs(x-followX)+Math.abs(y-followY)>.08)frame=requestAnimationFrame(draw);else{frame=0;previous=0;}};
  const move=(e:PointerEvent)=>{
   const target=e.target instanceof Element?e.target:null;
   if(!media.matches||e.pointerType!=='mouse'||!target?.closest('.folio')||target.closest('input,textarea,select,video,dialog,[contenteditable="true"],.pf-mobile-menu')){hide();return;}
   x=e.clientX;y=e.clientY;
   if(!visible){followX=x;followY=y;visible=true;el.dataset.visible='true';dot.dataset.visible='true';scope.classList.add('pf-has-cursor');}
   const nextSurface=target.closest<HTMLElement>('[data-cursor-surface]');if(surface!==nextSurface){if(surface)surface.dataset.spotVisible='false';surface=nextSurface;}if(surface)surface.dataset.spotVisible='true';
   const action=target.closest<HTMLElement>('a,button');let text='';
   if(action?.matches('button.pf-cert-image'))text='ENLARGE ↗';
   else if(action?.matches('a[download]'))text='SAVE ↓';
   else if(action?.matches('a[href^="mailto:"]'))text='SAY HELLO ↗';
   else if(action?.matches('a[href^="/writing/"]'))text='READ STORY ↗';
   else if(action?.matches('a[href^="/demos/"]'))text='OPEN DEMO ↗';
   else if(action?.matches('a[href^="/projects/"]'))text='EXPLORE ↗';
   el.dataset.mode=text?'label':action?'link':'idle';dot.dataset.mode=text?'label':'idle';
   el.dataset.tone=(document.documentElement.dataset.portfolioTheme==='light'?!target.closest('.pf-project-preview,.pf-contact'):!!target.closest('.pf-certificates,.pf-contact'))?'light':'dark';dot.dataset.tone=el.dataset.tone;
   if(label.current&&label.current.textContent!==text)label.current.textContent=text;
   if(!frame)frame=requestAnimationFrame(draw);
  };
  const down=()=>{el.dataset.pressed='true';};const up=()=>{el.dataset.pressed='false';};
  const key=(e:KeyboardEvent)=>{if(e.key==='Tab'||e.key==='Escape')hide();};
  const change=()=>{if(!media.matches)hide();};
  window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerdown',down,{passive:true});window.addEventListener('pointerup',up,{passive:true});window.addEventListener('keydown',key);window.addEventListener('blur',hide);window.addEventListener('scroll',hide,{passive:true});document.documentElement.addEventListener('pointerleave',hide);media.addEventListener('change',change);
  return()=>{hide();surfaces.forEach(n=>{delete n.dataset.cursorSurface;delete n.dataset.spotVisible;n.style.removeProperty('--spot-x');n.style.removeProperty('--spot-y');});window.removeEventListener('pointermove',move);window.removeEventListener('pointerdown',down);window.removeEventListener('pointerup',up);window.removeEventListener('keydown',key);window.removeEventListener('blur',hide);window.removeEventListener('scroll',hide);document.documentElement.removeEventListener('pointerleave',hide);media.removeEventListener('change',change);};
 },[]);
 return <><div className="pf-cursor" ref={cursor} aria-hidden="true" data-visible="false" data-mode="idle"><div className="pf-cursor-frame"><i/><span ref={label}/><b>↗</b></div></div><div className="pf-cursor-spark" ref={spark} aria-hidden="true" data-visible="false"><i/></div></>;
}
