import type {Metadata} from 'next';
import CareIndexApp from '@/components/CareIndexApp';
import '../careindex.css';
export const metadata:Metadata={title:'CareIndex — Interactive Clinic Operations & AVL Index Demo',description:'Real, browser-based operations with fictional patient records, appointments, visits and a self-balancing AVL patient index. Synthetic demo only; not for actual medical use.'};
export default function CareIndexPage(){return <CareIndexApp/>;}
