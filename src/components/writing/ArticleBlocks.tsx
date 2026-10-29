import type {ReactNode} from 'react';
import {writing} from '@/data/writing';
import snippets from '@/data/writing-snippets.json';
import {CodeBlock} from './ArticleMedia';
export {AnnotatedShot} from './ArticleMedia';
export {default as TeachingLab} from './TeachingLab';
export function Callout({title,children}:{title:string;children:ReactNode}){return <aside className="wr-callout"><span>KEEP THIS DISTINCTION</span><h3>{title}</h3>{children}</aside>;}
export function Workflow({articleId}:{articleId:string}){const article=writing.find(a=>a.id===articleId);return <figure className="wr-workflow"><figcaption>FOLLOW THE DATA / EXPLANATORY WORKFLOW</figcaption><ol>{article?.workflow.map((s,i)=><li key={s.title}><span>0{i+1}</span><h3>{s.title}</h3><p>{s.detail}</p></li>)}</ol></figure>;}
export function SourceCode({snippet}:{snippet:string}){const item=(snippets as Record<string,{code:string;language:string}>)[snippet];return item?<CodeBlock {...item}/>:null;}
