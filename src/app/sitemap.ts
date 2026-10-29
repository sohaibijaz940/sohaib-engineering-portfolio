import type {MetadataRoute} from "next";
import {projects} from "@/data/projects";
import {writing} from "@/data/writing";
export default function sitemap():MetadataRoute.Sitemap{const base=process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";return [{url:base,priority:1,changeFrequency:"monthly" as const},{url:`${base}/demos/careindex/`,priority:.85,changeFrequency:"monthly" as const},{url:`${base}/demos/avl-tree/`,priority:.7,changeFrequency:"monthly" as const},...projects.map(p=>({url:`${base}/projects/${p.slug}/`,priority:.8,changeFrequency:"monthly" as const})),{url:`${base}/writing/`,priority:.65,changeFrequency:"monthly" as const},...writing.map(n=>({url:`${base}/writing/${n.slug}/`,priority:.55,changeFrequency:"monthly" as const}))]}
