import type {Metadata} from 'next';
import CareIndexDoctorWorkspace from '@/components/CareIndexDoctorWorkspace';
import './doctor.css';
export const metadata:Metadata={title:'Doctor Workspace | CareIndex',description:'Clinician appointment queue, check-in, consultations and backend execution explorer. Synthetic demo data only.'};
export const dynamic='force-dynamic';
export default function DoctorPage(){return <CareIndexDoctorWorkspace/>;}
