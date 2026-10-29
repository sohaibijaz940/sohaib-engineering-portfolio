import type {Metadata} from 'next';
import CareIndexAccountSecurity from '@/components/CareIndexAccountSecurity';
import './security.css';
export const metadata:Metadata={title:'Account Security | CareIndex V10',description:'Manage demo account password and server sessions. Fictional records only.'};
export const dynamic='force-dynamic';
export default function SecurityPage(){return <CareIndexAccountSecurity/>;}
