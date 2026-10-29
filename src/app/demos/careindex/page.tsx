import type {Metadata} from 'next';
import CareIndexFullstack from '@/components/CareIndexFullstack';
import './careindex.css';
import './careindex-v5.css';
export const metadata:Metadata={title:'CareIndex — Clinic OS | Final Full-Stack Demo',description:'Local full-stack clinic management demonstration: synthetic patient accounts, real SQLite bookings, staff permissions and a traced engineering lab. Not for clinical use.'};
export const dynamic='force-dynamic';
export default function CareIndexPage(){return <CareIndexFullstack/>;}
