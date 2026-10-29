import Article0 from '@/content/writing/trustmart.mdx';
import Article1 from '@/content/writing/travel.mdx';
import Article2 from '@/content/writing/careindex.mdx';
import Article3 from '@/content/writing/word-search.mdx';
import Article4 from '@/content/writing/avl.mdx';
import Article5 from '@/content/writing/sql.mdx';
import {notFound} from 'next/navigation';
import {findWriting,writing} from '@/data/writing';
import ArticleShell from '@/components/writing/ArticleShell';
const content={'trustmart':Article0,'travel':Article1,'careindex':Article2,'word-search':Article3,'avl':Article4,'sql':Article5};
export const dynamicParams=false;
export function generateStaticParams(){return writing.map(a=>({slug:a.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const a=findWriting((await params).slug);return a?{title:a.shortTitle,description:a.description,alternates:{canonical:`/writing/${a.slug}/`},openGraph:{title:a.shortTitle,description:a.description,images:[a.cover],type:'article',publishedTime:a.date,authors:['Sohaib Ijaz']}}:{};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const a=findWriting((await params).slug);if(!a)notFound();const Content=content[a.id];return <ArticleShell article={a}><Content/></ArticleShell>;}
