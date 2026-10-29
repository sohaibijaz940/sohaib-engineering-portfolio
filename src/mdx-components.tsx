import type {MDXComponents} from 'mdx/types';
import * as blocks from '@/components/writing/ArticleBlocks';
export function useMDXComponents(components:MDXComponents):MDXComponents{return {...blocks,h2:({children})=><h2 id={String(children).toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-')}>{children}</h2>,a:({href,children,...props})=><a href={href} {...(href?.startsWith('https:')?{target:'_blank',rel:'noreferrer'}:{})} {...props}>{children}</a>,...components};}
