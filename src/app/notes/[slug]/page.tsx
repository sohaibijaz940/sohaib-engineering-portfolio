import {permanentRedirect,notFound} from 'next/navigation';
import {findWriting,writing} from '@/data/writing';
export function generateStaticParams(){return writing.map(a=>({slug:a.slug}));}
export default async function Page({params}:{params:Promise<{slug:string}>}){const a=findWriting((await params).slug);if(!a)notFound();permanentRedirect(`/writing/${a.slug}/`);}
