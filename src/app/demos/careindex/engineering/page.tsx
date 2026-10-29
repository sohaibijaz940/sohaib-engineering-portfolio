import type {Metadata} from 'next';
import CareIndexLearningLab from '@/components/CareIndexLearningLab';
import './engineering.css';
export const metadata:Metadata={title:'Engineering Learning Lab | CareIndex',description:'Interactive AVL, hashing, Trie, scheduling and actual sanitized SQLite/API trace explorations. Synthetic data only.'};
export const dynamic='force-dynamic';
export default function EngineeringPage(){return <CareIndexLearningLab/>;}
