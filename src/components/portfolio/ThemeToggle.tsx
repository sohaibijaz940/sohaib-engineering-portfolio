'use client';
import {useEffect,useState} from 'react';
export default function ThemeToggle({mobile=false}:{mobile?:boolean}){
 const [light,setLight]=useState(false);
 useEffect(()=>{const sync=()=>setLight(document.documentElement.dataset.portfolioTheme==='light');sync();const storage=(e:StorageEvent)=>{if(e.key==='portfolio-theme'){document.documentElement.dataset.portfolioTheme=e.newValue==='light'?'light':'dark';sync();}};window.addEventListener('portfolio-theme-change',sync);window.addEventListener('storage',storage);return()=>{window.removeEventListener('portfolio-theme-change',sync);window.removeEventListener('storage',storage);};},[]);
 const toggle=()=>{const next=document.documentElement.dataset.portfolioTheme==='light'?'dark':'light';document.documentElement.dataset.portfolioTheme=next;try{localStorage.setItem('portfolio-theme',next);}catch{/* The current tab still works when storage is unavailable. */}window.dispatchEvent(new Event('portfolio-theme-change'));};
 return <button type="button" className={`pf-theme-toggle ${mobile?'pf-theme-mobile':'pf-theme-desktop'}`} onClick={toggle} aria-label={`Switch to ${light?'dark':'light'} mode`} aria-pressed={light} title={`Switch to ${light?'dark':'light'} mode`}><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" fill="currentColor"/></svg>{mobile&&<span>{light?'Dark appearance':'Light appearance'}</span>}</button>;
}
