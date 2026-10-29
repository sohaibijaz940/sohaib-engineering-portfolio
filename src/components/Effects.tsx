"use client";
import {useEffect} from "react";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
export default function Effects(){
 useEffect(()=>{
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  gsap.registerPlugin(ScrollTrigger);
  const ctx=gsap.context(()=>{
    gsap.fromTo(".enter",{opacity:0,y:26},{opacity:1,y:0,duration:.85,ease:"power2.out",stagger:.09,clearProps:"opacity,transform"});
    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach(el=>gsap.fromTo(el,{opacity:0,y:28},{opacity:1,y:0,duration:.75,ease:"power2.out",clearProps:"opacity,transform",scrollTrigger:{trigger:el,start:"top 91%",once:true}}));
  });
  return()=>ctx.revert();
 },[]);
 return null;
}
