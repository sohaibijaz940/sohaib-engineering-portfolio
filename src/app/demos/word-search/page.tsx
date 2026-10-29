import type {Metadata} from 'next';
import WordSearch from '@/components/word-search/WordSearch';
import './word-search.css';
export const metadata:Metadata={title:'Word Search Studio',description:'Play, discover and explore the algorithms behind Sohaib’s original C++ word search.'};
export default function Page(){return <WordSearch/>;}
